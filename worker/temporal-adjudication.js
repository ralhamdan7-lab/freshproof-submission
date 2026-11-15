import { MULTI_PART_SUFFIXES, isMultiPartSuffix } from "./evidence-acquisition.js";
const DAY = 86400000;
const DATE_PATTERNS = [
  /\b(?:19|20)\d{2}-\d{2}-\d{2}\b/g,
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi,
  /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:19|20)\d{2}\b/gi,
  /(?:^|[^\d٠-٩])([0-9٠-٩]{1,2})\s+(?:يناير|كانون الثاني|فبراير|شباط|مارس|آذار|أبريل|إبريل|نيسان|مايو|أيار|يونيو|حزيران|يوليو|تموز|أغسطس|آب|سبتمبر|أيلول|أكتوبر|تشرين الأول|نوفمبر|تشرين الثاني|ديسمبر|كانون الأول)\s+(?:عام\s+)?(?:19|20|١٩|٢٠)[0-9٠-٩]{2}/g,
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:of\s+)?(?:19|20)\d{2}\b/gi,
  /(?:في عام|في سنة|عام|سنة)\s*([12][0-9]{3}|[٠-٩]{4})/g,
  /\b(?:19|20)\d{2}\b/g,
];
const ARABIC_MONTHS = [["يناير","كانون الثاني"],["فبراير","شباط"],["مارس","آذار"],["أبريل","إبريل","نيسان"],["مايو","أيار"],["يونيو","حزيران"],["يوليو","تموز"],["أغسطس","آب"],["سبتمبر","أيلول"],["أكتوبر","تشرين الأول"],["نوفمبر","تشرين الثاني"],["ديسمبر","كانون الأول"]];
const EVENT_CUES = /\b(occurred|happened|took place|took effect|landed|implemented|launched|released|opened|adopted|entered into force|came into effect|effective|enacted|ended|expired|ceased|replaced|appointed|resigned|elected|sworn in|took office|took over|was named|assumed|became|began|started|founded|introduced|renamed|revised|revoked|withdrawn|suspended|retired|discontinued|postponed|rescheduled|cancelled|canceled|joined|join|acceded|accession|admitted|withdrew|left|exited|seceded|independence|signed|ratified|merged|dissolved|abolished|moved|relocated|transferred|inaugurated|completed|changed its name|reclassified|switched)\b|انتهى|بدأ|افتتح|تطبيق|تم تطبيق|أُطلق|اطلق|دخل حيز النفاذ|اعتمد|اعتمدت|عُيّن|استقال|انتخب|حل محل|استبدل|أوقف|ألغي|ألغيت|انضم|انضمت|انسحب|انسحبت|استقل|استقلت|استقلال|وقع|وقعت|صادق|صادقت|نقل|نقلت|انتقل|انتقلت|أعيدت تسمية|غير اسمه|غيرت اسمها|تبنت|أصبح|أصبحت|اكتمل/i;
const PUBLICATION_CUES = /\b(published|publication|posted|issued|report dated|article dated|press release dated)\b|نشر|صدر التقرير|تاريخ النشر/i;
const UPDATE_CUES = /\b(updated|last updated|modified|revised on|updated on)\b|آخر تحديث|تم التحديث|عُدّل|تعديل بتاريخ/i;

function asciiDigits(value) {
  return String(value || "").replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}
function dateValue(mention) {
  const value = asciiDigits(mention).replace(/^(?:في عام|عام|في سنة|سنة)\s*/i, "").trim();
  if (/^(?:19|20)\d{2}$/.test(value)) return { normalized_date: value + "-01-01", precision: "YEAR" };
  const monthYear = value.match(/^([A-Za-z]{3,9})\s+(?:of\s+)?(\d{4})$/);
  if (monthYear) {
    const index = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(monthYear[1].slice(0, 3).toLowerCase());
    if (index < 0) return null;
    return { normalized_date: `${monthYear[2]}-${String(index + 1).padStart(2, "0")}-01`, precision: "MONTH" };
  }
  const arabicDay = value.match(/^(\d{1,2})\s+(.+?)\s+(?:عام\s+)?(\d{4})$/);
  if (arabicDay && /[\u0600-\u06FF]/.test(arabicDay[2])) {
    const index = ARABIC_MONTHS.findIndex(names => names.includes(arabicDay[2].trim()));
    if (index < 0) return null;
    const year = Number(arabicDay[3]), day = Number(arabicDay[1]);
    const timestamp = Date.UTC(year, index, day);
    const check = new Date(timestamp);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== index || check.getUTCDate() !== day) return null;
    return { normalized_date: check.toISOString().slice(0, 10), precision: "DAY" };
  }
  let year, month, day;
  let match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    year = Number(match[1]); month = Number(match[2]) - 1; day = Number(match[3]);
  } else {
    match = value.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
    if (match) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      month = months.indexOf(match[1].slice(0, 3).toLowerCase());
      day = Number(match[2]); year = Number(match[3]);
    } else {
      match = value.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
      if (!match) return null;
      day = Number(match[1]);
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      month = months.indexOf(match[2].slice(0, 3).toLowerCase());
      year = Number(match[3]);
    }
  }
  if (!Number.isInteger(year) || year < 1000 || year > 9999 || month < 0 || month > 11 || day < 1 || day > 31) return null;
  const timestamp = Date.UTC(year, month, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return { normalized_date: date.toISOString().slice(0, 10), precision: "DAY" };
}
export function extractDateMentions(text) {
  const value = String(text || "").slice(0, 900);
  const found = [];
  for (const pattern of DATE_PATTERNS) {
    for (const match of value.matchAll(pattern)) {
      // The Arabic day pattern consumes one leading boundary character.
      const lead = /^[^\d٠-٩]/.test(match[0]) && /[\u0600-\u06FF]/.test(match[0]) && /^[^\d٠-٩][0-9٠-٩]/.test(match[0]) ? 1 : 0;
      const mention = match[0].slice(lead);
      const start = (match.index ?? -1) + lead;
      if (start < 0 || found.some(item => start < item.end && start + mention.length > item.start)) continue;
      const parsed = dateValue(mention);
      if (!parsed) continue;
      const contextStart = Math.max(0, start - 90);
      const rawContext = value.slice(contextStart, Math.min(value.length, start + mention.length + 90));
      const context = rawContext.replace(/\s+/g, " ").trim();
      const localMentionStart = start - contextStart;
      const cueDistance = pattern => {
        const regex = new RegExp(pattern.source, pattern.flags.replace("g", "") + "g");
        let match, distance = Infinity;
        while ((match = regex.exec(rawContext)) !== null) {
          const midpoint = match.index + match[0].length / 2;
          distance = Math.min(distance, Math.abs(midpoint - localMentionStart));
          if (!match[0].length) regex.lastIndex++;
        }
        return distance;
      };
      const distances = [
        [cueDistance(UPDATE_CUES), "UPDATE_CANDIDATE"],
        [cueDistance(PUBLICATION_CUES), "PUBLICATION_CANDIDATE"],
        [cueDistance(EVENT_CUES), "EVENT_CANDIDATE"]
      ].sort((x, y) => x[0] - y[0]);
      const role_hint = Number.isFinite(distances[0][0]) && distances[0][0] <= 65
        && distances[0][0] < distances[1][0] ? distances[0][1] : "UNKNOWN";
      found.push({ mention, ...parsed, role_hint, context, start, end: start + mention.length });
    }
  }
  return found.sort((a, b) => a.start - b.start).slice(0, 6).map(({ end, ...item }) => item);
}

const DYNAMIC_CLAIM_KINDS = new Set(["CURRENT_STATE", "LIFECYCLE", "PRICE_POLICY", "REGULATORY_STATE", "SCHEDULED_EVENT"]);
const CHANGE_TYPES = new Set(["REPLACED", "ENDED", "INTRODUCED", "RENAMED", "REVISED", "REVOKED", "EXPIRED", "SUSPENDED", "DISCONTINUED", "POSTPONED", "RESCHEDULED", "CANCELLED", "CANCELED", "WITHDRAWN"]);
const STOPWORDS = new Set("the and for with from that this these those was were are is has have had its their they them into about after before during while current currently latest new old as of in on at to a an of by from remains still officially supported support status version claim".split(" "));
function normalized(value) {
  return String(value || "").normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
function tokens(value) {
  return (normalized(value).match(/[a-z0-9]{3,}|[\u0621-\u064A]{3,}/g) || []).filter(token => !STOPWORDS.has(token));
}
function exactQuote(snippet, quote, min = 8) {
  // Quotes may not span the "…" separator between non-contiguous page passages.
  return typeof quote === "string" && quote.trim().length >= min && quote.length <= 500 && !quote.includes("…")
    && normalized(snippet).includes(normalized(quote));
}
function dateMillis(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : null;
}
function claimReferenceEnd(claim) {
  const text = String(claim || "");
  const mentions = extractDateMentions(text);
  if (!mentions.length) return null;
  const referenceCue = /\b(as of|as at|as on|valid as of|current as of|during|for the fiscal year|for fiscal year|for FY)\b|اعتباراً من|اعتبارا من|كما في|حتى تاريخ|بحلول/gi;
  const references = mentions.map(mention => {
    const prefix = text.slice(Math.max(0, mention.start - 80), mention.start);
    const cues = [...prefix.matchAll(referenceCue)];
    if (!cues.length) return null;
    const nearest = cues.reduce((best, cue) => {
      const distance = prefix.length - (cue.index + cue[0].length);
      return !best || distance < best.distance ? { distance, mention } : best;
    }, null);
    return nearest && nearest.distance <= 35 ? nearest : null;
  }).filter(Boolean).sort((a, b) => a.distance - b.distance);
  const reference = references[0]?.mention;
  if (!reference) return null;
  const start = dateMillis(reference.normalized_date);
  if (start === null) return null;
  return reference.precision === "YEAR" ? Date.UTC(Number(reference.normalized_date.slice(0, 4)), 11, 31, 23, 59, 59) : start + DAY - 1;
}
function eligibleSource(source, sourceAssessment, relation, now) {
  if (relation !== "CONTRADICTS" || sourceAssessment?.temporal_role !== "CHANGE_NOTICE") return false;
  if (!["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL"].includes(source?.source_reliability)
    || source?.relevance_assessment?.relevance !== "HIGH"
    || sourceAssessment?.directness !== "DIRECT"
    || sourceAssessment?.scope_match !== "EXACT"
    || !["ORIGINATING_AUTHORITY", "PRIMARY_RESEARCH"].includes(sourceAssessment?.authority_role)) return false;
  if (!CHANGE_TYPES.has(sourceAssessment.change_type)) return false;
  const snippet = String(source.snippet || "");
  const dateIndex = sourceAssessment.event_date_mention_index;
  const mention = Array.isArray(source.date_mentions) ? source.date_mentions[dateIndex] : null;
  if (!Number.isInteger(dateIndex) || !mention || !["DAY", "MONTH"].includes(mention.precision) || mention.role_hint !== "EVENT_CANDIDATE") return false;
  const eventDate = dateMillis(mention.normalized_date);
  const todayEnd = Date.parse(new Date(now).toISOString().slice(0, 10)) + DAY - 1;
  if (eventDate === null || eventDate > todayEnd) return false;
  const statement = sourceAssessment.change_statement_quote;
  const oldState = sourceAssessment.old_state_quote;
  const newState = sourceAssessment.new_state_quote;
  if (!exactQuote(snippet, statement, 30) || !exactQuote(snippet, oldState, 3) || !exactQuote(snippet, newState, 3)) return false;
  if (![statement, oldState, newState, mention.mention].every(value => normalized(statement).includes(normalized(value)))) return false;
  return { event_date: mention.normalized_date, event_timestamp: eventDate, change_type: sourceAssessment.change_type, old_state_quote: oldState, new_state_quote: newState, statement_quote: statement };
}

/**
 * Generic supersession is intentionally stricter than generic contradiction.
 * It requires two independent primary/institutional sources that explicitly
 * document the same dated transition, with exact source-bound quotations.
 */
export function adjudicateTemporalSupersession({ claim, sources = [], relations = null, temporalSensitive = false, frameIsCurrentState = false, now = Date.now() } = {}) {
  // v0.2.84: a deterministic CURRENT_STATE claim frame is sufficient; the
  // model's temporal kind is advisory and is required only when no frame exists.
  if (!temporalSensitive || !relations?.claimAssessment) return null;
  if (!frameIsCurrentState && !DYNAMIC_CLAIM_KINDS.has(relations.claimAssessment.temporal_claim_kind)) return null;
  if (!relations.sourceByIndex || !relations.byIndex || !Array.isArray(sources) || sources.length < 2) return null;
  const referenceEnd = claimReferenceEnd(claim);
  const candidates = [];
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    const assessment = relations.sourceByIndex.get(index);
    const candidate = eligibleSource(source, assessment, relations.byIndex.get(index), now);
    if (!candidate || (referenceEnd !== null && candidate.event_timestamp <= referenceEnd)) continue;
    const claimTokens = new Set(tokens(claim));
    // Claim anchors may come from the verbatim old-state quote or the verbatim
    // change statement (pages rarely restate the prior state in full).
    const oldTokens = [...new Set([...tokens(candidate.old_state_quote), ...tokens(candidate.statement_quote)])];
    const sharedOldStateTokens = oldTokens.filter(token => claimTokens.has(token)).length;
    const minimumClaimAnchors = Math.min(2, claimTokens.size);
    if (sharedOldStateTokens < minimumClaimAnchors) continue;
    candidates.push({ index, source, assessment, ...candidate, host: registrableHost(source.url) });
  }
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i], b = candidates[j];
      if (!a.host || !b.host || a.host === b.host || a.change_type !== b.change_type) continue;
      if (Math.abs(a.event_timestamp - b.event_timestamp) > 30 * DAY) continue;
      const aNew = new Set(tokens(a.new_state_quote));
      const bNew = tokens(b.new_state_quote);
      if ([...aNew].filter(token => bNew.includes(token)).length < 2) continue;
      const eventDate = a.event_timestamp >= b.event_timestamp ? a.event_date : b.event_date;
      return {
        status: "SUPERSEDED",
        method: "CORROBORATED_TEMPORAL_CHANGE_EVENT",
        rationale: "Two independent primary or institutional sources explicitly document the same dated change, identify the prior state in the original claim, and corroborate the replacement state.",
        evidence: [
          { source_index: a.index, relation: "CONTRADICTS" },
          { source_index: b.index, relation: "CONTRADICTS" }
        ],
        temporal_evidence: {
          event_date: eventDate,
          change_type: a.change_type,
          old_state_quote: a.old_state_quote,
          new_state_quote: a.new_state_quote,
          source: { title: a.source.title, url: a.source.url, published_date: a.source.published_date || null, retrieved_at: a.source.retrieved_at || null },
          supporting_sources: [{ title: b.source.title, url: b.source.url, published_date: b.source.published_date || null, retrieved_at: b.source.retrieved_at || null }]
        },
        adjudication_signals: {
          temporal_transition_corroborated: true,
          temporal_claim_kind: relations.claimAssessment.temporal_claim_kind,
          change_type: a.change_type,
          event_date: eventDate,
          independent_change_notice_domains: 2,
          source_date_quotes_validated: true,
          publication_date_used_as_event_date: false
        }
      };
    }
  }
  // v0.2.84 issuer + corroboration: one validated change notice from a primary
  // or institutional originating source (all per-source checks above: exact
  // quotes, validated event date, old state matching the claim) plus at least
  // one independent qualified source that contradicts the claim and is not
  // dated before the change. No qualified source dated after the change may
  // support the claim.
  const QUALIFIED = new Set(["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL", "SECONDARY_REPUTABLE"]);
  const publishedMs = source => dateMillis(String(source?.published_date || "").slice(0, 10));
  for (const issuer of candidates) {
    const laterSupport = sources.some((source, index) => {
      if (index === issuer.index || relations.byIndex.get(index) !== "SUPPORTS" || !QUALIFIED.has(source?.source_reliability)) return false;
      if (source?.relevance_assessment?.relevance !== "HIGH") return false;
      const published = publishedMs(source);
      return published === null || published >= issuer.event_timestamp;
    });
    if (laterSupport) continue;
    const corroborator = sources.map((source, index) => ({ source, index })).find(({ source, index }) => {
      if (index === issuer.index) return false;
      const host = registrableHost(source?.url);
      if (!host || host === issuer.host) return false;
      const assessment = relations.sourceByIndex.get(index);
      if (relations.byIndex.get(index) !== "CONTRADICTS" || !QUALIFIED.has(source?.source_reliability)) return false;
      if (source?.relevance_assessment?.relevance !== "HIGH" || assessment?.scope_match !== "EXACT" || assessment?.directness === "UNCLEAR") return false;
      const published = publishedMs(source);
      return published === null || published >= issuer.event_timestamp;
    });
    if (!corroborator) continue;
    return {
      status: "SUPERSEDED",
      method: "ISSUER_CHANGE_NOTICE_WITH_CORROBORATION",
      rationale: "A primary or institutional source documents a dated change that replaced the state described in the claim, and an independent qualified source corroborates that the claim no longer holds.",
      evidence: [
        { source_index: issuer.index, relation: "CONTRADICTS" },
        { source_index: corroborator.index, relation: "CONTRADICTS" }
      ],
      temporal_evidence: {
        event_date: issuer.event_date,
        change_type: issuer.change_type,
        old_state_quote: issuer.old_state_quote,
        new_state_quote: issuer.new_state_quote,
        source: { title: issuer.source.title, url: issuer.source.url, published_date: issuer.source.published_date || null, retrieved_at: issuer.source.retrieved_at || null },
        supporting_sources: [{ title: corroborator.source.title, url: corroborator.source.url, published_date: corroborator.source.published_date || null, retrieved_at: corroborator.source.retrieved_at || null }]
      },
      adjudication_signals: {
        temporal_transition_corroborated: true,
        temporal_claim_kind: relations.claimAssessment.temporal_claim_kind,
        change_type: issuer.change_type,
        event_date: issuer.event_date,
        independent_change_notice_domains: 1,
        independent_corroborating_domains: 1,
        source_date_quotes_validated: true,
        publication_date_used_as_event_date: false
      }
    };
  }
  return null;
}
function registrableHost(url) {
  const multiPartSuffixes = MULTI_PART_SUFFIXES;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) return "";
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const labels = host.split(".");
    if (labels.length <= 2) return host;
    const suffix = labels.slice(-2).join(".");
    return isMultiPartSuffix(suffix) ? labels.slice(-3).join(".") : suffix;
  } catch { return ""; }
}
