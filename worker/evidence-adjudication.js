// Conservative claim-level adjudication. Semantic relations are advisory signals;
// final generic verdicts require complete assessments and independent qualified sources.
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
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}
function recentDated(source, now, maxAgeDays) {
  const date = validDate(source.published_date);
  return date !== null && date <= now + DAY && now - date <= maxAgeDays * DAY;
}
function uniqueHosts(items) {
  return new Set(items.map(x => hostOf(x.url)).filter(Boolean));
}
function completeAssessment(assessment, sourceCount) {
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
  return byIndex;
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

export function adjudicateEvidence({
  claim,
  sources = [],
  semanticAssessment = null,
  domainResult = null,
  crossSourceConflicts = [],
  retrievalCount = 0,
  now = Date.now(),
  maxEvidenceAgeDays = 180,
  temporalSensitive = true
} = {}) {
  // Domain adapters are deliberately separate, narrowly scoped adjudicators.
  if (domainResult?.status && ["CURRENT", "SUPERSEDED", "CONTRADICTED", "UNVERIFIABLE", "NEEDS_REVIEW", "NOT_TIME_SENSITIVE"].includes(domainResult.status)) {
    return {
      status: domainResult.status,
      method: "DOMAIN_SPECIFIC_RULE",
      rationale: "A narrowly scoped domain adapter supplied an explicit adjudication result.",
      evidence: domainResult.evidence || null,
      adjudication_signals: { semantic_relations: "ADVISORY_ONLY" }
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

  const relations = completeAssessment(semanticAssessment, sources.length);
  const assessed = sources.map((source, index) => ({
    source, index, relation: relations?.get(index) || "UNASSESSED"
  }));
  const reviewCandidates = assessed.filter(x =>
    ["HIGH", "MEDIUM"].includes(x.source?.relevance_assessment?.relevance) && hostOf(x.source.url)
  );
  // Only HIGH relevance can support a generic verdict. MEDIUM relevance is
  // retained as a review lead so strict domain filtering does not erase retrieval.
  const eligible = reviewCandidates.filter(x => x.source?.relevance_assessment?.relevance === "HIGH");
  const qualified = eligible.filter(x =>
    ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL"].includes(x.source.source_reliability)
    && (!temporalSensitive || recentDated(x.source, now, maxEvidenceAgeDays))
  );
  const supporting = qualified.filter(x => x.relation === "SUPPORTS");
  const contradicting = qualified.filter(x => x.relation === "CONTRADICTS");
  const scopeConflict = crossSourceConflicts.some(item => String(item.signal || "").includes("SCOPE"));
  const mixed = scopeConflict || qualified.some(x => x.relation === "MIXED")
    || (supporting.length > 0 && contradicting.length > 0);
  const supportHosts = uniqueHosts(supporting.map(x => x.source));
  const contradictHosts = uniqueHosts(contradicting.map(x => x.source));
  const qualifiedHosts = uniqueHosts(qualified.map(x => x.source));
  const signals = {
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
    publication_and_event_dates_separate: true
  };

  // Generic factual conclusions require two independent qualified domains.
  // A single official source can be compelling for a human reviewer, but does not
  // automatically become a generic machine verdict.
  if (relations && !mixed && contradictHosts.size >= 2) {
    return {
      status: "CONTRADICTED",
      method: "CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE",
      rationale: "Two independent, recent, high-relevance primary/institutional domains were semantically assessed as contradicting the exact claim.",
      evidence: contradicting.map(x => evidenceItem(x.source, x.relation, x.index)),
      adjudication_signals: signals
    };
  }
  if (relations && !mixed && supportHosts.size >= 2) {
    return {
      status: "CURRENT",
      method: "CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE",
      rationale: "Two independent, recent, high-relevance primary/institutional domains were semantically assessed as supporting the exact claim.",
      evidence: supporting.map(x => evidenceItem(x.source, x.relation, x.index)),
      adjudication_signals: signals
    };
  }

  const hasPotentialEvidence = reviewCandidates.length > 0 || (sources.length === 0 && retrievalCount > 0);
  const status = hasPotentialEvidence ? "NEEDS_REVIEW" : "UNVERIFIABLE";
  return {
    status,
    method: "CONSERVATIVE_EVIDENCE_ADJUDICATION",
    rationale: status === "UNVERIFIABLE"
      ? "No usable evidence was obtained; no truth verdict is inferred."
      : !relations
        ? "Semantic assessment was missing, incomplete, duplicated, or invalid; no generic verdict was issued."
        : "Evidence did not meet the independent-source threshold or contained mixed semantic relations. Search relevance and lexical conflict candidates are not proof.",
    evidence: reviewCandidates.map(x => evidenceItem(x.source, x.relation, x.index)),
    adjudication_signals: signals
  };
}
