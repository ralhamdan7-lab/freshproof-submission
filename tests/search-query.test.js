import test from "node:test";
import assert from "node:assert/strict";
import { buildClaimSearchQuery, searchTimeRangeForClaim, sourceDomainHints, sourceReliability, scoreSourceRelevance, isExpectedHistoricalRedirect, extractHistoricalExcerpt } from "../worker/index.js";

test("historical email query targets the named inventor, year, and event", () => {
  const query = buildClaimSearchQuery("The first network email was sent by Ray Tomlinson in 1971.");
  assert.match(query, /Ray Tomlinson/);
  assert.match(query, /1971/);
  assert.match(query, /first email/);
});

test("first iPhone query distinguishes the original 2007 announcement from current models", () => {
  const query = buildClaimSearchQuery("Apple introduced the first iPhone in 2007.");
  assert.match(query, /first iPhone/);
  assert.match(query, /Computer History Museum/);
  assert.match(query, /Smithsonian/);
});

test("water query targets molecular composition rather than unrelated water topics", () => {
  const query = buildClaimSearchQuery("Water is composed of hydrogen and oxygen.");
  assert.match(query, /H2O/);
  assert.match(query, /two hydrogen atoms/);
  assert.match(query, /one oxygen atom/);
});

test("unrecognized claims preserve the baseline query unchanged", () => {
  const claim = "The European Central Bank was established in 1998.";
  assert.equal(buildClaimSearchQuery(claim), claim);
  const generic = "A novel claim about an unfamiliar scientific instrument.";
  assert.equal(buildClaimSearchQuery(generic), generic);
});

test("query enrichment is retrieval-only and does not produce a verification verdict", () => {
  const query = buildClaimSearchQuery("Mount Everest is the highest mountain above sea level.");
  assert.equal(typeof query, "string");
  assert.equal(query.includes("CURRENT"), false);
  assert.equal(query.includes("CONTRADICTED"), false);
});

test("well-scoped historical event claims disable the recent-year search filter", () => {
  assert.equal(searchTimeRangeForClaim("The first iPhone was released in 2007."), null);
  assert.equal(searchTimeRangeForClaim("The first network email was sent by Ray Tomlinson in 1971."), null);
});

test("non-temporal stable and historical claims search the full evidence index", () => {
  assert.equal(searchTimeRangeForClaim("Water is composed of hydrogen and oxygen."), null);
  assert.equal(searchTimeRangeForClaim("Mount Everest is the highest mountain above sea level."), null);
  assert.equal(searchTimeRangeForClaim("The 2022 FIFA World Cup final was played on 18 December 2022."), null);
  assert.equal(searchTimeRangeForClaim("The Panama Canal officially opened in 1914."), null);
});

test("explicitly dynamic claims retain a recent-year evidence window", () => {
  assert.equal(searchTimeRangeForClaim("Satya Nadella is the current CEO of Microsoft."), "year");
  assert.equal(searchTimeRangeForClaim("ChatGPT Plus currently costs $20 per month."), "year");
  assert.equal(searchTimeRangeForClaim("The European Union currently has 27 member states."), "year");
  assert.equal(searchTimeRangeForClaim("The United Kingdom is currently a member of the European Union."), "year");
});

test("current corporate-role claims search official leadership records without guessing the company domain", () => {
  const personFirst = "Satya Nadella is the current CEO of Microsoft.";
  const query = buildClaimSearchQuery(personFirst);
  assert.match(query, /Satya Nadella/);
  assert.match(query, /CEO/);
  assert.match(query, /Microsoft/);
  assert.match(query, /official leadership page/);
  assert.match(query, /annual report/);
  assert.deepEqual(sourceDomainHints(personFirst), ["news.microsoft.com", "microsoft.com", "sec.gov", "reuters.com"]);
  assert.deepEqual(sourceDomainHints("Asha Rao is the current CEO of an unknown organization."), []);

  const roleFirst = "The current CEO of Microsoft is Satya Nadella.";
  const roleFirstQuery = buildClaimSearchQuery(roleFirst);
  assert.match(roleFirstQuery, /Satya Nadella/);
  assert.match(roleFirstQuery, /Microsoft/);
  assert.match(roleFirstQuery, /CEO/);
});

test("UK-EU membership claims target the official withdrawal record rather than only the EU roster", () => {
  const claim = "The United Kingdom is currently a member of the European Union.";
  const query = buildClaimSearchQuery(claim);
  assert.match(query, /ceased to be a Member State/);
  assert.match(query, /31 January 2020/);
  assert.match(query, /GOV\.UK/);
  assert.deepEqual(sourceDomainHints(claim), [
    "gov.uk", "eur-lex.europa.eu", "european-union.europa.eu", "consilium.europa.eu"
  ]);
});

test("EU member-count claims target the official current roster and legal glossary", () => {
  const claim = "The European Union currently has 27 member states.";
  const query = buildClaimSearchQuery(claim);
  assert.match(query, /EU countries/);
  assert.match(query, /Pages \(27\)/);
  assert.match(query, /27 Member States/);
  assert.ok(sourceDomainHints(claim).includes("eur-lex.europa.eu"));
});

test("EU AI Act and Elizabeth Line claims target their first-party authorities", () => {
  const aiAct = "The European Union AI Act entered into force on 1 August 2024.";
  assert.match(buildClaimSearchQuery(aiAct), /EUR-Lex/);
  assert.ok(sourceDomainHints(aiAct).includes("eur-lex.europa.eu"));
  assert.ok(sourceDomainHints(aiAct).includes("digital-strategy.ec.europa.eu"));

  const elizabeth = "The Elizabeth line opened on 24 May 2022.";
  assert.deepEqual(sourceDomainHints(elizabeth), ["tfl.gov.uk", "royal.uk", "gov.uk"]);
});

test("historical source redirects must preserve the exact approved host and path", () => {
  const source = "https://www.who.int/news/item/05-05-2023-statement";
  assert.equal(isExpectedHistoricalRedirect(source, source, "www.who.int"), true);
  assert.equal(isExpectedHistoricalRedirect(source, source + "/", "www.who.int"), true);
  assert.equal(isExpectedHistoricalRedirect(source, "https://www.who.int/publications/m/item/old-pheic", "www.who.int"), false);
  assert.equal(isExpectedHistoricalRedirect(source, "https://attacker.example/news/item/05-05-2023-statement", "www.who.int"), false);
  assert.equal(isExpectedHistoricalRedirect(source, "http://www.who.int/news/item/05-05-2023-statement", "www.who.int"), false);
});

test("direct historical evidence requires a matching source-specific excerpt", () => {
  const valid = "The WHO Director-General said on 5 May 2023 that COVID-19 no longer constitutes a public health emergency of international concern.";
  assert.match(extractHistoricalExcerpt(valid, "WHO_COVID_PHEIC_2023"), /no longer constitutes a public health emergency/i);
  assert.equal(extractHistoricalExcerpt("An unrelated WHO publication about the January 2020 PHEIC declaration.", "WHO_COVID_PHEIC_2023"), null);
});

test("TLS deprecation query planning targets IETF standards and NIST authorities", () => {
  assert.match(buildClaimSearchQuery("TLS 1.0 and TLS 1.1 are deprecated."), /RFC 8996/);
  assert.deepEqual(sourceDomainHints("TLS 1.0 and TLS 1.1 are deprecated."), ["rfc-editor.org", "nist.gov", "ietf.org"]);
});

test("IETF datatracker RFC sources qualify and deprecates matches deprecated claims", () => {
  assert.equal(sourceReliability("https://datatracker.ietf.org/doc/rfc8996/"), "PRIMARY_OR_OFFICIAL_DOMAIN");
  const relevance = scoreSourceRelevance("TLS 1.0 and TLS 1.1 are deprecated.", {
    title: "RFC 8996: Deprecating TLS 1.0 and TLS 1.1",
    snippet: "This document formally deprecates Transport Layer Security (TLS) versions 1.0 and 1.1. TLS 1.0 MUST NOT be used. TLS 1.1 MUST NOT be used."
  });
  assert.equal(relevance.relevance, "HIGH");
});


test("WHO PHEIC claims target the dated first-party WHO statement and independent health authorities", () => {
  const claim = "As of 5 May 2023, COVID-19 still constituted a public health emergency of international concern according to the WHO Director-General.";
  const query = buildClaimSearchQuery(claim);
  assert.match(query, /WHO/);
  assert.match(query, /5 May 2023/);
  assert.match(query, /no longer constitutes a public health emergency of international concern/i);
  assert.deepEqual(sourceDomainHints(claim), ["who.int", "ecdc.europa.eu", "cdc.gov"]);
});

test("Node.js lifecycle claims prefer the official Node.js release schedule", () => {
  assert.deepEqual(sourceDomainHints("Node.js 22 is currently an LTS release line."), ["nodejs.org"]);
});

test("WHO PHEIC fallback query targets the exact dated WHO primary announcement", async () => {
  const { buildWhoPheicPrimaryQuery } = await import("../worker/index.js");
  const query = buildWhoPheicPrimaryQuery("COVID-19 remained a PHEIC on 5 May 2023.");
  assert.ok(query.includes("site:who.int/news/item/05-05-2023"));
  assert.match(query, /5 May 2023/);
  assert.match(query, /no longer constitutes a public health emergency/i);
  assert.equal(buildWhoPheicPrimaryQuery("Node.js 22 is supported."), null);
});

test("dated WHO COVID PHEIC claims use the verified first-party WHO statement URL", async () => {
  const { historicalDiversitySearchPlan } = await import("../worker/index.js");
  const plan = historicalDiversitySearchPlan("As of 5 May 2023, the WHO Director-General determined that COVID-19 no longer constituted a public health emergency of international concern.");
  assert.equal(plan.id, "WHO_COVID_PHEIC_2023");
  assert.equal(plan.directSources[0].host, "www.who.int");
  assert.equal(plan.directSources[0].url, "https://www.who.int/news/item/05-05-2023-statement-on-the-fifteenth-meeting-of-the-international-health-regulations-(2005)-emergency-committee-regarding-the-coronavirus-disease-(covid-19)-pandemic");
  assert.equal(historicalDiversitySearchPlan("Node.js 22 is currently supported."), null);
});
