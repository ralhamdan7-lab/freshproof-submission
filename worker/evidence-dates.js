// FreshProof v0.2.82 — single source of truth for evidence-date semantics.
//
// Four dates are kept distinct and are never substituted for one another:
//   event date        — when the claimed fact happened (claim/passage level)
//   publication date  — when the source was first published
//   editorial update  — a later, page-declared modification of the same document
//   retrieval time    — when FreshProof fetched it
//
// Rules enforced here:
//   1. Retrieval time never establishes freshness.
//   2. An update date counts only when it is page-declared editorial metadata
//      (not an HTTP Last-Modified header, not a search-provider guess), is
//      not the retrieval day (render-time stamps), is not before publication,
//      is not in the future, and the same fetched page yielded claim-relevant
//      passages (validity and relevance established).
//   3. The latest date is NOT chosen blindly; the basis of the chosen date is
//      always reported with an explanation.
//   4. Narrow, named exception: only explicitly marked, structurally validated,
//    directly fetched live first-party observations may use retrieval time as
//    an observation timestamp. Historical records, indexed snippets and static
//    pricing articles are never live observations.

const DAY = 86400000;
const LIVE_OBSERVATION_MAX_AGE_MS = 15 * 60 * 1000;

function isValidatedLiveObservationSource(source, now) {
  if (source?.observation_semantics !== "LIVE_STRUCTURED_OBSERVATION"
    || source?.evidence_origin !== "SPECIALIST_DIRECT_ACQUISITION"
    || source?.source_reliability !== "PRIMARY_OR_OFFICIAL_DOMAIN") return false;
  const retrieved = parseEvidenceDate(source?.retrieved_at || "");
  if (retrieved === null || retrieved > now || now - retrieved > LIVE_OBSERVATION_MAX_AGE_MS) return false;
  let url;
  try { url = new URL(source.url); } catch { return false; }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (url.protocol !== "https:" || url.username || url.password || url.port || host !== "whitehouse.gov") return false;
  if (source.evidence_kind === "OFFICIAL_LIVE_ADMINISTRATION_DIRECTORY") {
    return source.observation_validation === "WHITE_HOUSE_ADMINISTRATION_DIRECTORY_PARSE_V1"
      && (url.pathname.toLowerCase() === "/administration" || url.pathname.toLowerCase().startsWith("/administration/"));
  }
  if (source.evidence_kind === "FIRST_PARTY_OFFICIAL_SOCIAL_ACCOUNT_LINK") {
    const pageText = String(source.content || "") + " " + String(source.snippet || "");
    return source.observation_validation === "WHITE_HOUSE_FIRST_PARTY_X_LINK_V1"
      && url.pathname === "/"
      && source.linked_account === "https://x.com/whitehouse"
      && /https:\/\/x\.com\/whitehouse\/?(?:[\s"'<>?#]|$)/i.test(pageText);
  }
  return false;
}

export const LIVE_STRUCTURED_OBSERVATION_KINDS = Object.freeze(new Set([
  "OFFICIAL_LIVE_ADMINISTRATION_DIRECTORY",
  "FIRST_PARTY_OFFICIAL_SOCIAL_ACCOUNT_LINK"
]));

export function parseEvidenceDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T[0-9:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value.trim())) return null;
  const trimmed = value.trim();
  const [y, m, d] = trimmed.slice(0, 10).split("-").map(Number);
  const dayStart = Date.UTC(y, m - 1, d);
  const check = new Date(dayStart);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  if (trimmed.length === 10) return dayStart;
  const parsed = Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed) ? trimmed : trimmed + "Z");
  return Number.isFinite(parsed) ? parsed : dayStart;
}

const isoDay = ms => new Date(ms).toISOString().slice(0, 10);

/**
 * Assess whether an editorial update date is acceptable as recency evidence.
 * Returns { accepted, date, reason }.
 */
export function assessUpdateDate(source, { now = Date.now() } = {}) {
  const raw = source?.updated_date;
  if (!raw) return { accepted: false, date: null, reason: "NO_UPDATE_DATE" };
  const date = parseEvidenceDate(raw);
  if (date === null) return { accepted: false, date: null, reason: "UPDATE_DATE_INVALID" };
  if (date > now) return { accepted: false, date: isoDay(date), reason: "UPDATE_DATE_IN_FUTURE" };
  if (source.updated_date_basis !== "PAGE_METADATA") return { accepted: false, date: isoDay(date), reason: "UPDATE_DATE_NOT_PAGE_DECLARED" };
  const retrievedDay = String(source.retrieved_at || source.retrieval?.retrieved_at || "").slice(0, 10);
  if (retrievedDay && isoDay(date) === retrievedDay) return { accepted: false, date: isoDay(date), reason: "UPDATE_DATE_EQUALS_RETRIEVAL_DAY" };
  const published = parseEvidenceDate(source.published_date || "");
  if (published !== null && date < published - DAY / 2) return { accepted: false, date: isoDay(date), reason: "UPDATE_DATE_BEFORE_PUBLICATION" };
  if (source.evidence_origin !== "DIRECT_PAGE_PASSAGES") return { accepted: false, date: isoDay(date), reason: "UPDATE_NOT_BOUND_TO_RELEVANT_PAGE_CONTENT" };
  return { accepted: true, date: isoDay(date), reason: "PAGE_DECLARED_EDITORIAL_UPDATE_WITH_RELEVANT_CONTENT" };
}

/**
 * The single recency function used by adjudication, adapter gating and
 * abstention diagnosis.
 *
 * @returns {{recency_date: string|null, recency_basis: string, is_recent: boolean,
 *   age_days: number|null, published_date: string|null, update: object,
 *   retrieval_time_ignored: boolean, explanation: string}}
 */
export function evidenceRecency(source, { now = Date.now(), maxAgeDays = 180, allowLiveObservation = false } = {}) {
  const publishedMs = parseEvidenceDate(source?.published_date || "");
  const publicationInFuture = publishedMs !== null && publishedMs > now;
  const published = publishedMs !== null && publishedMs <= now ? publishedMs : null;
  const update = assessUpdateDate(source, { now });
  const recordUpdateMs = parseEvidenceDate(source?.structured_record_update_date || "");
  const recordUpdateDay = recordUpdateMs === null ? null : isoDay(recordUpdateMs);
  const retrievedDay = String(source?.retrieved_at || "").slice(0, 10);
  const structuredRecordUpdateAccepted = source?.evidence_kind === "OFFICIAL_NODEJS_RELEASE_TABLE"
    && source?.structured_record_update_kind === "NODE_RELEASE_ROW_LAST_UPDATED"
    && source?.structured_record_update_verified === true
    && source?.evidence_origin === "SPECIALIST_DIRECT_ACQUISITION"
    && recordUpdateMs !== null
    && recordUpdateMs <= now
    && (!retrievedDay || recordUpdateDay !== retrievedDay)
    && (published === null || recordUpdateMs >= published);
  let recencyMs = null, basis = "UNDATED", explanation;
  if (update.accepted && (published === null || parseEvidenceDate(update.date) > published)) {
    recencyMs = parseEvidenceDate(update.date);
    basis = "EDITORIAL_UPDATE_DATE";
    explanation = `Used the page-declared editorial update date ${update.date}` + (published !== null ? ` (later than publication ${isoDay(published)})` : " (no publication date available)") + "; claim-relevant passages were extracted from the same page.";
  } else if (structuredRecordUpdateAccepted && !publicationInFuture) {
    recencyMs = recordUpdateMs;
    basis = "STRUCTURED_RECORD_UPDATE_DATE";
    explanation = `Used the validated per-record Last updated date ${recordUpdateDay} from a directly fetched official Node.js release row. Retrieval time is not used as freshness evidence.`;
  } else if (allowLiveObservation
    && LIVE_STRUCTURED_OBSERVATION_KINDS.has(source?.evidence_kind)
    && isValidatedLiveObservationSource(source, now)) {
    recencyMs = parseEvidenceDate(source.retrieved_at);
    basis = "LIVE_STRUCTURED_OBSERVATION";
    explanation = `The source's publication date remains recorded separately; the named White House adapter directly fetched and validated ${source.evidence_kind} at ${source.retrieved_at}. The URL, source provenance, structural-validation marker and 15-minute observation window were checked. This is not a publication or editorial-update date.`;
  } else if (published !== null) {
    recencyMs = published;
    basis = "PUBLICATION_DATE";
    explanation = `Used the publication date ${isoDay(published)} (${source.published_date_basis || "basis not recorded"}).` + (update.reason !== "NO_UPDATE_DATE" ? ` An update date was present but not used: ${update.reason}.` : "");
  }
  if (!explanation) explanation = (publicationInFuture ? "The publication date is in the future and was rejected. " : "No publication date and no acceptable editorial update date") + (update.reason !== "NO_UPDATE_DATE" ? ` (update rejected: ${update.reason})` : "") + ". Retrieval time is not evidence of freshness.";
  const ageDays = recencyMs === null ? null : Math.max(0, Math.floor((now - recencyMs) / DAY));
  return {
    recency_date: recencyMs === null ? null : isoDay(recencyMs),
    recency_basis: basis,
    is_recent: recencyMs !== null && recencyMs <= now && now - recencyMs <= (basis === "LIVE_STRUCTURED_OBSERVATION" ? Math.min(maxAgeDays * DAY, LIVE_OBSERVATION_MAX_AGE_MS) : maxAgeDays * DAY),
    age_days: ageDays,
    published_date: published === null ? null : isoDay(published),
    update,
    structured_record_update: {
      accepted: structuredRecordUpdateAccepted,
      date: structuredRecordUpdateAccepted ? recordUpdateDay : null,
      reason: structuredRecordUpdateAccepted ? "VALIDATED_NODE_RELEASE_ROW_LAST_UPDATED" : (source?.evidence_kind === "OFFICIAL_NODEJS_RELEASE_TABLE" && source?.structured_record_update_date ? "STRUCTURED_RECORD_UPDATE_REJECTED" : "NOT_APPLICABLE")
    },
    retrieval_time_ignored: basis !== "LIVE_STRUCTURED_OBSERVATION",
    explanation
  };
}
