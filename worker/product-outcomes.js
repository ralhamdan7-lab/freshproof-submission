const VALID_STATUSES = new Set(["CURRENT", "SUPERSEDED", "CONTRADICTED", "UNVERIFIABLE", "NEEDS_REVIEW", "NOT_ASSESSED"]);
const PYTHON_SUNSET_URL = "https://www.python.org/doc/sunset-python-2/";
const PYTHON_PEP373_URL = "https://peps.python.org/pep-0373/";
function canonicalPythonLifecycleUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (["python.org", "www.python.org"].includes(host) && path === "/doc/sunset-python-2") return PYTHON_SUNSET_URL;
    if (host === "peps.python.org" && path === "/pep-0373") return PYTHON_PEP373_URL;
    return null;
  } catch { return null; }
}
const isArabic = value => /[\u0600-\u06FF]/.test(String(value || ""));
function safeSourceRef(source) {
  try {
    const url = new URL(source?.url);
    if (url.protocol !== "https:") return null;
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
// v0.2.84: Arabic rendering of the adjudicator's rationale, keyed by method.
// The English rationale is retained verbatim in reason_original for audit.
const ARABIC_RATIONALE = {
  CONSERVATIVE_EVIDENCE_ADJUDICATION: () => "لم تستوفِ الأدلة عتبة الكفاية الخاصة بهذا الادعاء، أو تضمنت علاقات دلالية متباينة. صلة نتائج البحث وتعارضاتها اللفظية ليست دليلاً بحد ذاتها.",
  SINGLE_AUTHORITATIVE_PRIMARY_EVIDENCE: status => status === "CONTRADICTED"
    ? "مصدر أولي واحد مؤهل وذو صلة عالية يناقض النطاق الدقيق لادعاء محدود ومنخفض المخاطر. لا ينطبق هذا الاستثناء على الادعاءات الواسعة أو الخلافية أو المركبة أو الراهنة."
    : "مصدر أولي واحد مؤهل وذو صلة عالية يتناول النطاق الدقيق لادعاء محدود ومنخفض المخاطر. لا ينطبق هذا الاستثناء على الادعاءات الواسعة أو الخلافية أو المركبة أو الراهنة.",
  CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE: status => status === "CONTRADICTED"
    ? "نطاقان مستقلان على الأقل من المصادر الأولية أو المؤسسية المؤهلة قُيّما بأنهما يناقضان الادعاء بدقة."
    : "نطاقان مستقلان على الأقل من المصادر الأولية أو المؤسسية المؤهلة قُيّما بأنهما يدعمان الادعاء بدقة.",
  CORROBORATED_REPUTABLE_SECONDARY_EVIDENCE: () => "ناشران ثانويان مستقلان موثوقان يطابقان النطاق الدقيق لادعاء تاريخي أو سجلي محدود ومنخفض المخاطر.",
  CORROBORATED_TEMPORAL_CHANGE_EVENT: () => "تُثبت مصادر مستقلة مؤهلة حدوث تغيير مؤرخ لاحق تجاوز الحالة التي يذكرها الادعاء.",
  NOT_A_FACTUAL_CLAIM: () => "العبارة رأي أو حكم قيمي أو توصية؛ يمكن للأدلة أن تُثريها لكنها لا تجعلها صحيحة أو خاطئة.",
  FUTURE_OUTCOME_NOT_VERIFIABLE: () => "العبارة تتوقع نتيجة مستقبلية غير محسومة؛ لا يمكن لأي دليل حالي إثباتها. أما الخطط والمواعيد المعلنة فتُفحص بالأدلة.",
  INDEPENDENT_SOURCE_CONSENSUS: status => status === "CONTRADICTED"
    ? "مصادر مستقلة من ناشرين مختلفين تناقض الادعاء مباشرة وبدقة، ولا يدعمه أي مصدر مقيَّم."
    : "مصادر مستقلة من ناشرين مختلفين تدعم الادعاء مباشرة وبدقة، ولا يناقضه أي مصدر مقيَّم.",
  CURRENT_STATE_PERSISTENCE_CONSENSUS: status => status === "CONTRADICTED"
    ? "تتفق مصادر مستقلة على حالة راهنة مختلفة؛ بعضها أقدم أو غير مؤرخ، ولم يكشف البحث عن تغييرات لاحقة ما يدعم الادعاء."
    : "تتفق مصادر مستقلة على الحالة الراهنة كما وردت؛ بعضها أقدم أو غير مؤرخ، ولم يكشف البحث عن تغييرات لاحقة أي تغيير. قد تكون الحالة تغيّرت مؤخراً جداً.",
  UNCONTESTED_CURRENT_STATE_SUPPORT: () => "تؤكد مصادر مستقلة، منها ناشرون مصنّفون، أن الحالة المذكورة قائمة، ولم يجد البحث عن آخر المستجدات أي مصدر يفيد بتغيّرها، ولا ينفيها أي مصدر مُقيَّم.",
  UNCONTESTED_CURRENT_STATE_CONTRADICTION: () => "تنفي مصادر مستقلة، منها ناشرون مصنّفون، أن الحالة المذكورة قائمة حالياً، ولم يجد البحث عن آخر المستجدات أي مصدر يدعمها، ولا يدعمها أي مصدر مُقيَّم.",
  DOCUMENTED_CHANGE_CONSENSUS: () => "توثّق مصادر مستقلة تغييراً أزال الحالة التي يذكرها الادعاء، ولم يكشف البحث عن تطورات لاحقة أي مصدر يدعمه مجدداً؛ فالادعاء يصف حالة تغيّرت.",
  TEMPORAL_ORDER_RECONCILIATION: () => "تدعم مصادر أقدم الادعاء، لكن كل المصادر الأحدث تناقضه وتتفق فيما بينها باستقلال؛ فالادعاء يصف حالة تغيّرت لاحقاً.",
  ISSUER_CHANGE_NOTICE_WITH_CORROBORATION: () => "يوثّق مصدر أولي أو مؤسسي تغييراً مؤرخاً حلّ محل الحالة الواردة في الادعاء، ويؤكد مصدر مستقل مؤهل أن الادعاء لم يعد قائماً.",
  LIVE_ISSUER_RECORD: status => status === "CONTRADICTED"
    ? "السجل الحالي للجهة المُصدِرة نفسها، المسترجع أثناء هذا التحقق، يذكر حالة راهنة مختلفة، ولا يدعم الادعاءَ أي مصدر مقيَّم."
    : "السجل الحالي للجهة المُصدِرة نفسها، المسترجع أثناء هذا التحقق، يذكر الحالة الراهنة كما وردت، ولا يتعارض معه أي مصدر مقيَّم.",
  CLAIM_FRAME_REQUIRES_REVIEW: () => "الإطار الزمني للادعاء غامض أو غير محدد، لذلك يلزم مراجعة قبل إصدار حكم.",
  DETERMINISTIC_EVENT_ANCHOR_MATCH: () => "يطابق تاريخ الحدث في الأدلة المؤهلة المرجع الزمني الوارد في الادعاء.",
  SEMANTIC_COMPONENT_COVERAGE_GATE: () => "لم تغطِّ الأدلة جميع أجزاء الادعاء المركّب؛ لذلك لم يصدر حكم.",
  SEMANTIC_COMPONENT_DECOMPOSITION_GATE: () => "تعذّر تقسيم الادعاء المركّب إلى أجزاء قابلة للتحقق بثقة؛ لذلك لم يصدر حكم.",
  SEMANTIC_PROVIDER_UNAVAILABLE: () => "نموذج تقييم علاقة الأدلة غير متاح؛ لذلك لم يُستنتج حكم.",
  DOMAIN_ADAPTER_EVIDENCE_GATE: () => "لم تستوفِ أدلة القاعدة المتخصصة شروط الأدلة الأساسية."
};
function arabicRationale(adjudication, status) {
  const render = ARABIC_RATIONALE[adjudication?.method];
  return render ? render(status) : null;
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
    ...(normalizedStatus === "NOT_ASSESSED" ? [arabic ? "لم تكتمل عملية جمع الأدلة أو تقييمها؛ هذه ليست نتيجة عن صحة الادعاء." : "The evidence process did not complete; this is not a finding about the claim."] : []),
    ...(normalizedStatus === "NEEDS_REVIEW" ? [arabic ? "الأدلة لا تبرر حكماً قاطعاً." : "Available evidence does not justify a definitive verdict."] : []),
    ...(normalizedStatus === "UNVERIFIABLE" && adjudication?.method === "NOT_A_FACTUAL_CLAIM" ? [arabic ? "هذا رأي أو حكم قيمي؛ لا تُصدر الأدلة حكماً بصحته أو خطئه." : "This is an opinion or value judgement; evidence does not make it true or false."] : []),
    ...(normalizedStatus === "UNVERIFIABLE" && adjudication?.method === "FUTURE_OUTCOME_NOT_VERIFIABLE" ? [arabic ? "هذا توقع لنتيجة مستقبلية غير محسومة؛ لا يمكن التحقق منه الآن." : "This predicts an uncertain future outcome; it cannot be verified yet."] : []),
    ...(normalizedStatus === "UNVERIFIABLE" && !["NOT_A_FACTUAL_CLAIM", "FUTURE_OUTCOME_NOT_VERIFIABLE"].includes(adjudication?.method) ? [arabic ? "لم تتوفر أدلة قابلة للاستخدام." : "No usable evidence was available."] : []),
    ...(adjudication?.confidence_tier === "MODERATE" && ["CURRENT", "CONTRADICTED", "SUPERSEDED"].includes(normalizedStatus) ? [arabic ? "أساس الحكم: اتفاق مصادر مستقلة دون أي مصدر مخالف، وليس سجل الجهة المُصدِرة وحده." : "Basis: agreement between independent sources with none opposing, rather than the issuing authority's own record alone."] : [])
  ]);
  const summaryMap = arabic
    ? { CURRENT: "الأدلة تدعم الادعاء ضمن النطاق المحدد.", SUPERSEDED: "تجاوزت التطورات اللاحقة الادعاء الأصلي.", CONTRADICTED: "تتعارض الأدلة المقبولة مع الادعاء.", UNVERIFIABLE: "تعذر التحقق من الادعاء بالأدلة المتاحة.", NEEDS_REVIEW: "الأدلة غير كافية لحسم الادعاء.", NOT_ASSESSED: "لم يُقيَّم الادعاء بسبب تعذر تشغيلي، وليس بسبب الأدلة." }
    : { CURRENT: "Evidence supports the claim within the reviewed scope.", SUPERSEDED: "A documented change has overtaken the original claim.", CONTRADICTED: "Accepted evidence conflicts with the claim.", UNVERIFIABLE: "The claim could not be verified from available evidence.", NEEDS_REVIEW: "Available evidence is insufficient to resolve the claim.", NOT_ASSESSED: "The claim was not assessed because of an operational limit or error, not because of the evidence." };
  return {
    summary: summaryMap[normalizedStatus],
    reason: arabic
      ? (arabicRationale(adjudication, normalizedStatus) || (rationale ? "التعليل التفصيلي متاح بلغته الأصلية في سجل التدقيق." : "لم يقدم المحرك تعليلاً تفصيلياً إضافياً."))
      : (rationale || "No additional adjudication rationale was supplied."),
    ...(arabic && rationale ? { reason_original: rationale } : {}),
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
const COMMUNITY_HOST = /(?:^|\.)(?:reddit\.com|quora\.com|stackexchange\.com|stackoverflow\.com|medium\.com|facebook\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com|instagram\.com|pinterest\.com|linkedin\.com|fandom\.com|wikia\.com|blogspot\.com|wordpress\.com|tumblr\.com)$/i;

function buildGenericEvidenceCorrection({ claim, status, correctionCandidate, sources = [] } = {}) {
  if (!["SUPERSEDED", "CONTRADICTED"].includes(status)) return null;
  const candidate = correctionCandidate;
  if (!candidate || candidate.assessment?.status !== "SUPPORTED"
    || !["SEPARATE_MODEL_CANDIDATE_REVIEW", "IN_ASSESSMENT_GROUNDED_CORRECTION"].includes(candidate.assessment?.method)
    || candidate.assessment?.scope_match !== "MATCHED"
    || candidate.assessment?.timeframe_match !== "MATCHED"
    || candidate.assessment?.conflict_status !== "NONE") return null;
  const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
  if (text.length < 8 || text.length > 1200 || text === String(claim || "").trim()) return null;
  if (!Array.isArray(candidate.evidence) || !Array.isArray(sources)) return null;
  const seenIndices = new Set();
  const seenHosts = new Set();
  const evidenceRefs = [];
  // v0.2.91: two independent publishers quoting the replacement verbatim, at
  // least one classified (official, institutional or established reference).
  let hasPrimary = false;
  let hasOfficial = false;
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
      || COMMUNITY_HOST.test(host)) return null;
    if (seenHosts.has(host)) return null;
    seenHosts.add(host);
    if (["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL", "SECONDARY_REPUTABLE"].includes(reliability)) hasPrimary = true;
    if (reliability === "PRIMARY_OR_OFFICIAL_DOMAIN") hasOfficial = true;
    const ref = safeSourceRef(source);
    if (!ref) return null;
    evidenceRefs.push({ ...ref, relation: "SUPPORTS_CORRECTION", supporting_quote: supportingQuote });
  }
  if (evidenceRefs.length < 2 || seenHosts.size < 2 || !hasPrimary) return null;
  return { status: "PROVIDED", text, basis: hasOfficial ? "OFFICIAL_AND_INDEPENDENT_SOURCES" : "INDEPENDENT_CLASSIFIED_SOURCES", evidence_refs: evidenceRefs, limitations: uniqueStrings([candidate.limitation]) };
}

export function buildCorrection({ claim, status, domainAdapter, domainEvidence, explanationDetail, sources = [], correctionCandidate = null } = {}) {
  const normalizedStatus = VALID_STATUSES.has(status) ? status : "NEEDS_REVIEW";
  if (normalizedStatus === "CURRENT") return { status: "NOT_NEEDED", text: null, evidence_refs: [], limitations: [] };
  if (normalizedStatus === "NOT_ASSESSED") return { status: "NOT_APPLICABLE", text: null, evidence_refs: [], limitations: [isArabic(claim) ? "لم يُقيَّم الادعاء؛ لا يمكن اقتراح تصحيح دون تقييم الأدلة." : "The claim was not assessed; no correction can be proposed without evaluated evidence."] };
  if (normalizedStatus === "NEEDS_REVIEW" || normalizedStatus === "UNVERIFIABLE") return {
    status: "WITHHELD", text: null, evidence_refs: [],
    limitations: [isArabic(claim) ? "حُجب التصحيح لأن الأدلة غير كافية؛ لا ينبغي تخمين المعلومة البديلة." : "Correction withheld because the evidence is insufficient; a replacement must not be guessed."]
  };
  const domainSource = domainEvidence?.source || null;
  const indexedOfficialSource = (Array.isArray(sources) ? sources : [])
    .find(item => item?.evidence_kind === "OFFICIAL_PYTHON2_SUNSET_NOTICE" && canonicalPythonLifecycleUrl(item.url));
  const source = canonicalPythonLifecycleUrl(domainSource?.url) ? domainSource : indexedOfficialSource;
  const sourceUrl = canonicalPythonLifecycleUrl(source?.url);
  const citedOfficialEvidence = (explanationDetail?.evidence_basis || [])
    .some(item => canonicalPythonLifecycleUrl(item.url) === sourceUrl);
  const pythonEvidenceEligible = domainAdapter === "python2_lifecycle"
    && normalizedStatus === "SUPERSEDED"
    && domainEvidence?.method === "OFFICIAL_PYTHON_ORG_SUNSET_NOTICE"
    && domainEvidence?.event_date === "2020-01-01"
    && Boolean(sourceUrl)
    && citedOfficialEvidence;
  if (pythonEvidenceEligible) return {
    status: "PROVIDED",
    text: isArabic(claim) ? "لم يعد Python 2 مدعوماً؛ فقد انتهى دعمه في 1 يناير 2020." : "Python 2 is no longer supported; its support ended on January 1, 2020.",
    evidence_refs: [{ url: sourceUrl, title: source.title || (sourceUrl === PYTHON_PEP373_URL ? "PEP 373 — Python 2.7 Release Schedule" : "Sunsetting Python 2 | Python.org"), event_date: "2020-01-01" }],
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
