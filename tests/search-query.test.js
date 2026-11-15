import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClaimSearchQuery,
  searchTimeRangeForClaim,
  sourceDomainHints,
  sourceReliability,
  scoreSourceRelevance,
  isExpectedHistoricalRedirect,
  extractHistoricalExcerpt
} from "../worker/index.js";
import { resolveDomainAdapter, resolveHistoricalSourceAdapter } from "../worker/domain-adapters.js";

test("generic query construction preserves the original claim across known and unseen topics", () => {
  const claims = [
    "The first network email was sent by Ray Tomlinson in 1971.",
    "Apple introduced the first iPhone in 2007.",
    "Water is composed of hydrogen and oxygen.",
    "Satya Nadella is the current CEO of Microsoft.",
    "The United Kingdom is currently a member of the European Union.",
    "The European Union currently has 27 member states.",
    "The European Union AI Act entered into force on 1 August 2024.",
    "TLS 1.0 and TLS 1.1 are deprecated.",
    "The European Central Bank was established in 1998.",
    "A novel claim about an unfamiliar scientific instrument."
  ];
  for (const claim of claims) {
    assert.equal(buildClaimSearchQuery(claim), claim);
    assert.deepEqual(sourceDomainHints(claim), []);
  }
});

test("specialist lifecycle recognition is separate from generic query construction", () => {
  const claim = "Node.js 20.x remains actively supported under LTS.";
  const adapter = resolveDomainAdapter(claim);
  assert.equal(adapter?.id, "software_release");
  assert.equal(buildClaimSearchQuery(claim), claim);
  assert.deepEqual(sourceDomainHints(claim), []);
  assert.notEqual(adapter.primaryQuery(2026, claim), claim);
});

test("explicit historical adapters require the complete event scope and avoid substring collisions", () => {
  assert.equal(resolveHistoricalSourceAdapter("The person who wrote the report changed their view."), null);
  assert.equal(resolveHistoricalSourceAdapter("The person who wrote about COVID on 5 May 2023 changed their view."), null);
  assert.equal(resolveHistoricalSourceAdapter("The current iPhone price changed this week."), null);
  assert.equal(resolveHistoricalSourceAdapter("A heart transplant unit updated its visiting hours."), null);

  const who = resolveHistoricalSourceAdapter("COVID-19 no longer constituted a PHEIC on 5 May 2023.");
  assert.equal(who.id, "WHO_COVID_PHEIC_2023");
  assert.equal(who.directSources[0].host, "www.who.int");
  assert.match(who.query, /5 May 2023/);

  const iphone = resolveHistoricalSourceAdapter("The first iPhone was released in 2007.");
  assert.equal(iphone.id, "FIRST_IPHONE");
  assert.deepEqual(iphone.domains, ["apple.com", "vam.ac.uk", "si.edu"]);
  assert.ok(iphone.directSources.some(source => source.host === "www.apple.com"));

  const transplant = resolveHistoricalSourceAdapter("Christiaan Barnard performed the first human heart transplant in 1967.");
  assert.equal(transplant.id, "FIRST_HUMAN_HEART_TRANSPLANT");
  assert.deepEqual(transplant.domains, ["health.uct.ac.za", "gshfb.co.za", "gov.za"]);
});

test("first-iPhone relevance aliases are scoped to the explicit historical adapter", () => {
  const claim = "The first iPhone was released in 2007.";
  const source = {
    title: "Apple iPhone introduced in 2007",
    snippet: "Apple introduced iPhone in January 2007."
  };
  const generic = scoreSourceRelevance(claim, source);
  const specialist = scoreSourceRelevance(claim, source, resolveHistoricalSourceAdapter(claim));
  assert.ok(specialist.matched_term_count > generic.matched_term_count);
  assert.equal(specialist.relevance, "HIGH");

  const unrelatedClaim = "The first version of the protocol was released in 2007.";
  const unrelated = scoreSourceRelevance(unrelatedClaim, {
    title: "Protocol announced in 2007",
    snippet: "The protocol was announced in 2007."
  });
  assert.notEqual(unrelated.relevance, "HIGH");
});

test("heart-transplant event guard is scoped to its explicit adapter", () => {
  const claim = "The first successful human heart transplant was performed in 1967.";
  const source = {
    title: "Stanford inventions and innovations",
    snippet: "A 1959 medical innovation and later work in the heart transplant field."
  };
  const generic = scoreSourceRelevance(claim, source);
  const specialist = scoreSourceRelevance(claim, source, resolveHistoricalSourceAdapter(claim));
  assert.notEqual(generic.method, "HISTORICAL_EVENT_CONTEXT_GUARD");
  assert.equal(specialist.relevance, "LOW");
  assert.equal(specialist.method, "HISTORICAL_EVENT_CONTEXT_GUARD");
});

test("well-scoped historical event claims disable the recent-year search filter", () => {
  assert.equal(searchTimeRangeForClaim("The first iPhone was released in 2007."), null);
  assert.equal(searchTimeRangeForClaim("The first network email was sent by Ray Tomlinson in 1971."), null);
  assert.equal(searchTimeRangeForClaim("The 2022 FIFA World Cup final was played on 18 December 2022."), null);
  assert.equal(searchTimeRangeForClaim("The Panama Canal officially opened in 1914."), null);
});

test("explicitly dynamic claims retain a recent-year evidence window", () => {
  assert.equal(searchTimeRangeForClaim("Satya Nadella is the current CEO of Microsoft."), "year");
  assert.equal(searchTimeRangeForClaim("ChatGPT Plus currently costs $20 per month."), "year");
  assert.equal(searchTimeRangeForClaim("The European Union currently has 27 member states."), "year");
  assert.equal(searchTimeRangeForClaim("The United Kingdom is currently a member of the European Union."), "year");
});

test("official sources and direct historical evidence keep their source contracts", () => {
  assert.equal(sourceReliability("https://datatracker.ietf.org/doc/rfc8996/"), "PRIMARY_OR_OFFICIAL_DOMAIN");
  assert.equal(sourceReliability("https://www.who.int/news/item/05-05-2023-statement"), "PRIMARY_OR_OFFICIAL_DOMAIN");
  const valid = "The WHO Director-General said on 5 May 2023 that COVID-19 no longer constitutes a public health emergency of international concern.";
  assert.match(extractHistoricalExcerpt(valid, "WHO_COVID_PHEIC_2023"), /no longer constitutes a public health emergency/i);
  assert.equal(extractHistoricalExcerpt("An unrelated WHO publication about the January 2020 PHEIC declaration.", "WHO_COVID_PHEIC_2023"), null);
});

test("historical source redirects must preserve the exact approved host and path", () => {
  const source = "https://www.who.int/news/item/05-05-2023-statement";
  assert.equal(isExpectedHistoricalRedirect(source, source, "www.who.int"), true);
  assert.equal(isExpectedHistoricalRedirect(source, source + "/", "www.who.int"), true);
  assert.equal(isExpectedHistoricalRedirect(source, "https://www.who.int/publications/m/item/old-pheic", "www.who.int"), false);
  assert.equal(isExpectedHistoricalRedirect(source, "https://attacker.example/news/item/05-05-2023-statement", "www.who.int"), false);
  assert.equal(isExpectedHistoricalRedirect(source, "http://www.who.int/news/item/05-05-2023-statement", "www.who.int"), false);
});

test("TLS evidence relevance remains generic and no guessed publisher list is produced", () => {
  const claim = "TLS 1.0 and TLS 1.1 are deprecated.";
  const relevance = scoreSourceRelevance(claim, {
    title: "RFC 8996: Deprecating TLS 1.0 and TLS 1.1",
    snippet: "This document formally deprecates Transport Layer Security (TLS) versions 1.0 and 1.1. TLS 1.0 MUST NOT be used. TLS 1.1 MUST NOT be used."
  });
  assert.equal(relevance.relevance, "HIGH");
  assert.deepEqual(sourceDomainHints(claim), []);
});
