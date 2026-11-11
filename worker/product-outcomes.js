const VALID_STATUSES = new Set(["CURRENT", "SUPERSEDED", "CONTRADICTED", "UNVERIFIABLE", "NEEDS_REVIEW", "NOT_TIME_SENSITIVE"]);
const PYTHON_SUNSET_URL = "https://www.python.org/doc/sunset-python-2/";
function canonicalPythonSunsetUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");
    if (url.protocol !== "https:" || !["python.org", "www.python.org"].includes(host) || url.port || path !== "/doc/sunset-python-2") return null;
    return PYTHON_SUNSET_URL;
  } catch { return null; }
}
const isArabic = value => /[\u0600-\u06FF]/.test(String(value || ""));
function safeSourceRef(source) {
  try {
    const url = new URL(source?.url);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return {
      title: String(source.title || url.hostname).slice(0, 240),
      url: url.href,
      publication_date: source.published_date || source.publication_date || null,
      event_date_candidate: source.event_date_candidate || null,
      retrieved_at: source.retrieved_at || null,
      acquisition_method: source.acquisition_method || null,
      source_reliability: source.source_reliability || "UNKNOWN"
    };
  } catch { return null; }
}
function uniqueStrings(values) {
  return [...new Set(values.filter(value => typeof value === "string" && value.trim()).map(value => value.trim()))];
}
export function buildExplanationDetail({ claim, status, adjudication = null, sources = [], domainEvidence = null, retrievalDiagnostics = [] } = {}) {
  const normalizedStatus = VALID_STATUSES.has(status) ? status : "NEEDS_REVIEW";
  const arabic = isArabic(claim);
  const rationale = String(adjudication?.rationale || "").trim();
  const evidenceBasis = [];
  if (domainEvidence?.source) {
    const ref = safeSourceRef({
      ...domainEvidence.source,
      event_date_candidate: domainEvidence.event_date || domainEvidence.source.event_date_candidate,
      source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN"
    });
    if (ref) evidenceBasis.push({ ...ref, relation: normalizedStatus === "SUPERSEDED" ? "CONTRADICTS_OR_SUPERSEDES" : "SUPPORTS_SCOPE_LIMITED_FINDING", why: domainEvidence.limitation || rationale });
  }
  for (const item of Array.isArray(adjudication?.evidence) ? adjudication.evidence : []) {
    const source = sources[item.source_index];
    const ref = safeSourceRef(source || item);
    if (ref && !evidenceBasis.some(existing => existing.url === ref.url)) {
      evidenceBasis.push({ ...ref, relation: item.relation || "UNASSESSED", why: rationale });
    }
  }
  if (!evidenceBasis.length) {
    for (const source of sources) {
      if (source.relevance_assessment?.relevance === "LOW") continue;
      const ref = safeSourceRef(source);
      if (ref && !evidenceBasis.some(existing => existing.url === ref.url)) evidenceBasis.push({ ...ref, relation: "NOT_ADJUDICATED", why: arabic ? "مصدر مسترجع للمراجعة؛ لم يُثبت وحده صحة الادعاء أو نفيه." : "Retrieved for review; this source alone was not adjudicated as supporting or refuting the claim." });
    }
  }
  const eventDate = domainEvidence?.event_date || null;
  const publicationDate = domainEvidence?.source?.publication_date || evidenceBasis.find(item => item.publication_date)?.publication_date || null;
  const retrievedAt = domainEvidence?.source?.retrieved_at || evidenceBasis.find(item => item.retrieved_at)?.retrieved_at || null;
  const limitations = uniqueStrings([
    domainEvidence?.limitation,
    ...(retrievalDiagnostics.length && !evidenceBasis.length ? [arabic ? "تعذر الحصول على دليل صالح؛ تفاصيل الاسترجاع تشخيصية وليست دليلاً." : "No usable evidence was obtained; retrieval diagnostics are not evidence."] : []),
    ...(normalizedStatus === "NOT_TIME_SENSITIVE" ? [arabic ? "عدم اكتشاف مؤشر زمني لا يثبت صحة الادعاء." : "No temporal trigger does not establish that the claim is true."] : []),
    ...(normalizedStatus === "NEEDS_REVIEW" ? [arabic ? "الأدلة لا تبرر حكماً قاطعاً." : "Available evidence does not justify a definitive verdict."] : []),
    ...(normalizedStatus === "UNVERIFIABLE" ? [arabic ? "لم تتوفر أدلة قابلة للاستخدام." : "No usable evidence was available."] : [])
  ]);
  const summaryMap = arabic
    ? { CURRENT: "الأدلة تدعم الادعاء ضمن النطاق المحدد.", SUPERSEDED: "تجاوزت التطورات اللاحقة الادعاء الأصلي.", CONTRADICTED: "تتعارض الأدلة المقبولة مع الادعاء.", UNVERIFIABLE: "تعذر التحقق من الادعاء بالأدلة المتاحة.", NEEDS_REVIEW: "الأدلة غير كافية لحسم الادعاء.", NOT_TIME_SENSITIVE: "لم يُكتشف مؤشر زمني يستدعي التحقق الزمني." }
    : { CURRENT: "Evidence supports the claim within the reviewed scope.", SUPERSEDED: "A documented change has overtaken the original claim.", CONTRADICTED: "Accepted evidence conflicts with the claim.", UNVERIFIABLE: "The claim could not be verified from available evidence.", NEEDS_REVIEW: "Available evidence is insufficient to resolve the claim.", NOT_TIME_SENSITIVE: "No temporal trigger was detected for time-sensitive review." };
  return {
    summary: summaryMap[normalizedStatus],
    reason: rationale || (arabic ? "لم يقدم المحرك تعليلاً تفصيلياً إضافياً." : "No additional adjudication rationale was supplied."),
    evidence_basis: evidenceBasis,
    date_interpretation: { event_date: eventDate, publication_date: publicationDate, retrieved_at: retrievedAt, note: arabic ? "تواريخ الحدث والنشر والاسترجاع حقول مستقلة ولا يجوز الخلط بينها." : "Event, publication, and retrieval dates are distinct fields and must not be conflated." },
    limitations
  };
}

function normalizeEvidenceQuote(value) {
  return String(value || "").normalize("NFKC").replace(/[\\u200B-\\u200D\\uFEFF]/g, "").replace(/\\s+/g, " ").trim().toLocaleLowerCase();
}
function hostForCorrection(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    return url.hostname.toLowerCase().replace(/^www[.]/, "");
  } catch { return ""; }
}
function buildGenericEvidenceCorrection({ claim, status, correctionCandidate, sources = [] } = {}) {
  if (!["SUPERSEDED", "CONTRADICTED"].includes(status)) return null;
  const candidate = correctionCandidate;
  if (!candidate || candidate.assessment?.status !== "SUPPORTED"
    || candidate.assessment?.method !== "SEPARATE_MODEL_CANDIDATE_REVIEW"
    || candidate.assessment?.scope_match !== "MATCHED"
    || candidate.assessment?.timeframe_match !== "MATCHED"
    || candidate.assessment?.conflict_status !== "NONE") return null;
  const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
  if (text.length < 8 || text.length > 1200 || text === String(claim || "").trim()) return null;
  if (!Array.isArray(candidate.evidence) || !Array.isArray(sources)) return null;
  const seenIndices = new Set();
  const seenHosts = new Set();
  const evidenceRefs = [];
  let hasPrimary = false;
  for (const item of candidate.evidence) {
    const index = item?.source_index;
    if (!Number.isInteger(index) || index < 0 || index >= sources.length || seenIndices.has(index)
      || item?.relation !== "SUPPORTS_CANDIDATE") return null;
    seenIndices.add(index);
    const source = sources[index];
    const host = hostForCorrection(source?.url);
    const snippet = typeof source?.snippet === "string" ? source.snippet.trim() : "";
    const reliability = source?.source_reliability;
    const supportingQuote = typeof item?.supporting_quote === "string" ? item.supporting_quote.trim() : "";
    const normalizedQuote = normalizeEvidenceQuote(supportingQuote);
    if (!host || snippet.length < 20 || supportingQuote.length < 20 || supportingQuote.length > 500
      || !normalizeEvidenceQuote(snippet).includes(normalizedQuote)
      || source?.relevance_assessment?.relevance === "LOW"
      || !["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL"].includes(reliability)) return null;
    if (seenHosts.has(host)) return null;
    seenHosts.add(host);
    if (reliability === "PRIMARY_OR_OFFICIAL_DOMAIN") hasPrimary = true;
    const ref = safeSourceRef(source);
    if (!ref) return null;
    evidenceRefs.push({ ...ref, relation: "SUPPORTS_CORRECTION", supporting_quote: supportingQuote });
  }
  if (evidenceRefs.length < 2 || seenHosts.size < 2 || !hasPrimary) return null;
  return { status: "PROVIDED", text, evidence_refs: evidenceRefs, limitations: uniqueStrings([candidate.limitation]) };
}

export function buildCorrection({ claim, status, domainAdapter, domainEvidence, explanationDetail, sources = [], correctionCandidate = null } = {}) {
  const normalizedStatus = VALID_STATUSES.has(status) ? status : "NEEDS_REVIEW";
  if (normalizedStatus === "CURRENT") return { status: "NOT_NEEDED", text: null, evidence_refs: [], limitations: [] };
  if (normalizedStatus === "NOT_TIME_SENSITIVE") return { status: "NOT_APPLICABLE", text: null, evidence_refs: [], limitations: [isArabic(claim) ? "لم يُفعّل التحقق الزمني؛ وهذه الحالة لا تمثل حكماً على صحة الادعاء." : "Temporal review was not triggered; this is not a truth verdict."] };
  if (normalizedStatus === "NEEDS_REVIEW" || normalizedStatus === "UNVERIFIABLE") return {
    status: "WITHHELD", text: null, evidence_refs: [],
    limitations: [isArabic(claim) ? "حُجب التصحيح لأن الأدلة غير كافية؛ لا ينبغي تخمين المعلومة البديلة." : "Correction withheld because the evidence is insufficient; a replacement must not be guessed."]
  };
  const domainSource = domainEvidence?.source || null;
  const indexedOfficialSource = (Array.isArray(sources) ? sources : [])
    .find(item => item?.evidence_kind === "OFFICIAL_PYTHON2_SUNSET_NOTICE" && canonicalPythonSunsetUrl(item.url));
  const source = canonicalPythonSunsetUrl(domainSource?.url) ? domainSource : indexedOfficialSource;
  const sourceUrl = canonicalPythonSunsetUrl(source?.url);
  const citedOfficialEvidence = (explanationDetail?.evidence_basis || [])
    .some(item => canonicalPythonSunsetUrl(item.url) === PYTHON_SUNSET_URL);
  const pythonEvidenceEligible = domainAdapter === "python2_lifecycle"
    && normalizedStatus === "SUPERSEDED"
    && domainEvidence?.method === "OFFICIAL_PYTHON_ORG_SUNSET_NOTICE"
    && domainEvidence?.event_date === "2020-01-01"
    && sourceUrl === PYTHON_SUNSET_URL
    && citedOfficialEvidence;
  if (pythonEvidenceEligible) return {
    status: "PROVIDED",
    text: isArabic(claim) ? "لم يعد Python 2 مدعوماً؛ فقد انتهى دعمه في 1 يناير 2020." : "Python 2 is no longer supported; its support ended on January 1, 2020.",
    evidence_refs: [{ url: PYTHON_SUNSET_URL, title: source.title || "Sunsetting Python 2 | Python.org", event_date: "2020-01-01" }],
    limitations: uniqueStrings([domainEvidence.limitation, source.acquisition_limitation])
  };
  const genericCorrection = buildGenericEvidenceCorrection({ claim, status: normalizedStatus, correctionCandidate, sources });
  if (genericCorrection) return genericCorrection;
  return {
    status: "WITHHELD", text: null, evidence_refs: [],
    limitations: [isArabic(claim) ? "الحكم يشير إلى تغير أو تعارض، لكن لا يوجد تصحيح مستوفٍ لشروط التحقق المستقل من الأدلة والنطاق والزمن. حُجب التصحيح لتجنب اختلاق بديل." : "The finding indicates change or conflict, but no correction passed independent evidence, scope, and timeframe checks. Correction is withheld to avoid inventing a replacement."]
  };
}
export function buildProductOutcomes(input = {}) {
  const explanation_detail = buildExplanationDetail(input);
  const correction = buildCorrection({ ...input, explanationDetail: explanation_detail, correctionCandidate: input.correctionCandidate || input.adjudication?.correction_candidate || null });
  return { explanation_detail, correction };
}
