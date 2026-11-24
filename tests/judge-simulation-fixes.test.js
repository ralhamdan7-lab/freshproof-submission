// v0.3.24 fixes from the judge-simulation run of 24 November 2026.
import test from "node:test";
import assert from "node:assert/strict";
import { claimMonthPeriods, dateWithinClaimedMonth, claimNamesAbsent } from "../worker/index.js";
import { adjudicateEvidence } from "../worker/evidence-adjudication.js";

test("a day inside the claimed month does not contradict the claimed month", () => {
  assert.deepEqual(claimMonthPeriods("OpenAI released ChatGPT in November 2022."), [{ month: "november", year: "2022" }]);
  assert.deepEqual(claimMonthPeriods("ChatGPT was released on 30 November 2022."), []);
  assert.deepEqual(claimMonthPeriods("ChatGPT was released on November 30, 2022."), []);
  assert.equal(dateWithinClaimedMonth("OpenAI released ChatGPT in November 2022.", "ChatGPT launched on November 23, 2022."), true);
  assert.equal(dateWithinClaimedMonth("OpenAI released ChatGPT in November 2022.", "It launched on 30 November 2022."), true);
  assert.equal(dateWithinClaimedMonth("OpenAI released ChatGPT in November 2022.", "It was released in December 2022."), false);
  assert.equal(dateWithinClaimedMonth("World War II ended in 1946.", "The war ended on 2 September 1945."), false);
  assert.equal(dateWithinClaimedMonth("The treaty was signed on 4 March 2020.", "It was signed on 5 March 2020."), false);
});

test("a temperature scale written as its symbol counts as named", () => {
  assert.deepEqual(claimNamesAbsent("Water boils at 100 degrees Celsius at sea level.", "Water boils at 100 °C at sea level."), []);
  assert.deepEqual(claimNamesAbsent("Water boils at 100 degrees Celsius.", "Water boils at 212 °F."), ["Celsius"]);
});

const now = Date.parse("2026-11-24T03:00:00.000Z");
const src = (host, reliability, basis) => ({ title: `${host} page`, url: `https://www.${host}/page`, snippet: `Canberra is the capital of Australia (${host}).`, source_reliability: reliability, reliability_basis: basis, evidence_origin: "DIRECT_PAGE_PASSAGES", retrieved_at: "2026-11-24T02:59:00.000Z", relevance_assessment: { relevance: "HIGH" } });

test("a never-true present-state claim is contradicted, not superseded, without a documented change", () => {
  const sources = [src("worldatlas.com", "SECONDARY_REPUTABLE", "CURATED_OR_SUFFIX_REGISTRY"), src("britannica.com", "SECONDARY_REPUTABLE", "CURATED_OR_SUFFIX_REGISTRY"), src("australia-facts.example", "UNASSESSED", "UNCLASSIFIED_PUBLISHER"), src("geo-notes.example", "UNASSESSED", "UNCLASSIFIED_PUBLISHER")];
  const sem = role => ({ status: "COMPLETED_ADVISORY", claim_assessment: { claim_type: "CURRENT_STATE", claim_risk: "LOW", temporal_claim_kind: "CURRENT_STATE" },
    assessments: sources.map((_, i) => ({ source_index: i, relation: "CONTRADICTS" })),
    source_assessments: sources.map((_, i) => ({ source_index: i, directness: "DIRECT", scope_match: "EXACT", authority_role: "SECONDARY", temporal_role: role, change_type: "NONE" })) });
  const run = role => adjudicateEvidence({ claim: "The capital of Australia is Sydney.", sources, semanticAssessment: sem(role), claimFrame: { frame: "CURRENT_STATE", is_time_sensitive: true, temporal_status: "TEMPORAL_REVIEW_REQUIRED" }, temporalSensitive: true, now, changeSearchPerformed: true });
  for (const role of ["HISTORICAL_RECORD", "EVENT_REPORT", "BACKGROUND"]) assert.notEqual(run(role).status, "SUPERSEDED", role);
});

test("v0.3.25: a name carried by the publisher's own domain counts as present", () => {
  assert.deepEqual(claimNamesAbsent("Argentina won the 2022 FIFA World Cup.", "Argentina won the World Cup in Qatar in 2022. fifa.com"), []);
  assert.deepEqual(claimNamesAbsent("Argentina won the 2022 FIFA World Cup.", "Argentina won the World Cup in Qatar in 2022."), ["FIFA"]);
});
