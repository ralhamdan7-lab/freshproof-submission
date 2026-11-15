import test from "node:test";
import assert from "node:assert/strict";
import worker, { selectDiverseSources, sourceReliability, scoreSourceRelevance } from "../worker/index.js";
import { resolveHistoricalSourceAdapter } from "../worker/domain-adapters.js";
import { registrableDomain } from "../worker/evidence-adjudication.js";

test("historical diversity plans target independent first-party publishers", () => {
  const iphone = resolveHistoricalSourceAdapter("The first iPhone was released in 2007.");
  assert.equal(iphone.id, "FIRST_IPHONE");
  assert.deepEqual(iphone.domains, ["apple.com", "vam.ac.uk", "si.edu"]);
  const transplant = resolveHistoricalSourceAdapter("The first successful human heart transplant was performed in 1967.");
  assert.equal(transplant.id, "FIRST_HUMAN_HEART_TRANSPLANT");
  assert.deepEqual(transplant.domains, ["health.uct.ac.za", "gshfb.co.za", "gov.za"]);
  assert.equal(resolveHistoricalSourceAdapter("Apollo 11 landed on the Moon in 1969."), null);
});

test("South African institutional subdomains resolve to independent registrable publishers", () => {
  assert.equal(registrableDomain("https://health.uct.ac.za/cardiothoracic-surgery/history"), "uct.ac.za");
  assert.equal(registrableDomain("https://www.gshfb.co.za/about"), "gshfb.co.za");
  assert.equal(registrableDomain("https://www.samj.org.za/article"), "samj.org.za");
  assert.equal(registrableDomain("https://another.gov.za/article"), "another.gov.za");
});

test("source selection prioritizes publisher diversity before duplicate pages", () => {
  const ranked = ["computerhistory.org/a", "computerhistory.org/b", "apple.com/a", "si.edu/a", "gshfb.co.za/a", "uct.ac.za/a"]
    .map((host, index) => ({ url: "https://" + host, index }));
  const selected = selectDiverseSources(ranked, 4);
  assert.deepEqual(selected.map(x => x.index), [0, 2, 3, 4]);
  assert.equal(new Set(selected.map(x => registrableDomain(x.url))).size, 4);
});

test("historical retrieval supplements concentrated result clusters and retains independent publishers", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  const result = (title, url, content, published_date = "2026-03-01") => ({ title, url, content, published_date, score: 0.95 });
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    const html = (title, content) => new Response("<html><head><title>" + title + "</title></head><body><main>" + content + "</main></body></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    if (target === "https://www.apple.com/newsroom/2007/01/09Apple-Reinvents-the-Phone-with-iPhone/") {
      return html("Apple Reinvents the Phone with iPhone - Apple", "PRESS RELEASE January 9, 2007. Apple today introduced iPhone. iPhone will be available in the US in June 2007.");
    }
    if (target === "https://collections.vam.ac.uk/item/O1328358/iphone-1st-generation-apple-iphone-ive-jonathan/") {
      return html("iPhone, 1st generation - V&A Explore the Collections", "The iPhone 2G was developed by Apple Inc. in 2005 and launched in 2007. It is the first generation of iPhone. The phone was introduced by Jobs on January 9, 2007.");
    }
    if (target === "https://www.si.edu/object/iphone-model-2g:chndm_2009-29-1") {
      return html("iPhone Model 2G - Smithsonian Institution", "The object was manufactured by Apple Inc. and has a date of 2007. It is an original iPhone model in the Smithsonian collection.");
    }
    if (target === "https://health.uct.ac.za/cardiothoracic-surgery/historical/first-human-heart-transplant") {
      return html("World's First Human Heart Transplant - University of Cape Town", "The first human heart transplant in the world was performed at Groote Schuur Hospital on 3 December 1967 by Professor Christiaan Barnard.");
    }
    if (target === "https://www.gshfb.co.za/groote-schuur-hospital") {
      return html("Groote Schuur Hospital", "On 3 December 1967, Chris Barnard and his team performed the first ever heart transplant in the world at Groote Schuur Hospital.");
    }
    if (target !== "https://api.tavily.com/search") throw new Error("Unexpected outbound request: " + target);
    const body = JSON.parse(init.body);
    requests.push(body);
    // The first pass is intentionally the raw, unrestricted claim query.
    // Return no results so the optional historical specialist enrichment can run.
    if (body.query === "The first iPhone was released in 2007." ||
        body.query === "The first successful human heart transplant was performed in 1967.") {
      return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (body.query.includes("Apple newsroom")) {
      return new Response(JSON.stringify({ results: [
        result("Apple Reinvents the Phone with iPhone", "https://www.apple.com/newsroom/2007/01/09Apple-Reinvents-the-Phone-with-iPhone/", "Apple introduced the original iPhone on January 9, 2007. The first iPhone was announced in 2007 and was available in June 2007."),
        result("IPhone Model 2G Smartphone", "https://collection.cooperhewitt.org/objects/18733051/", "The original iPhone was a 2007 debut. Steve Jobs unveiled the product in January 2007 for a June launch.")
      ] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (body.query.includes("Groote Schuur")) {
      return new Response(JSON.stringify({ results: [
        result("World's First Human Heart Transplant", "https://health.uct.ac.za/cardiothoracic-surgery/historical/first-human-heart-transplant", "The first human heart transplant in the world was performed at Groote Schuur Hospital just before 6 a.m. on Sunday 3 December 1967 by Professor Christiaan Barnard."),
        result("About Groote Schuur Hospital", "https://www.gshfb.co.za/about/", "On 3 December 1967, Chris Barnard and his team performed the first ever heart transplant in the world at Groote Schuur Hospital.")
      ] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (body.query.includes("first iPhone 2007")) {
      return new Response(JSON.stringify({ results: Array.from({ length: 5 }, (_, i) =>
        result("Computer History Museum iPhone history " + i, "https://computerhistory.org/blog/iphone-history-" + i, "The original iPhone was announced in 2007 and shipped in 2007.")
      ) }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (body.query.includes("first human heart transplant")) {
      return new Response(JSON.stringify({ results: [
        result("NCBI history of heart transplantation", "https://pmc.ncbi.nlm.nih.gov/articles/PMC13075970/", "The first human heart transplant occurred on December 3, 1967."),
        result("NCBI heart transplant review", "https://pmc.ncbi.nlm.nih.gov/articles/PMC12634396/", "Christiaan Barnard performed the first heart transplant in 1967."),
        result("NCBI medical history", "https://pmc.ncbi.nlm.nih.gov/articles/PMC12926931/", "The first human heart transplant was performed in 1967."),
        result("Stanford medical innovations", "https://news.stanford.edu/stories/2026/03/stanford-inventions-innovations", "A history of medical innovation and the heart transplant field.")
      ] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("Unexpected Tavily query: " + body.query);
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "The first iPhone was released in 2007. The first successful human heart transplant was performed in 1967." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.claims.length, 2);
    const iphone = body.claims.find(x => /iphone/i.test(x.text));
    const transplant = body.claims.find(x => /heart transplant/i.test(x.text));
    assert.ok(iphone.sources.some(x => new URL(x.url).hostname === "www.apple.com"));
    assert.ok(iphone.sources.some(x => new URL(x.url).hostname === "collections.vam.ac.uk"));
    assert.ok(transplant.sources.some(x => new URL(x.url).hostname === "health.uct.ac.za"));
    assert.ok(transplant.sources.some(x => new URL(x.url).hostname === "www.gshfb.co.za"));
    assert.equal(sourceReliability("https://health.uct.ac.za/cardiothoracic-surgery"), "INSTITUTIONAL");
    assert.equal(sourceReliability("https://www.gshfb.co.za/about"), "INSTITUTIONAL");
    assert.equal(sourceReliability("https://collections.vam.ac.uk/item/O1328358/iphone-1st-generation-apple-iphone-ive-jonathan/"), "INSTITUTIONAL");
    assert.equal(sourceReliability("https://www.si.edu/object/iphone-model-2g:chndm_2009-29-1"), "PRIMARY_OR_OFFICIAL_DOMAIN");
    assert.equal(body.methodology.search_budget.used, 4,
      "the shared request budget preserves both unrestricted baselines and permits bounded historical enrichment queries");
    // Five validated historical-source fetches remain; v0.2.82 generic page
    // acquisition may use the remaining shared budget but never exceeds it.
    assert.ok(body.methodology.direct_fetch_budget.used >= 5);
    assert.ok(body.methodology.direct_fetch_budget.used <= body.methodology.direct_fetch_budget.limit);
    assert.ok(iphone.retrieval_diagnostics.some(x => x.stage === "DIRECT_HISTORICAL_SOURCE" && x.status === "VALIDATED"));
    assert.ok(transplant.retrieval_diagnostics.some(x => x.stage === "DIRECT_HISTORICAL_SOURCE" && x.status === "VALIDATED"));
    assert.ok(new Set(iphone.sources.map(x => registrableDomain(x.url))).size >= 3);
    assert.ok(new Set(transplant.sources.map(x => registrableDomain(x.url))).size >= 2,
      "the two independently validated institutional publishers must remain available even when the shared search budget is exhausted");
  } finally { globalThis.fetch = originalFetch; }
});

test("released and announced are contextual aliases only for the original iPhone timeline", () => {
  const iphoneClaim = "The first iPhone was released in 2007.";
  const iphone = scoreSourceRelevance(iphoneClaim, {
    title: "IPhone Model 2G Smartphone",
    snippet: "The original iPhone was a 2007 debut. Steve Jobs unveiled the product in January 2007 for a June launch."
  }, resolveHistoricalSourceAdapter(iphoneClaim));
  assert.equal(iphone.relevance, "HIGH");
  const unrelatedClaim = "The first version of the protocol was released in 2007.";
  const unrelated = scoreSourceRelevance(unrelatedClaim, {
    title: "Protocol announced in 2007",
    snippet: "The protocol was announced in 2007."
  }, null);
  assert.notEqual(unrelated.relevance, "HIGH");
});

test("heart-transplant relevance excludes nearby history without the 1967 event anchors", () => {
  const claim = "The first successful human heart transplant was performed in 1967.";
  const adapter = resolveHistoricalSourceAdapter(claim);
  const unrelated = scoreSourceRelevance(claim, {
    title: "Stanford inventions and innovations",
    snippet: "A 1959 medical innovation and later work in the heart transplant field."
  }, adapter);
  assert.equal(unrelated.relevance, "LOW");
  assert.equal(unrelated.method, "HISTORICAL_EVENT_CONTEXT_GUARD");
  const direct = scoreSourceRelevance(claim, {
    title: "World's First Human Heart Transplant",
    snippet: "Professor Christiaan Barnard performed the first human heart transplant at Groote Schuur Hospital on 3 December 1967."
  }, adapter);
  assert.equal(direct.relevance, "HIGH");
});

test("Tavily request-scoped circuit breaker stops repeated failing searches", async () => {
  const originalFetch = globalThis.fetch;
  let tavilyCalls = 0;
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    const html = (title, content) => new Response("<html><head><title>" + title + "</title></head><body>" + content + "</body></html>", { status: 200, headers: { "content-type": "text/html" } });
    if (target === "https://api.tavily.com/search") {
      tavilyCalls++;
      return new Response(JSON.stringify({ error: "rate limited" }), { status: 429, headers: { "content-type": "application/json" } });
    }
    if (target === "https://www.apple.com/newsroom/2007/01/09Apple-Reinvents-the-Phone-with-iPhone/") {
      return html("Apple Reinvents the Phone with iPhone", "January 9, 2007. Apple introduced iPhone and said it would be available in June 2007.");
    }
    if (target === "https://collections.vam.ac.uk/item/O1328358/iphone-1st-generation-apple-iphone-ive-jonathan/") {
      return html("iPhone, 1st generation - V&A", "The iPhone 2G was launched in 2007. It is the first generation of iPhone.");
    }
    if (target === "https://www.si.edu/object/iphone-model-2g:chndm_2009-29-1") {
      return new Response("Forbidden", { status: 403, headers: { "content-type": "text/html" } });
    }
    throw new Error("Unexpected outbound request: " + target);
  };
  try {
    const response = await worker.fetch(new Request("https://freshproof.test/api/verify", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "The first iPhone was released in 2007." })
    }), { TAVILY_API_KEY: "test-key", ALLOWED_ORIGIN: "*" });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(tavilyCalls, 1);
    const diagnostics = body.claims[0].retrieval_diagnostics;
    assert.ok(diagnostics.some(x => x.status === "RATE_LIMITED" && x.http_status === 429));
    assert.ok(diagnostics.some(x => x.status === "CIRCUIT_OPEN" && x.http_status === 429));
    assert.ok(diagnostics.some(x => x.stage === "DIRECT_HISTORICAL_SOURCE" && x.status === "VALIDATED"));
  } finally { globalThis.fetch = originalFetch; }
});
