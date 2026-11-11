import test from "node:test";
import assert from "node:assert/strict";
import { scoreSourceRelevance } from "../worker/index.js";

test("current identity wording does not penalize relevant historical rename evidence", () => {
  const claim = "Twitter is currently known as Twitter.";
  const source = {
    title: "X (formerly Twitter) | Social networking service",
    snippet: "The social networking service formerly known as Twitter is now called X."
  };
  const result = scoreSourceRelevance(claim, source);
  assert.equal(result.relevance, "HIGH");
  assert.ok(result.matched_terms.includes("known"));
  assert.ok(!result.unmatched_terms.includes("currently"));
});

test("brand-name non-change claim matches explicit rebranding evidence without deciding truth", () => {
  const claim = "Twitter's official brand name has not changed.";
  const source = {
    title: "Twitter rebranded as X",
    snippet: "The company announced the rebrand from Twitter to X in July 2023."
  };
  const result = scoreSourceRelevance(claim, source);
  assert.equal(result.relevance, "HIGH");
  assert.ok(result.matched_terms.includes("changed"));
  assert.ok(result.unmatched_terms.includes("not"));
});
