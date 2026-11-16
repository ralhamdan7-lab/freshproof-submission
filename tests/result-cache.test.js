import test from "node:test";
import assert from "node:assert/strict";
import { createResultCache, normalizeClaimKey, cacheableResult, ttlFor } from "../worker/result-cache.js";

function fakeCache() {
  const store = new Map();
  return { store, match: async key => store.has(key) ? new Response(store.get(key)) : undefined, put: async (key, response) => { store.set(key, await response.text()); } };
}

test("v0.2.91 result cache: stores completed results, never NOT_ASSESSED", async () => {
  const cache = fakeCache();
  const rc = createResultCache({}, cache);
  const done = { claim_id: "claim-1", status: "CURRENT", execution: { status: "COMPLETED" }, claim_frame: { frame: "STABLE_FACT" } };
  assert.equal(await rc.put("0.2.91", "Water boils at 100 C.", done), true);
  const hit = await rc.get("0.2.91", "  water boils at 100 c ");
  assert.equal(hit.status, "CURRENT");
  assert.equal(hit.result_cache.status, "HIT");
  assert.ok(hit.result_cache.assessed_at);
  assert.equal(await rc.get("0.2.92", "Water boils at 100 C."), null, "a new version never reuses old results");
  assert.equal(await rc.put("0.2.91", "x claim", { status: "NOT_ASSESSED", execution: { status: "PROVIDER_LIMITED" } }), false);
  assert.equal(cacheableResult({ status: "CURRENT", execution: { status: "COMPLETED" }, resolved_context: { resolution: "PRONOUN_RESOLVED" } }), false);
  assert.ok(ttlFor({ claim_frame: { frame: "CURRENT_STATE" } }) < ttlFor({ claim_frame: { frame: "STABLE_FACT" } }));
});

test("v0.2.91 result cache: disabled by flag or without Cache API", async () => {
  assert.equal(createResultCache({ ENABLE_RESULT_CACHE: "false" }, fakeCache()).enabled, false);
  assert.equal(createResultCache({}, null).enabled, false);
  assert.equal(normalizeClaimKey("Canberra  is the capital."), normalizeClaimKey("canberra is the capital"));
});

test("v0.2.91 result cache: abstentions are kept only briefly", async () => {
  const { ttlFor } = await import("../worker/result-cache.js");
  assert.equal(ttlFor({ status: "NEEDS_REVIEW", claim_frame: { frame: "STABLE_FACT" } }), 1800);
  assert.ok(ttlFor({ status: "CONTRADICTED", claim_frame: { frame: "STABLE_FACT" } }) > 1800);
  assert.ok(ttlFor({ status: "UNVERIFIABLE", adjudication: { method: "NOT_A_FACTUAL_CLAIM" }, claim_frame: { frame: "NON_FACTUAL" } }) > 1800);
});
