// v0.2.84 publisher identity: telemetry + JSON-LD first-party confirmation.
// A self-declared identity never confers authority. Synthetic entities only.
import test from "node:test";
import assert from "node:assert/strict";
import { organizationKeys, claimNamesOrganization, assessPublisherIdentity, declaredOrganization } from "../worker/authority-resolver.js";
import { enrichSourceWithPage, extractPageDocument } from "../worker/evidence-acquisition.js";
import { verify, page, vague } from "./helpers/acquisition-harness.js";

const CLAIM = "The Quilomab Standards Council adopted the Q-7 measurement standard on 12 March 2024.";
const ORG = "Quilomab Standards Council (QSC)";

test("organisation keys separate case-insensitive phrases from case-sensitive acronyms", () => {
  const keys = organizationKeys(ORG);
  assert.deepEqual(keys.phrases, ["quilomab standards council"]);
  assert.ok(keys.acronyms.includes("QSC"));
  assert.deepEqual(organizationKeys("Home"), { phrases: [], acronyms: [] });
});

test("claim naming is whole-phrase; ordinary words never match an acronym", () => {
  assert.equal(claimNamesOrganization(CLAIM, ORG), "quilomab standards council");
  assert.equal(claimNamesOrganization("QSC adopted the Q-7 standard.", ORG), "QSC");
  assert.equal(claimNamesOrganization("A person who joined the qsc club said so.", ORG), null);
  assert.equal(claimNamesOrganization("The council adopted a national standard.", "National Council"), null);
  assert.equal(claimNamesOrganization("أعلن مجلس كيلوماب للمعايير اعتماد المعيار.", "مجلس كيلوماب للمعايير"), "مجلس كيلوماب للمعايير");
});

test("only the trailing segment of a separated title is a publisher candidate", () => {
  const topicFirst = assessPublisherIdentity({ title: "Q-7 measurement standard | Ardent Digest" }, "The Q-7 measurement standard was adopted.");
  assert.equal(topicFirst.claim_named_key, null, "topic segment must not be read as the publisher");
  const publisherLast = assessPublisherIdentity({ title: "Q-7 adoption notice | Quilomab Standards Council" }, CLAIM);
  assert.equal(publisherLast.claim_named_key, "quilomab standards council");
  assert.deepEqual(publisherLast.identity_evidence, ["PAGE_TITLE_SUFFIX"]);
});

test("JSON-LD organisation name is read from publisher blocks", () => {
  const block = JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle", headline: "x", publisher: { "@type": "Organization", name: "Quilomab Standards Council" } });
  assert.deepEqual(declaredOrganization([block]), { name: "Quilomab Standards Council", type: "Organization" });
  const doc = extractPageDocument(`<html><head><script type="application/ld+json">${block}</script></head><body><p>x</p></body></html>`);
  assert.equal(doc.organization.name, "Quilomab Standards Council");
});

const fetched = (url, html) => ({ ok: true, requested_url: url, final_url: url, redirects: [], http_status: 200, content_type: "text/html", truncated: false, retrieved_at: new Date().toISOString(), html });
const pageHtml = head => `<html><head><title>Q-7 adoption notice</title>${head}</head><body><p>The Quilomab Standards Council adopted the Q-7 measurement standard on 12 March 2024 after public consultation.</p></body></html>`;
const ogSite = name => `<meta property="og:site_name" content="${name}">`;
const ldOrg = name => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", publisher: { "@type": "GovernmentOrganization", name } })}</script>`;

test("a self-declared identity on a foreign domain is recorded but confers no authority", () => {
  const spoof = enrichSourceWithPage({ url: "https://qsc-news.example.com/q7", source_reliability: "UNASSESSED", reliability_basis: "UNCLASSIFIED_PUBLISHER" },
    fetched("https://qsc-news.example.com/q7", pageHtml(ogSite(ORG))), CLAIM);
  assert.equal(spoof.source_reliability, "UNASSESSED");
  assert.equal(spoof.reliability_basis, "UNCLASSIFIED_PUBLISHER");
  assert.equal(spoof.publisher_identity.claim_named_key, "quilomab standards council", "identity is still visible in the trace");
});

test("JSON-LD organisation name alone can confirm a first-party page", () => {
  const firstParty = { url: "https://www.qsc.org/notices/q7", source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", reliability_basis: "FIRST_PARTY_ENTITY_DOMAIN", first_party_entity: "qsc" };
  const viaLd = enrichSourceWithPage(firstParty, fetched(firstParty.url, pageHtml(ldOrg("QSC"))), CLAIM);
  assert.equal(viaLd.first_party_confirmation, "PAGE_IDENTITY_NAMES_ENTITY");
  assert.equal(viaLd.source_reliability, "PRIMARY_OR_OFFICIAL_DOMAIN");
  const none = enrichSourceWithPage(firstParty, fetched(firstParty.url, pageHtml("")), CLAIM);
  assert.equal(none.first_party_confirmation, "NOT_CONFIRMED_BY_PAGE_IDENTITY");
  assert.equal(none.source_reliability, "UNASSESSED");
});

const searchFor = urls => () => urls.map(url => vague("Q-7 adoption notice", url));
const ORACLE = { supports: ["adopted the Q-7 measurement standard on 12 March 2024"], claimType: "OTHER", temporalKind: "STABLE" };
const bodyHtml = head => page({ title: "Q-7 adoption notice", body: "The Quilomab Standards Council adopted the Q-7 measurement standard on 12 March 2024 after public consultation." }).replace("<head>", `<head>${head}`);

test("E2E: the same issuer text on a spoof host never reaches the issuer's reliability", async () => {
  const own = "https://www.qsc.org/notices/q7";
  const spoof = "https://qsc-news.example.com/q7";
  const issuer = await verify(CLAIM, { search: searchFor([own]), pages: { [own]: { html: bodyHtml(ogSite(ORG)) } }, oracle: ORACLE });
  const issuerSource = issuer.body.claims[0].sources.find(source => source.url === own);
  assert.equal(issuerSource.source_reliability, "PRIMARY_OR_OFFICIAL_DOMAIN");
  assert.equal(issuerSource.first_party_confirmation, "PAGE_IDENTITY_NAMES_ENTITY");
  assert.equal(issuerSource.publisher_identity.claim_named_key, "quilomab standards council");

  const spoofed = await verify(CLAIM, { search: searchFor([spoof]), pages: { [spoof]: { html: bodyHtml(ogSite(ORG)) } }, oracle: ORACLE });
  const spoofSource = spoofed.body.claims[0].sources.find(source => source.url === spoof);
  assert.notEqual(spoofSource.source_reliability, "PRIMARY_OR_OFFICIAL_DOMAIN");
  assert.ok(!["CURRENT", "CONTRADICTED", "SUPERSEDED"].includes(spoofed.body.claims[0].status), spoofed.body.claims[0].status);
});

test("E2E: issuer page the semantic layer labels a secondary report is not decisive", async () => {
  const own = "https://www.qsc.org/notices/q7";
  const result = await verify(CLAIM, { search: searchFor([own]), pages: { [own]: { html: bodyHtml(ogSite(ORG)) } }, oracle: { ...ORACLE, roles: { "www.qsc.org": "SECONDARY_REPORT" } } });
  assert.notEqual(result.body.claims[0].status, "CURRENT");
});

test("first-party page naming the organisation in full is confirmed by acronym; a different same-acronym body is not", () => {
  const firstParty = { url: "https://www.qsc.org/notices/q7", source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", reliability_basis: "FIRST_PARTY_ENTITY_DOMAIN", first_party_entity: "qsc" };
  const fullName = enrichSourceWithPage(firstParty, fetched(firstParty.url, pageHtml(ogSite("Quilomab Standards Council"))), CLAIM);
  assert.equal(fullName.first_party_confirmation, "PAGE_IDENTITY_NAMES_ENTITY_BY_ACRONYM");
  assert.equal(fullName.source_reliability, "PRIMARY_OR_OFFICIAL_DOMAIN");

  const otherBody = enrichSourceWithPage(firstParty, fetched(firstParty.url, pageHtml(ogSite("Quilomab Shipping Company"))), CLAIM);
  assert.equal(otherBody.first_party_confirmation, "NOT_CONFIRMED_BY_PAGE_IDENTITY", "same acronym, but the claim does not name this organisation");
  assert.equal(otherBody.source_reliability, "UNASSESSED");

  const titleSuffix = enrichSourceWithPage(firstParty, fetched(firstParty.url, `<html><head><title>Q-7 adoption notice | Quilomab Standards Council</title></head><body><p>The Quilomab Standards Council adopted the Q-7 measurement standard on 12 March 2024.</p></body></html>`), CLAIM);
  assert.equal(titleSuffix.first_party_confirmation, "PAGE_IDENTITY_NAMES_ENTITY_BY_ACRONYM");
});
