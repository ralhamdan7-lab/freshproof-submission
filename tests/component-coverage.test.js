import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence } from "../worker/evidence-adjudication.js";

const NOW = Date.UTC(2026, 10, 14);
const claimComponents = [
  { component_id: 1, text: "The agency issued the rule" },
  { component_id: 2, text: "The rule took effect in 2025" }
];
const sources = [
  {
    title: "Official record A",
    url: "https://nasa.gov/example-a",
    published_date: "2026-11-10",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
    relevance_assessment: { relevance: "HIGH" }
  },
  {
    title: "Official record B",
    url: "https://who.int/example-b",
    published_date: "2026-11-11",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
    relevance_assessment: { relevance: "HIGH" }
  }
];
function semantic(componentAssessments) {
  return {
    status: "COMPLETED_ADVISORY",
    claim_assessment: { claim_type: "COMPOUND", claim_risk: "HIGH" },
    assessments: [
      { source_index: 0, relation: "SUPPORTS" },
      { source_index: 1, relation: "SUPPORTS" }
    ],
    source_assessments: [
      { source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY" },
      { source_index: 1, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY" }
    ],
    component_assessments: componentAssessments
  };
}
const completePairs = [
  { component_id: 1, source_index: 0, relation: "SUPPORTS" },
  { component_id: 1, source_index: 1, relation: "SUPPORTS" },
  { component_id: 2, source_index: 0, relation: "SUPPORTS" },
  { component_id: 2, source_index: 1, relation: "SUPPORTS" }
];

test("a model-only compound label is advisory: no single-source shortcut, multi-source corroboration still decides", () => {
  // v0.2.90: the model called the claim compound but no separable parts exist.
  const compoundAssessment = { ...semantic([]), claim_assessment: { claim_type: "COMPOUND", claim_risk: "HIGH" } };
  const result = adjudicateEvidence({
    claim: "The agency issued the rule and it took effect in 2025",
    claimComponents: [{ component_id: 1, text: "The agency issued the rule and it took effect in 2025" }],
    sources,
    semanticAssessment: compoundAssessment,
    temporalSensitive: true,
    now: NOW
  });
  assert.notEqual(result.method, "SEMANTIC_COMPONENT_DECOMPOSITION_GATE");
  assert.notEqual(result.method, "SINGLE_AUTHORITATIVE_PRIMARY_EVIDENCE");
  const single = adjudicateEvidence({
    claim: "The agency issued the rule and it took effect in 2025",
    claimComponents: [{ component_id: 1, text: "The agency issued the rule and it took effect in 2025" }],
    sources: sources.slice(0, 1),
    semanticAssessment: { ...compoundAssessment, assessments: compoundAssessment.assessments.slice(0, 1), source_assessments: (compoundAssessment.source_assessments || []).slice(0, 1) },
    temporalSensitive: true,
    now: NOW
  });
  assert.equal(single.status, "NEEDS_REVIEW", "one source cannot decide a claim the model considers compound");
});

test("compound claim is not decisive when component evidence mapping is absent", () => {
  const result = adjudicateEvidence({
    claim: "The agency issued the rule and it took effect in 2025",
    claimComponents,
    sources,
    semanticAssessment: semantic([]),
    temporalSensitive: true,
    now: NOW
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.method, "SEMANTIC_COMPONENT_COVERAGE_GATE");
  assert.equal(result.adjudication_signals.review_reason, "SEMANTIC_COMPONENT_COVERAGE_GAP");
});

test("compound claim can pass component gate only with complete source-component pairs", () => {
  const result = adjudicateEvidence({
    claim: "The agency issued the rule and it took effect in 2025",
    claimComponents,
    sources,
    semanticAssessment: semantic(completePairs),
    temporalSensitive: true,
    now: NOW
  });
  assert.equal(result.status, "CURRENT");
});

test("component mapping rejects missing or duplicated source-component pairs", () => {
  const missing = adjudicateEvidence({
    claim: "The agency issued the rule and it took effect in 2025",
    claimComponents,
    sources,
    semanticAssessment: semantic(completePairs.slice(1)),
    temporalSensitive: true,
    now: NOW
  });
  const duplicate = adjudicateEvidence({
    claim: "The agency issued the rule and it took effect in 2025",
    claimComponents,
    sources,
    semanticAssessment: semantic([...completePairs, completePairs[0]]),
    temporalSensitive: true,
    now: NOW
  });
  assert.equal(missing.status, "NEEDS_REVIEW");
  assert.equal(duplicate.status, "NEEDS_REVIEW");
});

test("opposite relations across different components block a whole-claim verdict", () => {
  const splitPolarity = completePairs.map(item =>
    item.component_id === 2 ? { ...item, relation: "CONTRADICTS" } : item
  );
  const result = adjudicateEvidence({
    claim: "The agency issued the rule and it took effect in 2025",
    claimComponents,
    sources,
    semanticAssessment: semantic(splitPolarity),
    temporalSensitive: true,
    now: NOW
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.adjudication_signals.review_reason, "CONFLICTING_COMPONENT_EVIDENCE");
});

test("conflicting polarity inside a component blocks a decisive compound verdict", () => {
  const conflicting = completePairs.map(item =>
    item.component_id === 2 && item.source_index === 1
      ? { ...item, relation: "CONTRADICTS" }
      : item
  );
  const result = adjudicateEvidence({
    claim: "The agency issued the rule and it took effect in 2025",
    claimComponents,
    sources,
    semanticAssessment: semantic(conflicting),
    temporalSensitive: true,
    now: NOW
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.adjudication_signals.review_reason, "CONFLICTING_COMPONENT_EVIDENCE");
});
