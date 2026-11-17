import test from "node:test";
import assert from "node:assert/strict";
import { assessSourceAuthority, normalizePlannedAuthorityDomains, plannedAuthorityMatch } from "../worker/evidence-acquisition.js";

test("a domain named by the search plan raises an unclassified publisher to the lowest qualified tier", () => {
  const planned = normalizePlannedAuthorityDomains(["toureiffel.paris"], "The Eiffel Tower was completed in 1889.");
  const result = assessSourceAuthority("https://www.toureiffel.paris/en/the-monument/history", "The Eiffel Tower was completed in 1889.", "UNASSESSED", { plannedAuthorityDomains: planned });
  assert.equal(result.reliability, "SECONDARY_REPUTABLE");
  assert.equal(result.basis, "MODEL_PLANNED_AUTHORITY_DOMAIN");
});

test("subdomains match by label boundary only", () => {
  assert.equal(plannedAuthorityMatch("https://news.example-agency.org/a", ["example-agency.org"]), "example-agency.org");
  assert.equal(plannedAuthorityMatch("https://example-agency.org.attacker.net/a", ["example-agency.org"]), null);
  assert.equal(plannedAuthorityMatch("https://notexample-agency.org/a", ["example-agency.org"]), null);
});

test("a domain written in the claim cannot be nominated as its own authority", () => {
  assert.deepEqual(normalizePlannedAuthorityDomains(["truth-site.com"], "According to truth-site.com, the moon is hollow."), []);
});

test("open-publishing platforms, bare suffixes and malformed values are rejected", () => {
  assert.deepEqual(normalizePlannedAuthorityDomains(["en.wikipedia.org", "medium.com", "gov.sa", "co.uk", "not a domain", "1.2.3.4", "https://www.who.int/news"], "claim"), ["who.int"]);
});

test("user-generated pages and curated tiers are not changed by the plan", () => {
  const ugc = assessSourceAuthority("https://example-agency.org/forum/thread/1", "claim", "UNASSESSED", { plannedAuthorityDomains: ["example-agency.org"] });
  assert.equal(ugc.reliability, "UNASSESSED");
  const curated = assessSourceAuthority("https://www.bbc.com/news/x", "claim", "SECONDARY_REPUTABLE", { plannedAuthorityDomains: ["bbc.com"] });
  assert.equal(curated.basis, "CURATED_OR_SUFFIX_REGISTRY");
});

test("without a plan nothing changes", () => {
  const result = assessSourceAuthority("https://unknown-publisher.net/x", "claim", "UNASSESSED");
  assert.equal(result.reliability, "UNASSESSED");
});
