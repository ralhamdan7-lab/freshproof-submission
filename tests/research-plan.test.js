// v0.2.84 — bounded research planning: value-masked and change queries.
import test from "node:test";
import assert from "node:assert/strict";
import { valueMaskedQuery, changeQuery, buildResearchPlan, extraQueryShare } from "../worker/research-plan.js";
import { classifyClaimFrame } from "../worker/claim-frame.js";
import { verify, page, vague, iso } from "./helpers/acquisition-harness.js";

const REF = "2026-11-15T12:00:00Z";
const frame = claim => classifyClaimFrame(claim, { referenceTime: REF });

test("value-masked query removes asserted dates, amounts and quantities only", () => {
  assert.equal(valueMaskedQuery("The Larkspur Water Convention entered into force on 1 January 2020."), "The Larkspur Water Convention entered into force");
  assert.equal(valueMaskedQuery("The Velmora Act was passed on March 3, 2019 by the parliament."), "The Velmora Act was passed by the parliament");
  assert.equal(valueMaskedQuery("The Ardent ferry pass costs $20 per month."), "The Ardent ferry pass costs per month");
  assert.equal(valueMaskedQuery("دخلت اتفاقية لاركسبر حيز التنفيذ في 20 أبريل 2006."), "دخلت اتفاقية لاركسبر حيز التنفيذ");
  assert.equal(valueMaskedQuery("Water is composed of hydrogen and oxygen."), null);
});

test("change query is built only for current-state claims and only from the claim's words", () => {
  assert.equal(changeQuery("The Larkspur Water Convention entered into force on 1 January 2020.", frame("The Larkspur Water Convention entered into force on 1 January 2020.")), null);
  const query = changeQuery("John Doe is CEO of Acme.", frame("John Doe is CEO of Acme."));
  assert.match(query, /^John Doe CEO of Acme /);
  assert.match(query, /appointed OR succeeded OR replaced/);
  assert.match(changeQuery("يشغل خالد ناصر منصب وزير النقل حالياً.", frame("يشغل خالد ناصر منصب وزير النقل حالياً.")), /تعيين/);
});

test("plan order: change first for current state, value-masked first otherwise; non-factual gets none", () => {
  assert.deepEqual(buildResearchPlan("The Ardent ferry pass costs 20 credits.", frame("The Ardent ferry pass costs 20 credits.")).map(step => step.purpose), ["CHANGE", "VALUE_MASKED"]);
  assert.deepEqual(buildResearchPlan("The Larkspur Water Convention entered into force on 1 January 2020.", frame("The Larkspur Water Convention entered into force on 1 January 2020.")).map(step => step.purpose), ["VALUE_MASKED"]);
  assert.deepEqual(buildResearchPlan("I think the 2020 policy is better.", frame("I think the 2020 policy is better.")), []);
});

test("fair share reserves one baseline query for each remaining claim", () => {
  assert.equal(extraQueryShare({ maxQueries: 5, used: 1, remainingClaimsAfter: 0 }), 3);
  assert.equal(extraQueryShare({ maxQueries: 5, used: 1, remainingClaimsAfter: 2 }), 1);
  assert.equal(extraQueryShare({ maxQueries: 5, used: 3, remainingClaimsAfter: 1 }), 1);
  assert.equal(extraQueryShare({ maxQueries: 5, used: 5, remainingClaimsAfter: 0 }), 0);
  assert.equal(extraQueryShare({ maxQueries: 5, used: 2, remainingClaimsAfter: 3 }), 0);
});

// Complete path: Q1 (the false claim verbatim) only finds vague pages; the
// value-masked query surfaces two independent primary records of the true date.
const falseClaim = "The Larkspur Water Convention entered into force on 1 January 2020.";
const truth = "The Larkspur Water Convention entered into force on 1 January 2019, ninety days after the twentieth ratification.";
const fixture = {
  search: query => query === falseClaim
    ? [vague("Larkspur water news", "https://news.example-daily.com/larkspur")]
    : [vague("Convention status", "https://www.larkspur-secretariat.int/status"), vague("Treaty record", "https://treaties.velmora.gov.au/larkspur")],
  pages: {
    "https://www.larkspur-secretariat.int/status": { html: page({ title: "Convention status", published: iso(2000), body: truth }) },
    "https://treaties.velmora.gov.au/larkspur": { html: page({ title: "Treaty record", published: iso(1900), body: "Depositary record: " + truth }) }
  },
  oracle: { contradicts: ["entered into force on 1 January 2019"], claimType: "HISTORICAL_EVENT", risk: "LOW", temporalKind: "HISTORICAL_EVENT" }
};

test("E2E: the value-masked query finds the true date and a false dated claim is CONTRADICTED", async () => {
  const { body, calls } = await verify(falseClaim, fixture);
  const claim = body.claims[0];
  assert.equal(claim.claim_frame.frame, "TIME_ANCHORED_EVENT");
  assert.ok(calls.search.some(request => request.query === "The Larkspur Water Convention entered into force"));
  assert.ok(claim.retrieval_diagnostics.some(item => item.stage === "RESEARCH_PLAN" && item.purpose === "VALUE_MASKED" && item.result_count === 2));
  assert.equal(claim.status, "CONTRADICTED");
  assert.equal(claim.execution.stages.search, "OK");
  assert.ok(["COMPLETED", "PARTIAL"].includes(claim.execution.status), "a failed fetch of one unrelated page may make execution PARTIAL");
});

test("E2E control: with a one-query budget the planner cannot run and the claim is not decided", async () => {
  const { body } = await verify(falseClaim, { ...fixture, env: { MAX_SEARCH_QUERIES: "1" } });
  assert.notEqual(body.claims[0].status, "CONTRADICTED");
  assert.equal(body.methodology.search_budget.limit, 1);
});
