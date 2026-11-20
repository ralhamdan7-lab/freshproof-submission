import { evidenceRecency } from "./evidence-dates.js";
import { adjudicateTemporalSupersession } from "./temporal-adjudication.js";
import { MULTI_PART_SUFFIXES, independentLineages, isMultiPartSuffix } from "./evidence-acquisition.js";

// Claim-specific evidence sufficiency. Semantic assessments are advisory; single-source
// decisions are limited to narrow, low-risk claims backed by direct exact-scope primary evidence.
const VALID_RELATIONS = new Set(["SUPPORTS", "CONTRADICTS", "MIXED", "IRRELEVANT", "INSUFFICIENT"]);
const DECISIVE_RELATIONS = new Set(["SUPPORTS", "CONTRADICTS"]);
const DAY = 86400000;

function hostOf(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) return "";
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch { return ""; }
}
// v0.2.82: one shared bounded multi-part suffix list (also used by acquisition and
// temporal adjudication) so government and academic second levels of every
// listed country are treated consistently.
const MULTI_PART_PUBLIC_SUFFIXES = MULTI_PART_SUFFIXES;

// Count independent registrable domains, not subdomains controlled by one publisher.
// This is a bounded common-suffix list, not a complete Public Suffix List; unknown
// multi-label suffixes may be misclassified and must not be described as universal.
export function registrableDomain(url) {
  const host = hostOf(url);
  if (!host) return "";
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join(".");
  if (isMultiPartSuffix(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
}

// Recency comes from evidenceRecency(): publication date or a validated,
// page-declared editorial update date. Retrieval time is never recency evidence.
function recentDated(source, now, maxAgeDays) {
  return evidenceRecency(source, { now, maxAgeDays }).is_recent;
}

// v0.2.84 live issuer record: for a current-state claim, the originating
// authority's own current record, fetched in this request, is evidence of the
// present state even when the page carries no date (membership lists, registers,
// directories). Every condition is required:
//   - fetched directly in this request, with claim-relevant page passages;
//   - publisher classified PRIMARY_OR_OFFICIAL_DOMAIN (structural or confirmed
//     first-party), never by the model;
//   - semantic assessment: DIRECT, EXACT scope, ORIGINATING_AUTHORITY and
//     temporal_role CURRENT_STATE_RECORD;
//   - a dated page is judged by its date: only undated or recent pages qualify,
//     so an old news item or archived page never becomes "live".
// Retrieval time is recorded as the observation time; it is not treated as a
// publication date.
const LIVE_RECORD_MAX_RETRIEVAL_AGE_MS = 6 * 3600 * 1000;
function liveIssuerRecord(item, now, maxAgeDays) {
  const source = item?.source;
  const assessed = item?.semanticSource;
  if (!source || !assessed) return false;
  if (source.evidence_origin !== "DIRECT_PAGE_PASSAGES" || source.source_reliability !== "PRIMARY_OR_OFFICIAL_DOMAIN") return false;
  if (assessed.directness !== "DIRECT" || assessed.scope_match !== "EXACT"
    || assessed.authority_role !== "ORIGINATING_AUTHORITY" || assessed.temporal_role !== "CURRENT_STATE_RECORD") return false;
  const retrieved = Date.parse(String(source.retrieved_at || ""));
  if (!Number.isFinite(retrieved) || retrieved > now + 60000 || now - retrieved > LIVE_RECORD_MAX_RETRIEVAL_AGE_MS) return false;
  const recency = evidenceRecency(source, { now, maxAgeDays });
  return recency.recency_basis === "UNDATED" || recency.is_recent;
}
// v0.3.20 normative specification: when a claim is about what a published
// technical standard specifies, the standard's own official text is the
// primary authority. Only published standards on their issuers' own hosts
// qualify (RFCs, W3C Technical Reports, ISO, NIST FIPS/SP, ECMA, Unicode,
// ITU-T Recommendations, ETSI, IEEE); drafts and secondary write-ups never do.
const NORMATIVE_SPECIFICATION_PATHS = [
  [/(^|\.)rfc-editor\.org$/, /^\/(?:rfc|info)\/rfc\d+(?:\.(?:html|txt|pdf))?\/?$/i],
  [/^datatracker\.ietf\.org$/, /^\/doc\/(?:html\/)?rfc\d+\/?$/i],
  [/^(?:www\.)?ietf\.org$/, /^\/rfc\/rfc\d+(?:\.(?:html|txt))?$/i],
  [/^(?:www\.)?w3\.org$/, /^\/TR\/(?!.*(?:-?WD-|\/ED\/|NOTE-))/],
  [/^(?:www\.)?iso\.org$/, /^\/(?:[a-z]{2}\/)?standard\/\d+/i],
  [/^(?:nvlpubs|csrc)\.nist\.gov$/, /^\/(?:nistpubs\/(?:FIPS|SpecialPublications)\/|pubs\/(?:fips|sp)\/)/i],
  [/^(?:www\.)?ecma-international\.org$/, /^\/publications-and-standards\/standards\/ecma-\d+/i],
  [/^(?:www\.)?unicode\.org$/, /^\/(?:reports\/tr\d+|versions\/Unicode\d)/i],
  [/^(?:www\.)?itu\.int$/, /^\/rec\/T-REC-/i],
  [/^(?:www\.)?etsi\.org$/, /^\/deliver\/etsi_(?:ts|en|es)\//i],
  [/^standards\.ieee\.org$/, /^\/ieee\/\d+/i]
];
export function isNormativeSpecificationUrl(rawUrl) {
  let url;
  try { url = new URL(String(rawUrl || "")); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return NORMATIVE_SPECIFICATION_PATHS.some(([hostRule, pathRule]) => hostRule.test(host) && pathRule.test(url.pathname));
}
function normativeSpecificationSource(item) {
  const source = item?.source;
  const assessed = item?.semanticSource;
  if (!source || !assessed) return false;
  if (!isNormativeSpecificationUrl(source.url)) return false;
  if (source.source_reliability !== "PRIMARY_OR_OFFICIAL_DOMAIN" || source.evidence_origin !== "DIRECT_PAGE_PASSAGES") return false;
  if (/\bobsoleted\s+by\b|\bsuperseded\s+by\b|\bwithdrawn\b|\bhistoric(?:al)?\s+status\b/i.test(`${source.title || ""} ${source.snippet || ""}`)) return false;
  return assessed.directness === "DIRECT" && assessed.scope_match === "EXACT"
    && ["ORIGINATING_AUTHORITY", "PRIMARY_RESEARCH"].includes(assessed.authority_role)
    && ["SUPPORTS", "CONTRADICTS"].includes(item.relation);
}
// v0.3.21 originating issuer: in any field, one official source settles a
// claim when that source is the body that itself made, issued, holds or
// maintains the stated fact (its own decision, record, membership list,
// product, statistics or publication), not a page that reports another body's
// fact. Self-promotional superlatives on a company's own site never qualify.
const ISSUER_MARKETING = /\b(?:best|fastest|leading|most (?:advanced|popular|powerful|trusted|secure|innovative)|world'?s (?:first|largest|best|leading|fastest)|number one|#1|unmatched|unrivalled|unrivaled|revolutionary|industry[- ]leading)\b/i;
const ISSUER_BASES = new Set(["FIRST_PARTY_ENTITY_DOMAIN", "MODEL_PLANNED_AUTHORITY_DOMAIN", "CURATED_OR_SUFFIX_REGISTRY", "GOVERNMENT_OR_INTERGOVERNMENTAL_DOMAIN_PATTERN"]);
function originatingIssuerSource(item, claim, claimType) {
  const source = item?.source;
  const assessed = item?.semanticSource;
  if (!source || !assessed) return false;
  if (source.evidence_origin !== "DIRECT_PAGE_PASSAGES") return false;
  if (assessed.directness !== "DIRECT" || assessed.scope_match !== "EXACT") return false;
  if (!["SUPPORTS", "CONTRADICTS"].includes(item.relation)) return false;
  if (source.reliability_basis === "FIRST_PARTY_ENTITY_DOMAIN" && ISSUER_MARKETING.test(String(claim || ""))) return false;
  // A finding attributed to a named study is settled only by the study itself,
  // never by another body's page reporting it.
  if (claimType === "ATTRIBUTED_RESEARCH_RESULT") {
    return assessed.authority_role === "PRIMARY_RESEARCH"
      && ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL"].includes(source.source_reliability);
  }
  return assessed.authority_role === "ORIGINATING_AUTHORITY"
    && source.source_reliability === "PRIMARY_OR_OFFICIAL_DOMAIN" && ISSUER_BASES.has(source.reliability_basis);
}
// v0.2.82: a first-party domain (publisher name equals an entity in the claim)
// counts as primary only when the semantic assessment also finds that the page
// itself directly originates the record. Structural/curated authority is unchanged.
function authorityQualified(item) {
  if (item?.source?.reliability_basis !== "FIRST_PARTY_ENTITY_DOMAIN") return true;
  const assessed = item.semanticSource;
  return Boolean(assessed) && assessed.directness === "DIRECT"
    && ["ORIGINATING_AUTHORITY", "PRIMARY_RESEARCH"].includes(assessed.authority_role)
    && assessed.scope_match !== "NO_MATCH";
}
// Proposition-level relevance: when structured source metadata exists, a source
// the semantic assessment found to be out of scope (NO_MATCH) never qualifies,
// however high its keyword relevance. The whole-claim relation remains required.
function scopeQualified(item) {
  return !item?.semanticSource || item.semanticSource.scope_match !== "NO_MATCH";
}
// v0.2.82: independence is counted by publisher lineage (same registrable
// domain, same organisation label across suffixes, or near-duplicate
// syndicated evidence text), never by raw hostname alone.
function uniqueHosts(items) {
  return new Set(independentLineages(items));
}
function completeAssessment(assessment, sourceCount, components = []) {
  if (!assessment || assessment.status !== "COMPLETED_ADVISORY" || !Array.isArray(assessment.assessments)
    || assessment.assessments.length !== sourceCount || sourceCount === 0) return null;
  const byIndex = new Map();
  for (const item of assessment.assessments) {
    if (!item || !Number.isInteger(item.source_index) || item.source_index < 0
      || item.source_index >= sourceCount || !VALID_RELATIONS.has(item.relation)
      || byIndex.has(item.source_index)) return null;
    byIndex.set(item.source_index, item.relation);
  }
  if (byIndex.size !== sourceCount) return null;
  const componentByPair = new Map();
  if (Array.isArray(components) && components.length > 1) {
    const pairs = assessment.component_assessments;
    if (!Array.isArray(pairs) || pairs.length !== components.length * sourceCount) return null;
    for (const item of pairs) {
      if (!item || !Number.isInteger(item.component_id) || item.component_id < 1 || item.component_id > components.length
        || !Number.isInteger(item.source_index) || item.source_index < 0 || item.source_index >= sourceCount
        || !VALID_RELATIONS.has(item.relation)) return null;
      const key = `${item.component_id}:${item.source_index}`;
      if (componentByPair.has(key)) return null;
      componentByPair.set(key, item.relation);
    }
    if (componentByPair.size !== components.length * sourceCount) return null;
  }
  const claimAssessment = assessment.claim_assessment || null;
  const sourceAssessments = assessment.source_assessments;
  const sourceByIndex = new Map();
  // Legacy complete relation assessments remain valid for the established
  // two-independent-domain path. Metadata is mandatory only for the exception.
  if (claimAssessment && Array.isArray(sourceAssessments) && sourceAssessments.length === sourceCount) {
    const allowedTypes = new Set(["INSTITUTIONAL_RECORD", "HISTORICAL_EVENT", "ATTRIBUTED_RESEARCH_RESULT", "CURRENT_STATE", "SCIENTIFIC_CONSENSUS", "CONTESTED", "COMPOUND", "OTHER"]);
    const allowedRisks = new Set(["LOW", "MEDIUM", "HIGH"]);
    if (!allowedTypes.has(claimAssessment.claim_type) || !allowedRisks.has(claimAssessment.claim_risk)) return null;
    for (const item of sourceAssessments) {
      if (!item || !Number.isInteger(item.source_index) || item.source_index < 0
        || item.source_index >= sourceCount || sourceByIndex.has(item.source_index)
        || !["DIRECT", "INDIRECT", "UNCLEAR"].includes(item.directness)
        || !["EXACT", "PARTIAL", "NO_MATCH"].includes(item.scope_match)
        || !["ORIGINATING_AUTHORITY", "PRIMARY_RESEARCH", "SECONDARY", "UNKNOWN"].includes(item.authority_role)) return null;
      sourceByIndex.set(item.source_index, item);
    }
    if (sourceByIndex.size !== sourceCount) return null;
  }
  return { byIndex, claimAssessment, sourceByIndex, componentByPair };
}
function independentSingleSourceDisqualifier(claim) {
  const text = String(claim || "").toLowerCase();
  // Conservative lexical guard: these signals only disable the single-source
  // shortcut; they never determine a factual verdict.
  const dynamic = /\b(current|currently|now|today|latest|newest|still|remains|serving|incumbent|active|available|in force|as of|this year|presently|ongoing)\b|حالي[اًا]|الآن|اليوم|حالياً|لا يزال|ما زال|المعتمد حالياً|الأحدث|الجديد حالياً/.test(text);
  const highImpact = /\b(medical|medicine|drug|medication|dosage|diagnosis|treatment|disease|clinical|patient|legal|law|regulation|court|judge|election|president|prime minister|minister|war|military|security|cybersecurity|financial|finance|investment|stock|tax|interest rate|bankruptcy|safety|emergency)\b|طب|طبي|دواء|جرعة|تشخيص|علاج|مرض|سريري|قانون|نظام|لائحة|محكمة|قاض|انتخاب|رئيس|وزير|حرب|عسكري|أمن|أمني|مالي|استثمار|سهم|ضريبة|إفلاس|سلامة|طوارئ/.test(text);
  const compound = /[;\n]|\b(and|or|but|whereas|while|although|both|either|neither)\b|\sو(?:\s|ال)|\sأو\s|\sلكن\s|\sبينما\s/.test(text);
  return { dynamic, high_impact: highImpact, compound };
}
function evidenceItem(source, relation, index) {
  return {
    source_index: index,
    title: source.title || "",
    url: source.url,
    published_date: source.published_date || null,
    event_date_candidate: source.event_date_candidate || null,
    source_reliability: source.source_reliability || "UNKNOWN",
    relation
  };
}

// v0.2.90 ----------------------------------------------------------------
const QUALIFIED_TIERS = new Set(["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL", "SECONDARY_REPUTABLE"]);
// Persistence windows for current states with no later change found: tight
// for fast-moving states, wider for structural ones (capitals, memberships,
// names, regulations in force). Office holders and prices never rely on old
// undated pages alone.
const PERSISTENCE_DAYS = Object.freeze({ OFFICE_HOLDER: 365, PRICE_FEE: 365, STATISTIC: 730, MEMBERSHIP: 1825, NAME_IDENTITY: 1825, REGULATION_IN_FORCE: 1095, LIFECYCLE_SUPPORT: 730, OTHER: 1825 });
const FORECAST = /\b(?:will|shall|is expected to|are expected to|is likely to|are likely to|is projected to|are projected to|could|is going to|are going to)\b[^.!?]{0,80}\b(?:exceed|surpass|reach|hit|top|trade|cost|be worth|rise|fall|drop|decline|increase|decrease|grow|shrink|win|lose|beat|collapse|crash|double|triple|halve|outperform|dominate|replace)\b|(?:ستتجاوز|سيتجاوز|ستصل|سيصل|سترتفع|سيرتفع|ستنخفض|سينخفض|سيفوز|ستفوز|سيخسر|ستخسر|ستنهار|سينهار|ستتضاعف|سيتضاعف|سيبلغ|ستبلغ|ستتفوق|سيتفوق|ستهيمن|سيهيمن)/iu;
export function isOpenForecast(claim) {
  return FORECAST.test(String(claim || ""));
}
function sourceTimestamp(source) {
  const value = Date.parse(String(source?.published_date || source?.updated_date || "").slice(0, 10));
  return Number.isFinite(value) ? value : null;
}
function corroborable(x) {
  const source = x?.source;
  const assessedSource = x?.semanticSource;
  if (!source || !assessedSource || !hostOf(source.url)) return false;
  if (source.relevance_assessment?.relevance !== "HIGH") return false;
  if (source.reliability_basis === "USER_GENERATED_CONTENT_ON_DOMAIN") return false;
  // A domain that matches the claimed entity but whose page does not identify
  // as it (parked, resold or impersonating domains) is never a corroborator.
  if (source.reliability_basis === "FIRST_PARTY_UNCONFIRMED_BY_PAGE" || source.first_party_confirmation === "NOT_CONFIRMED_BY_PAGE_IDENTITY") return false;
  if (!authorityQualified(x)) return false;
  if (assessedSource.scope_match !== "EXACT" || assessedSource.directness === "UNCLEAR") return false;
  return x.relation === "SUPPORTS" || x.relation === "CONTRADICTS";
}
function consensusStrength(items, highRisk) {
  const lineages = independentLineages(items.map(x => x.source)).length;
  const qualifiedCount = new Set(items.filter(x => QUALIFIED_TIERS.has(x.source.source_reliability)).map(x => registrableDomain(x.source.url))).size;
  const directPages = items.filter(x => x.source.evidence_origin === "DIRECT_PAGE_PASSAGES").length;
  // v0.2.91: search-provider excerpts are verbatim publisher text, so a page
  // read directly is no longer mandatory when classified publishers agree.
  // Unclassified-only agreement still needs a directly read page.
  const met = highRisk
    ? lineages >= 3 && qualifiedCount >= 1 && (directPages >= 1 || qualifiedCount >= 2)
    : (lineages >= 2 && qualifiedCount >= 1) || (lineages >= 3 && directPages >= 1);
  return { met, lineages, qualified_publishers: qualifiedCount, direct_page_sources: directPages };
}
// v0.3.0: graded verdicts carry STRONG confidence when agreement is broad:
// at least four assessed sources on the same side, none on the other, three
// independent lineages and a classified publisher (two for high-risk claims).
// This is an evidence category, not a probability.
function gradedConsensus(args) {
  const result = gradedConsensusBase(args);
  if (!result || result.confidence_tier !== "MODERATE" || result.signals?.minority_dissent_domains) return result;
  const highRisk = args.claimRisk === "HIGH" || Boolean(args.lexicalGuard?.high_impact);
  const side = result.status === "CURRENT" ? "SUPPORTS" : "CONTRADICTS";
  const opposite = side === "SUPPORTS" ? "CONTRADICTS" : "SUPPORTS";
  const agreeing = args.assessed.filter(x => x.relation === side).length;
  const opposing = args.assessed.filter(x => x.relation === opposite).length;
  const strength = consensusStrength(result.items, highRisk);
  if (agreeing >= 4 && opposing === 0 && strength.lineages >= 3 && strength.qualified_publishers >= (highRisk ? 2 : 1)) {
    return { ...result, confidence_tier: "STRONG", signals: { ...(result.signals || {}), confidence_basis: "BROAD_INDEPENDENT_AGREEMENT", agreeing_sources: agreeing } };
  }
  return result;
}

function gradedConsensusBase({ assessed, claimFrame, requireRecentEvidence, now, maxEvidenceAgeDays, changeSearchPerformed, claimRisk, lexicalGuard, trace = {} }) {
  const frame = claimFrame?.frame || null;
  const highRisk = claimRisk === "HIGH" || Boolean(lexicalGuard?.high_impact);
  const pool = assessed.filter(corroborable);
  // v0.2.91 telemetry: why graded consensus did or did not apply.
  Object.assign(trace, { corroborable_sources: pool.length, high_risk_threshold: highRisk, change_search_performed: Boolean(changeSearchPerformed) });
  if (!pool.length) return null;
  // Any qualified source labelled MIXED keeps the claim under review.
  if (assessed.some(x => x.relation === "MIXED" && corroborable({ ...x, relation: "SUPPORTS" }) && QUALIFIED_TIERS.has(x.source.source_reliability))) return null;
  const changeNoticeAgainst = assessed.some(x => x.semanticSource?.temporal_role === "CHANGE_NOTICE" && x.relation === "CONTRADICTS");
  const persistenceDays = PERSISTENCE_DAYS[claimFrame?.state_class] ?? PERSISTENCE_DAYS.OTHER;
  // v0.2.91: a change notice against the claim blocks persistence only for the
  // claim's side. Sources that document the change (or the resulting state)
  // are themselves the contradiction: their age does not weaken them unless a
  // later source supports the old state again, which blocks consensus below.
  const persistenceAllowedFor = x => requireRecentEvidence && changeSearchPerformed
    && (x.relation === "CONTRADICTS" || !changeNoticeAgainst);
  const currencyBasis = x => {
    if (!requireRecentEvidence) return "NOT_REQUIRED";
    if (recentDated(x.source, now, maxEvidenceAgeDays)) return "RECENT";
    if (liveIssuerRecord(x, now, maxEvidenceAgeDays)) return "LIVE_ISSUER_RECORD";
    if (!persistenceAllowedFor(x)) return null;
    const role = x.semanticSource?.temporal_role;
    if (x.relation === "CONTRADICTS" && role === "CHANGE_NOTICE") return "DOCUMENTED_CHANGE";
    const recency = evidenceRecency(x.source, { now, maxAgeDays: persistenceDays });
    if (recency.is_recent) return "WITHIN_PERSISTENCE_WINDOW";
    if (recency.recency_basis === "UNDATED" && role === "CURRENT_STATE_RECORD") return "UNDATED_CURRENT_STATE_RECORD";
    // v0.2.91: when no assessed source at all supports a present-state claim
    // after a search for its latest status, independent sources saying it is
    // not the case count regardless of their date. The stricter threshold
    // below (three lineages, classified publishers) applies to this basis.
    if (x.relation === "CONTRADICTS" && frame === "CURRENT_STATE" && !anyAssessedSupport) return "UNCONTESTED_AFTER_LATEST_STATUS_SEARCH";
    // v0.2.98: the mirror case. No assessed source says the present state has
    // ended, after a search for its latest status; undated or older sources
    // that state it may count, under the same stricter threshold.
    if (x.relation === "SUPPORTS" && frame === "CURRENT_STATE" && !anyAssessedContradiction) return "UNCONTESTED_AFTER_LATEST_STATUS_SEARCH";
    return null;
  };
  const anyAssessedSupport = assessed.some(x => x.relation === "SUPPORTS");
  const anyAssessedContradiction = assessed.some(x => x.relation === "CONTRADICTS");
  const current = pool.map(x => ({ ...x, currency: currencyBasis(x) })).filter(x => x.currency);
  const supports = current.filter(x => x.relation === "SUPPORTS");
  const contradicts = current.filter(x => x.relation === "CONTRADICTS");
  const allSupports = pool.filter(x => x.relation === "SUPPORTS");
  const allContradicts = pool.filter(x => x.relation === "CONTRADICTS");
  Object.assign(trace, {
    supports: allSupports.length, contradicts: allContradicts.length,
    supports_current: supports.length, contradicts_current: contradicts.length,
    support_strength: supports.length ? consensusStrength(supports, highRisk) : null,
    contradict_strength: contradicts.length ? consensusStrength(contradicts, highRisk) : null
  });
  const usedPersistence = items => items.some(x => ["WITHIN_PERSISTENCE_WINDOW", "UNDATED_CURRENT_STATE_RECORD", "DOCUMENTED_CHANGE"].includes(x.currency));
  const signalsFor = (items, extra = {}) => ({
    confidence_basis: "INDEPENDENT_AGREEMENT",
    ...consensusStrength(items, highRisk),
    high_risk_threshold_applied: highRisk,
    currency_basis: [...new Set(items.map(x => x.currency))],
    change_search_performed: Boolean(changeSearchPerformed),
    ...extra
  });

  // (a) Temporal-order reconciliation: every dated supporting source is older
  // than every dated contradicting source, and the contradicting side meets
  // consensus on its own. The claim describes a state that has been overtaken.
  if (["CURRENT_STATE", "STABLE_FACT", "MIXED_OR_AMBIGUOUS"].includes(frame) && allSupports.length && allContradicts.length) {
    const supportTimes = allSupports.map(x => sourceTimestamp(x.source));
    const contraTimes = allContradicts.map(x => sourceTimestamp(x.source));
    const strength = consensusStrength(allContradicts, highRisk);
    if (strength.met && supportTimes.every(Number.isFinite) && contraTimes.every(Number.isFinite)
      && Math.max(...supportTimes) < Math.min(...contraTimes)) {
      return {
        status: "SUPERSEDED",
        method: "TEMPORAL_ORDER_RECONCILIATION",
        confidence_tier: "MODERATE",
        rationale: "Older sources support the claim, but every later source contradicts it, and the later sources independently agree. The claim describes a state that has since changed.",
        items: allContradicts,
        signals: signalsFor(allContradicts.map(x => ({ ...x, currency: "NEWER_THAN_ALL_SUPPORT" })), { older_supporting_domains: allSupports.map(x => hostOf(x.source.url)) })
      };
    }
  }
  // Any opposing assessed source (current or not) blocks consensus, with one
  // narrow v0.2.91 exception: a lone dissenting page from a single unclassified
  // publisher does not block a side that is backed by at least three
  // independent lineages, two of them qualified publishers. The dissent is
  // recorded in the signals and the verdict stays MODERATE.
  const loneUnqualifiedDissent = (side, opposition) => {
    if (!side.length || !opposition.length) return false;
    const oppositionLineages = independentLineages(opposition.map(x => x.source)).length;
    const oppositionQualified = opposition.some(x => QUALIFIED_TIERS.has(x.source.source_reliability));
    if (oppositionLineages !== 1 || oppositionQualified) return false;
    const strength = consensusStrength(side, highRisk);
    return strength.met && strength.lineages >= 3 && strength.qualified_publishers >= 2;
  };
  let dissent = null;
  if (allSupports.length && allContradicts.length) {
    if (loneUnqualifiedDissent(supports, allContradicts)) dissent = { side: "CURRENT", opposition: allContradicts };
    else if (loneUnqualifiedDissent(contradicts, allSupports)) dissent = { side: "CONTRADICTED", opposition: allSupports };
    else return null;
  }
  for (const [status, items] of [["CURRENT", supports], ["CONTRADICTED", contradicts]]) {
    if (!items.length) continue;
    if (dissent && dissent.side !== status) continue;
    const strength = consensusStrength(items, highRisk);
    if (!strength.met) continue;
    const persistence = usedPersistence(items);
    if (items.some(x => x.currency === "UNCONTESTED_AFTER_LATEST_STATUS_SEARCH")) {
      const strict = consensusStrength(items, highRisk);
      if (!(strict.lineages >= 3 && strict.qualified_publishers >= (highRisk ? 2 : 1))) continue;
      if (status === "CURRENT") {
        return {
          status: "CURRENT",
          method: "UNCONTESTED_CURRENT_STATE_SUPPORT",
          confidence_tier: "MODERATE",
          rationale: "Independent sources, including classified publishers, state the claimed present state; a search for its latest status found no source saying it has changed, and no assessed source contradicts it.",
          items,
          signals: signalsFor(items)
        };
      }
      const pastState = items.some(x => ["CHANGE_NOTICE", "HISTORICAL_RECORD", "EVENT_REPORT"].includes(x.semanticSource?.temporal_role));
      return {
        status: pastState ? "SUPERSEDED" : "CONTRADICTED",
        method: "UNCONTESTED_CURRENT_STATE_CONTRADICTION",
        confidence_tier: "MODERATE",
        rationale: pastState
          ? "Independent sources, including classified publishers, describe the claimed state as past, a search for the latest status found no source supporting it, and no assessed source supports it. The claim describes a state that no longer holds."
          : "Independent sources, including classified publishers, state that the claimed present state is not the case, a search for the latest status found no source supporting it, and no assessed source supports it.",
        items,
        signals: signalsFor(items)
      };
    }
    // v0.2.91: for a present-state claim, independent sources that document a
    // change away from the claimed state mean the claim was overtaken.
    const documentedChange = status === "CONTRADICTED" && frame === "CURRENT_STATE"
      && items.some(x => x.semanticSource?.temporal_role === "CHANGE_NOTICE");
    if (documentedChange) {
      return {
        status: "SUPERSEDED",
        method: "DOCUMENTED_CHANGE_CONSENSUS",
        confidence_tier: "MODERATE",
        rationale: "Independent sources document a change away from the claimed state, a search for later developments found no source supporting the claim again, and no assessed source supports it. The claim describes a state that has since changed.",
        items,
        signals: signalsFor(items, dissent ? { minority_dissent_domains: dissent.opposition.map(x => hostOf(x.source.url)) } : {})
      };
    }
    return {
      status,
      method: persistence ? "CURRENT_STATE_PERSISTENCE_CONSENSUS" : "INDEPENDENT_SOURCE_CONSENSUS",
      confidence_tier: "MODERATE",
      rationale: persistence
        ? (status === "CURRENT"
          ? "Independent sources agree on the claimed present state; some are older or undated, but a search for later changes found none. The state could still have changed very recently."
          : "Independent sources agree on a different present state; some are older or undated, and a search for later changes found none supporting the claim.")
        : (status === "CURRENT"
          ? "Independent sources from separate publishers directly and exactly support the claim, and no assessed source contradicts it."
          : "Independent sources from separate publishers directly and exactly contradict the claim, and no assessed source supports it."),
      items,
      signals: signalsFor(items, dissent ? { minority_dissent_domains: dissent.opposition.map(x => hostOf(x.source.url)) } : {})
    };
  }
  return null;
}

export function adjudicateEvidence({
  claim,
  claimComponents = [],
  sources = [],
  semanticAssessment = null,
  domainResult = null,
  crossSourceConflicts = [],
  retrievalCount = 0,
  now = Date.now(),
  maxEvidenceAgeDays = 180,
  temporalSensitive = true,
  claimFrame = null,
  changeSearchPerformed = false,
  normativeSpecification = false,
  originatingIssuer = false
} = {}) {
  const materialComponents = Array.isArray(claimComponents) ? claimComponents : [];
  const evidenceFrame = claimFrame?.frame || null;
  // v0.2.90: scheduled plans and mixed-time claims are checked against
  // evidence like current states (recent evidence required); only opinions,
  // open forecasts and unresolvable relative dates are not adjudicated.
  const requireRecentEvidence = evidenceFrame
    ? ["CURRENT_STATE", "SCHEDULED_FUTURE", "MIXED_OR_AMBIGUOUS"].includes(evidenceFrame)
    : !!temporalSensitive;
  if (evidenceFrame === "NON_FACTUAL") {
    return {
      status: "UNVERIFIABLE",
      method: "NOT_A_FACTUAL_CLAIM",
      rationale: "The statement is an opinion, value judgement or recommendation; evidence can inform it but cannot make it true or false.",
      evidence: [],
      confidence_tier: "NOT_APPLICABLE",
      adjudication_signals: { claim_frame: evidenceFrame, review_reason: "NON_FACTUAL" }
    };
  }
  if (evidenceFrame === "SCHEDULED_FUTURE" && isOpenForecast(claim)) {
    return {
      status: "UNVERIFIABLE",
      method: "FUTURE_OUTCOME_NOT_VERIFIABLE",
      rationale: "The statement predicts an uncertain future outcome; no present evidence can establish it. Scheduled plans and announcements, by contrast, are checked against evidence.",
      evidence: [],
      confidence_tier: "NOT_APPLICABLE",
      adjudication_signals: { claim_frame: evidenceFrame, review_reason: "OPEN_FORECAST" }
    };
  }
  if (evidenceFrame === "UNRESOLVED") {
    return {
      status: "NEEDS_REVIEW",
      method: "CLAIM_FRAME_REQUIRES_REVIEW",
      rationale: "The claim's time reference could not be resolved safely; no decisive verdict was inferred.",
      evidence: [],
      adjudication_signals: { claim_frame: evidenceFrame, review_reason: "CLAIM_FRAME_NOT_DECISIVE" }
    };
  }
  // v0.2.90: when the model calls a claim compound but no separable parts
  // exist, the label is advisory: single-source shortcuts are disabled and
  // only multi-source corroboration can decide.
  const modelClassifiesCompound = semanticAssessment?.claim_assessment?.claim_type === "COMPOUND";
  const modelOnlyCompound = modelClassifiesCompound && materialComponents.length < 2;
  if (materialComponents.length > 1) {
    const componentAssessment = completeAssessment(semanticAssessment, Array.isArray(sources) ? sources.length : 0, materialComponents);
    const covered = new Map();
    const eligibleSource = (source) => source?.relevance_assessment?.relevance === "HIGH"
      && ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL", "SECONDARY_REPUTABLE"].includes(source?.source_reliability)
      && Boolean(hostOf(source?.url))
      && (!requireRecentEvidence || recentDated(source, now, maxEvidenceAgeDays));
    if (componentAssessment) {
      for (let componentId = 1; componentId <= materialComponents.length; componentId++) {
        const relationsForComponent = [];
        for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
          const relation = componentAssessment.componentByPair.get(`${componentId}:${sourceIndex}`);
          if (eligibleSource(sources[sourceIndex]) && DECISIVE_RELATIONS.has(relation)) relationsForComponent.push(relation);
        }
        covered.set(componentId, relationsForComponent);
      }
    }
    const missing = materialComponents.map((_, index) => index + 1)
      .filter(componentId => !covered.has(componentId) || covered.get(componentId).length === 0);
    const allComponentRelations = [...covered.values()].flat();
    const mixed = new Set(allComponentRelations).size > 1
      || [...covered.values()].some(relations => new Set(relations).size > 1);
    if (!componentAssessment || missing.length || mixed) {
      return {
        status: "NEEDS_REVIEW",
        method: "SEMANTIC_COMPONENT_COVERAGE_GATE",
        rationale: "A compound claim cannot receive a decisive verdict until every material component is linked to evidence eligible under its claim-frame validity policy with no unresolved component-level polarity conflict.",
        evidence: [],
        adjudication_signals: {
          semantic_component_assessment_complete: Boolean(componentAssessment),
          components_total: materialComponents.length,
          components_covered: materialComponents.length - missing.length,
          uncovered_component_ids: missing,
          component_polarity_conflict: mixed,
          review_reason: !componentAssessment ? "SEMANTIC_COMPONENT_COVERAGE_GAP" : mixed ? "CONFLICTING_COMPONENT_EVIDENCE" : "INSUFFICIENT_COMPONENT_EVIDENCE"
        }
      };
    }
  }
  // A specialist may issue a decisive verdict only when its evidence is bound
  // to the exact, already-eligible source objects selected by the core pipeline.
  // Adapter-specific parsing/date rules remain intact; this boundary prevents
  // detached, untrusted, stale, or non-primary URLs from bypassing core gates.
  if (domainResult?.status && ["CURRENT", "SUPERSEDED", "CONTRADICTED", "UNVERIFIABLE", "NEEDS_REVIEW", "NOT_TIME_SENSITIVE"].includes(domainResult.status)) {
    const decisive = ["CURRENT", "SUPERSEDED", "CONTRADICTED"].includes(domainResult.status);
    const evidence = domainResult.evidence || null;
    const evidenceUrls = [
      evidence?.source?.url,
      ...(Array.isArray(evidence?.supporting_sources) ? evidence.supporting_sources.map(item => item?.url) : [])
    ].filter(Boolean);
    const eligibleByUrl = new Map((Array.isArray(sources) ? sources : []).map(source => [source.url, source]));
    const boundSources = evidenceUrls.map(url => eligibleByUrl.get(url));
    // v0.2.82: retrieval time alone never validates adapter evidence. Only a
    // publication date, a validated editorial update, or an adapter-declared
    // structurally validated first-party live listing (named, narrow exception)
    // can satisfy the 365-day window; the basis is recorded for audit.
    const boundRecency = boundSources.map(source => source ? evidenceRecency(source, { now, maxAgeDays: 365, allowLiveObservation: true }) : null);
    const sourceDatesValid = boundSources.length > 0 && boundRecency.every(item => item?.is_recent);
    const isValidatedPythonHistoricalRecord = source => {
      if (source?.evidence_kind !== "OFFICIAL_PYTHON2_SUNSET_NOTICE"
        || source?.historical_record_semantics !== "AUTHORITATIVE_HISTORICAL_EVENT_RECORD"
        || source?.historical_record_validation !== "PYTHON2_SUNSET_VALIDATED_CONTENT_V1"
        || source?.event_date_candidate !== "2020-01-01"
        || !["OFFICIAL_SUNSET_STATEMENT", "PEP_373_END_OF_LIFE_DATE"].includes(source?.event_date_basis)
        || !["DIRECT_FIRST_PARTY_FETCH", "DIRECT_FIRST_PARTY_PEP", "TAVILY_INDEXED_FIRST_PARTY_PAGE"].includes(source?.acquisition_method)
        || (source?.acquisition_method === "TAVILY_INDEXED_FIRST_PARTY_PAGE"
          ? source?.evidence_origin !== "SPECIALIST_SEARCH_INDEX"
          : source?.evidence_origin !== "SPECIALIST_DIRECT_ACQUISITION")) return false;
      try {
        const url = new URL(source.url);
        const host = url.hostname.toLowerCase();
        const path = url.pathname.toLowerCase();
        return ((host === "python.org" || host === "www.python.org") && path.startsWith("/doc/sunset-python-2"))
          || (host === "peps.python.org" && path === "/pep-0373/")
          || (host === "docs.python.org" && path === "/3/howto/pyporting.html");
      } catch { return false; }
    };
    const historicalEventRecordValid = decisive
      && evidence?.method === "OFFICIAL_PYTHON_ORG_SUNSET_NOTICE"
      && evidence?.historical_record_semantics === "AUTHORITATIVE_HISTORICAL_EVENT_RECORD"
      && evidence?.historical_record_validation === "PYTHON2_SUNSET_VALIDATED_CONTENT_V1"
      && evidence?.event_date === "2020-01-01"
      && evidence?.source?.historical_record_validation === "PYTHON2_SUNSET_VALIDATED_CONTENT_V1"
      && evidence?.source?.event_date_candidate === evidence.event_date
      && boundSources.length === 1
      && boundSources.every(source => isValidatedPythonHistoricalRecord(source));
    const sourceQualityValid = boundSources.length > 0 && boundSources.every(source =>
      source?.relevance_assessment?.relevance === "HIGH"
      && ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL"].includes(source?.source_reliability)
      && Boolean(hostOf(source.url))
    );
    // v0.2.84: the adapter gate follows the same frame-aware validity policy as
    // the generic path. Recency is required only for CURRENT_STATE claims (or
    // when no frame is known); a time-anchored event, a past state or a stable
    // fact is not invalidated by the age of its authoritative record.
    const adapterFrameExemptFromRecency = Boolean(evidenceFrame) && evidenceFrame !== "CURRENT_STATE";
    const temporalEvidenceValid = sourceDatesValid || historicalEventRecordValid || adapterFrameExemptFromRecency;
    const domainEvidenceValidated = !decisive || (
      evidenceUrls.length > 0
      && boundSources.length === evidenceUrls.length
      && temporalEvidenceValid
      && sourceQualityValid
    );
    if (domainEvidenceValidated) {
      return {
        status: domainResult.status,
        method: "DOMAIN_SPECIFIC_RULE",
        rationale: historicalEventRecordValid
          ? "The result is bound to a validated first-party historical event record. Its event date is not treated as publication freshness."
          : "A narrowly scoped domain adapter supplied an explicit result bound to eligible, dated recent primary or institutional evidence.",
        evidence,
        adjudication_signals: {
          semantic_relations: "ADVISORY_ONLY",
          domain_evidence_bound_to_core_sources: true,
          domain_evidence_temporal_basis: historicalEventRecordValid ? "VALIDATED_HISTORICAL_EVENT_RECORD" : "DATED_CURRENT_EVIDENCE",
          domain_evidence_event_date: historicalEventRecordValid ? evidence.event_date : null,
          domain_evidence_recency: boundRecency.map(item => item && { recency_date: item.recency_date, recency_basis: item.recency_basis, freshness_applicable: !historicalEventRecordValid && !adapterFrameExemptFromRecency }),
          claim_frame_recency_policy: adapterFrameExemptFromRecency ? "NOT_REQUIRED_FOR_" + evidenceFrame : "REQUIRED_365_DAYS_OR_VALIDATED_RECORD"
        }
      };
    }
    return {
      status: "NEEDS_REVIEW",
      method: "DOMAIN_ADAPTER_EVIDENCE_GATE",
      rationale: "The specialist result was withheld because its decisive evidence was missing, detached from eligible retrieved sources, insufficiently recent, or not primary/institutional.",
      evidence,
      adjudication_signals: {
        semantic_relations: "ADVISORY_ONLY",
        domain_evidence_bound_to_core_sources: false,
        domain_evidence_url_count: evidenceUrls.length,
        domain_evidence_bound_source_count: boundSources.filter(Boolean).length,
        domain_evidence_recency: boundRecency.map(item => item && { recency_date: item.recency_date, recency_basis: item.recency_basis, explanation: item.explanation })
      }
    };
  }
  // A lexical LOCAL_RULES fallback is not a semantic relation assessment.
  // Never let co-occurring entity/year/action tokens produce a decisive verdict.
  if (semanticAssessment?.provider === "LOCAL_RULES") {
    return {
      status: "NEEDS_REVIEW",
      method: "SEMANTIC_PROVIDER_UNAVAILABLE",
      rationale: "The semantic provider was unavailable; local lexical anchors are non-decisive review leads and cannot establish entailment.",
      evidence: [],
      adjudication_signals: {
        semantic_assessment_status: semanticAssessment?.status || "LOCAL_RULES",
        semantic_provider: "LOCAL_RULES",
        review_reason: "MODEL_UNAVAILABLE"
      }
    };
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    const attempted = Number.isFinite(retrievalCount) && retrievalCount > 0;
    return {
      status: attempted ? "NEEDS_REVIEW" : "UNVERIFIABLE",
      method: attempted ? "RETRIEVAL_REQUIRES_REVIEW" : "INSUFFICIENT_EVIDENCE",
      rationale: attempted
        ? "Evidence retrieval returned leads, but none passed the source eligibility gate; no factual verdict was inferred."
        : "No evidence sources were retrieved; no factual verdict was inferred.",
      evidence: [],
      adjudication_signals: { dated_sources: 0, independent_domains: 0, temporal_sensitive: !!temporalSensitive, retrieval_candidates: retrievalCount }
    };
  }

  const relations = completeAssessment(semanticAssessment, sources.length, materialComponents);
  const assessed = sources.map((source, index) => ({
    source, index, relation: relations?.byIndex.get(index) || "UNASSESSED",
    semanticSource: relations?.sourceByIndex.get(index) || null
  }));
  const temporalSupersession = adjudicateTemporalSupersession({
    claim, sources, relations, temporalSensitive: evidenceFrame ? evidenceFrame === "CURRENT_STATE" : temporalSensitive, frameIsCurrentState: evidenceFrame === "CURRENT_STATE", now
  });
  if (temporalSupersession) return temporalSupersession;
  const reviewCandidates = assessed.filter(x =>
    ["HIGH", "MEDIUM"].includes(x.source?.relevance_assessment?.relevance) && hostOf(x.source.url)
  );
  // Only HIGH relevance can support a generic verdict. MEDIUM relevance is
  // retained as a review lead so strict domain filtering does not erase retrieval.
  const eligible = reviewCandidates.filter(x => x.source?.relevance_assessment?.relevance === "HIGH");
  const qualified = eligible.filter(x =>
    ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL", "SECONDARY_REPUTABLE"].includes(x.source.source_reliability)
    && authorityQualified(x)
    && scopeQualified(x)
    && (!requireRecentEvidence || recentDated(x.source, now, maxEvidenceAgeDays) || liveIssuerRecord(x, now, maxEvidenceAgeDays))
  );
  const supporting = qualified.filter(x => x.relation === "SUPPORTS");
  const contradicting = qualified.filter(x => x.relation === "CONTRADICTS");
  // v0.2.84 telemetry: the exact gate each source passed or failed, produced
  // by the same predicates that adjudicate (no post-hoc reconstruction).
  const qualifiedSet = new Set(qualified.map(x => x.index));
  const source_trace = assessed.map(x => {
    const reasons = [];
    if (!hostOf(x.source?.url)) reasons.push("INVALID_URL");
    const relevance = x.source?.relevance_assessment?.relevance || "UNASSESSED";
    if (relevance !== "HIGH") reasons.push("RELEVANCE_" + relevance);
    if (!["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL", "SECONDARY_REPUTABLE"].includes(x.source?.source_reliability)) reasons.push("RELIABILITY_" + (x.source?.source_reliability || "UNKNOWN"));
    if (!authorityQualified(x)) reasons.push("FIRST_PARTY_NOT_CONFIRMED_AS_ORIGINATING");
    if (!scopeQualified(x)) reasons.push("SCOPE_NO_MATCH");
    const liveRecord = requireRecentEvidence && liveIssuerRecord(x, now, maxEvidenceAgeDays);
    if (requireRecentEvidence && !recentDated(x.source, now, maxEvidenceAgeDays) && !liveRecord) reasons.push("NOT_RECENT_FOR_CURRENT_STATE");
    if (x.relation === "UNASSESSED") reasons.push("NO_SEMANTIC_RELATION");
    const eligibleSource = qualifiedSet.has(x.index);
    return {
      index: x.index,
      registrable_domain: hostOf(x.source?.url),
      reliability: x.source?.source_reliability || null,
      reliability_basis: x.source?.reliability_basis || null,
      evidence_origin: x.source?.evidence_origin || null,
      relevance,
      relation: x.relation,
      scope_match: x.semanticSource?.scope_match || null,
      authority_role: x.semanticSource?.authority_role || null,
      eligible: eligibleSource,
      live_issuer_record: Boolean(liveRecord),
      contribution: eligibleSource
        ? (x.relation === "SUPPORTS" ? "SUPPORTS_ELIGIBLE" : x.relation === "CONTRADICTS" ? "CONTRADICTS_ELIGIBLE" : "ELIGIBLE_" + x.relation)
        : "EXCLUDED:" + (reasons[0] || "NOT_QUALIFIED"),
      exclusion_reasons: eligibleSource ? [] : reasons
    };
  });
  const scopeConflict = crossSourceConflicts.some(item => String(item.signal || "").includes("SCOPE"));
  const mixed = scopeConflict || qualified.some(x => x.relation === "MIXED")
    || (supporting.length > 0 && contradicting.length > 0);
  const supportHosts = uniqueHosts(supporting.map(x => x.source));
  const contradictHosts = uniqueHosts(contradicting.map(x => x.source));
  const qualifiedHosts = uniqueHosts(qualified.map(x => x.source));
  const lexicalGuard = independentSingleSourceDisqualifier(claim);
  const allRelations = relations ? [...relations.byIndex.values()] : [];
  const allEvidenceMixed = allRelations.includes("MIXED")
    || (allRelations.includes("SUPPORTS") && allRelations.includes("CONTRADICTS"));
  const signals = {
    source_trace,
    claim_frame: evidenceFrame,
    recency_required: requireRecentEvidence,
    temporal_sensitive: !!temporalSensitive,
    semantic_assessment_complete: Boolean(relations),
    semantic_assessment_status: semanticAssessment?.status || "UNAVAILABLE",
    qualified_sources: qualified.length,
    qualified_high_relevance_sources: qualified.length,
    independent_qualified_domains: qualifiedHosts.size,
    cross_source_conflict_candidates: crossSourceConflicts.length,
    independent_supporting_domains: supportHosts.size,
    independent_contradicting_domains: contradictHosts.size,
    semantic_mixed_evidence: mixed,
    lexical_conflict_candidates: crossSourceConflicts.length,
    lexical_conflicts_are_non_decisive: true,
    publication_and_event_dates_separate: true,
    single_source_lexical_guard: lexicalGuard,
    single_source_mixed_relations_detected: allEvidenceMixed,
    direct_page_evidence_sources: sources.filter(source => source?.evidence_origin === "DIRECT_PAGE_PASSAGES").length,
    first_party_sources_not_confirmed_as_originating: eligible.filter(x => x.source?.reliability_basis === "FIRST_PARTY_ENTITY_DOMAIN" && !authorityQualified(x)).length,
    scope_mismatched_sources: eligible.filter(x => !scopeQualified(x)).length
  };

  // One primary source is sufficient only for a narrow, low-risk proposition
  // when the model's structured assessment says it is direct and exact-scope.
  // The model does not establish publisher reliability: that remains URL-gated below.
  // v0.2.84: a deterministic TIME_ANCHORED_EVENT frame (a dated, completed,
  // discrete event) is an alternative to the model's LOW-risk record/event
  // typing, unless the model rates the claim HIGH risk. Every source-level
  // condition below is unchanged.
  const boundedEventFrame = evidenceFrame === "TIME_ANCHORED_EVENT" && relations?.claimAssessment?.claim_risk !== "HIGH";
  const singleSourceEligible = relations
    && ((relations.claimAssessment?.claim_risk === "LOW"
      && ["INSTITUTIONAL_RECORD", "HISTORICAL_EVENT", "ATTRIBUTED_RESEARCH_RESULT"].includes(relations.claimAssessment?.claim_type))
      || boundedEventFrame)
    && !lexicalGuard.dynamic && !lexicalGuard.high_impact && !lexicalGuard.compound && !modelOnlyCompound
    && qualified.length === 1
    && qualified[0].semanticSource?.directness === "DIRECT"
    && qualified[0].semanticSource?.scope_match === "EXACT"
    && ((qualified[0].semanticSource?.authority_role === "ORIGINATING_AUTHORITY"
      && qualified[0].source.source_reliability === "PRIMARY_OR_OFFICIAL_DOMAIN")
      || (qualified[0].semanticSource?.authority_role === "PRIMARY_RESEARCH"
        && ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL"].includes(qualified[0].source.source_reliability)))
    && !mixed && !allEvidenceMixed;
  if (singleSourceEligible && supporting.length === 1) {
    return {
      status: "CURRENT",
      method: "SINGLE_AUTHORITATIVE_PRIMARY_EVIDENCE",
      rationale: "A single eligible, high-relevance primary source directly addresses the exact scope of a narrow, low-risk claim. This exception does not apply to broad consensus, contested, compound, or dynamic current-state claims.",
      evidence: supporting.map(x => evidenceItem(x.source, x.relation, x.index)),
      adjudication_signals: { ...signals, single_source_exception: true, single_source_basis: boundedEventFrame ? "TIME_ANCHORED_EVENT_FRAME" : "LOW_RISK_RECORD_TYPE", claim_type: relations.claimAssessment.claim_type, claim_risk: relations.claimAssessment.claim_risk }
    };
  }
  if (singleSourceEligible && contradicting.length === 1) {
    return {
      status: "CONTRADICTED",
      method: "SINGLE_AUTHORITATIVE_PRIMARY_EVIDENCE",
      rationale: "A single recent, high-relevance primary source directly contradicts the exact scope of a narrow, low-risk claim. This exception does not apply to broad consensus, contested, compound, or dynamic current-state claims.",
      evidence: contradicting.map(x => evidenceItem(x.source, x.relation, x.index)),
      adjudication_signals: { ...signals, single_source_exception: true, single_source_basis: boundedEventFrame ? "TIME_ANCHORED_EVENT_FRAME" : "LOW_RISK_RECORD_TYPE", claim_type: relations.claimAssessment.claim_type, claim_risk: relations.claimAssessment.claim_risk }
    };
  }
  // v0.2.84: a current-state claim settled by the originating authority's live
  // record. Requires every decisive qualified source to agree, no mixed or
  // conflicting relation among any assessed source, a non-compound claim, and
  // at least one live issuer record among the agreeing sources.
  const liveRecords = qualified.filter(x => liveIssuerRecord(x, now, maxEvidenceAgeDays));
  const liveIssuerEligible = requireRecentEvidence && relations && liveRecords.length > 0
    && !mixed && !allEvidenceMixed && !lexicalGuard.compound;
  if (liveIssuerEligible && (supporting.length > 0) !== (contradicting.length > 0)
    && liveRecords.every(x => x.relation === (supporting.length ? "SUPPORTS" : "CONTRADICTS"))) {
    const agreeing = supporting.length ? supporting : contradicting;
    return {
      status: supporting.length ? "CURRENT" : "CONTRADICTED",
      method: "LIVE_ISSUER_RECORD",
      rationale: supporting.length
        ? "The originating authority's own current record, fetched during this verification, directly states the claimed present state, and no assessed source conflicts with it."
        : "The originating authority's own current record, fetched during this verification, directly states a different present state, and no assessed source supports the claim.",
      evidence: agreeing.map(x => evidenceItem(x.source, x.relation, x.index)),
      adjudication_signals: { ...signals, live_issuer_records: liveRecords.map(x => hostOf(x.source.url)), observation_time_is_retrieval_time: true }
    };
  }
  // v0.3.20 normative specification rule (rollout switch NORMATIVE_SPEC_MODE):
  // a claim about what a published standard specifies is settled by the
  // standard's own official text when every condition holds: the claim is not
  // a current-state, scheduled or mixed-time claim, not dynamic and not
  // compound; the standard was fetched directly from its issuer's host and is
  // not marked obsoleted, superseded or withdrawn; the model found it DIRECT,
  // EXACT scope and the originating or primary authority; every such standard
  // agrees; and no qualified source takes the opposite or a mixed position,
  // with no mixed relation among any assessed source.
  const specifications = normativeSpecification && relations && !requireRecentEvidence
    && !lexicalGuard.dynamic && !lexicalGuard.compound && !modelOnlyCompound && !mixed && !allEvidenceMixed
    ? qualified.filter(normativeSpecificationSource) : [];
  if (specifications.length > 0) {
    const relation = specifications[0].relation;
    const opposing = relation === "SUPPORTS" ? contradicting : supporting;
    if (specifications.every(x => x.relation === relation) && opposing.length === 0) {
      const agreeing = relation === "SUPPORTS" ? supporting : contradicting;
      return {
        status: relation === "SUPPORTS" ? "CURRENT" : "CONTRADICTED",
        method: "NORMATIVE_SPECIFICATION",
        rationale: relation === "SUPPORTS"
          ? "The official text of the published standard the claim is about directly states what the claim says, and no qualified source disagrees."
          : "The official text of the published standard the claim is about directly contradicts the claim, and no qualified source supports it.",
        evidence: agreeing.map(x => evidenceItem(x.source, x.relation, x.index)),
        adjudication_signals: { ...signals, normative_specifications: specifications.map(x => hostOf(x.source.url)) }
      };
    }
  }
  // v0.3.21 originating issuer rule (rollout switch ISSUER_AUTHORITY_MODE):
  // one official source that is the issuer of the stated fact settles the
  // claim in any field when: the claim is not contested, a scientific
  // consensus or compound; the source was fetched directly, passed every
  // qualification gate (including recency for current-state claims), and the
  // model found it DIRECT, EXACT scope and the originating authority; every
  // issuer source agrees; no qualified source takes the opposite position;
  // and no assessed source at all is mixed or opposed.
  const issuerClaimType = relations?.claimAssessment?.claim_type || null;
  const issuers = originatingIssuer && relations && !mixed && !allEvidenceMixed
    && !lexicalGuard.compound && !modelOnlyCompound
    && !["CONTESTED", "SCIENTIFIC_CONSENSUS", "COMPOUND"].includes(issuerClaimType)
    ? qualified.filter(x => originatingIssuerSource(x, claim, issuerClaimType)) : [];
  if (issuers.length > 0) {
    const relation = issuers[0].relation;
    const opposing = relation === "SUPPORTS" ? contradicting : supporting;
    if (issuers.every(x => x.relation === relation) && opposing.length === 0) {
      const agreeing = relation === "SUPPORTS" ? supporting : contradicting;
      return {
        status: relation === "SUPPORTS" ? "CURRENT" : "CONTRADICTED",
        method: "ORIGINATING_ISSUER",
        rationale: relation === "SUPPORTS"
          ? "The body that itself issued or holds the stated fact confirms it in its own official source, and no assessed source disagrees."
          : "The body that itself issued or holds the stated fact states otherwise in its own official source, and no assessed source supports the claim.",
        evidence: agreeing.map(x => evidenceItem(x.source, x.relation, x.index)),
        adjudication_signals: { ...signals, originating_issuers: issuers.map(x => hostOf(x.source.url)), claim_type: issuerClaimType }
      };
    }
  }
  // Narrow corroboration by reputable secondary publishers; no single-source shortcut.
  const secondaryOnlyEligible = (items) => {
    const allowedClaim = ((relations?.claimAssessment?.claim_risk === "LOW"
      && ["HISTORICAL_EVENT", "INSTITUTIONAL_RECORD", "ATTRIBUTED_RESEARCH_RESULT"].includes(relations?.claimAssessment?.claim_type))
      || boundedEventFrame)
      && !lexicalGuard.dynamic && !lexicalGuard.high_impact && !lexicalGuard.compound && !allEvidenceMixed;
    const distinct = new Map(items.map(x => [registrableDomain(x.source.url), x]));
    return allowedClaim && distinct.size >= 2 && independentLineages(items.map(x => x.source)).length >= 2 && [...distinct.values()].every(x =>
      x.source.source_reliability === "SECONDARY_REPUTABLE"
      && x.semanticSource?.directness === "DIRECT"
      && x.semanticSource?.scope_match === "EXACT"
      && x.semanticSource?.authority_role === "SECONDARY"
    );
  };
  const hasSufficientCorroboration = items => {
    const primaryHosts = uniqueHosts(items.filter(x =>
      ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL"].includes(x.source.source_reliability)).map(x => x.source));
    if (primaryHosts.size >= 2) return true;
    const allHosts = uniqueHosts(items.map(x => x.source));
    const hasPrimaryOrInstitutional = items.some(x =>
      ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL"].includes(x.source.source_reliability));
    return allHosts.size >= 2 && hasPrimaryOrInstitutional || secondaryOnlyEligible(items);
  };
  if (relations && !mixed && hasSufficientCorroboration(contradicting)) {
    const secondary = secondaryOnlyEligible(contradicting);
    return {
      status: "CONTRADICTED",
      method: secondary ? "CORROBORATED_REPUTABLE_SECONDARY_EVIDENCE" : "CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE",
      rationale: secondary
        ? "Two independent curated secondary publishers directly match the exact scope of a narrow, low-risk historical/record claim."
        : "Two independent, eligible, high-relevance primary/institutional domains were semantically assessed as contradicting the exact claim.",
      evidence: contradicting.map(x => evidenceItem(x.source, x.relation, x.index)),
      adjudication_signals: signals
    };
  }
  if (relations && !mixed && hasSufficientCorroboration(supporting)) {
    const secondary = secondaryOnlyEligible(supporting);
    return {
      status: "CURRENT",
      method: secondary ? "CORROBORATED_REPUTABLE_SECONDARY_EVIDENCE" : "CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE",
      rationale: secondary
        ? "Two independent curated secondary publishers directly match the exact scope of a narrow, low-risk historical/record claim."
        : "Two independent, eligible, high-relevance primary/institutional domains were semantically assessed as supporting the exact claim.",
      evidence: supporting.map(x => evidenceItem(x.source, x.relation, x.index)),
      adjudication_signals: signals
    };
  }

  // -------------------------------------------------------------------------
  const consensusTrace = {};
  // v0.2.90 graded evidence: MODERATE-confidence verdicts from independent
  // agreement. Every rule still requires a semantic relation, EXACT scope, a
  // non-UNCLEAR directness, HIGH relevance and independent lineages, and is
  // blocked by any opposing assessed source. Verdicts carry confidence_tier.
  // -------------------------------------------------------------------------
  if (relations) {
    const graded = gradedConsensus({
      assessed, claimFrame, requireRecentEvidence, now, maxEvidenceAgeDays, changeSearchPerformed,
      claimRisk: relations.claimAssessment?.claim_risk, lexicalGuard, trace: consensusTrace
    });
    if (graded) {
      return {
        ...graded,
        evidence: graded.items.map(x => evidenceItem(x.source, x.relation, x.index)),
        adjudication_signals: { ...signals, ...graded.signals }
      };
    }
  }

  const hasPotentialEvidence = reviewCandidates.length > 0 || (sources.length === 0 && retrievalCount > 0);
  const status = hasPotentialEvidence ? "NEEDS_REVIEW" : "UNVERIFIABLE";
  return {
    status,
    method: "CONSERVATIVE_EVIDENCE_ADJUDICATION",
    rationale: status === "UNVERIFIABLE"
      ? "No usable evidence was obtained; no truth verdict is inferred."
      : !relations
        ? "Semantic assessment was missing, incomplete, duplicated, or invalid, including the claim-risk and source-role metadata; no generic verdict was issued."
        : "Evidence did not meet the claim-specific sufficiency threshold or contained mixed semantic relations. Search relevance and lexical conflict candidates are not proof.",
    evidence: reviewCandidates.map(x => evidenceItem(x.source, x.relation, x.index)),
    adjudication_signals: Object.keys(consensusTrace).length ? { ...signals, consensus_trace: consensusTrace } : signals
  };
}
