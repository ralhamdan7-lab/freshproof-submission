import test from "node:test";
import assert from "node:assert/strict";
import { correctionFromAssessment } from "../worker/index.js";
import { buildCorrection } from "../worker/product-outcomes.js";

const sources = [
  { url: "https://www.archive-one.org/a", source_reliability: "SECONDARY_REPUTABLE", relevance_assessment: { relevance: "HIGH" }, snippet: "Records confirm the Larkspur Dam was completed in 1998 after six years of construction work." },
  { url: "https://www.river-atlas.net/b", source_reliability: "UNASSESSED", relevance_assessment: { relevance: "HIGH" }, snippet: "Construction of the Larkspur Dam finished in 1998, creating Lake Quilomab upstream of the valley." },
  { url: "https://www.dam-notes.io/c", source_reliability: "UNASSESSED", relevance_assessment: { relevance: "HIGH" }, snippet: "The dam is a major regional landmark with a large reservoir and a visitor centre." }
];
const semantic = (text, quotes) => ({
  correction_text: text,
  assessments: [{ source_index: 0, relation: "CONTRADICTS" }, { source_index: 1, relation: "CONTRADICTS" }, { source_index: 2, relation: "INSUFFICIENT" }],
  source_assessments: quotes.map((quote, source_index) => ({ source_index, scope_match: "EXACT", correct_value_quote: quote }))
});
const claim = "The Larkspur Dam was completed in 2004.";

test("v0.2.92: an in-assessment correction is accepted only when its new value is quoted verbatim by two contradicting sources", () => {
  const ok = correctionFromAssessment(claim, sources, semantic("The Larkspur Dam was completed in 1998.", ["the Larkspur Dam was completed in 1998 after six years", "Construction of the Larkspur Dam finished in 1998", null]));
  assert.ok(ok.candidate);
  const correction = buildCorrection({ claim, status: "CONTRADICTED", correctionCandidate: ok.candidate, sources });
  assert.equal(correction.status, "PROVIDED");
  assert.equal(correction.text, "The Larkspur Dam was completed in 1998.");
  assert.equal(correction.evidence_refs.length, 2);

  const invented = correctionFromAssessment(claim, sources, semantic("The Larkspur Dam was completed in 1997.", ["the Larkspur Dam was completed in 1998 after six years", "Construction of the Larkspur Dam finished in 1998", null]));
  assert.equal(invented.candidate, null, "a value absent from the quotes is never shown");
  const oneSource = correctionFromAssessment(claim, sources, semantic("The Larkspur Dam was completed in 1998.", ["the Larkspur Dam was completed in 1998 after six years", null, null]));
  assert.equal(oneSource.candidate, null);
  const fabricatedQuote = correctionFromAssessment(claim, sources, semantic("The Larkspur Dam was completed in 1998.", ["the Larkspur Dam was completed in 1998 after six years", "Officials say the dam opened in 1998 to great fanfare", null]));
  assert.equal(fabricatedQuote.candidate, null, "quotes must be verbatim");
});
