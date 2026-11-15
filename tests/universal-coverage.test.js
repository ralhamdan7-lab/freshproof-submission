import test from "node:test";
import assert from "node:assert/strict";
import worker, { buildClaimSearchQuery, sourceDomainHints, scoreSourceRelevance } from "../worker/index.js";
import { resolveDomainAdapter, resolveHistoricalSourceAdapter } from "../worker/domain-adapters.js";

test("unknown-domain claims retain a general unconstrained retrieval path", () => {
  const claim = "A new ceremonial custom was officially revised last week.";
  assert.equal(resolveDomainAdapter(claim), null);
  assert.equal(buildClaimSearchQuery(claim), claim);
  assert.deepEqual(sourceDomainHints(claim), []);
});

test("specialist recognition does not replace the core claim query or generic domain routing", () => {
  const claim = "Python 2.7 is still officially supported.";
  const adapter = resolveDomainAdapter(claim);
  assert.equal(adapter?.id, "python2_lifecycle");
  assert.equal(buildClaimSearchQuery(claim), claim);
  assert.deepEqual(sourceDomainHints(claim), []);
  assert.notEqual(adapter.primaryQuery(2026, claim), claim);
});

test("broad unseen subjects remain eligible for general retrieval without adapter registration", () => {
  const claims = [
    "The current chief executive of a newly formed company is still in office.",
    "A recently amended maritime treaty now applies to all signatories.",
    "A municipal desalination authority updated its standards this year.",
    "تغيّر نظام التأشيرات لهذا البلد خلال الشهر الحالي.",
    "أعلنت مؤسسة دولية عن معيار جديد للتجارة الرقمية."
  ];
  for (const claim of claims) {
    assert.equal(resolveDomainAdapter(claim), null, claim);
    assert.equal(buildClaimSearchQuery(claim), claim);
    assert.deepEqual(sourceDomainHints(claim), []);
  }
});

test("historical specialist routing uses bounded full-scope matches, not loose entity substrings", () => {
  assert.equal(resolveHistoricalSourceAdapter("The person who wrote the report changed their view."), null);
  assert.equal(resolveHistoricalSourceAdapter("The current iPhone price changed this week."), null);
  assert.equal(resolveHistoricalSourceAdapter("A heart transplant unit updated its visiting hours."), null);

  assert.equal(
    resolveHistoricalSourceAdapter("COVID-19 no longer constituted a PHEIC on 5 May 2023.")?.id,
    "WHO_COVID_PHEIC_2023"
  );
  assert.equal(
    resolveHistoricalSourceAdapter("The first iPhone was introduced in 2007.")?.id,
    "FIRST_IPHONE"
  );
  assert.equal(
    resolveHistoricalSourceAdapter("Christiaan Barnard performed the first human heart transplant in 1967.")?.id,
    "FIRST_HUMAN_HEART_TRANSPLANT"
  );
});

test("topic-specific relevance aliases apply only after explicit specialist adapter resolution", () => {
  const claim = "The first iPhone was released in 2007.";
  const source = {
    title: "First-generation iPhone introduced in 2007",
    snippet: "Apple introduced the first-generation iPhone in January 2007.",
    url: "https://www.apple.com/newsroom/2007/01/09Apple-Reinvents-the-Phone-with-iPhone/"
  };
  const generic = scoreSourceRelevance(claim, source);
  const specialist = scoreSourceRelevance(claim, source, resolveHistoricalSourceAdapter(claim));
  assert.ok(specialist.matched_term_count > generic.matched_term_count);
});

test("specialist adapters remain optional enrichment and do not define supported subject coverage", () => {
  const knownSpecialistClaim = "Python 2.7 is still officially supported.";
  const unknownSpecialistClaim = "The current rules for an emerging quantum-network protocol changed recently.";
  assert.ok(resolveDomainAdapter(knownSpecialistClaim));
  assert.equal(resolveDomainAdapter(unknownSpecialistClaim), null);
  assert.equal(typeof buildClaimSearchQuery(unknownSpecialistClaim), "string");
  assert.equal(buildClaimSearchQuery(unknownSpecialistClaim), unknownSpecialistClaim);
});


test("unregistered-topic claim reaches the real Worker retrieval path with its own generic query", async () => {
  const originalFetch = globalThis.fetch;
  const claim = "The newly adopted coastal resilience custom took effect last Thursday.";
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    assert.equal(url, "https://api.tavily.com/search");
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://freshproof.test" },
      body: JSON.stringify({ text: claim })
    }), {
      ALLOWED_ORIGIN: "https://freshproof.test",
      TAVILY_API_KEY: "synthetic-test-key",
      ENABLE_SEMANTIC_TRIAGE: "false"
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.claims.length, 1);
    assert.equal(body.claims[0].domain_adapter, "general");
    assert.ok(requests.length >= 1);
    assert.equal(requests[0].query, claim, "the first search must be the unconstrained generic claim query");
    assert.equal(Object.hasOwn(requests[0], "include_domains"), false, "the universal baseline must not be constrained by a guessed publisher list");
    assert.equal(body.methodology.search_budget.used, requests.length);
    assert.ok(requests.length <= 5, "the request-wide search budget must remain bounded");
    assert.ok(["NEEDS_REVIEW", "UNVERIFIABLE"].includes(body.claims[0].status));
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("unregistered topics receive bounded publisher-agnostic diversity enrichment when baseline results cluster", async () => {
  const originalFetch = globalThis.fetch;
  const claim = "The newly adopted coastal resilience custom took effect last Thursday.";
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(typeof input === "string" ? input : input.url, "https://api.tavily.com/search");
    const request = JSON.parse(init.body);
    requests.push(request);
    const source = requests.length === 1
      ? {
          title: "Coastal resilience custom effective date",
          url: "https://coastal-policy.example/report",
          published_date: new Date().toISOString().slice(0, 10),
          score: 0.95,
          content: "The newly adopted coastal resilience custom took effect last Thursday."
        }
      : {
          title: "Independent marine institute confirms custom date",
          url: "https://marine-research.example/notice",
          published_date: new Date().toISOString().slice(0, 10),
          score: 0.94,
          content: "The newly adopted coastal resilience custom took effect last Thursday."
        };
    return new Response(JSON.stringify({ results: [source] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://freshproof.test" },
      body: JSON.stringify({ text: claim })
    }), {
      ALLOWED_ORIGIN: "https://freshproof.test",
      TAVILY_API_KEY: "synthetic-test-key",
      ENABLE_SEMANTIC_TRIAGE: "false"
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.claims[0].domain_adapter, "general");
    assert.equal(requests.length, 2);
    assert.equal(requests[0].query, claim, "the first request remains the original publisher-agnostic proposition");
    assert.equal(Object.hasOwn(requests[0], "include_domains"), false);
    assert.match(requests[1].query, /official primary institutional sources/i);
    assert.equal(Object.hasOwn(requests[1], "include_domains"), false,
      "unknown topics must not receive a guessed publisher allowlist");
    assert.equal(body.methodology.search_budget.used, 2);
    assert.equal(body.claims[0].retrieval_diagnostics.some(item =>
      item.stage === "INDEPENDENT_DOMAIN_FALLBACK"
      && item.strategy === "PUBLISHER_AGNOSTIC_SECONDARY_QUERY"
      && item.result_count === 1
    ), true);
    assert.ok(["NEEDS_REVIEW", "UNVERIFIABLE"].includes(body.claims[0].status),
      "a second search must not bypass the evidence adjudication/abstention gates");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("known-topic claims retain the original text through generic retrieval", async () => {
  const originalFetch = globalThis.fetch;
  const claim = "The Paris Agreement entered into force on 12 December 2015.";
  const requests = [];
  assert.equal(buildClaimSearchQuery(claim), claim);
  assert.deepEqual(sourceDomainHints(claim), []);
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(typeof input === "string" ? input : input.url, "https://api.tavily.com/search");
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://freshproof.test" },
      body: JSON.stringify({ text: claim })
    }), {
      ALLOWED_ORIGIN: "https://freshproof.test",
      TAVILY_API_KEY: "synthetic-test-key",
      ENABLE_SEMANTIC_TRIAGE: "false"
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(requests[0].query, claim);
    assert.equal(Object.hasOwn(requests[0], "include_domains"), false);
    assert.ok(requests.length >= 1 && requests.length <= 5,
      "the original query may be followed only by bounded publisher-agnostic diversity enrichment");
    assert.ok(requests.every(request => !Object.hasOwn(request, "include_domains")),
      "the generic path must never constrain publishers from a topic/entity keyword list");
    assert.ok(requests.every(request => request.query === claim
      || request.query === claim + " official primary institutional sources"),
      "generic retrieval may only add the publisher-agnostic diversity suffix");
    assert.equal(body.methodology.search_budget.used, requests.length);
    assert.ok(requests.length <= 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
