import test from "node:test";
import assert from "node:assert/strict";
import { evidenceConfidence } from "../worker/index.js";

const sources = [
  { url: "https://www.example.gov/report-a", source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", published_date: "2026-10-01", relevance_assessment: { relevance: "HIGH" } },
  { url: "https://data.example.edu/report-b", source_reliability: "INSTITUTIONAL", published_date: "2026-10-02", relevance_assessment: { relevance: "HIGH" } },
  { url: "https://blog.example.com/report-c", source_reliability: "UNASSESSED", published_date: "2026-10-03", relevance_assessment: { relevance: "HIGH" } }
];

test("retrieval count and publication dates alone never inflate evidence confidence", () => {
  assert.equal(evidenceConfidence(sources, { status: "DISABLED_BY_DEFAULT", assessments: [] }), "LIMITED");
  assert.equal(evidenceConfidence(sources, null), "LIMITED");
});

test("no retrieved sources produce NONE", () => {
  assert.equal(evidenceConfidence([], { status: "COMPLETED_ADVISORY", assessments: [] }), "NONE");
});

test("two independent qualified sources with same advisory relation produce a candidate label, not a verdict", () => {
  const assessment = {
    status: "COMPLETED_ADVISORY",
    assessments: [
      { source_index: 0, relation: "SUPPORTS" },
      { source_index: 1, relation: "SUPPORTS" },
      { source_index: 2, relation: "SUPPORTS" }
    ]
  };
  assert.equal(evidenceConfidence(sources, assessment), "CORROBORATION_CANDIDATE_WITH_DATES");
});

test("same-host duplicates and unassessed domains cannot create a corroboration candidate", () => {
  const duplicated = [
    sources[0],
    { ...sources[0], url: "https://www.example.gov/another-report" },
    sources[2]
  ];
  const assessment = {
    status: "COMPLETED_ADVISORY",
    assessments: [
      { source_index: 0, relation: "SUPPORTS" },
      { source_index: 1, relation: "SUPPORTS" },
      { source_index: 2, relation: "SUPPORTS" }
    ]
  };
  assert.equal(evidenceConfidence(duplicated, assessment), "LIMITED");
});

test("conflicting advisory relations do not combine into a corroboration candidate", () => {
  const assessment = {
    status: "COMPLETED_ADVISORY",
    assessments: [
      { source_index: 0, relation: "SUPPORTS" },
      { source_index: 1, relation: "CONTRADICTS" },
      { source_index: 2, relation: "SUPPORTS" }
    ]
  };
  assert.equal(evidenceConfidence(sources, assessment), "LIMITED");
});
