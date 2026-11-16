// v0.2.90 model-planned retrieval through the real request handler.
import test from "node:test";
import assert from "node:assert/strict";
import { verify, page, vague } from "./helpers/acquisition-harness.js";

const CLAIM = "انضمت فيلمورا إلى اتحاد أردنت الجمركي عام 2010.";
const OFFICIAL = "https://www.ardent-union.int/members/velmora";
const officialHtml = page({ title: "Velmora accession", body: "Velmora joined the Ardent Customs Union on 1 July 2013 following ratification." });

test("an Arabic claim's planned English authority-domain query reaches the official record", async () => {
  const { body, calls } = await verify(CLAIM, {
    search: (query, request) => (request.include_domains || []).includes("ardent-union.int") ? [vague("Velmora accession", OFFICIAL)] : [],
    pages: { [OFFICIAL]: { html: officialHtml } },
    oracle: {
      plan: { queries: [{ query: "Velmora accession Ardent Customs Union date", language: "en", purpose: "OFFICIAL_RECORD" }, { query: "انضمام فيلمورا اتحاد أردنت الجمركي", language: "ar", purpose: "NEUTRAL_FACT" }], authority_domains: ["ardent-union.int"] },
      contradicts: ["1 July 2013"]
    }
  });
  const planned = calls.search.find(item => (item.include_domains || []).includes("ardent-union.int"));
  assert.ok(planned, "authority-domain search issued");
  assert.equal(planned.query, "Velmora accession Ardent Customs Union date");
  const claim = body.claims[0];
  const official = claim.sources.find(source => source.url === OFFICIAL);
  assert.ok(official, "official record retrieved");
  assert.equal(official.discovery_purpose, "MODEL_AUTHORITY_DOMAINS");
  assert.equal(official.source_reliability, "PRIMARY_OR_OFFICIAL_DOMAIN", "reliability comes from deterministic rules (.int), not from the plan");
  assert.equal(official.relevance_assessment.method, "PLANNED_QUERY_RELEVANCE_SCREEN", "cross-lingual relevance via the planned English query");
  assert.match(official.snippet, /1 July 2013/, "passages selected with the planned query, not the vague search snippet");
  assert.equal(claim.status, "CONTRADICTED");
  assert.equal(claim.confidence_tier, "STRONG");
  const diag = claim.retrieval_diagnostics.find(item => item.stage === "MODEL_SEARCH_PLAN");
  assert.equal(diag.status, "COMPLETED");
  assert.ok(calls.search.length <= 7, "request search budget respected");
});

test("a failed planner leaves the deterministic retrieval path intact", async () => {
  const { body, calls } = await verify("The Larkspur Dam was completed in 1998.", {
    search: () => [vague("Larkspur Dam", "https://www.larkspur-water.gov/dam")],
    pages: {},
    oracle: { planFails: true, supports: ["1998"] }
  });
  assert.equal(body.claims.length, 1);
  assert.equal(calls.plan, 1);
  assert.ok(calls.search.length >= 1);
  assert.equal(body.claims[0].retrieval_diagnostics.find(item => item.stage === "MODEL_SEARCH_PLAN").status, "FAILED");
});

test("the planner is not called when semantic triage is disabled", async () => {
  const { calls } = await verify("The Larkspur Dam was completed in 1998.", { search: () => [], env: { ENABLE_SEMANTIC_TRIAGE: "false" } });
  assert.equal(calls.plan || 0, 0);
});
