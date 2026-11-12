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
    url: "https://docs.python.org/3/whatsnew/",
    title: "Python What's New",
    published_date: "2026-11-09",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
    relevance_assessment: { relevance: "HIGH" }
  }
];
const assessment = (...relations) => ({
  status: "COMPLETED_ADVISORY",
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
    sources: [],
    domainResult: { status: "SUPERSEDED", evidence: [{ url: "https://nodejs.org/en/about/previous-releases" }] },
    now
  });
  assert.equal(result.status, "SUPERSEDED");
  assert.equal(result.method, "DOMAIN_SPECIFIC_RULE");
});

test("no evidence yields UNVERIFIABLE", () => {
  const result = adjudicateEvidence({ sources: [], now });
  assert.equal(result.status, "UNVERIFIABLE");
});
