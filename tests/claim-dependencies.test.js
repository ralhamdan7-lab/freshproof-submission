// v0.2.84 extraction dependencies: no orphan claims from pronoun, demonstrative,
// relative-time or contrast leads; original text preserved. Synthetic entities.
import test from "node:test";
import assert from "node:assert/strict";
import { splitClaims, bindDependentSentences, decomposeClaimForAssessment } from "../worker/index.js";

test("pronoun-led and relative-time sentences bind to their antecedent sentence", () => {
  assert.deepEqual(splitClaims("The Larkspur Dam opened in 1998. It was renamed the Velmora Dam in 2015."),
    ["The Larkspur Dam opened in 1998. It was renamed the Velmora Dam in 2015."]);
  assert.deepEqual(splitClaims("The Quilomab Council adopted standard Q-7 in 2019. Two years later, it withdrew the standard."),
    ["The Quilomab Council adopted standard Q-7 in 2019. Two years later, it withdrew the standard."]);
  assert.deepEqual(splitClaims("The Ardent ferry operates daily between Port Lemm and Port Ash. However, the service was suspended on 2 March 2026."),
    ["The Ardent ferry operates daily between Port Lemm and Port Ash. However, the service was suspended on 2 March 2026."]);
});

test("Arabic reference, relative-time and contrast leads bind (including with a trailing comma)", () => {
  assert.equal(splitClaims("افتُتح سد لاركسبير عام 1998. وفي العام التالي، أعيدت تسميته إلى سد فيلمورا.").length, 1);
  assert.equal(splitClaims("تعمل عبّارة أردنت يومياً. لكن الخدمة عُلّقت في 2 مارس 2026.").length, 1);
  assert.equal(splitClaims("أعلن مجلس كيلوماب المعيار في 2019. وهو معيار إلزامي منذ ذلك الحين.").length, 1);
});

test("independent sentences and sentence-level conditions stay separate", () => {
  assert.deepEqual(splitClaims("The Larkspur Dam opened in 1998. The Velmora Bridge opened in 2004."),
    ["The Larkspur Dam opened in 1998.", "The Velmora Bridge opened in 2004."]);
  assert.equal(splitClaims("If the vote passes, the Ardent levy takes effect in May. The Larkspur Council approved the budget in 2024.").length, 2);
});

test("binding is bounded so a long pronoun chain cannot swallow the whole input", () => {
  const chain = ["The Larkspur Dam opened in 1998."].concat(Array.from({ length: 5 }, (_, i) => `It was inspected again in ${2000 + i}.`)).join(" ");
  const units = bindDependentSentences(chain.split(/(?<=\.)\s+/));
  assert.equal(units[0].count, 3);
  assert.ok(units.length >= 2);
  assert.equal(units[1].orphan, true, "a dependent sentence beyond the bound is flagged, not silently promoted");
});

test("semicolon pronoun clause stays attached as a REFERENCE dependency with integrity preserved", () => {
  const original = "The Larkspur Dam opened in 1998; it was renamed in 2015.";
  assert.deepEqual(splitClaims(original), [original]);
  const decomposed = decomposeClaimForAssessment(original);
  assert.equal(decomposed.integrity, "FULL_ORIGINAL_PRESERVED");
  assert.equal(decomposed.components.length, 1);
  assert.deepEqual(decomposed.components[0].attached_dependencies.map(item => item.type), ["REFERENCE"]);
});
