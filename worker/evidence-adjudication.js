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
const MULTI_PART_PUBLIC_SUFFIXES = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "sch.uk",
  "com.au", "net.au", "org.au", "edu.au", "gov.au",
  "co.nz", "org.nz", "govt.nz", "ac.nz",
  "com.br", "gov.br", "com.cn", "gov.cn", "com.sg", "gov.sg", "com.hk", "gov.hk", "com.tw", "gov.tw",
  "co.jp", "ne.jp", "or.jp", "ac.jp", "go.jp", "gov.jp",
  "co.in", "firm.in", "net.in", "org.in", "gen.in", "ind.in", "gov.in", "ac.in", "edu.in",
  "com.mx", "com.tr", "co.za", "org.za", "ac.za", "gov.za",
  "com.sa", "gov.sa", "edu.sa", "org.sa"
]);

// Count independent registrable domains, not subdomains controlled by one publisher.
// This is a bounded common-suffix list, not a complete Public Suffix List; unknown
// multi-label suffixes may be misclassified and must not be described as universal.
export function registrableDomain(url) {
  const host = hostOf(url);
  if (!host) return "";
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_PUBLIC_SUFFIXES.has(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
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
  return new Set(items.map(x => registrableDomain(x.url)).filter(Boolean));
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
  temporalSensitive = true
} = {}) {
  const materialComponents = Array.isArray(claimComponents) ? claimComponents : [];
  const modelClassifiesCompound = semanticAssessment?.claim_assessment?.claim_type === "COMPOUND";
  if (modelClassifiesCompound && materialComponents.length < 2) {
    return {
      status: "NEEDS_REVIEW",
      method: "SEMANTIC_COMPONENT_DECOMPOSITION_GATE",
      rationale: "The semantic assessment identified a compound proposition, but the structural decomposition did not expose at least two independently assessable components.",
      evidence: [],
      adjudication_signals: {
        semantic_claim_type: "COMPOUND",
        components_detected: materialComponents.length,
        review_reason: "SEMANTIC_DECOMPOSITION_GAP"
      }
    };
  }
  if (materialComponents.length > 1) {
    const componentAssessment = completeAssessment(semanticAssessment, Array.isArray(sources) ? sources.length : 0, materialComponents);
    const covered = new Map();
    const eligibleSource = (source) => source?.relevance_assessment?.relevance === "HIGH"
      && ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL", "SECONDARY_REPUTABLE"].includes(source?.source_reliability)
      && Boolean(hostOf(source?.url))
      && (!temporalSensitive || recentDated(source, now, maxEvidenceAgeDays));
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
        rationale: "A compound claim cannot receive a decisive verdict until every material component is linked to eligible, dated evidence with no unresolved component-level polarity conflict.",
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
    const sourceDatesValid = boundSources.length > 0 && boundSources.every(source => {
      const dates = [source?.retrieved_at, source?.published_date].map(value => Date.parse(value || "")).filter(Number.isFinite);
      return dates.some(date => date <= now + DAY && now - date <= 365 * DAY);
    });
    const sourceQualityValid = boundSources.length > 0 && boundSources.every(source =>
      source?.relevance_assessment?.relevance === "HIGH"
      && ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL"].includes(source?.source_reliability)
      && Boolean(hostOf(source.url))
    );
    const domainEvidenceValidated = !decisive || (
      evidenceUrls.length > 0
      && boundSources.length === evidenceUrls.length
      && sourceDatesValid
      && sourceQualityValid
    );
    if (domainEvidenceValidated) {
      return {
        status: domainResult.status,
        method: "DOMAIN_SPECIFIC_RULE",
        rationale: "A narrowly scoped domain adapter supplied an explicit result bound to eligible, recent primary or institutional evidence.",
        evidence,
        adjudication_signals: { semantic_relations: "ADVISORY_ONLY", domain_evidence_bound_to_core_sources: true }
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
        domain_evidence_bound_source_count: boundSources.filter(Boolean).length
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
  const reviewCandidates = assessed.filter(x =>
    ["HIGH", "MEDIUM"].includes(x.source?.relevance_assessment?.relevance) && hostOf(x.source.url)
  );
  // Only HIGH relevance can support a generic verdict. MEDIUM relevance is
  // retained as a review lead so strict domain filtering does not erase retrieval.
  const eligible = reviewCandidates.filter(x => x.source?.relevance_assessment?.relevance === "HIGH");
  const qualified = eligible.filter(x =>
    ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL", "SECONDARY_REPUTABLE"].includes(x.source.source_reliability)
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
  const lexicalGuard = independentSingleSourceDisqualifier(claim);
  const allRelations = relations ? [...relations.byIndex.values()] : [];
  const allEvidenceMixed = allRelations.includes("MIXED")
    || (allRelations.includes("SUPPORTS") && allRelations.includes("CONTRADICTS"));
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
    publication_and_event_dates_separate: true,
    single_source_lexical_guard: lexicalGuard,
    single_source_mixed_relations_detected: allEvidenceMixed
  };

  // One primary source is sufficient only for a narrow, low-risk proposition
  // when the model's structured assessment says it is direct and exact-scope.
  // The model does not establish publisher reliability: that remains URL-gated below.
  const singleSourceEligible = relations
    && relations.claimAssessment?.claim_risk === "LOW"
    && ["INSTITUTIONAL_RECORD", "HISTORICAL_EVENT", "ATTRIBUTED_RESEARCH_RESULT"].includes(relations.claimAssessment?.claim_type)
    && !lexicalGuard.dynamic && !lexicalGuard.high_impact && !lexicalGuard.compound
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
      rationale: "A single recent, high-relevance primary source directly addresses the exact scope of a narrow, low-risk claim. This exception does not apply to broad consensus, contested, compound, or dynamic current-state claims.",
      evidence: supporting.map(x => evidenceItem(x.source, x.relation, x.index)),
      adjudication_signals: { ...signals, single_source_exception: true, claim_type: relations.claimAssessment.claim_type, claim_risk: relations.claimAssessment.claim_risk }
    };
  }
  if (singleSourceEligible && contradicting.length === 1) {
    return {
      status: "CONTRADICTED",
      method: "SINGLE_AUTHORITATIVE_PRIMARY_EVIDENCE",
      rationale: "A single recent, high-relevance primary source directly contradicts the exact scope of a narrow, low-risk claim. This exception does not apply to broad consensus, contested, compound, or dynamic current-state claims.",
      evidence: contradicting.map(x => evidenceItem(x.source, x.relation, x.index)),
      adjudication_signals: { ...signals, single_source_exception: true, claim_type: relations.claimAssessment.claim_type, claim_risk: relations.claimAssessment.claim_risk }
    };
  }
  // Narrow corroboration by reputable secondary publishers; no single-source shortcut.
  const secondaryOnlyEligible = (items) => {
    const allowedClaim = relations?.claimAssessment?.claim_risk === "LOW"
      && ["HISTORICAL_EVENT", "INSTITUTIONAL_RECORD", "ATTRIBUTED_RESEARCH_RESULT"].includes(relations?.claimAssessment?.claim_type)
      && !lexicalGuard.dynamic && !lexicalGuard.high_impact && !lexicalGuard.compound && !allEvidenceMixed;
    const distinct = new Map(items.map(x => [registrableDomain(x.source.url), x]));
    return allowedClaim && distinct.size >= 2 && [...distinct.values()].every(x =>
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
        : "Two independent, recent, high-relevance primary/institutional domains were semantically assessed as contradicting the exact claim.",
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
        : "Two independent, recent, high-relevance primary/institutional domains were semantically assessed as supporting the exact claim.",
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
        ? "Semantic assessment was missing, incomplete, duplicated, or invalid, including the claim-risk and source-role metadata; no generic verdict was issued."
        : "Evidence did not meet the claim-specific sufficiency threshold or contained mixed semantic relations. Search relevance and lexical conflict candidates are not proof.",
    evidence: reviewCandidates.map(x => evidenceItem(x.source, x.relation, x.index)),
    adjudication_signals: signals
  };
}
