import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker, { VERSION } from "../worker/index.js";

const claim = "The Acme service is currently available to customers.";
const published = new Date().toISOString().slice(0, 10);
const sources = [
  {
    title: "Official Acme service notice",
    url: "https://agency.gov/acme-service-status",
    published_date: published,
    score: 0.99,
    content: "Official notice: The Acme service was discontinued on 2025-06-01 and is no longer available to customers."
  },
  {
    title: "Independent government service report",
    url: "https://department.gov/reports/acme-service",
    published_date: published,
    score: 0.98,
    content: "Independent government report: The Acme service was discontinued on 2025-06-01 and is no longer available to customers."
  }
];

function correctionResponse(quoteMode = "valid") {
  const firstQuote = quoteMode === "invalid"
    ? "The Acme service is still available to all customers."
    : "Official notice: The Acme service was discontinued on 2025-06-01 and is no longer available to customers.";
  return {
    status: "SUPPORTED",
    text: "The Acme service was discontinued on 2025-06-01.",
    scope_match: "MATCHED",
    timeframe_match: "MATCHED",
    conflict_status: "NONE",
    evidence: [
      { source_index: 0, relation: "SUPPORTS_CANDIDATE", supporting_quote: firstQuote },
      { source_index: 1, relation: "SUPPORTS_CANDIDATE", supporting_quote: "Independent government report: The Acme service was discontinued on 2025-06-01 and is no longer available to customers." }
    ],
    limitation: "The replacement is limited to the named service and the documented discontinuation date."
  };
}

async function runApiScenario({ sourceSet = sources, relations = ["CONTRADICTS", "CONTRADICTS"], quoteMode = "valid" } = {}) {
  const originalFetch = globalThis.fetch;
  let aiCalls = 0;
  const ai = {
    async run(_model, input) {
      aiCalls++;
      const system = input?.messages?.[0]?.content || "";
      if (system.includes("evidence relation classifier")) {
        return { response: JSON.stringify({
          assessments: sourceSet.map((_, source_index) => ({
            source_index,
            relation: relations[source_index] || "INSUFFICIENT",
            rationale: "Controlled synthetic fixture relation."
          }))
        }) };
      }
      return { response: JSON.stringify(correctionResponse(quoteMode)) };
    }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    assert.equal(url, "https://api.tavily.com/search");
    assert.equal(init.method, "POST");
    const headers = new Headers(init.headers);
    assert.equal(headers.get("authorization"), "Bearer synthetic-test-key");
    const tavilyBody = JSON.parse(init.body);
    assert.equal(Object.hasOwn(tavilyBody, "api_key"), false);
    return new Response(JSON.stringify({
      results: sourceSet.map(source => ({
        title: source.title,
        url: source.url,
        published_date: source.published_date,
        score: source.score,
        content: source.content
      }))
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const request = new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://freshproof.test" },
      body: JSON.stringify({ text: claim })
    });
    const response = await worker.fetch(request, {
      ALLOWED_ORIGIN: "https://freshproof.test",
      TAVILY_API_KEY: "synthetic-test-key",
      ENABLE_SEMANTIC_TRIAGE: "true",
      ENABLE_CORRECTION_CANDIDATE_REVIEW: "true",
      FREE_WORKERS_AI_QUOTA_VERIFIED: "true",
      AI: ai
    });
    const body = await response.json();
    return { response, body, aiCalls };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("v0.2.59 full-product integration: VERIFY -> EXPLAIN -> CORRECT and safe abstention", async () => {
  assert.equal(VERSION, "0.2.76");

  // Positive end-to-end path: deterministic retrieval + injected model fixture,
  // through Worker API, adjudication, explanation, correction, and response.
  const positive = await runApiScenario();
  assert.equal(positive.response.status, 200);
  assert.equal(positive.body.version, "0.2.76");
  assert.equal(positive.body.claims.length, 1);
  assert.deepEqual(positive.body.extraction, { detected_count: 1, processed_count: 1, truncated_count: 0, is_truncated: false, maximum_processed_claims: 3 });
  const result = positive.body.claims[0];
  assert.equal(result.status, "CONTRADICTED");
  assert.equal(result.adjudication.method, "CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE");
  assert.equal(result.explanation_detail.summary, "Accepted evidence conflicts with the claim.");
  assert.equal(result.explanation_detail.evidence_basis.length, 2);
  assert.equal(result.explanation_detail.date_interpretation.publication_date, published);
  assert.equal(result.correction.status, "PROVIDED");
  assert.equal(result.correction.text, "The Acme service was discontinued on 2025-06-01.");
  assert.equal(result.correction.evidence_refs.length, 2);
  assert.match(result.correction.evidence_refs[0].supporting_quote, /discontinued on 2025-06-01/);
  assert.equal(positive.aiCalls, 2, "one synthetic relation assessment and one synthetic correction review");
  assert.equal(result.explanation_detail.date_interpretation.event_date, null,
    "a generic search excerpt's possible event date must not be promoted into an adjudicated event date");
  assert.equal(result.explanation_detail.date_interpretation.publication_date, published,
    "the source publication date must remain a separate field");

  // Positive support path: corroborated evidence may support CURRENT, but it
  // must not cause FreshProof to invent a replacement correction.
  const supported = await runApiScenario({ relations: ["SUPPORTS", "SUPPORTS"] });
  assert.equal(supported.body.claims[0].status, "CURRENT");
  assert.equal(supported.body.claims[0].correction.status, "NOT_NEEDED");
  assert.equal(supported.body.claims[0].correction.text, null);
  assert.equal(supported.aiCalls, 1, "a CURRENT claim must not trigger correction review");

  // Conflicting relations must produce NEEDS_REVIEW and never trigger correction.
  const conflict = await runApiScenario({ relations: ["SUPPORTS", "CONTRADICTS"] });
  assert.equal(conflict.body.claims[0].status, "NEEDS_REVIEW");
  assert.equal(conflict.body.claims[0].correction.status, "WITHHELD");
  assert.equal(conflict.body.claims[0].correction.text, null);
  assert.equal(conflict.aiCalls, 1, "the correction review must not run after conflict/abstention");

  // One source is insufficient for independent corroboration.
  const insufficient = await runApiScenario({ sourceSet: sources.slice(0, 1), relations: ["CONTRADICTS"] });
  assert.equal(insufficient.body.claims[0].status, "NEEDS_REVIEW");
  assert.equal(insufficient.body.claims[0].correction.status, "WITHHELD");
  assert.equal(insufficient.body.claims[0].correction.text, null);
  assert.equal(insufficient.aiCalls, 1);

  // Two URLs on the same host are not independent sources.
  const sameHost = [
    sources[0],
    { ...sources[1], url: "https://agency.gov/second-report" }
  ];
  const sameHostResult = await runApiScenario({ sourceSet: sameHost });
  assert.equal(sameHostResult.body.claims[0].status, "NEEDS_REVIEW");
  assert.equal(sameHostResult.body.claims[0].correction.status, "WITHHELD");
  assert.equal(sameHostResult.aiCalls, 1);

  // A fabricated/paraphrased quote must fail closed even if the fixture labels
  // the candidate SUPPORTED.
  const invalidQuote = await runApiScenario({ quoteMode: "invalid" });
  assert.equal(invalidQuote.body.claims[0].status, "CONTRADICTED");
  assert.equal(invalidQuote.body.claims[0].correction.status, "WITHHELD");
  assert.equal(invalidQuote.body.claims[0].correction.text, null);
  assert.equal(invalidQuote.aiCalls, 2);

  // A low-relevance source is excluded before adjudication and cannot be used
  // to manufacture a correction.
  const lowRelevance = await runApiScenario({
    sourceSet: [
      { ...sources[0], title: "Official aircraft maintenance notice", content: "Official notice about unrelated aircraft maintenance schedules and runway operations." },
      { ...sources[1], title: "Independent airport operations report", content: "Independent report about unrelated aircraft maintenance schedules and runway operations." }
    ]
  });
  assert.equal(lowRelevance.body.claims[0].status, "UNVERIFIABLE");
  assert.equal(lowRelevance.body.claims[0].correction.status, "WITHHELD");
  assert.equal(lowRelevance.body.claims[0].correction.text, null);
});

test("claim-conditioned retrieval enriches the original query without replacing it or bypassing abstention", async () => {
  const originalFetch = globalThis.fetch;
  const claim = "Satya Nadella is the current Chief Executive Officer of Microsoft.";
  const queries = [];
  const searchDomainRequests = [];
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(typeof input === "string" ? input : input.url, "https://api.tavily.com/search");
    const body = JSON.parse(init.body);
    queries.push(body.query);
    searchDomainRequests.push(body.include_domains || []);
    return new Response(JSON.stringify({ results: [] }), {
      status: 200, headers: { "content-type": "application/json" }
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
    const result = body.claims[0];
    assert.equal(response.status, 200);
    assert.equal(queries[0], claim, "the exact original proposition must remain the baseline query");
    assert.ok(queries.some(query => query !== claim && /official leadership page/.test(query)),
      "a claim-conditioned official leadership query must be added when budget permits");
    assert.ok(searchDomainRequests.some(domains => domains.includes("news.microsoft.com") || domains.includes("microsoft.com")),
      "the additive query should target the known organization's first-party domain");
    assert.ok(["NEEDS_REVIEW", "UNVERIFIABLE"].includes(result.status),
      "empty retrieval must abstain; query enrichment cannot manufacture a verdict");
    assert.equal(result.correction.status, "WITHHELD");
    assert.ok(result.retrieval_diagnostics.some(item =>
      item.stage === "CLAIM_CONDITIONED_SEARCH_ENRICHMENT" && item.status === "NO_RESULTS"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("frontend renders supporting excerpts as text, not executable HTML", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(app, /el\.textContent = text/);
  assert.match(app, /node\("blockquote", "outcome-quote", item\.supporting_quote\)/);
  assert.match(app, /link\.rel = "noopener noreferrer"/);
  assert.match(app, /correction\.evidence_refs/);
  assert.match(app, /SUPPORTED AS STATED/);
  assert.match(app, /This does not mean the event is recent or ongoing/);
  assert.match(app, /NOT TIME-SENSITIVE · FACTUAL REVIEW STILL RUNS/);
  assert.match(app, /statusTone/);
});


test("v0.2.59 factual verification runs for non-time-sensitive claims", async () => {
  const originalFetch = globalThis.fetch;
  const stableClaim = "Water is composed of hydrogen and oxygen.";
  const stableSources = [
    { title: "Water molecule reference", url: "https://chemistry.example.edu/water-molecule", score: 0.99, content: "Water molecules consist of two hydrogen atoms bonded to one oxygen atom." },
    { title: "Science education reference", url: "https://science.example.ac.uk/chemical-composition-water", score: 0.98, content: "A water molecule contains two hydrogen atoms and one oxygen atom, with formula H2O." }
  ];
  const ai = { async run(_model, input) {
    const system = input?.messages?.[0]?.content || "";
    if (!system.includes("evidence relation classifier")) throw new Error("Correction review must not run for a supported claim");
    return { response: JSON.stringify({ assessments: stableSources.map((_, source_index) => ({ source_index, relation: "SUPPORTS", rationale: "Controlled synthetic support fixture." })) }) };
  }};
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(typeof input === "string" ? input : input.url, "https://api.tavily.com/search");
    assert.equal(init.method, "POST");
    return new Response(JSON.stringify({ results: stableSources }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json", origin: "https://freshproof.test" },
      body: JSON.stringify({ text: stableClaim })
    }), {
      ALLOWED_ORIGIN: "https://freshproof.test", TAVILY_API_KEY: "synthetic-test-key",
      ENABLE_SEMANTIC_TRIAGE: "true", AI: ai
    });
    const body = await response.json();
    const result = body.claims[0];
    assert.equal(response.status, 200);
    assert.equal(body.version, "0.2.76");
    assert.equal(result.temporal_assessment.status, "NOT_TIME_SENSITIVE");
    assert.equal(result.status, "CURRENT");
    assert.equal(result.adjudication.method, "CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE");
    assert.equal(result.correction.status, "NOT_NEEDED");
    assert.equal(result.sources.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test("v0.2.59 non-time-sensitive claim still abstains when semantic assessment is disabled", async () => {
  const originalFetch = globalThis.fetch;
  const stableClaim = "Water is composed of hydrogen and oxygen.";
  const stableSources = [
    { title: "Water molecule reference", url: "https://chemistry.example.edu/water-molecule", content: "Water molecules consist of two hydrogen atoms bonded to one oxygen atom." },
    { title: "Science education reference", url: "https://science.example.ac.uk/chemical-composition-water", content: "A water molecule contains two hydrogen atoms and one oxygen atom." }
  ];
  globalThis.fetch = async () => new Response(JSON.stringify({ results: stableSources }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json", origin: "https://freshproof.test" },
      body: JSON.stringify({ text: stableClaim })
    }), { ALLOWED_ORIGIN: "https://freshproof.test", TAVILY_API_KEY: "synthetic-test-key", ENABLE_SEMANTIC_TRIAGE: "false" });
    const result = (await response.json()).claims[0];
    assert.equal(result.temporal_assessment.status, "NOT_TIME_SENSITIVE");
    assert.equal(result.status, "NEEDS_REVIEW");
    assert.equal(result.correction.status, "WITHHELD");
    assert.equal(result.sources.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});


test("multi-claim requests spend only spare search budget to diversify independent publishers", async () => {
  const originalFetch = globalThis.fetch;
  const sourcesByDomain = {
    "usgs.gov": {
      title: "USGS — Water molecule",
      url: "https://www.usgs.gov/water-science-school/science/water-molecule",
      published_date: "2026-11-10",
      score: 0.99,
      content: "Water is composed of molecules with two hydrogen atoms and one oxygen atom, H2O."
    },
    "rsc.org": {
      title: "Royal Society of Chemistry — Water",
      url: "https://www.rsc.org/periodic-table/compound/7732/water",
      published_date: "2026-11-09",
      score: 0.98,
      content: "Water has the chemical formula H2O: each molecule contains two hydrogen atoms and one oxygen atom."
    },
    "nasa.gov": {
      title: "NASA — Apollo 11",
      url: "https://www.nasa.gov/history/apollo-11-mission-overview/",
      published_date: "2026-11-10",
      score: 0.99,
      content: "Apollo 11 landed the first humans on the Moon in July 1969."
    },
    "si.edu": {
      title: "Smithsonian — Apollo 11",
      url: "https://www.si.edu/spotlight/apollo-11",
      published_date: "2026-11-09",
      score: 0.98,
      content: "The Apollo 11 mission landed astronauts on the Moon in 1969."
    }
  };
  let searchCalls = 0;
  let aiCalls = 0;
  const ai = {
    async run(_model, input) {
      aiCalls++;
      const user = input?.messages?.find(message => message.role === "user")?.content || "";
      const payload = JSON.parse(user);
      return { response: JSON.stringify({
        assessments: (payload.sources || []).map((source, source_index) => ({
          source_index,
          relation: "SUPPORTS",
          rationale: "Controlled independent-publisher fixture."
        }))
      }) };
    }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    assert.equal(url, "https://api.tavily.com/search");
    assert.equal(init.method, "POST");
    const request = JSON.parse(init.body);
    const domains = request.include_domains || [];
    let results;
    if (domains.length) {
      const source = sourcesByDomain[domains[0]];
      results = source ? [source] : [];
    } else if (/water|hydrogen|oxygen/i.test(request.query)) {
      results = [sourcesByDomain["usgs.gov"], sourcesByDomain["rsc.org"]];
    } else if (/apollo|moon/i.test(request.query)) {
      results = [sourcesByDomain["nasa.gov"], sourcesByDomain["si.edu"]];
    } else {
      results = [];
    }
    searchCalls++;
    return new Response(JSON.stringify({ results }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://freshproof.test" },
      body: JSON.stringify({ text: "Water is composed of hydrogen and oxygen.\nApollo 11 landed on the Moon in 1969." })
    }), {
      ALLOWED_ORIGIN: "https://freshproof.test",
      TAVILY_API_KEY: "synthetic-test-key",
      ENABLE_SEMANTIC_TRIAGE: "true",
      AI: ai
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.version, "0.2.76");
    assert.equal(body.claims.length, 2);
    assert.ok(searchCalls >= 2 && searchCalls <= 5, "baseline retrieval plus bounded diversity fallback must stay within the request-wide search budget");
    assert.equal(searchCalls <= 5, true, "the request-wide search budget must not be exceeded");
    assert.equal(aiCalls, 2);
    for (const result of body.claims) {
      assert.equal(result.status, "CURRENT");
      assert.equal(result.sources.length, 2);
      assert.equal(result.adjudication.adjudication_signals.independent_supporting_domains, 2);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
