import test from "node:test";
import assert from "node:assert/strict";
import { splitClaims, isLikelyTemporal, LIMITS } from "../worker/index.js";
import { adjudicateEvidence } from "../worker/evidence-adjudication.js";

// Deterministic pseudo-random generator: repeatable fuzz/property coverage.
function rng(seed = 0x5eedc0de) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
const RELATIONS = ["SUPPORTS", "CONTRADICTS", "MIXED", "IRRELEVANT", "INSUFFICIENT"];

function fixture(r, count, {sameHost = false, stale = false, future = false, relevance = "HIGH"} = {}) {
  const sources = Array.from({length: count}, (_, i) => ({
    title: `Synthetic source ${i}`,
    url: `https://${sameHost ? "single" : `source-${i}`}.agency.example.gov/evidence`,
    published_date: stale ? "2025-01-01" : future ? "2026-11-15" : "2026-11-10",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
    relevance_assessment: { relevance },
    snippet: "A controlled synthetic evidence excerpt."
  }));
  const relations = sources.map(() => pick(r, RELATIONS));
  const assessment = {
    status: "COMPLETED_ADVISORY",
    assessments: relations.map((relation, source_index) => ({source_index, relation, rationale:"synthetic test fixture"}))
  };
  return {sources, relations, assessment};
}

function assertNoUnsupportedVerdict(result, sources, relations, assessment) {
  if (!["CURRENT", "CONTRADICTED"].includes(result.status)) return;
  assert.equal(assessment.status, "COMPLETED_ADVISORY");
  const decisive = result.status === "CURRENT" ? "SUPPORTS" : "CONTRADICTS";
  const opposite = decisive === "SUPPORTS" ? "CONTRADICTS" : "SUPPORTS";
  assert.ok(!relations.includes(opposite), "a decisive verdict cannot coexist with qualified opposing relations");
  assert.ok(!relations.includes("MIXED"), "a decisive verdict cannot coexist with a mixed relation");
  const decisiveHosts = new Set(sources.filter((_, index) => relations[index] === decisive).map(x => new URL(x.url).hostname));
  assert.ok(decisiveHosts.size >= 2, "a decisive generic verdict requires two independent domains with the same decisive relation");
  assert.ok(sources.every(x => x.relevance_assessment.relevance === "HIGH"));
  assert.ok(sources.every(x => x.source_reliability === "PRIMARY_OR_OFFICIAL_DOMAIN"));
}

test("seeded randomized claim segmentation is deterministic, bounded, and non-empty", () => {
  const r = rng(0x1234abcd);
  const subjects = ["The current director", "The latest release", "The policy", "الرئيس الحالي", "أحدث إصدار", "القرار الحالي"];
  const predicates = ["is still active", "changed in 2025", "remains available", "was discontinued", "ما زال سارياً", "تغير في عام 2025"];
  const endings = [".", "؟", "؛", "!", "。"];
  for (let i = 0; i < 500; i++) {
    const n = 1 + Math.floor(r() * 9);
    const text = Array.from({length:n}, () => `${pick(r,subjects)} ${pick(r,predicates)}${pick(r,endings)}`).join(" ");
    const first = splitClaims(text);
    const second = splitClaims(text);
    assert.deepEqual(first, second, `non-deterministic segmentation at generated case ${i}`);
    assert.ok(first.length <= LIMITS.maxClaims, `claim cap exceeded at generated case ${i}`);
    assert.ok(first.every(x => typeof x === "string" && x.trim().length > 0));
  }
});

test("seeded randomized temporal classifier never throws or returns non-boolean values", () => {
  const r = rng(0x9abcdeff);
  const fragments = [
    "The current CEO remains in office.",
    "Apollo 11 landed in 1969.",
    "الرئيس الحالي أعلن القرار اليوم.",
    "وُقّعت المعاهدة عام 1919.",
    "The price is still $20 per month.",
    "Water is composed of hydrogen and oxygen.",
    "The latest version was released in 2025."
  ];
  for (let i = 0; i < 500; i++) {
    const value = Array.from({length:1 + Math.floor(r()*4)}, () => pick(r,fragments)).join(" ");
    assert.equal(typeof isLikelyTemporal(value), "boolean", `invalid temporal result at case ${i}`);
  }
});

test("seeded randomized adjudication never issues a verdict without complete independent corroboration", () => {
  const r = rng(0xfeedbeef);
  for (let i = 0; i < 500; i++) {
    const count = Math.floor(r() * 6);
    const mode = pick(r, ["normal","duplicate-host","stale","future","medium"]);
    const f = fixture(r, count, {
      sameHost: mode === "duplicate-host",
      stale: mode === "stale",
      future: mode === "future",
      relevance: mode === "medium" ? "MEDIUM" : "HIGH"
    });
    const result = adjudicateEvidence({
      claim: "The current policy is active.",
      sources: f.sources,
      semanticAssessment: f.assessment,
      retrievalCount: count,
      now: NOW,
      maxEvidenceAgeDays: 180,
      temporalSensitive: true
    });
    assertNoUnsupportedVerdict(result, f.sources, f.relations, f.assessment);
    if (mode === "duplicate-host" && count > 1) assert.ok(!["CURRENT","CONTRADICTED"].includes(result.status));
    if (mode === "stale" && count > 0) assert.ok(!["CURRENT","CONTRADICTED"].includes(result.status));
    if (mode === "future" && count > 0) assert.ok(!["CURRENT","CONTRADICTED"].includes(result.status));
    if (mode === "medium" && count > 0) assert.ok(!["CURRENT","CONTRADICTED"].includes(result.status));
  }
});

test("randomized malformed/incomplete semantic assessments always fail closed", () => {
  const r = rng(0xa11ce);
  for (let i = 0; i < 250; i++) {
    const count = 1 + Math.floor(r() * 5);
    const f = fixture(r, count);
    const malformed = pick(r, [
      {status:"PENDING", assessments:f.assessment.assessments},
      {status:"COMPLETED_ADVISORY", assessments:f.assessment.assessments.slice(1)},
      {status:"COMPLETED_ADVISORY", assessments:[...f.assessment.assessments, f.assessment.assessments[0]]},
      {status:"COMPLETED_ADVISORY", assessments:f.assessment.assessments.map((x,j)=>j===0?{...x,relation:"FAKE"}:x)}
    ]);
    const result = adjudicateEvidence({
      claim:"The current policy is active.",
      sources:f.sources,
      semanticAssessment:malformed,
      retrievalCount:count,
      now:NOW,
      temporalSensitive:true
    });
    assert.ok(!["CURRENT","CONTRADICTED"].includes(result.status), `malformed assessment produced verdict at case ${i}`);
  }
});

test("randomized non-time-sensitive claims still require semantic evidence and independent hosts", () => {
  const r = rng(0x77aa55);
  for (let i = 0; i < 200; i++) {
    const count = 1 + Math.floor(r() * 5);
    const f = fixture(r, count, {stale:true});
    const result = adjudicateEvidence({
      claim:"Water is composed of hydrogen and oxygen.",
      sources:f.sources,
      semanticAssessment:f.assessment,
      retrievalCount:count,
      now:NOW,
      temporalSensitive:false
    });
    assertNoUnsupportedVerdict(result, f.sources, f.relations, f.assessment);
  }
});
