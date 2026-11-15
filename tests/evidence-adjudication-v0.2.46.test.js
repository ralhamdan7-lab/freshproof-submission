import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence } from "../worker/evidence-adjudication.js";

const now = Date.parse("2026-11-12T00:00:00Z");
const sources = [
  {
    url: "https://www.python.org/downloads/",
    title: "Python Releases",
    published_date: "2026-11-10",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
    relevance_assessment: { relevance: "HIGH" }
  },
  {
    url: "https://python-release-authority.example/releases/",
    title: "Python What's New",
    published_date: "2026-11-09",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
    relevance_assessment: { relevance: "HIGH" }
  }
];
const assessment = (...relations) => ({
  status: "COMPLETED_ADVISORY",
  claim_assessment: { claim_type: "OTHER", claim_risk: "HIGH" },
  source_assessments: relations.map((_, source_index) => ({
    source_index, directness: "INDIRECT", scope_match: "PARTIAL", authority_role: "SECONDARY"
  })),
  assessments: relations.map((relation, source_index) => ({ source_index, relation, rationale: "Synthetic fixture." }))
});

test("two independent recent primary domains can corroborate contradiction", () => {
  const result = adjudicateEvidence({
    claim: "Python 3.12 is the latest stable release.",
    sources,
    semanticAssessment: assessment("CONTRADICTS", "CONTRADICTS"),
    now
  });
  assert.equal(result.status, "CONTRADICTED");
  assert.equal(result.method, "CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE");
  assert.equal(result.evidence.length, 2);
});

test("two independent recent primary domains can corroborate support", () => {
  const result = adjudicateEvidence({
    claim: "Python 3.15 is the latest stable release.",
    sources,
    semanticAssessment: assessment("SUPPORTS", "SUPPORTS"),
    now
  });
  assert.equal(result.status, "CURRENT");
});

test("a single primary source cannot produce generic CONTRADICTED", () => {
  const result = adjudicateEvidence({
    claim: "Python 3.12 is the latest stable release.",
    sources: sources.slice(0, 1),
    semanticAssessment: assessment("CONTRADICTS"),
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
});

test("one direct exact-scope originating authority can decide a narrow low-risk institutional record", () => {
  const one = sources.slice(0, 1);
  const result = adjudicateEvidence({
    claim: "The institution published its annual report on 10 November 2026.",
    sources: one,
    semanticAssessment: {
      status: "COMPLETED_ADVISORY",
      claim_assessment: { claim_type: "INSTITUTIONAL_RECORD", claim_risk: "LOW" },
      source_assessments: [{ source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY" }],
      assessments: [{ source_index: 0, relation: "SUPPORTS", rationale: "The official record states the exact publication date." }]
    },
    now
  });
  assert.equal(result.status, "CURRENT");
  assert.equal(result.method, "SINGLE_AUTHORITATIVE_PRIMARY_EVIDENCE");
  assert.equal(result.adjudication_signals.single_source_exception, true);
});

test("one direct exact-scope originating authority can contradict a narrow low-risk institutional record", () => {
  const result = adjudicateEvidence({
    claim: "The institution published its annual report on 10 November 2026.",
    sources: sources.slice(0, 1),
    semanticAssessment: {
      status: "COMPLETED_ADVISORY",
      claim_assessment: { claim_type: "INSTITUTIONAL_RECORD", claim_risk: "LOW" },
      source_assessments: [{ source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY" }],
      assessments: [{ source_index: 0, relation: "CONTRADICTS", rationale: "The official record gives a different date." }]
    },
    now
  });
  assert.equal(result.status, "CONTRADICTED");
  assert.equal(result.method, "SINGLE_AUTHORITATIVE_PRIMARY_EVIDENCE");
});

test("single-source exception rejects indirect, partial-scope, secondary, and dynamic claims", () => {
  const one = sources.slice(0, 1);
  const base = {
    status: "COMPLETED_ADVISORY",
    claim_assessment: { claim_type: "INSTITUTIONAL_RECORD", claim_risk: "LOW" },
    source_assessments: [{ source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY" }],
    assessments: [{ source_index: 0, relation: "SUPPORTS" }]
  };
  const variants = [
    { ...base, source_assessments: [{ ...base.source_assessments[0], directness: "INDIRECT" }] },
    { ...base, source_assessments: [{ ...base.source_assessments[0], scope_match: "PARTIAL" }] },
    { ...base, source_assessments: [{ ...base.source_assessments[0], authority_role: "SECONDARY" }] },
    { ...base, claim_assessment: { claim_type: "CURRENT_STATE", claim_risk: "LOW" } },
    { ...base, claim_assessment: { claim_type: "SCIENTIFIC_CONSENSUS", claim_risk: "HIGH" } }
  ];
  for (const semanticAssessment of variants) {
    const result = adjudicateEvidence({ claim: "The official current status is X.", sources: one, semanticAssessment, now });
    assert.equal(result.status, "NEEDS_REVIEW");
  }
});

test("partial assessment cannot produce a verdict even when status claims completed", () => {
  const result = adjudicateEvidence({
    sources,
    semanticAssessment: { status: "COMPLETED_ADVISORY", assessments: [{ source_index: 0, relation: "CONTRADICTS" }] },
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.adjudication_signals.semantic_assessment_complete, false);
});

test("assessment without COMPLETED_ADVISORY status cannot produce a verdict", () => {
  const result = adjudicateEvidence({
    sources,
    semanticAssessment: { status: "FAILED_CLOSED", assessments: [{ source_index: 0, relation: "CONTRADICTS" }, { source_index: 1, relation: "CONTRADICTS" }] },
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
});

test("duplicate, out-of-range, unknown, or missing assessment indexes fail closed", () => {
  const malformed = [
    [{ source_index: 0, relation: "CONTRADICTS" }, { source_index: 0, relation: "CONTRADICTS" }],
    [{ source_index: 0, relation: "CONTRADICTS" }, { source_index: 2, relation: "CONTRADICTS" }],
    [{ source_index: 0, relation: "MAYBE" }, { source_index: 1, relation: "CONTRADICTS" }]
  ];
  for (const assessments of malformed) {
    const result = adjudicateEvidence({ sources, semanticAssessment: { status: "COMPLETED_ADVISORY", assessments }, now });
    assert.equal(result.status, "NEEDS_REVIEW");
    assert.equal(result.adjudication_signals.semantic_assessment_complete, false);
  }
});

test("same-host URLs are not independent corroboration", () => {
  const sameHost = [sources[0], { ...sources[1], url: "https://www.python.org/doc/whatsnew/" }];
  const result = adjudicateEvidence({ sources: sameHost, semanticAssessment: assessment("CONTRADICTS", "CONTRADICTS"), now });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.adjudication_signals.independent_contradicting_domains, 1);
});

test("mixed semantic evidence forces abstention", () => {
  const result = adjudicateEvidence({
    sources,
    semanticAssessment: assessment("SUPPORTS", "MIXED"),
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.adjudication_signals.semantic_mixed_evidence, true);
});

test("opposing semantic relations force abstention", () => {
  const result = adjudicateEvidence({ sources, semanticAssessment: assessment("SUPPORTS", "CONTRADICTS"), now });
  assert.equal(result.status, "NEEDS_REVIEW");
});

test("stale or undated sources cannot verify a time-sensitive claim", () => {
  const stale = sources.map(source => ({ ...source, published_date: "2025-01-01" }));
  const result = adjudicateEvidence({ sources: stale, semanticAssessment: assessment("CONTRADICTS", "CONTRADICTS"), now });
  assert.equal(result.status, "NEEDS_REVIEW");
  const undated = sources.map(({ published_date, ...source }) => source);
  const undatedResult = adjudicateEvidence({ sources: undated, semanticAssessment: assessment("CONTRADICTS", "CONTRADICTS"), now });
  assert.equal(undatedResult.status, "NEEDS_REVIEW");
});

test("lexical conflict candidates alone do not veto completed semantic assessment", () => {
  const result = adjudicateEvidence({
    sources,
    semanticAssessment: assessment("CONTRADICTS", "CONTRADICTS"),
    crossSourceConflicts: [{ signal: "POTENTIAL_CROSS_SOURCE_NUMERIC_CONFLICT", requires_review: true }],
    now
  });
  assert.equal(result.status, "CONTRADICTED");
});

test("irrelevant evidence cannot support or contradict", () => {
  const result = adjudicateEvidence({
    sources: sources.map(source => ({ ...source, relevance_assessment: { relevance: "LOW" } })),
    semanticAssessment: assessment("CONTRADICTS", "CONTRADICTS"),
    retrievalCount: 2,
    now
  });
  assert.equal(result.status, "UNVERIFIABLE");
});

test("domain-specific adjudication remains isolated and explicit", () => {
  const result = adjudicateEvidence({
    sources: [sources[0]],
    domainResult: { status: "SUPERSEDED", evidence: { source: { url: sources[0].url } } },
    now
  });
  assert.equal(result.status, "SUPERSEDED");
  assert.equal(result.method, "DOMAIN_SPECIFIC_RULE");
});

test("no evidence yields UNVERIFIABLE", () => {
  const result = adjudicateEvidence({ sources: [], now });
  assert.equal(result.status, "UNVERIFIABLE");
});

const singleSourceAssessment = (relation = "SUPPORTS", overrides = {}) => ({
  status: "COMPLETED_ADVISORY",
  claim_assessment: { claim_type: "INSTITUTIONAL_RECORD", claim_risk: "LOW", ...(overrides.claim_assessment || {}) },
  source_assessments: [{ source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY", ...(overrides.source_assessment || {}) }],
  assessments: [{ source_index: 0, relation, ...(overrides.assessment || {}) }]
});

test("single-source shortcut is blocked by independent dynamic, high-impact, and compound claim guards", () => {
  const cases = [
    "The institution currently publishes its annual report.",
    "The medicine dosage was officially recorded on 10 November 2026.",
    "The institution published its annual report and changed its governance rules."
  ];
  for (const claim of cases) {
    const result = adjudicateEvidence({ claim, sources: sources.slice(0, 1), semanticAssessment: singleSourceAssessment(), now });
    assert.equal(result.status, "NEEDS_REVIEW", claim);
    assert.equal(result.adjudication_signals.single_source_exception, undefined);
  }
});

test("single-source shortcut is blocked by mixed relations anywhere in the retrieved set", () => {
  const result = adjudicateEvidence({
    claim: "The institution published its annual report on 10 November 2026.",
    sources: [sources[0], { ...sources[1], source_reliability: "SECONDARY", relevance_assessment: { relevance: "MEDIUM" } }],
    semanticAssessment: {
      ...singleSourceAssessment(),
      assessments: [{ source_index: 0, relation: "SUPPORTS" }, { source_index: 1, relation: "CONTRADICTS" }]
    },
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.adjudication_signals.single_source_mixed_relations_detected, true);
});

test("single-source shortcut rejects unqualified URLs, non-primary reliability, medium relevance, and stale dates", () => {
  const base = sources[0];
  const variants = [
    { ...base, url: "http://www.python.org/downloads/" },
    { ...base, url: "https://user:pass@www.python.org/downloads/" },
    { ...base, url: "https://www.python.org:8443/downloads/" },
    { ...base, source_reliability: "SECONDARY" },
    { ...base, relevance_assessment: { relevance: "MEDIUM" } },
    { ...base, published_date: "2025-01-01" }
  ];
  for (const source of variants) {
    const result = adjudicateEvidence({
      claim: "The institution published its annual report on 10 November 2026.",
      sources: [source],
      semanticAssessment: singleSourceAssessment(),
      now
    });
    assert.notEqual(result.status, "CURRENT", JSON.stringify(source));
    assert.notEqual(result.status, "CONTRADICTED", JSON.stringify(source));
  }
});

test("single-source exception requires complete structured metadata and exact role pairing", () => {
  const variants = [
    { ...singleSourceAssessment(), source_assessments: [] },
    singleSourceAssessment("SUPPORTS", { source_assessment: { authority_role: "UNKNOWN" } }),
    singleSourceAssessment("SUPPORTS", { source_assessment: { scope_match: "NO_MATCH" } }),
    singleSourceAssessment("SUPPORTS", { source_assessment: { directness: "UNCLEAR" } }),
    singleSourceAssessment("SUPPORTS", { claim_assessment: { claim_risk: "MEDIUM" } })
  ];
  for (const semanticAssessment of variants) {
    const result = adjudicateEvidence({
      claim: "The institution published its annual report on 10 November 2026.",
      sources: sources.slice(0, 1),
      semanticAssessment,
      now
    });
    assert.notEqual(result.status, "CURRENT");
    assert.notEqual(result.status, "CONTRADICTED");
  }
});

test("independence groups subdomains under the same registrable publisher", () => {
  const samePublisher = [
    sources[0],
    { ...sources[1], url: "https://releases.python.org/archive/" }
  ];
  const result = adjudicateEvidence({
    sources: samePublisher,
    semanticAssessment: assessment("CONTRADICTS", "CONTRADICTS"),
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.adjudication_signals.independent_contradicting_domains, 1);
});

test("single-source shortcut applies conservative Arabic dynamic and high-impact guards", () => {
  const claims = [
    "تتولى الجهة حالياً نشر التقرير السنوي.",
    "جرعة الدواء المعتمدة كانت موثقة في 10 نوفمبر 2026."
  ];
  for (const claim of claims) {
    const result = adjudicateEvidence({ claim, sources: sources.slice(0, 1), semanticAssessment: singleSourceAssessment(), now });
    assert.equal(result.status, "NEEDS_REVIEW", claim);
  }
});
