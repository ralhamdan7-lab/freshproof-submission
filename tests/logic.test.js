import { detectTextDirection } from "../src/text-direction.js";
import test from "node:test";
import assert from "node:assert/strict";
import { buildTemporalSearchQuery, splitClaims, isLikelyTemporal, sourceReliability, alignSourceToClaim, assessClaimRelation, compareEvidenceSet, adjudicateEvidenceWithModel, SEMANTIC_MODEL, LIMITS, VERSION, DOMAIN_ADAPTERS } from "../worker/index.js";

test("splits an answer into bounded independent sentence candidates", () => {
  assert.equal(splitClaims("The capital city is Riyadh. The current population estimate is 7 million.").length, 2);
});
test("splits explicit coordinated clauses into separate claim candidates", () => {
  const claims = splitClaims("The current CEO was appointed in 2025; the company revenue increased by 12 percent.");
  assert.equal(claims.length, 2);
  assert.match(claims[0], /CEO/);
  assert.match(claims[1], /revenue/);
});
test("splits clearly marked Arabic clauses without splitting ordinary commas", () => {
  const claims = splitClaims("الرئيس الحالي أعلن القرار اليوم؛ كما أن الوزير استقال في عام 2025.");
  assert.equal(claims.length, 2);
  assert.match(claims[1], /الوزير استقال/);
});
test("splits Arabic sentence boundaries into separate claim candidates", () => {
  const claims = splitClaims("الرياض عاصمة المملكة العربية السعودية. يبلغ عدد السكان الحالي سبعة ملايين نسمة.");
  assert.equal(claims.length, 2);
  assert.match(claims[1], /السكان الحالي/);
});
test("caps claims to control external search usage", () => {
  const text = Array.from({ length: 8 }, (_, i) => `Statement number ${i + 1} contains enough words to qualify as a candidate claim.`).join(" ");
  assert.equal(splitClaims(text).length, LIMITS.maxClaims);
});
test("detects time-sensitive office-holder, price and date claims", () => {
  assert.equal(isLikelyTemporal("The current CEO was appointed in 2025."), true);
  assert.equal(isLikelyTemporal("The price is currently 25 dollars."), true);
});
test("detects continuity and unchanged-state assertions as time-sensitive", () => {
  assert.equal(isLikelyTemporal("its official brand name has not changed."), true);
  assert.equal(isLikelyTemporal("The policy remains unchanged."), true);
  assert.equal(isLikelyTemporal("The service is still available."), true);
  assert.equal(isLikelyTemporal("The platform was formerly known as Twitter."), true);
});
test("detects common Arabic temporal indicators", () => {
  assert.equal(isLikelyTemporal("الرئيس الحالي أعلن القرار."), true);
  assert.equal(isLikelyTemporal("البيانات الحالية متاحة للمراجعة."), true);
  assert.equal(isLikelyTemporal("التصنيف الراهن للجهة تغير."), true);
  assert.equal(isLikelyTemporal("الرئيس الحالي أعلن القرار اليوم."), true);
  assert.equal(isLikelyTemporal("أحدث إصدار من النظام صدر مؤخراً."), true);
});
test("does not mistake fixed historical years for temporal sensitivity", () => {
  assert.equal(isLikelyTemporal("Apollo 11 landed on the Moon in 1969."), false);
  assert.equal(isLikelyTemporal("وُقّعت معاهدة فرساي عام 1919."), false);
  assert.equal(isLikelyTemporal("World War II ended in 1945."), false);
});
test("detects dated claims when the subject is inherently changeable", () => {
  assert.equal(isLikelyTemporal("The population estimate in 2025 was 2.4 million."), true);
  assert.equal(isLikelyTemporal("The GDP growth rate in 2025 was 3 percent."), true);
  assert.equal(isLikelyTemporal("تم تعيين الوزير في عام 2025."), true);
});
test("leaves stable scientific statements outside temporal triage", () => {
  assert.equal(isLikelyTemporal("Water is composed of hydrogen and oxygen atoms."), false);
});
test("classifies known official domains separately from unassessed sources", () => {
  assert.equal(sourceReliability("https://www.census.gov/data.html"), "PRIMARY_OR_OFFICIAL_DOMAIN");
  assert.equal(sourceReliability("https://about.x.com/en"), "PRIMARY_OR_OFFICIAL_DOMAIN");
  assert.equal(sourceReliability("https://x.com/Ravi/status/123"), "UNASSESSED");
  assert.equal(sourceReliability("https://twitter.com/user/status/123"), "UNASSESSED");
  assert.equal(sourceReliability("https://example.com/news"), "UNASSESSED");
  assert.equal(sourceReliability("not a url"), "UNKNOWN");
});
test("does not treat non-http links as valid source URLs", () => {
  assert.equal(sourceReliability("javascript:alert(1)"), "UNKNOWN");
});

import worker from "../worker/index.js";
test("health endpoint responds without external services", async () => {
  const response = await worker.fetch(new Request("https://freshproof.test/api/health"), { ALLOWED_ORIGIN: "*" });
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.ok, true);
  assert.equal(health.version, VERSION);
});
test("verification fails closed when Tavily secret is absent", async () => {
  const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "The current CEO was appointed in 2025." })
  }), {});
  assert.equal(response.status, 503);
});
test("rejects oversized inputs before search", async () => {
  const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "x".repeat(12001) })
  }), { TAVILY_API_KEY: "test-only" });
  assert.equal(response.status, 413);
});
test("enforces configured origin", async () => {
  const response = await worker.fetch(new Request("https://freshproof.test/api/health", { headers: { origin: "https://evil.example" } }), { ALLOWED_ORIGIN: "https://demo.example" });
  assert.equal(response.status, 403);
});
test("normalizes mocked Tavily evidence without turning search presence into a truth verdict", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.tavily.com/search");
    const sent = JSON.parse(init.body);
    assert.equal(sent.include_answer, false);
    assert.equal(sent.include_published_date, true);
    assert.equal(sent.time_range, "year");
    assert.equal(sent.filter_by_published_date, false);
    assert.equal(Object.hasOwn(sent, "max_age_hours"), false);
    return new Response(JSON.stringify({ results: [
      { title: "Official release", url: "https://example.gov/release", content: "The new policy took effect on January 2, 2026.", published_date: "2026-01-04", score: 0.91 },
      { title: "Independent report", url: "https://news.example.org/policy", content: "The policy change was implemented in 2026.", published_date: "2026-01-05", score: 0.82 }
    ] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "The latest policy took effect in 2026." })
    }), { TAVILY_API_KEY: "mock-key", ALLOWED_ORIGIN: "*" });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.version, VERSION);
    assert.equal(result.claims[0].claim_id, "claim-1");
    assert.equal(result.claims[0].extraction, "HEURISTIC_CLAUSE");
    assert.equal(result.claims[0].status, "NEEDS_REVIEW");
    assert.equal(result.claims[0].sources.length, 2);
    assert.equal(result.claims[0].sources[0].published_date, "2026-01-04");
    assert.equal(result.claims[0].sources[0].event_date_candidate, "January 2, 2026");
    assert.equal(result.claims[0].freshness.label, "OLD");
  } finally { globalThis.fetch = originalFetch; }
});

test("flags future publication dates as metadata anomalies, not fresh evidence", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [
    { title: "Future-dated result", url: "https://example.org/report", content: "The policy is currently active.", published_date: "2099-01-01", score: 0.9 }
  ] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "The policy is currently active and applies to all agencies." })
    }), { TAVILY_API_KEY: "mock-key", ALLOWED_ORIGIN: "*" });
    const result = await response.json();
    assert.equal(result.claims[0].freshness.label, "UNKNOWN");
    assert.equal(result.claims[0].freshness.date_anomaly, "FUTURE_PUBLICATION_DATE");
    assert.equal(result.claims[0].claim_id, "claim-1");
    assert.equal(result.claims[0].extraction, "HEURISTIC_CLAUSE");
    assert.equal(result.claims[0].status, "NEEDS_REVIEW");
  } finally { globalThis.fetch = originalFetch; }
});

test("preserves Arabic event-year context separately from publication date", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [
    { title: "Arabic source", url: "https://example.org/ar", content: "تم تطبيق القرار في عام 2024 وفق البيان.", published_date: "2026-11-01", score: 0.8 }
  ] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "القرار الحالي مطبق على جميع الجهات الحكومية منذ عام 2024." })
    }), { TAVILY_API_KEY: "mock-key", ALLOWED_ORIGIN: "*" });
    const result = await response.json();
    assert.equal(result.claims[0].sources[0].event_date_candidate, "في عام 2024");
    assert.equal(result.claims[0].sources[0].published_date, "2026-11-01");
  } finally { globalThis.fetch = originalFetch; }
});


test("aligns retrieved source terms to a claim without inferring support", () => {
  const aligned = alignSourceToClaim("The current policy applies to public agencies", "Official policy update: the policy applies to public agencies from July");
  assert.equal(aligned.label, "MULTIPLE_TERM_OVERLAP");
  assert.ok(aligned.matched_claim_terms.includes("policy"));
  assert.equal(aligned.method, "NORMALIZED_TOKEN_OVERLAP");
  const unrelated = alignSourceToClaim("The current policy applies to public agencies", "Weather forecast predicts rain tomorrow");
  assert.equal(unrelated.label, "NO_CLEAR_TERM_OVERLAP");
});

test("includes transparent term-overlap metadata in each retrieved source", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [
    { title: "Policy update", url: "https://example.org/policy", content: "The policy applies to public agencies.", published_date: "2026-11-01", score: 0.8 }
  ] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "The current policy applies to public agencies today." })
    }), { TAVILY_API_KEY: "mock-key", ALLOWED_ORIGIN: "*" });
    const result = await response.json();
    assert.equal(result.claims[0].sources[0].claim_alignment.label, "MULTIPLE_TERM_OVERLAP");
    assert.ok(result.claims[0].sources[0].relation_assessment);
    assert.equal(result.claims[0].sources[0].relation_assessment.requires_review, true);
    assert.equal(result.claims[0].status, "NEEDS_REVIEW");
    assert.match(result.methodology.limitations.join(" "), /Term overlap and rule-based relation signals are review aids only/);
  } finally { globalThis.fetch = originalFetch; }
});


test("flags explicit claim-source polarity differences as review candidates, never verdicts", () => {
  const claim = "The current policy applies to public agencies";
  const source = "The policy does not apply to public agencies under the current rule";
  const alignment = alignSourceToClaim(claim, source);
  const assessment = assessClaimRelation(claim, source, alignment);
  assert.equal(assessment.signal, "POTENTIAL_POLARITY_CONFLICT");
  assert.equal(assessment.requires_review, true);
});

test("flags numeric disagreement conservatively when claim topics overlap", () => {
  const claim = "The current inflation rate is 4 percent";
  const source = "Current inflation rate stands at 6 percent";
  const alignment = alignSourceToClaim(claim, source);
  const assessment = assessClaimRelation(claim, source, alignment);
  assert.equal(assessment.signal, "POTENTIAL_NUMERIC_DISAGREEMENT");
  assert.equal(assessment.requires_review, true);
});

test("compares multiple sources and exposes conflict candidates with explicit caveats", () => {
  const base = { claim_alignment: { matched_claim_terms: ["policy", "agency", "current"] } };
  const conflicts = compareEvidenceSet([
    { ...base, url: "https://a.example/report", snippet: "The current policy applies to agency X in 2026." },
    { ...base, url: "https://b.example/report", snippet: "The current policy does not apply to agency X in 2026." }
  ]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].signal, "POTENTIAL_CROSS_SOURCE_POLARITY_CONFLICT");
  assert.equal(conflicts[0].requires_review, true);
  assert.match(conflicts[0].warning, /Rule-based conflict candidate only/i);
});

test("does not infer source support from topical overlap alone", () => {
  const alignment = alignSourceToClaim("The current policy applies to public agencies", "The current policy applies to public agencies");
  const assessment = assessClaimRelation("The current policy applies to public agencies", "The current policy applies to public agencies", alignment);
  assert.equal(assessment.signal, "TOPICAL_ALIGNMENT_ONLY");
  assert.equal(assessment.requires_review, true);
});


test("semantic assessment fails closed when Workers AI is not configured", async () => {
  const result = await adjudicateEvidenceWithModel("The current policy applies", [{ url: "https://example.org", title: "Policy", snippet: "The policy applies." }], null);
  assert.equal(result.status, "NOT_CONFIGURED");
  assert.equal(result.assessments.length, 0);
});

test("semantic assessment validates advisory model output and never emits a final verdict", async () => {
  let calledModel = null;
  const ai = { run: async (model, options) => { calledModel = model; assert.equal(options.temperature, 0); assert.deepEqual(options.chat_template_kwargs, { enable_thinking: false }); return { response: JSON.stringify({ assessments: [{ source_index: 0, relation: "SUPPORTS", rationale: "The source states the same policy scope." }] }) }; } };
  const result = await adjudicateEvidenceWithModel("The current policy applies", [{ url: "https://example.org", title: "Policy", snippet: "The policy applies." }], ai);
  assert.equal(calledModel, SEMANTIC_MODEL);
  assert.equal(result.status, "COMPLETED_ADVISORY");
  assert.equal(result.assessments[0].relation, "SUPPORTS");
  assert.equal(result.assessments[0].requires_review, true);
  assert.match(result.limitation, /uncalibrated advisory signals/);
});

test("semantic assessment parses the Cloudflare chat-completion response envelope", async () => {
  const ai = { run: async () => ({
    result: { choices: [{ message: { content: "```json\n{\"assessments\":[{\"source_index\":0,\"relation\":\"CONTRADICTS\",\"rationale\":\"The source states the opposite.\"}]}\n```" } }] }
  }) };
  const result = await adjudicateEvidenceWithModel("The capital is Sydney", [{ url: "https://example.org", title: "Capital", snippet: "Canberra is the capital." }], ai);
  assert.equal(result.status, "COMPLETED_ADVISORY");
  assert.equal(result.assessments[0].relation, "CONTRADICTS");
});

test("semantic assessment rejects incomplete or malformed model responses", async () => {
  const ai = { run: async () => ({ response: "{not-json" }) };
  const result = await adjudicateEvidenceWithModel("Claim", [{ url: "https://example.org", snippet: "Evidence" }], ai);
  assert.equal(result.status, "FAILED_CLOSED");
  assert.equal(result.assessments.length, 0);
});

test("semantic assessment is bounded to five sources", async () => {
  let payload;
  const ai = { run: async (_model, options) => { payload = JSON.parse(options.messages[1].content); return { response: JSON.stringify({ assessments: payload.sources.map(s => ({ source_index: s.source_index, relation: "INSUFFICIENT", rationale: "Not enough context." })) }) }; } };
  const sources = Array.from({ length: 8 }, (_, i) => ({ url: `https://s${i}.example`, snippet: "text" }));
  const result = await adjudicateEvidenceWithModel("Claim", sources, ai);
  assert.equal(payload.sources.length, 5);
  assert.equal(result.assessments.length, 5);
});


test("retries an empty Node.js official-domain search with one bounded broad query", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    requests.push(body);
    if (requests.length === 1) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ results: [{
      title: "Node.js 26.13.0 (Current)",
      url: "https://nodejs.org/en/blog/release/v26.13.0",
      content: "Node.js 26.13.0 (Current) release. Published 2026-10-28.",
      published_date: "2026-10-28",
      score: 0.95
    }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "The latest stable Node.js release is Node.js 20." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0].include_domains, ["nodejs.org"]);
    assert.equal(requests[1].include_domains, undefined);
    assert.equal(body.methodology.search_budget.used, 2);
    assert.equal(body.claims[0].sources.length, 1);
    assert.equal(body.claims[0].sources[0].url, "https://nodejs.org/en/blog/release/v26.13.0");
    assert.equal(body.claims[0].status, "NEEDS_REVIEW");
  } finally { globalThis.fetch = originalFetch; }
});

test("broad Node.js fallback excludes non-official sources from evidence", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    if (requests.length === 1) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ results: [
      { title: "Node.js release discussion", url: "https://example.com/node-release", content: "Node.js 26 latest release version.", published_date: "2026-10-28", score: 0.99 },
      { title: "Node.js 26.13.0 (Current)", url: "https://nodejs.org/en/blog/release/v26.13.0", content: "Node.js 26.13.0 (Current) release.", published_date: "2026-10-28", score: 0.90 }
    ] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "The latest stable Node.js release is Node.js 20." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(requests.length, 2);
    assert.deepEqual(body.claims[0].sources.map(source => source.url), ["https://nodejs.org/en/blog/release/v26.13.0"]);
    assert.ok(body.claims[0].excluded_sources.some(source => source.url === "https://example.com/node-release"));
    assert.equal(body.claims[0].status, "NEEDS_REVIEW");
  } finally { globalThis.fetch = originalFetch; }
});

test("semantic triage remains disabled by default even when the Workers AI binding is configured", async () => {
  let aiCalls = 0;
  const handler = (await import("../worker/index.js")).default;
  const env = {
    TAVILY_API_KEY: "test-key",
    AI: { run: async () => { aiCalls++; return {}; } },
    ALLOWED_ORIGIN: "https://freshproof.example"
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [{ title: "Current policy", url: "https://example.org/policy", content: "The current policy applies to public agencies.", published_date: "2026-11-08", score: 0.9 }] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await handler.fetch(new Request("https://worker.example/api/verify", { method: "POST", headers: { origin: "https://freshproof.example", "content-type": "application/json" }, body: JSON.stringify({ text: "The current policy applies to public agencies." }) }), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.claims[0].semantic_assessment.status, "DISABLED_BY_DEFAULT");
    assert.equal(aiCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("semantic triage runs only after explicit opt-in", async () => {
  let aiCalls = 0;
  const handler = (await import("../worker/index.js")).default;
  const env = {
    TAVILY_API_KEY: "test-key",
    AI: { run: async (_model, options) => {
      aiCalls++;
      const payload = JSON.parse(options.messages[1].content);
      return { response: JSON.stringify({ assessments: payload.sources.map(source => ({ source_index: source.source_index, relation: "SUPPORTS", rationale: "Mocked semantic assessment for the test." })) }) };
    } },
    ENABLE_SEMANTIC_TRIAGE: "true",
    ALLOWED_ORIGIN: "https://freshproof.example"
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [{ title: "Current policy", url: "https://example.org/policy", content: "The current policy applies to public agencies.", published_date: "2026-11-08", score: 0.9 }] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await handler.fetch(new Request("https://worker.example/api/verify", { method: "POST", headers: { origin: "https://freshproof.example", "content-type": "application/json" }, body: JSON.stringify({ text: "The current policy applies to public agencies." }) }), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.claims[0].semantic_assessment.status, "COMPLETED_ADVISORY");
    assert.equal(body.claims[0].semantic_assessment.assessments[0].relation, "SUPPORTS");
    assert.equal(aiCalls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test("semantic triage can be disabled only by an explicit deployment override", async () => {
  let aiCalls = 0;
  const handler = (await import("../worker/index.js")).default;
  const env = { TAVILY_API_KEY: "test-key", AI: { run: async () => { aiCalls++; return {}; } }, ENABLE_SEMANTIC_TRIAGE: "false", ALLOWED_ORIGIN: "https://freshproof.example" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [{ title: "Current policy", url: "https://example.org/policy", content: "The current policy applies to public agencies.", published_date: "2026-11-08", score: 0.9 }] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await handler.fetch(new Request("https://worker.example/api/verify", { method: "POST", headers: { origin: "https://freshproof.example", "content-type": "application/json" }, body: JSON.stringify({ text: "The current policy applies to public agencies." }) }), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.claims[0].semantic_assessment.status, "DISABLED_BY_CONFIGURATION");
    assert.equal(aiCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("browser requests fail closed when exact CORS origin is not configured", async () => {
  const handler = (await import("../worker/index.js")).default;
  const response = await handler.fetch(new Request("https://worker.example/api/health", { headers: { origin: "https://attacker.example" } }), {});
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});


test("enforces the native Cloudflare API rate limiter before upstream search", async () => {
  let calls = 0;
  const handler = (await import("../worker/index.js")).default;
  const env = {
    TAVILY_API_KEY: "test-key",
    ALLOWED_ORIGIN: "https://freshproof.example",
    API_RATE_LIMITER: { limit: async ({ key }) => { calls++; assert.equal(key, "verify:203.0.113.7"); return { success: false }; } }
  };
  const response = await handler.fetch(new Request("https://worker.example/api/verify", {
    method: "POST",
    headers: { origin: "https://freshproof.example", "cf-connecting-ip": "203.0.113.7", "content-type": "application/json" },
    body: JSON.stringify({ text: "The current policy applies to public agencies." })
  }), env);
  assert.equal(response.status, 429);
  assert.equal(calls, 1);
});

test("detects a narrowly scoped US president office-holder claim", async () => {
  const { detectOfficeHolderClaim, adjudicateOfficeHolderClaim } = await import("../worker/index.js");
  const claim = "As of 2026, the President of the United States is Joe Biden.";
  assert.equal(detectOfficeHolderClaim(claim).claimed_holder, "Joe Biden");
  const personFirstCurrent = "Joe Biden is the current President of the United States.";
  assert.equal(detectOfficeHolderClaim(personFirstCurrent).claimed_holder, "Joe Biden");
  const personFirstUS = "Joe Biden is the current U.S. President.";
  assert.equal(detectOfficeHolderClaim(personFirstUS).claimed_holder, "Joe Biden");
  const sources = [{ title: "President Donald J. Trump", url: "https://www.whitehouse.gov/administration/donald-j-trump/", snippet: "President Donald J. Trump is the 47th President of the United States.", published_date: "2026-11-08", source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN" }];
  const result = adjudicateOfficeHolderClaim(claim, sources, Date.parse("2026-11-09T00:00:00Z"));
  assert.equal(result.status, "CONTRADICTED");
  assert.equal(result.evidence.reported_current_holder, "Donald J. Trump");
});

test("preserves office-holder context when Tavily places it beyond the 900-character display snippet", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const requestBody = JSON.parse(init.body);
    assert.match(requestBody.query, /current President of the United States/);
    return new Response(JSON.stringify({ results: [{
      title: "Executive Orders – The White House",
      url: "https://www.whitehouse.gov/administration/",
      content: "Presidential Actions and executive order archive. ".repeat(30) + "Administration President Donald J. Trump First Lady Melania Trump Vice President JD Vance Second Lady Usha Vance The Cabinet Executive Office of the President",
      published_date: "2026-09-29",
      score: 0.92
    }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const handler = (await import("../worker/index.js")).default;
    const response = await handler.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "As of 2026, the President of the United States is Joe Biden." })
    }), { TAVILY_API_KEY: "mock-key", ALLOWED_ORIGIN: "*" });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.version, VERSION);
    assert.equal(result.claims[0].status, "CONTRADICTED");
    assert.equal(result.claims[0].officeholder_evidence.reported_current_holder, "Donald J. Trump");
    assert.equal(result.claims[0].officeholder_evidence.supporting_sources[0].published_date, "2026-09-29");
    assert.ok(result.claims[0].sources[0].snippet.length <= 900, "display snippet remains bounded");
  } finally { globalThis.fetch = originalFetch; }
});

test("does not split a person's middle initial from the surname during claim extraction", async () => {
  const { splitClaims } = await import("../worker/index.js");
  const claims = splitClaims("As of 2026, the President of the United States is Donald J. Trump.");
  assert.equal(claims.length, 1);
  assert.equal(claims[0], "As of 2026, the President of the United States is Donald J. Trump.");
});

test("preserves a matching full office-holder name through the complete verification pipeline", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const requestBody = JSON.parse(init.body);
    assert.match(requestBody.query, /current President of the United States/);
    return new Response(JSON.stringify({ results: [{
      title: "Executive Orders – The White House",
      url: "https://www.whitehouse.gov/administration/",
      content: "Administration President Donald J. Trump First Lady Melania Trump Vice President JD Vance Second Lady Usha Vance The Cabinet Executive Office of the President",
      published_date: "2026-09-29",
      score: 0.92
    }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const handler = (await import("../worker/index.js")).default;
    const response = await handler.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "As of 2026, the President of the United States is Donald J. Trump." })
    }), { TAVILY_API_KEY: "mock-key", ALLOWED_ORIGIN: "*" });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.version, VERSION);
    assert.equal(result.claims.length, 1);
    assert.equal(result.claims[0].text, "As of 2026, the President of the United States is Donald J. Trump.");
    assert.notEqual(result.claims[0].status, "CONTRADICTED");
    assert.equal(result.claims[0].status, "NEEDS_REVIEW", "matching evidence should not be overclaimed as verified current");
  } finally { globalThis.fetch = originalFetch; }
});

test("does not contradict a matching current office-holder claim", async () => {
  const { adjudicateOfficeHolderClaim } = await import("../worker/index.js");
  const claim = "As of 2026, the President of the United States is Donald J. Trump.";
  const sources = [{
    title: "Executive Orders – The White House",
    url: "https://www.whitehouse.gov/administration/",
    snippet: "Administration President Donald J. Trump First Lady Melania Trump Vice President JD Vance",
    published_date: "2026-09-29",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN"
  }];
  assert.equal(adjudicateOfficeHolderClaim(claim, sources, Date.parse("2026-11-09T00:00:00Z")).status, null);
});

test("extracts the current office holder from flattened White House administration directory snippets", async () => {
  const { adjudicateOfficeHolderClaim } = await import("../worker/index.js");
  const claim = "As of 2026, the President of the United States is Joe Biden.";
  const sources = [{
    title: "Executive Orders – The White House",
    url: "https://www.whitehouse.gov/administration/",
    snippet: "Administration President Donald J. Trump First Lady Melania Trump Vice President JD Vance Second Lady Usha Vance The Cabinet Executive Office of the President",
    published_date: "2026-09-29",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN"
  }];
  const result = adjudicateOfficeHolderClaim(claim, sources, Date.parse("2026-11-09T00:00:00Z"));
  assert.equal(result.status, "CONTRADICTED");
  assert.equal(result.evidence.reported_current_holder, "Donald J. Trump");
  assert.equal(result.evidence.supporting_sources[0].published_date, "2026-09-29");
});

test("does not confuse the vice president or first lady with the president in flattened directory snippets", async () => {
  const { adjudicateOfficeHolderClaim } = await import("../worker/index.js");
  const claim = "As of 2026, the President of the United States is Joe Biden.";
  const sources = [{
    title: "White House administration directory",
    url: "https://www.whitehouse.gov/administration/",
    snippet: "Administration President Donald J. Trump First Lady Melania Trump Vice President JD Vance Second Lady Usha Vance",
    published_date: "2026-09-29",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN"
  }];
  const result = adjudicateOfficeHolderClaim(claim, sources, Date.parse("2026-11-09T00:00:00Z"));
  assert.notEqual(result.evidence?.reported_current_holder, "JD Vance");
  assert.notEqual(result.evidence?.reported_current_holder, "Melania Trump");
});

test("does not infer the current office holder from unrelated White House article navigation", async () => {
  const { adjudicateOfficeHolderClaim, shouldRunOfficeHolderFallback } = await import("../worker/index.js");
  const claim = "As of 2026, the President of the United States is Joe Biden.";
  const navigationOnly = [{
    title: "Advancing Women's Health to Improve Outcomes in All Phases of Life – The White House",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2026/10/example/",
    snippet: "DONALD J. TRUMP THE WHITE HOUSE, October 19, 2026.",
    domain_context: "Administration President Trump About Vice President JD Vance",
    published_date: "2026-10-19",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN"
  }];
  const result = adjudicateOfficeHolderClaim(claim, navigationOnly, Date.parse("2026-11-09T00:00:00Z"));
  assert.equal(result.status, null);
  assert.equal(shouldRunOfficeHolderFallback(navigationOnly, Date.parse("2026-11-09T00:00:00Z")), true);

  const spoofedOfficialHost = [{
    title: "President Donald J. Trump",
    url: "https://whitehouse.gov.attacker.example/administration/donald-j-trump/",
    snippet: "President Donald J. Trump is the 47th President of the United States.",
    published_date: "2026-11-08",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN"
  }];
  assert.equal(adjudicateOfficeHolderClaim(claim, spoofedOfficialHost, Date.parse("2026-11-09T00:00:00Z")).status, null);
  assert.equal(shouldRunOfficeHolderFallback(spoofedOfficialHost, Date.parse("2026-11-09T00:00:00Z")), true);
});

test("does not issue office-holder verdict from secondary or stale sources", async () => {
  const { adjudicateOfficeHolderClaim } = await import("../worker/index.js");
  const claim = "As of 2026, the President of the United States is Joe Biden.";
  const staleSecondary = [{ title: "President Donald Trump", url: "https://news.example.com/politics", snippet: "President Donald Trump leads the administration.", published_date: "2018-03-22", source_reliability: "UNASSESSED" }];
  assert.equal(adjudicateOfficeHolderClaim(claim, staleSecondary, Date.parse("2026-11-09T00:00:00Z")).status, null);
});

test("uses a role-specific current-office query and returns contradicted only with recent official evidence", async () => {
  const originalFetch = globalThis.fetch;
  let querySent = "";
  let domainsSent = [];
  globalThis.fetch = async (_url, init) => {
    const requestBody = JSON.parse(init.body);
    querySent = requestBody.query;
    domainsSent = requestBody.include_domains || [];
    return new Response(JSON.stringify({ results: [
      { title: "President Donald J. Trump", url: "https://www.whitehouse.gov/administration/donald-j-trump/", content: "President Donald J. Trump is the 47th President of the United States.", published_date: "2026-11-08", score: 0.9 },
      { title: "Official White House", url: "https://www.whitehouse.gov/briefing-room/", content: "The President announced the current administration policy.", published_date: "2026-11-08", score: 0.8 }
    ] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "As of 2026, the President of the United States is Joe Biden." }) }), { TAVILY_API_KEY: "mock-key", ALLOWED_ORIGIN: "*" });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.match(querySent, /current President of the United States/);
    assert.deepEqual(domainsSent, ["whitehouse.gov"]);
    assert.equal(result.claims[0].status, "CONTRADICTED");
    assert.equal(result.claims[0].officeholder_evidence.reported_current_holder, "Donald J. Trump");
    assert.equal(result.version, VERSION);
  } finally { globalThis.fetch = originalFetch; }
});

test("expands X/Twitter brand continuity claims with entity-specific official context", () => {
  const query = buildTemporalSearchQuery("its official brand name has not changed.", 2026, "Twitter is currently known as Twitter, and its official brand name has not changed.");
  assert.match(query, /X/);
  assert.match(query, /Twitter/);
  assert.match(query, /official platform brand name rebrand X Corp 2026/);
  assert.match(buildTemporalSearchQuery("The population is currently 5 million.", 2026), /population is currently 5 million/);
});


test("resolves pronoun-led claims to an explicit Twitter/X antecedent without changing the original claim", async () => {
  const { resolveClaimContext } = await import("../worker/index.js");
  const result = resolveClaimContext("its official brand name has not changed.", "Twitter is currently known as Twitter, and its official brand name has not changed.");
  assert.equal(result.original_claim, "its official brand name has not changed.");
  assert.equal(result.resolved_claim, "Twitter's official brand name has not changed.");
  assert.equal(result.entity, "Twitter / X");
  assert.equal(resolveClaimContext("its revenue increased.", "The company reported its results.").resolution, "UNRESOLVED_OR_NOT_NEEDED");
});

test("recognizes X brand-toolkit evidence as an alias-relevant source for a Twitter identity claim", async () => {
  const { resolveClaimContext, scoreSourceRelevance, alignSourceToClaim } = await import("../worker/index.js");
  const context = resolveClaimContext("its official brand name has not changed.", "Twitter is currently known as Twitter, and its official brand name has not changed.");
  const source = { title: "Brand toolkit", snippet: "Resources for presenting the X brand consistently and professionally. Looking for Twitter brand assets? Get them here." };
  const relevance = scoreSourceRelevance(context.resolved_claim, source);
  assert.notEqual(relevance.relevance, "LOW");
  assert.ok(relevance.matched_terms.includes("twitter"));
  const alignment = alignSourceToClaim(context.resolved_claim, source.title + " " + source.snippet);
  assert.ok(alignment.matched_claim_terms.includes("twitter"));
});

test("screens unrelated recent social posts as low relevance despite one lexical mention", async () => {
  const { scoreSourceRelevance } = await import("../worker/index.js");
  const claim = "Twitter's official brand name has not changed.";
  const source = { title: "Instagram", snippet: "A recent video and photo by a creator, including a Twitter screenshot among unrelated images and comments." };
  const result = scoreSourceRelevance(claim, source);
  assert.equal(result.relevance, "LOW");
});

test("does not confuse social-platform hosting with publisher authority", async () => {
  const { sourceReliability } = await import("../worker/index.js");
  assert.equal(sourceReliability("https://about.x.com/en/brand-toolkit"), "PRIMARY_OR_OFFICIAL_DOMAIN");
  assert.equal(sourceReliability("https://x.com/Ravi/status/123"), "UNASSESSED");
  assert.equal(sourceReliability("https://twitter.com/user/status/123"), "UNASSESSED");
  assert.equal(sourceReliability("https://www.instagram.com/"), "UNASSESSED");
});


test("verification pipeline resolves Twitter pronouns and excludes unrelated recent search results", async () => {
  const handler = (await import("../worker/index.js")).default;
  const originalFetch = globalThis.fetch;
  const queries = [];
  globalThis.fetch = async (_url, init) => {
    const request = JSON.parse(init.body);
    queries.push(request.query);
    return new Response(JSON.stringify({ results: [
      { title: "Brand toolkit", url: "https://about.x.com/en/brand-toolkit", content: "Resources for presenting the X brand consistently and professionally. Looking for Twitter brand assets? Get them here.", published_date: "2026-10-15", score: 0.9 },
      { title: "Instagram", url: "https://www.instagram.com/p/example", content: "A recent creator video and photo post, with a Twitter screenshot among unrelated images and comments.", published_date: "2026-11-08", score: 0.99 }
    ] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const answer = "Twitter is currently known as Twitter, and its official brand name has not changed.";
    const response = await handler.fetch(new Request("https://worker.example/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: answer })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.version, "0.2.47");
    assert.equal(body.claims.length, 2);
    assert.equal(body.claims[1].text, "its official brand name has not changed.");
    assert.equal(body.claims[1].resolved_context.resolved_claim, "Twitter's official brand name has not changed.");
    assert.match(queries[1], /Twitter/);
    assert.equal(queries.filter(query => query.includes("official platform name rebrand")).length, 1);
    assert.ok(queries.some(query => query.includes("site:about.x.com")));
    assert.equal(queries.filter(query => query.includes("social networking service renamed rebrand")).length, 1);
    assert.ok(body.claims[1].sources.length <= 5);
    assert.ok(body.claims[1].sources.some(source => source.title === "Brand toolkit"));
    assert.ok(body.claims[1].excluded_sources.some(source => source.title === "Instagram"));
    assert.equal(body.claims[1].status, "NEEDS_REVIEW");
  } finally { globalThis.fetch = originalFetch; }
});


test("concept-aware relevance retains rebrand evidence expressed with replacement and former-name language", async () => {
  const { scoreSourceRelevance } = await import("../worker/index.js");
  const claim = "Twitter's official brand name has not changed.";
  const britannica = {
    title: "X (formerly Twitter) | Founding, History, Elon Musk, & SpaceX",
    snippet: "Twitter, once one of the most recognizable names in social media, has been replaced by X."
  };
  const result = scoreSourceRelevance(claim, britannica);
  assert.notEqual(result.relevance, "LOW");
  assert.ok(result.matched_terms.includes("twitter"));
  assert.ok(result.matched_terms.includes("name"));
  assert.ok(result.matched_terms.includes("changed"));
  assert.equal(result.method, "CONCEPT_ALIAS_LEXICAL_RELEVANCE_SCREEN");
});

test("concept-aware relevance does not upgrade unrelated Instagram content that merely mentions Twitter", async () => {
  const { scoreSourceRelevance } = await import("../worker/index.js");
  const claim = "Twitter's official brand name has not changed.";
  const unrelated = {
    title: "Instagram creator photo and video roundup",
    snippet: "A creator posted photos and videos, including a Twitter screenshot among unrelated images."
  };
  assert.equal(scoreSourceRelevance(claim, unrelated).relevance, "LOW");
});

test("concept aliases are relevance-only and do not create a final truth verdict", async () => {
  const { scoreSourceRelevance, assessClaimRelation, alignSourceToClaim } = await import("../worker/index.js");
  const claim = "Twitter's official brand name has not changed.";
  const sourceText = "X (formerly Twitter). Twitter's name has been replaced by X.";
  const relevance = scoreSourceRelevance(claim, { title: "X (formerly Twitter)", snippet: sourceText });
  const alignment = alignSourceToClaim(claim, sourceText);
  const relation = assessClaimRelation(claim, sourceText, alignment);
  assert.notEqual(relevance.relevance, "LOW");
  assert.equal(relation.requires_review, true);
  assert.notEqual(relation.signal, "SUPPORTS");
  assert.notEqual(relation.signal, "CONTRADICTS");
});


test("domain adapter registry is isolated and exposes bounded adapter contracts", async () => {
  const { resolveDomainAdapter } = await import("../worker/domain-adapters.js");
  assert.deepEqual(DOMAIN_ADAPTERS.map(adapter => adapter.id), ["python2_lifecycle", "whitehouse_x_identity", "office_holder", "software_release", "official_pricing", "social_brand_identity"]);
  assert.equal(resolveDomainAdapter("A stable statement without a domain-specific entity.", ""), null);
  const office = resolveDomainAdapter("As of 2026, the President of the United States is Joe Biden.", "", () => true);
  assert.equal(office.id, "office_holder");
  assert.deepEqual(office.primaryDomains, ["whitehouse.gov"]);
  const social = resolveDomainAdapter("its official brand name has not changed.", "Twitter is the platform mentioned in this answer.");
  assert.equal(social.id, "social_brand_identity");
  assert.equal(social.resolvedContext.resolved_claim, "Twitter's official brand name has not changed.");
  assert.equal(social.adjudicate([]).status, null);
});

test("domain-specific search is subject to a request-wide query budget", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ results: [{ title: "Evidence", url: "https://example.org/evidence", content: "The current policy applies to all agencies.", published_date: "2026-11-08", score: 0.9 }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const answer = [
      "The current policy applies to all agencies.",
      "The current rate is 4 percent.",
      "The latest version was released in 2026.",
      "The current population estimate is 5 million.",
      "The current CEO was appointed in 2025."
    ].join(" ");
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: answer })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    assert.equal(response.status, 200);
    assert.ok(calls <= LIMITS.maxQueries);
  } finally { globalThis.fetch = originalFetch; }
});


test("Node.js latest-version claims route to official Node.js release sources", async () => {
  const { resolveDomainAdapter } = await import("../worker/domain-adapters.js");
  const adapter = resolveDomainAdapter("The latest stable Node.js version is 22.0.0.", "");
  assert.equal(adapter?.id, "software_release");
  assert.deepEqual(adapter.primaryDomains, ["nodejs.org"]);
  assert.match(adapter.primaryQuery(), /official.*release notes/i);
  const relevant = adapter.rankSource({ url: "https://nodejs.org/en/download/releases/", title: "Node.js Releases", snippet: "Current and LTS release versions" }, { relevance: "LOW" });
  assert.equal(relevant.relevance, "MEDIUM");
  assert.equal(relevant.method, "OFFICIAL_SOFTWARE_RELEASE_SOURCE");
  assert.equal(adapter.adjudicate([]).status, null);
});

test("ChatGPT pricing claims route to official OpenAI pricing and help sources", async () => {
  const { resolveDomainAdapter } = await import("../worker/domain-adapters.js");
  const adapter = resolveDomainAdapter("The official US price of ChatGPT Plus is $20 per month.", "");
  assert.equal(adapter?.id, "official_pricing");
  assert.deepEqual(adapter.primaryDomains, ["help.openai.com"]);
  const relevant = adapter.rankSource({ url: "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus", title: "What is ChatGPT Plus? | OpenAI Help Center", snippet: "ChatGPT Plus subscription price: $20/month" }, { relevance: "LOW" });
  assert.equal(relevant.relevance, "MEDIUM");
  assert.equal(relevant.method, "OFFICIAL_PRODUCT_PRICING_SOURCE");
  const unrelatedOfficial = adapter.rankSource({ url: "https://openai.com/index/introducing-chatgpt-go/", title: "Introducing ChatGPT Go", snippet: "ChatGPT Plus and Go plan pricing" }, { relevance: "HIGH" });
  assert.equal(unrelatedOfficial, null);
  const untrusted = adapter.rankSource({ url: "https://reddit.com/r/ChatGPT", title: "ChatGPT price discussion", snippet: "Plus costs $20 per month" }, { relevance: "HIGH" });
  assert.equal(untrusted, null);
  assert.equal(adapter.adjudicate([]).status, null);
});

test("generic non-Node software release claims do not get misrouted to Node.js", async () => {
  const { resolveDomainAdapter } = await import("../worker/domain-adapters.js");
  assert.equal(resolveDomainAdapter("The latest stable Python version is 3.14.", ""), null);
});


test("official Node.js and OpenAI domains receive primary-source reliability classification", async () => {
  const { sourceReliability } = await import("../worker/index.js");
  assert.equal(sourceReliability("https://nodejs.org/en/download/releases/"), "PRIMARY_OR_OFFICIAL_DOMAIN");
  assert.equal(sourceReliability("https://openai.com/chatgpt/pricing/"), "PRIMARY_OR_OFFICIAL_DOMAIN");
  assert.equal(sourceReliability("https://help.openai.com/en/articles/example"), "PRIMARY_OR_OFFICIAL_DOMAIN");
  assert.equal(sourceReliability("https://reddit.com/r/ChatGPT"), "UNASSESSED");
});

test("software and pricing adapters apply official-domain restrictions to Tavily requests", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    for (const text of ["The latest stable Node.js version is 22.0.0.", "The official US price of ChatGPT Plus is $20 per month."]) {
      const response = await worker.fetch(new Request("https://freshproof.test/api/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
      assert.equal(response.status, 200);
    }
    assert.deepEqual(requests[0].include_domains, ["nodejs.org"]);
    assert.equal(requests[1].include_domains, undefined);
    assert.deepEqual(requests[2].include_domains, ["help.openai.com"]);
  } finally { globalThis.fetch = originalFetch; }
});


test("recognizes the newest active Node.js LTS major from immutable official schedule evidence", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  const schedule = {
    v22: { start: "2024-04-24", lts: "2024-10-29", maintenance: "2025-10-21", end: "2027-04-30" },
    v24: { start: "2025-05-06", lts: "2025-10-28", maintenance: "2026-10-20", end: "2028-04-30" },
    v26: { start: "2026-05-05", lts: null, maintenance: null, end: "2026-10-27" }
  };
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).startsWith("https://api.tavily.com/search")) {
      request = JSON.parse(init.body);
      return new Response(JSON.stringify({ results: [{
        title: "Node.js official releases",
        url: "https://nodejs.org/en/download/releases/",
        content: "Official Node.js release schedule.",
        published_date: "2026-10-14",
        score: 0.95
      }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url).startsWith("https://api.github.com/repos/nodejs/Release/commits?path=schedule.json")) {
      return new Response(JSON.stringify([{ sha: "0123456789abcdef0123456789abcdef01234567", commit: { committer: { date: "2026-11-10T12:00:00Z" } } }]), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url) === "https://raw.githubusercontent.com/nodejs/Release/0123456789abcdef0123456789abcdef01234567/schedule.json") {
      return new Response(JSON.stringify(schedule), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("Unexpected outbound URL in test: " + String(url));
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Node.js 22 is the current Long-Term Support (LTS) release." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(request.query, /LTS/);
    assert.equal(body.claims[0].status, "SUPERSEDED");
    assert.equal(body.claims[0].domain_evidence.latest_lts_major, 24, JSON.stringify(body.claims[0]));
    assert.equal(body.claims[0].domain_evidence.is_latest_lts_major, false);
  } finally { globalThis.fetch = originalFetch; }
});

test("does not report semantic Node.js version numbers as numeric evidence conflicts", () => {
  const claim = "The latest Node.js release is version 26.12.0.";
  const source = "Node.js 26.0.0 (Current) release notes; Node.js 24.x remains LTS.";
  const assessment = assessClaimRelation(claim, source, alignSourceToClaim(claim, source));
  assert.notEqual(assessment.signal, "POTENTIAL_NUMERIC_DISAGREEMENT");
  const base = { claim_alignment: { matched_claim_terms: ["node", "release"] } };
  const conflicts = compareEvidenceSet([
    { ...base, url: "https://nodejs.org/a", snippet: "Node.js 26.0.0 (Current) release" },
    { ...base, url: "https://nodejs.org/b", snippet: "Node.js 26.12.0 (Current) release" }
  ]);
  assert.equal(conflicts.length, 0);
});

test("keeps general Node.js patch-level claims in review without a lifecycle verdict", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [{
    title: "Node.js 26.12.0 (Current)",
    url: "https://nodejs.org/en/blog/release/v26.12.0",
    content: "Node.js 26.12.0 (Current) release notes.",
    published_date: "2026-10-14",
    score: 0.9
  }] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "The latest Node.js release is version 26.12.0." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(body.claims[0].status, "NEEDS_REVIEW");
  } finally { globalThis.fetch = originalFetch; }
});


test("recognizes ongoing support language as temporally sensitive", () => {
  assert.equal(isLikelyTemporal("Node.js 22 remains supported as an LTS release."), true);
  assert.equal(isLikelyTemporal("Node.js 22 is still supported as an LTS release."), true);
});


test("Node.js ongoing LTS support uses official release schedule JSON", async () => {
  const { resolveDomainAdapter } = await import("../worker/domain-adapters.js");
  const adapter = resolveDomainAdapter("Node.js 22 remains supported as an LTS release.", "");
  const schedule = {
    "v22": { "start": "2024-04-24", "lts": "2024-10-29", "maintenance": "2025-10-21", "end": "2027-04-30", "codename": "Jod" },
    "v24": { "start": "2025-05-06", "lts": "2025-10-28", "maintenance": "2026-10-20", "end": "2028-04-30", "codename": "Krypton" },
    "v26": { "start": "2026-05-05", "lts": "2026-10-28", "maintenance": "2027-10-20", "end": "2029-04-30", "codename": "Lithium" }
  };
  const source = { title: "nodejs/Release schedule.json", url: "https://github.com/nodejs/Release/blob/main/schedule.json", snippet: JSON.stringify(schedule), published_date: "2026-11-10" };
  const result = adapter.adjudicate([source], Date.parse("2026-11-10T00:00:00Z"));
  assert.equal(result.status, "CURRENT");
  assert.equal(result.evidence.method, "OFFICIAL_NODEJS_RELEASE_SCHEDULE_JSON");
  assert.equal(result.evidence.support_status, "MAINTENANCE_LTS");
  assert.equal(result.evidence.lts_start, "2024-10-29");
  assert.equal(result.evidence.end_of_life, "2027-04-30");
  assert.equal(result.evidence.latest_lts_major, 26);
  assert.equal(result.evidence.is_latest_lts_major, false);
});
test("Node.js ongoing support returns SUPERSEDED when official table marks the major EOL", async () => {
  const { resolveDomainAdapter } = await import("../worker/domain-adapters.js");
  const adapter = resolveDomainAdapter("Node.js 22 remains supported as an LTS release.", "");
  const source = {
    title: "Node.js Releases",
    url: "https://nodejs.org/en/about/previous-releases",
    snippet: JSON.stringify({ "v22": { "start": "2024-04-24", "lts": "2024-10-29", "maintenance": "2025-10-21", "end": "2026-04-30" } }),
    published_date: "2026-11-10"
  };
  assert.equal(adapter.adjudicate([source], Date.parse("2026-11-10T00:00:00Z")).status, "SUPERSEDED");
});

test("Node.js ongoing support abstains when official release row is stale or absent", async () => {
  const { resolveDomainAdapter } = await import("../worker/domain-adapters.js");
  const adapter = resolveDomainAdapter("Node.js 22 remains supported as an LTS release.", "");
  const stale = {
    title: "Node.js Releases",
    url: "https://nodejs.org/en/about/previous-releases",
    snippet: JSON.stringify({ "v22": { "start": "2024-04-24", "lts": "2024-10-29", "maintenance": "2025-10-21", "end": "2027-04-30" } })
  };
  const absent = { ...stale, snippet: "Node.js 22 release information is available." };
  assert.equal(adapter.adjudicate([stale], Date.parse("2026-11-10T00:00:00Z")).status, null);
  assert.equal(adapter.adjudicate([absent], Date.parse("2026-11-10T00:00:00Z")).status, null);
  const schedule = { v22: { start: "2024-04-24", lts: "2024-10-29", maintenance: "2025-10-21", end: "2027-04-30" } };
  const officialJson = { title: "nodejs/Release schedule.json", url: "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json", snippet: JSON.stringify(schedule), published_date: "2024-01-01" };
  const undatedJson = { ...officialJson, published_date: null };
  assert.equal(adapter.adjudicate([officialJson], Date.parse("2026-11-10T00:00:00Z")).status, null);
  assert.equal(adapter.adjudicate([undatedJson], Date.parse("2026-11-10T00:00:00Z")).status, null);
  const currentJson = { ...officialJson, published_date: "2026-11-09" };
  const selectedRecent = adapter.adjudicate([officialJson, currentJson], Date.parse("2026-11-10T00:00:00Z"));
  assert.equal(selectedRecent.status, "CURRENT");
  assert.equal(selectedRecent.evidence.source.published_date, "2026-11-09");
});

test("POST verification falls back to the official Node.js lifecycle page and retains it beyond the generic result cap", async () => {
  const originalFetch = globalThis.fetch;
  const searchResults = Array.from({ length: 7 }, (_, i) => ({
    title: `Node.js release background result ${i + 1}`,
    url: `https://nodejs.org/en/blog/release/v${20 + i}`,
    content: "Node.js release information and lifecycle notes.",
    published_date: "2026-11-09",
    score: 0.99 - i / 100
  }));
  const officialHtml = `<html><body><table>
    <tr><th>Node.js</th><th>Codename</th><th>First released</th><th>Last updated</th><th>Status</th></tr>
    <tr><td>v26</td><td>Lithium</td><td>May 05, 2026</td><td>Oct 28, 2026</td><td>LTS</td></tr>
    <tr><td>v16</td><td>Gallium</td><td>Apr 20, 2021</td><td>Aug 08, 2023</td><td>EOL</td></tr>
  </table></body></html>`;
  let officialFallbackFetched = false;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).startsWith("https://api.tavily.com/search")) {
      return new Response(JSON.stringify({ results: searchResults }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url).startsWith("https://api.github.com/repos/nodejs/Release/commits?path=schedule.json")) {
      return new Response("upstream temporarily unavailable", { status: 503 });
    }
    if (String(url) === "https://nodejs.org/en/about/previous-releases") {
      officialFallbackFetched = true;
      return new Response(officialHtml, { status: 200, headers: { "content-type": "text/html" } });
    }
    throw new Error("Unexpected outbound URL in fallback test: " + String(url));
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Node.js 16 is currently an actively supported LTS release." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(officialFallbackFetched, true);
    assert.equal(body.claims[0].status, "SUPERSEDED");
    assert.equal(body.claims[0].domain_evidence.method, "OFFICIAL_NODEJS_RELEASE_TABLE_STATUS");
    assert.equal(body.claims[0].domain_evidence.support_status, "EOL", JSON.stringify(body.claims[0]));
    assert.equal(body.claims[0].domain_evidence.last_updated, "2023-08-08");
    assert.equal(body.claims[0].sources.some(source => source.url === "https://nodejs.org/en/about/previous-releases"), true);
  } finally { globalThis.fetch = originalFetch; }
});

test("POST verification retrieves and adjudicates the official Node.js release table", async () => {
  const originalFetch = globalThis.fetch;
  let searchRequest;
  const schedule = {
    "v22": { "start": "2024-04-24", "lts": "2024-10-29", "maintenance": "2025-10-21", "end": "2027-04-30", "codename": "Jod" },
    "v24": { "start": "2025-05-06", "lts": "2025-10-28", "maintenance": "2026-10-20", "end": "2028-04-30", "codename": "Krypton" },
    "v26": { "start": "2026-05-05", "lts": "2026-10-28", "maintenance": "2027-10-20", "end": "2029-04-30", "codename": "Lithium" }
  };
  let directScheduleFetch = false;
  let scheduleCommitFetch = false;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).startsWith("https://api.tavily.com/search")) {
      searchRequest = JSON.parse(init.body);
      return new Response(JSON.stringify({ results: [{
        title: "Node.js — Node.js Releases",
        url: "https://nodejs.org/en/download/releases/",
        content: "Official Node.js release information.",
        published_date: "2026-11-10",
        score: 0.95
      }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url).startsWith("https://api.github.com/repos/nodejs/Release/commits?path=schedule.json")) {
      scheduleCommitFetch = true;
      return new Response(JSON.stringify([{ sha: "0123456789abcdef0123456789abcdef01234567", commit: { committer: { date: "2026-11-10T12:00:00Z" } } }]), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url) === "https://raw.githubusercontent.com/nodejs/Release/0123456789abcdef0123456789abcdef01234567/schedule.json") {
      directScheduleFetch = true;
      return new Response(JSON.stringify(schedule), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("Unexpected outbound URL in test: " + String(url));
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Node.js 22 remains supported as an LTS release." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(searchRequest.include_domains, ["nodejs.org"]);
    assert.equal(directScheduleFetch, true);
    assert.equal(scheduleCommitFetch, true);
    assert.equal(body.claims[0].sources.some(source => source.url.includes("0123456789abcdef0123456789abcdef01234567")), true);
    assert.equal(body.claims[0].status, "CURRENT", JSON.stringify(body.claims[0]));
    assert.equal(body.claims[0].domain_evidence.method, "OFFICIAL_NODEJS_RELEASE_SCHEDULE_JSON");
    assert.equal(body.claims[0].domain_evidence.support_status, "MAINTENANCE_LTS");
    assert.equal(body.claims[0].domain_evidence.end_of_life, "2027-04-30");
  } finally { globalThis.fetch = originalFetch; }
});

import { adjudicateEvidence } from "../worker/evidence-adjudication.js";
test("Evidence Adjudication requires two independent recent primary sources for CURRENT",()=>{const sources=["a.gov","b.gov"].map(h=>({url:"https://"+h+"/fact",title:"Official fact",published_date:"2026-11-09",source_reliability:"PRIMARY_OR_OFFICIAL_DOMAIN",relevance_assessment:{relevance:"HIGH"}}));const r=adjudicateEvidence({claim:"The policy is currently active.",sources,semanticAssessment:{status:"COMPLETED_ADVISORY",assessments:[{source_index:0,relation:"SUPPORTS"},{source_index:1,relation:"SUPPORTS"}]},now:Date.parse("2026-11-10T00:00:00Z")});assert.equal(r.status,"CURRENT");});
test("Evidence Adjudication requires two independent primary contradictions",()=>{const sources=["a.gov","b.gov"].map(h=>({url:"https://"+h+"/fact",published_date:"2026-11-09",source_reliability:"PRIMARY_OR_OFFICIAL_DOMAIN",relevance_assessment:{relevance:"HIGH"}}));const r=adjudicateEvidence({claim:"The policy is active.",sources,semanticAssessment:{status:"COMPLETED_ADVISORY",assessments:[{source_index:0,relation:"CONTRADICTS"},{source_index:1,relation:"CONTRADICTS"}]},now:Date.parse("2026-11-10T00:00:00Z")});assert.equal(r.status,"CONTRADICTED");});
test("Evidence Adjudication abstains on stale, undated, and mixed evidence",()=>{const b={url:"https://agency.gov/fact",source_reliability:"PRIMARY_OR_OFFICIAL_DOMAIN",relevance_assessment:{relevance:"HIGH"}};const stale=adjudicateEvidence({sources:[{...b,published_date:"2024-01-01"}],semanticAssessment:{assessments:[{source_index:0,relation:"SUPPORTS"}]},now:Date.parse("2026-11-10T00:00:00Z")});const undated=adjudicateEvidence({sources:[b],semanticAssessment:{assessments:[{source_index:0,relation:"SUPPORTS"}]},now:Date.parse("2026-11-10T00:00:00Z")});const mixed=adjudicateEvidence({sources:[{...b,published_date:"2026-11-09"},{...b,url:"https://other.gov/fact",published_date:"2026-11-09"}],semanticAssessment:{assessments:[{source_index:0,relation:"SUPPORTS"},{source_index:1,relation:"MIXED"}]},now:Date.parse("2026-11-10T00:00:00Z")});assert.equal(stale.status,"NEEDS_REVIEW");assert.equal(undated.status,"NEEDS_REVIEW");assert.equal(mixed.status,"NEEDS_REVIEW");});
test("domain-specific lifecycle adjudication takes precedence without semantic override",()=>{const r=adjudicateEvidence({sources:[],domainResult:{status:"CURRENT",evidence:{method:"OFFICIAL_NODEJS_RELEASE_SCHEDULE_JSON"}}});assert.equal(r.status,"CURRENT");assert.equal(r.method,"DOMAIN_SPECIFIC_RULE");});


test("Node.js lifecycle adapter uses immutable schedule via Atom when REST is unavailable and exposes EOL date", async () => {
  const originalFetch = globalThis.fetch;
  const sha = "c3e8696312969c95643cb52f05f124c161db87b2";
  const schedule = {
    "v16": { "start": "2021-04-20", "lts": "2021-10-26", "maintenance": "2022-10-18", "end": "2023-09-11", "codename": "Gallium" },
    "v26": { "start": "2026-05-05", "lts": "2026-10-28", "maintenance": "2027-10-20", "end": "2029-04-30", "codename": "Lithium" }
  };
  let atomFetched = false;
  let pinnedFetched = false;
  globalThis.fetch = async (url, init = {}) => {
    const value = String(url);
    if (value.startsWith("https://api.tavily.com/search")) {
      return new Response(JSON.stringify({ results: [{
        title: "Node.js — Official Previous Releases and Lifecycle Table",
        url: "https://nodejs.org/en/about/previous-releases",
        content: "| v16 | Gallium | Apr 20, 2021 | Aug 08, 2023 | EOL\n| v26 | Lithium | May 05, 2026 | Oct 28, 2026 | LTS",
        published_date: "2026-11-10",
        score: 0.99
      }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (value.startsWith("https://api.github.com/repos/nodejs/Release/commits?path=schedule.json")) {
      return new Response("rate limited", { status: 403 });
    }
    if (value === "https://github.com/nodejs/Release/commits/main/schedule.json.atom") {
      atomFetched = true;
      return new Response(`<feed><entry><id>tag:github.com,2008:Grit::Commit/${sha}</id><updated>2026-10-31T04:22:42Z</updated></entry></feed>`, { status: 200, headers: { "content-type": "application/atom+xml" } });
    }
    if (value === `https://raw.githubusercontent.com/nodejs/Release/${sha}/schedule.json`) {
      pinnedFetched = true;
      return new Response(JSON.stringify(schedule), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("Unexpected outbound URL: " + value);
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Node.js 16 is currently an actively supported LTS release." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(atomFetched, true);
    assert.equal(pinnedFetched, true);
    assert.equal(body.claims[0].status, "SUPERSEDED");
    assert.equal(body.claims[0].domain_evidence.method, "OFFICIAL_NODEJS_RELEASE_SCHEDULE_JSON");
    assert.equal(body.claims[0].domain_evidence.support_status, "EOL");
    assert.equal(body.claims[0].domain_evidence.lts_start, "2021-10-26");
    assert.equal(body.claims[0].domain_evidence.maintenance_start, "2022-10-18");
    assert.equal(body.claims[0].domain_evidence.end_of_life, "2023-09-11");
    assert.equal(body.claims[0].domain_evidence.source.url.includes(sha), true);
  } finally { globalThis.fetch = originalFetch; }
});


test("extracts short but complete Arabic claims instead of dropping them by character count", () => {
  const claims = splitClaims("تدور الأرض حول الشمس.");
  assert.equal(claims.length, 1);
  assert.equal(claims[0], "تدور الأرض حول الشمس.");
});

test("recognizes official-support and official social-account claims as temporal", () => {
  assert.equal(isLikelyTemporal("Python 2.7 is still officially supported."), true);
  assert.equal(isLikelyTemporal("The official White House X account is @whitehouse."), true);
});


test("detects language and direction independently for mixed-language claims", () => {
  assert.deepEqual(detectTextDirection("Python 2.7 is still officially supported."), { lang: "en", dir: "ltr" });
  assert.deepEqual(detectTextDirection("The official White House X account is @whitehouse."), { lang: "en", dir: "ltr" });
  assert.deepEqual(detectTextDirection("Water freezes at 0°C at standard atmospheric pressure."), { lang: "en", dir: "ltr" });
  assert.deepEqual(detectTextDirection("تدور الأرض حول الشمس."), { lang: "ar", dir: "rtl" });
});


test("temporal retrieval failures are surfaced as diagnostics and never converted into truth verdicts", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("https://api.tavily.com/search")) {
      return new Response("search unavailable", { status: 503 });
    }
    if (String(url) === "https://www.python.org/doc/sunset-python-2/") {
      return new Response("official source unavailable", { status: 503 });
    }
    throw new Error("Unexpected URL: " + String(url));
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Python 2.7 is still officially supported." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    const claim = body.claims[0];
    assert.equal(response.status, 200);
    assert.equal(claim.status, "NEEDS_REVIEW");
    assert.equal(claim.domain_evidence.retrieval_status, "HTTP_ERROR");
    assert.equal(claim.retrieval_diagnostics.some(item => item.provider === "TAVILY" && item.status === "UPSTREAM_FAILED"), true);
    assert.equal(claim.retrieval_diagnostics.some(item => item.provider === "PYTHON_ORG" && item.status === "HTTP_ERROR"), true);
    assert.equal(body.methodology.search_budget.used, 2);
    assert.equal(body.methodology.direct_fetch_budget.used, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
