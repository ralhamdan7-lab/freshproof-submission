import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence } from "../worker/evidence-adjudication.js";

test("actual semantic-provider outage payloads abstain instead of issuing CURRENT", () => {
  const now = Date.parse("2026-11-15T00:00:00.000Z");
  const sources = [
    {
      url: "https://www.nasa.gov/example",
      title: "Apollo 13",
      snippet: "The lunar landing was aborted.",
      published_date: "2026-11-10",
      source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
      relevance_assessment: { relevance: "HIGH" }
    },
    {
      url: "https://www.si.edu/example",
      title: "Apollo 13",
      snippet: "The mission did not land on the Moon.",
      published_date: "2026-11-11",
      source_reliability: "INSTITUTIONAL",
      relevance_assessment: { relevance: "HIGH" }
    }
  ];

  for (const semanticAssessment of [
    { status: "FAILED_CLOSED", provider: "cloudflare", assessments: [], failure_code: "PROVIDER_LIMIT_OR_QUOTA" },
    { status: "DISABLED_BY_PROVIDER_QUOTA", provider: "cloudflare", assessments: [] }
  ]) {
    const result = adjudicateEvidence({
      claim: "Apollo 13 landed on the Moon in 1970.",
      sources,
      semanticAssessment,
      retrievalCount: sources.length,
      now,
      temporalSensitive: true
    });

    assert.equal(result.status, "NEEDS_REVIEW");
    assert.equal(result.method, "CONSERVATIVE_EVIDENCE_ADJUDICATION");
    assert.equal(result.adjudication_signals.semantic_assessment_complete, false);
    assert.equal(result.evidence.every(item => item.relation === "UNASSESSED"), true);
  }
});
