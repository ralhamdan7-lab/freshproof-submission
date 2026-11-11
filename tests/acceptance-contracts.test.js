import test from "node:test";
import assert from "node:assert/strict";
import { resolveDomainAdapter } from "../worker/domain-adapters.js";
import { buildCorrection } from "../worker/product-outcomes.js";

const PYTHON_URL = "https://www.python.org/doc/sunset-python-2/";
const PYTHON_CLAIM = "Python 2.7 is still officially supported.";
const VALID_EXCERPT = "The sunset date has now passed; it was January 1, 2020. Python 2 is no longer supported.";

function pythonAdapter() {
  const adapter = resolveDomainAdapter(PYTHON_CLAIM);
  assert.equal(adapter?.id, "python2_lifecycle");
  return adapter;
}

test("Python 2 adapter accepts a validated official first-party indexed excerpt after direct HTTP 403", async () => {
  const adapter = pythonAdapter();
  let searchCalls = 0;
  const result = await adapter.additionalEvidence({
    fetch: async () => new Response("Forbidden", { status: 403 }),
    search: async (query, domains, options) => {
      searchCalls++;
      assert.deepEqual(domains, ["python.org"]);
      assert.equal(options.timeRange, null);
      return [{ title: "Sunsetting Python 2 | Python.org", url: PYTHON_URL, snippet: VALID_EXCERPT }];
    }
  });

  assert.equal(searchCalls, 1);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].evidence_kind, "OFFICIAL_PYTHON2_SUNSET_NOTICE");
  assert.equal(result.sources[0].acquisition_method, "TAVILY_INDEXED_FIRST_PARTY_PAGE");
  assert.equal(result.sources[0].event_date_candidate, "2020-01-01");
  assert.match(result.sources[0].acquisition_limitation, /page itself was not fetched/i);
  assert.equal(adapter.adjudicate(result.sources).status, "SUPERSEDED");
});

test("Python 2 adapter rejects lookalike hosts, unrelated paths, and incomplete indexed excerpts", async () => {
  const adapter = pythonAdapter();
  const invalidResults = [
    { title: "Spoofed", url: "https://python.org.attacker.example/doc/sunset-python-2/", snippet: VALID_EXCERPT },
    { title: "Wrong path", url: "https://www.python.org/doc/using-python/", snippet: VALID_EXCERPT },
    { title: "Missing date", url: PYTHON_URL, snippet: "Python 2 is no longer supported." },
    { title: "Missing support statement", url: PYTHON_URL, snippet: "The sunset date was January 1, 2020. Python 2 remains widely used." }
  ];
  const result = await adapter.additionalEvidence({
    fetch: async () => new Response("Forbidden", { status: 403 }),
    search: async () => invalidResults
  });

  assert.deepEqual(result.sources, []);
  assert.equal(result.diagnostics.some(item => item.status === "NO_VALIDATED_FIRST_PARTY_RESULT"), true);
  assert.equal(adapter.adjudicate([], { retrievalDiagnostics: result.diagnostics }).status, "NEEDS_REVIEW");
});

test("Python 2 adapter prefers validated direct official HTML and skips indexed fallback", async () => {
  const adapter = pythonAdapter();
  let searchCalls = 0;
  const html = `<!doctype html><html><body><h1>Sunsetting Python 2</h1><p>${VALID_EXCERPT}</p></body></html>`;
  const result = await adapter.additionalEvidence({
    fetch: async () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }),
    search: async () => { searchCalls++; return []; }
  });

  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].acquisition_method, undefined);
  assert.equal(result.sources[0].publication_date_semantics, "NOT_PROVIDED");
  assert.equal(searchCalls, 0);
  assert.equal(adapter.adjudicate(result.sources).status, "SUPERSEDED");
});

test("Python 2 correction is withheld unless the exact official finding and citation are present", () => {
  const source = {
    title: "Sunsetting Python 2 | Python.org",
    url: PYTHON_URL,
    evidence_kind: "OFFICIAL_PYTHON2_SUNSET_NOTICE"
  };
  const base = {
    claim: PYTHON_CLAIM,
    status: "SUPERSEDED",
    domainAdapter: "python2_lifecycle",
    domainEvidence: {
      method: "OFFICIAL_PYTHON_ORG_SUNSET_NOTICE",
      event_date: "2020-01-01",
      source
    },
    explanationDetail: { evidence_basis: [{ url: PYTHON_URL }] }
  };

  const valid = buildCorrection(base);
  assert.equal(valid.status, "PROVIDED");
  assert.match(valid.text, /no longer supported/i);

  assert.equal(buildCorrection({
    ...base,
    domainEvidence: { ...base.domainEvidence, method: "UNRELATED_METHOD" }
  }).status, "WITHHELD");

  assert.equal(buildCorrection({
    ...base,
    explanationDetail: { evidence_basis: [{ url: "https://example.com/claim" }] }
  }).status, "WITHHELD");
});

test("generic outdated findings do not invent a replacement without an independently reviewed candidate", () => {
  const correction = buildCorrection({
    claim: "The service is currently available in every country.",
    status: "SUPERSEDED"
  });
  assert.equal(correction.status, "WITHHELD");
  assert.equal(correction.text, null);
  assert.match(correction.limitations.join(" "), /withheld/i);
});

test("NOT_TIME_SENSITIVE is explicitly not a factual truth verdict", () => {
  const correction = buildCorrection({
    claim: "Water is composed of hydrogen and oxygen atoms.",
    status: "NOT_TIME_SENSITIVE"
  });
  assert.equal(correction.status, "NOT_APPLICABLE");
  assert.equal(correction.text, null);
  assert.match(correction.limitations.join(" "), /not a truth verdict/i);
});

test("Arabic Python 2 correction is direct and preserves the event date", () => {
  const correction = buildCorrection({
    claim: "لا يزال Python 2.7 مدعوماً رسمياً.",
    status: "SUPERSEDED",
    domainAdapter: "python2_lifecycle",
    domainEvidence: {
      method: "OFFICIAL_PYTHON_ORG_SUNSET_NOTICE",
      event_date: "2020-01-01",
      source: { title: "Sunsetting Python 2 | Python.org", url: PYTHON_URL }
    },
    explanationDetail: { evidence_basis: [{ url: PYTHON_URL }] }
  });
  assert.equal(correction.status, "PROVIDED");
  assert.match(correction.text, /لم يعد Python 2 مدعوماً/);
  assert.match(correction.text, /1 يناير 2020/);
});


test("Python 2 lifecycle adapter recognizes Arabic support-status phrasing", () => {
  for (const claim of [
    "لا يزال Python 2.7 مدعوماً رسمياً.",
    "Python 2.7 لم يعد مدعوماً.",
    "انتهى الدعم الرسمي لـ Python 2.7."
  ]) {
    const adapter = resolveDomainAdapter(claim);
    assert.equal(adapter?.id, "python2_lifecycle", claim);
  }
  assert.equal(resolveDomainAdapter("صدر Python 2.7 عام 2010.")?.id, undefined);
});

test("official ChatGPT Plus pricing adapter fetches the exact first-party Help Center article", async () => {
  const adapter = resolveDomainAdapter("ChatGPT Plus currently costs $20 per month in the United States.");
  assert.equal(adapter?.id, "official_pricing");
  const html = '<!doctype html><html><head><title>What is ChatGPT Plus?</title></head><body><h1>What is ChatGPT Plus?</h1><p>ChatGPT Plus is a subscription plan that provides enhanced access for $20/month.</p><p>Price: $20/month (billed monthly).</p></body></html>';
  const result = await adapter.additionalEvidence({
    fetch: async url => new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" }
    })
  });
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].url, "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus");
  assert.equal(result.sources[0].evidence_kind, "OFFICIAL_CHATGPT_PLUS_PRICING_HELP_ARTICLE");
  assert.match(result.sources[0].snippet, /\$20\/month/);
  assert.equal(result.sources[0].published_date, null);
  assert.ok(Date.parse(result.sources[0].retrieved_at));
  assert.equal(adapter.adjudicate(result.sources).status, null, "pricing retrieval must not emit a truth verdict");
});
