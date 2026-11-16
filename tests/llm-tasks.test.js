// v0.2.90 model-assisted decomposition and search planning: the model's output
// is validated before use. Synthetic entities only.
import test from "node:test";
import assert from "node:assert/strict";
import { validateDecomposition, validateSearchPlan, decomposeClaimsWithModel, planSearchWithModel, parseJsonObject } from "../worker/llm-tasks.js";

const TEXT = "The Larkspur Dam opened in 1998 near Port Ash. It was renamed the Velmora Dam in 2015, and it produces 420 MW. I think it is the most beautiful dam in the region.";
const fakeAi = response => ({ run: async () => ({ response: typeof response === "string" ? response : JSON.stringify(response), _freshproof_provider: "test" }) });

test("decomposition keeps claims tied to verbatim spans and never accepts invented numbers", () => {
  const { claims, rejected } = validateDecomposition({ claims: [
    { claim: "The Larkspur Dam opened in 1998.", span: "The Larkspur Dam opened in 1998 near Port Ash.", kind: "FACT" },
    { claim: "The Larkspur Dam was renamed the Velmora Dam in 2015.", span: "It was renamed the Velmora Dam in 2015, and it produces 420 MW.", kind: "FACT" },
    { claim: "The Velmora Dam produces 420 MW.", span: "It was renamed the Velmora Dam in 2015, and it produces 420 MW.", kind: "FACT" },
    { claim: "The Velmora Dam produces 450 MW.", span: "It was renamed the Velmora Dam in 2015, and it produces 420 MW.", kind: "FACT" },
    { claim: "The dam opened in 1998.", span: "The dam was opened in 1998 by the king.", kind: "FACT" },
    { claim: "The Larkspur Dam is the most beautiful dam in the region.", span: "I think it is the most beautiful dam in the region.", kind: "OPINION" },
    { claim: "The Larkspur Dam opened in 1998.", span: "The Larkspur Dam opened in 1998 near Port Ash.", kind: "FACT" },
    { claim: "x", span: "The Larkspur Dam opened in 1998 near Port Ash.", kind: "FACT" },
    { claim: "The Larkspur Dam opened in 1998 near Port Ash.", span: "The Larkspur Dam opened in 1998 near Port Ash.", kind: "RUMOUR" }
  ] }, TEXT);
  assert.deepEqual(claims.map(item => item.claim), [
    "The Larkspur Dam opened in 1998.",
    "The Larkspur Dam was renamed the Velmora Dam in 2015.",
    "The Velmora Dam produces 420 MW.",
    "The Larkspur Dam is the most beautiful dam in the region."
  ]);
  assert.equal(rejected.invented_number, 1, "450 MW is not in the span");
  assert.equal(rejected.span_not_verbatim, 1);
  assert.equal(rejected.duplicate, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected.kind, 1);
});

test("decomposition accepts Arabic spans and Arabic-Indic digits", () => {
  const text = "افتُتح سد لاركسبير عام ١٩٩٨. وفي العام التالي أُعيدت تسميته.";
  const { claims } = validateDecomposition({ claims: [{ claim: "افتُتح سد لاركسبير عام 1998.", span: "افتُتح سد لاركسبير عام ١٩٩٨.", kind: "FACT" }] }, text);
  assert.equal(claims.length, 1);
});

test("search plans drop URLs, site operators, duplicates of the claim and invalid domains", () => {
  const claim = "Velmora joined the Ardent Customs Union in 2010.";
  const plan = validateSearchPlan({
    queries: [
      { query: "Velmora joined the Ardent Customs Union in 2010.", language: "en", purpose: "NEUTRAL_FACT" },
      { query: "year Velmora joined Ardent Customs Union", language: "en", purpose: "NEUTRAL_FACT" },
      { query: "Velmora accession site:ardent-union.int", language: "en", purpose: "OFFICIAL_RECORD" },
      { query: "see https://evil.example/x", language: "en", purpose: "NEUTRAL_FACT" },
      { query: "Velmora membership status", language: "en", purpose: "LATEST_STATUS" },
      { query: "fourth query beyond the limit", language: "en", purpose: "NEUTRAL_FACT" }
    ],
    authority_domains: ["https://www.ardent-union.int/members", "192.168.1.1", "localhost", "intranet.internal", "velmora.gov", "a", "mfa.velmora.gov", "fourth.org"]
  }, claim);
  assert.deepEqual(plan.queries.map(item => item.query), ["year Velmora joined Ardent Customs Union", "Velmora accession", "Velmora membership status"]);
  assert.deepEqual(plan.authority_domains, ["ardent-union.int", "velmora.gov", "mfa.velmora.gov"]);
});

test("model calls fail safe and parse fenced JSON", async () => {
  assert.equal((await decomposeClaimsWithModel(TEXT, null)).status, "NOT_CONFIGURED");
  assert.equal((await decomposeClaimsWithModel(TEXT, fakeAi("not json"))).status, "INVALID_RESPONSE");
  assert.equal((await decomposeClaimsWithModel(TEXT, { run: async () => { throw Object.assign(new Error("x"), { code: "rate_limited" }); } })).status, "FAILED");
  const ok = await decomposeClaimsWithModel(TEXT, fakeAi("```json\n" + JSON.stringify({ claims: [{ claim: "The Larkspur Dam opened in 1998.", span: "The Larkspur Dam opened in 1998 near Port Ash.", kind: "FACT" }] }) + "\n```"));
  assert.equal(ok.status, "COMPLETED");
  assert.equal(ok.claims.length, 1);
  const plan = await planSearchWithModel("Velmora joined the Ardent Customs Union in 2010.", { frame: "TIME_ANCHORED_EVENT" }, fakeAi({ queries: [{ query: "Velmora accession date Ardent Customs Union", language: "en", purpose: "OFFICIAL_RECORD" }], authority_domains: ["ardent-union.int"] }));
  assert.equal(plan.status, "COMPLETED");
  assert.deepEqual(plan.authority_domains, ["ardent-union.int"]);
  const slow = await planSearchWithModel("x claim here", null, { run: () => new Promise(() => {}) }, { timeoutMs: 20 });
  assert.equal(slow.status, "FAILED");
  assert.equal(parseJsonObject("prefix {\"a\":1} suffix").a, 1);
});

test("the provider receives routing hints only on the Groq path", async () => {
  let seen;
  const ai = { run: async (_model, input) => { seen = input; return { response: JSON.stringify({ queries: [], authority_domains: [] }) }; } };
  await planSearchWithModel("Velmora joined the union in 2010.", null, ai);
  assert.equal(seen._freshproof_tier, "light");
  assert.equal(seen.response_format.type, "json_schema");
});
