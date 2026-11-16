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

test("v0.3.1: a negating correction is grounded by two contradicting quotes; new facts must be covered by the quotes together", () => {
  const vaccineSources = [
    { url: "https://www.health-agency.gov/a", source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", relevance_assessment: { relevance: "HIGH" }, snippet: "Large studies found no link between the Quillon vaccine and Tessar syndrome in children." },
    { url: "https://www.medical-review.org/b", source_reliability: "INSTITUTIONAL", relevance_assessment: { relevance: "HIGH" }, snippet: "The Quillon vaccine does not cause Tessar syndrome; the vaccine never contained borax preservatives." }
  ];
  const claim = "The Quillon vaccine causes Tessar syndrome in children.";
  const semantic = text => ({ correction_text: text, assessments: [{ source_index: 0, relation: "CONTRADICTS" }, { source_index: 1, relation: "CONTRADICTS" }],
    source_assessments: [{ source_index: 0, scope_match: "EXACT", correct_value_quote: "Large studies found no link between the Quillon vaccine and Tessar syndrome in children." }, { source_index: 1, scope_match: "EXACT", correct_value_quote: "The Quillon vaccine does not cause Tessar syndrome" }] });
  const negation = correctionFromAssessment(claim, vaccineSources, semantic("The Quillon vaccine does not cause Tessar syndrome in children."));
  assert.ok(negation.candidate, negation.reason);
  const built = buildCorrection({ claim, status: "CONTRADICTED", correctionCandidate: negation.candidate, sources: vaccineSources });
  assert.equal(built.status, "PROVIDED");
  const invented = correctionFromAssessment(claim, vaccineSources, semantic("The Quillon vaccine does not cause Tessar syndrome; it causes mild fever."));
  assert.equal(invented.candidate, null, "a new fact absent from every quote is rejected");
  assert.match(invented.reason, /UNGROUNDED_TERMS|GROUNDED_QUOTES_FROM/);
});
