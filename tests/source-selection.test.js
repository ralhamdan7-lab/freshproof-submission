import test from "node:test";
import assert from "node:assert/strict";
import { selectDiverseSources } from "../worker/index.js";

const mk = (url, tier, relevance) => ({ url, source_reliability: tier, relevance_assessment: { relevance } });

test("v0.2.98: the evidence window keeps up to two classified, non-low-relevance publishers", () => {
  const ranked = [
    mk("https://blog-one.com/a", "UNASSESSED", "HIGH"), mk("https://blog-two.com/a", "UNASSESSED", "HIGH"),
    mk("https://blog-three.com/a", "UNASSESSED", "HIGH"), mk("https://blog-four.com/a", "UNASSESSED", "HIGH"),
    mk("https://blog-five.com/a", "UNASSESSED", "HIGH"), mk("https://www.britannica.com/a", "SECONDARY_REPUTABLE", "MEDIUM"),
    mk("https://www.agency.gov.sa/a", "PRIMARY_OR_OFFICIAL_DOMAIN", "MEDIUM"), mk("https://www.bbc.com/a", "SECONDARY_REPUTABLE", "LOW")
  ];
  const picked = selectDiverseSources(ranked, 5).map(item => new URL(item.url).hostname);
  assert.equal(picked.length, 5);
  assert.ok(picked.includes("www.britannica.com"));
  assert.ok(picked.includes("www.agency.gov.sa"));
  assert.ok(!picked.includes("www.bbc.com"), "low-relevance sources are never promoted");
  assert.deepEqual(picked.slice(0, 3), ["blog-one.com", "blog-two.com", "blog-three.com"]);
  // Without classified candidates the ranked order is unchanged.
  assert.deepEqual(selectDiverseSources(ranked.slice(0, 5), 5).map(item => item.url), ranked.slice(0, 5).map(item => item.url));
});
