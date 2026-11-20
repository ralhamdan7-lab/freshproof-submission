import test from "node:test";
import assert from "node:assert/strict";
import { claimYearsAbsent } from "../worker/index.js";

test("v0.3.3: a source cannot support a claim about a year it never mentions", () => {
  assert.equal(claimYearsAbsent("The Berlin Wall fell in 1991.", "The Berlin Wall fell on 9 November 1989."), true);
  assert.equal(claimYearsAbsent("The Berlin Wall fell in 1989.", "The Berlin Wall fell on 9 November 1989."), false);
  assert.equal(claimYearsAbsent("سقط جدار برلين عام ١٩٨٩.", "The wall fell in 1989."), false, "Arabic-Indic digits are normalised");
  assert.equal(claimYearsAbsent("Water is a liquid.", "Anything"), false, "claims without a year are not affected");
  assert.equal(claimYearsAbsent("The station opened in 1998.", "Opened 11998 units"), true, "years must be whole tokens");
});

test("v0.3.4: a source cannot support a Latin-script claim without its proper names (acronyms accepted)", async () => {
  const { claimNamesAbsent } = await import("../worker/index.js");
  assert.deepEqual(claimNamesAbsent("The Titanic sank in 1912 after hitting an iceberg in the Pacific Ocean.", "RMS Titanic sank in 1912 in the North Atlantic Ocean."), ["Pacific"]);
  assert.deepEqual(claimNamesAbsent("The United Kingdom is a member state of the European Union.", "The UK joined the EU in 1973."), []);
  assert.deepEqual(claimNamesAbsent("Albert Einstein won the Nobel Prize in Physics in 1921.", "The Nobel Prize in Physics 1921 was awarded to Albert Einstein."), []);
  assert.deepEqual(claimNamesAbsent("سقط جدار برلين عام 1989.", "The Berlin Wall fell in 1989."), [], "Arabic claims are not name-checked against English text");
});

test("v0.3.9 name guard: possessives, acronyms of runs and hyphenated compounds", async () => {
  const { claimNamesAbsent } = await import("../worker/index.js");
  assert.deepEqual(claimNamesAbsent("The European Union's AI Act entered into force on 1 August 2024.", "The EU AI Act entered into force on 1 August 2024."), []);
  assert.deepEqual(claimNamesAbsent("Llama 3.1 405B uses a dense Transformer rather than a Mixture-of-Experts architecture.", "a dense transformer, not a mixture of experts model"), []);
  assert.deepEqual(claimNamesAbsent("Llama 3.1 405B uses a dense Transformer rather than a Mixture-of-Experts architecture.", "a dense transformer, not an MoE model"), []);
  assert.deepEqual(claimNamesAbsent("Llama 3.1 supports a 128K-token context window in May.", "llama 3.1 supports 128k tokens"), []);
  assert.deepEqual(claimNamesAbsent("The Titanic sank in 1912 in the Pacific Ocean.", "The Titanic sank in the North Atlantic Ocean in 1912."), ["Pacific"]);
});

test("v0.3.17: the replacement-value rule is sent only when enabled", async () => {
  const { adjudicateEvidenceWithModel, REPLACEMENT_VALUE_RULE } = await import("../worker/index.js");
  const seen = [];
  const ai = { async run(_model, input) { seen.push(input.messages[0].content); return { response: JSON.stringify({ claim_assessment: { claim_risk: "LOW" }, assessments: [] }) }; } };
  const sources = [{ title: "Montreal Protocol", snippet: "The Montreal Protocol was adopted on 16 September 1987.", url: "https://www.unep.org/ozonaction/who-we-are/about-montreal-protocol" }];
  await adjudicateEvidenceWithModel("The Montreal Protocol was adopted in 1997.", sources, ai);
  const before = seen.length;
  assert.ok(seen.every(content => !content.includes("Replacement value:")));
  await adjudicateEvidenceWithModel("The Montreal Protocol was adopted in 1997.", sources, ai, { replacementValueRule: true });
  assert.ok(seen.slice(before).some(content => content.includes(REPLACEMENT_VALUE_RULE)));
});
