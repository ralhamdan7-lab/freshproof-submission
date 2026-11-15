import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence } from "../worker/evidence-adjudication.js";

const now = Date.parse("2026-11-15T00:00:00Z");

function source(url, reliability, published_date, event_date_candidate = null) {
  return {
    url,
    title: "Institutional record of a formal status change",
    snippet: "The institution confirms the formal change of membership status and its effective date.",
    published_date,
    event_date_candidate,
    retrieved_at: "2026-11-15T00:00:00.000Z",
    source_reliability: reliability,
    relevance_assessment: { relevance: "HIGH" }
  };
}

function assessment(count) {
  return {
    status: "COMPLETED_ADVISORY",
    assessments: Array.from({ length: count }, (_, source_index) => ({ source_index, relation: "CONTRADICTS" })),
    claim_assessment: { claim_type: "CURRENT_STATE", claim_risk: "MEDIUM" },
    source_assessments: [
      { source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY" },
      { source_index: 1, directness: "DIRECT", scope_match: "EXACT", authority_role: "SECONDARY" }
    ]
  };
}

test("general current-state claim can use an authoritative dated transition plus independent recent corroboration", () => {
  const claim = "The Republic of Example is currently a member of Treaty Z.";
  const sources = [
    source("https://treaty-authority.example/withdrawal-record", "PRIMARY_OR_OFFICIAL_DOMAIN", "2024-04-01", "2020-01-31"),
    source("https://independent-institute.example/current-status", "INSTITUTIONAL", "2026-05-25")
  ];
  const result = adjudicateEvidence({
    claim,
    sources,
    semanticAssessment: assessment(2),
    now,
    temporalSensitive: true
  });

  assert.equal(result.status, "CONTRADICTED");
  assert.equal(result.method, "TEMPORAL_TRANSITION_CORROBORATION");
  assert.equal(result.evidence.length, 2);
});

test("a historical transition alone never establishes a current-state verdict", () => {
  const claim = "The Republic of Example is currently a member of Treaty Z.";
  const sources = [
    source("https://treaty-authority.example/withdrawal-record", "PRIMARY_OR_OFFICIAL_DOMAIN", "2024-04-01", "2020-01-31")
  ];
  const oneSourceAssessment = {
    status: "COMPLETED_ADVISORY",
    assessments: [{ source_index: 0, relation: "CONTRADICTS" }],
    claim_assessment: { claim_type: "CURRENT_STATE", claim_risk: "MEDIUM" },
    source_assessments: [
      { source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY" }
    ]
  };
  const result = adjudicateEvidence({
    claim,
    sources,
    semanticAssessment: oneSourceAssessment,
    now,
    temporalSensitive: true
  });

  assert.equal(result.status, "NEEDS_REVIEW");
});

test("recent independent sources with conflicting semantic relations still require review", () => {
  const claim = "The current membership status of Example in Treaty Z is active.";
  const sources = [
    source("https://treaty-authority.example/status", "PRIMARY_OR_OFFICIAL_DOMAIN", "2026-11-10"),
    source("https://independent-institute.example/status", "INSTITUTIONAL", "2026-11-11")
  ];
  const mixedAssessment = assessment(2);
  mixedAssessment.assessments[1].relation = "SUPPORTS";
  const result = adjudicateEvidence({
    claim,
    sources,
    semanticAssessment: mixedAssessment,
    now,
    temporalSensitive: true
  });

  assert.equal(result.status, "NEEDS_REVIEW");
});
