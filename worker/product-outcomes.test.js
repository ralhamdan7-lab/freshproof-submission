import test from "node:test";
import assert from "node:assert/strict";
import { buildExplanationDetail, buildCorrection, buildProductOutcomes } from "./product-outcomes.js";

const pythonEvidence = {
  method: "OFFICIAL_PYTHON_ORG_SUNSET_NOTICE",
  event_date: "2020-01-01",
  source: {
    title: "Sunsetting Python 2 | Python.org",
    url: "https://www.python.org/doc/sunset-python-2/",
    publication_date: null,
    retrieved_at: "2026-11-11T04:35:30.445Z",
    acquisition_method: "TAVILY_INDEXED_FIRST_PARTY_PAGE"
  },
  limitation: "Direct retrieval was denied; the official page URL and its date/support wording were validated from a domain-restricted search-index excerpt. The page itself was not fetched."
};

test("Python 2 SUPERSEDED result receives a source-grounded correction", () => {
  const outcomes = buildProductOutcomes({
    claim: "Python 2.7 is still officially supported.",
    status: "SUPERSEDED",
    domainAdapter: "python2_lifecycle",
    domainEvidence: pythonEvidence,
    adjudication: { rationale: "The official sunset notice says Python 2 is no longer supported." },
    sources: [{ title: pythonEvidence.source.title, url: pythonEvidence.source.url, snippet: "Python 2 is no longer supported.", source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", acquisition_method: "TAVILY_INDEXED_FIRST_PARTY_PAGE" }]
  });
  assert.equal(outcomes.explanation_detail.date_interpretation.event_date, "2020-01-01");
  assert.equal(outcomes.explanation_detail.date_interpretation.publication_date, null);
  assert.equal(outcomes.explanation_detail.evidence_basis[0].url, pythonEvidence.source.url);
  assert.equal(outcomes.correction.status, "PROVIDED");
  assert.match(outcomes.correction.text, /Python 2 is no longer supported/);
  assert.equal(outcomes.correction.evidence_refs[0].url, pythonEvidence.source.url);
  assert.match(outcomes.correction.limitations[0], /page itself was not fetched/);
});

test("Arabic correction preserves Arabic wording for an Arabic original claim", () => {
  const correction = buildCorrection({
    claim: "هل لا يزال Python 2 مدعوماً رسمياً؟",
    status: "SUPERSEDED",
    domainAdapter: "python2_lifecycle",
    domainEvidence: pythonEvidence,
    explanationDetail: { evidence_basis: [{ url: pythonEvidence.source.url }] }
  });
  assert.equal(correction.status, "PROVIDED");
  assert.match(correction.text, /لم يعد Python 2 مدعوماً/);
});

test("Python correction is withheld when the adapter, event date, method, or source URL is not exact", () => {
  const variants = [
    { domainAdapter: "generic" },
    { domainEvidence: { ...pythonEvidence, event_date: "2020-02-01" } },
    { domainEvidence: { ...pythonEvidence, method: "UNVALIDATED_SEARCH_RESULT" } },
    { domainEvidence: { ...pythonEvidence, source: { ...pythonEvidence.source, url: "https://example.com/doc/sunset-python-2/" } } },
    { explanationDetail: { evidence_basis: [] } }
  ];
  for (const variant of variants) {
    const correction = buildCorrection({
      claim: "Python 2.7 is still officially supported.",
      status: "SUPERSEDED",
      domainAdapter: "python2_lifecycle",
      domainEvidence: pythonEvidence,
      explanationDetail: { evidence_basis: [{ url: pythonEvidence.source.url }] },
      ...variant
    });
    assert.equal(correction.status, "WITHHELD");
    assert.equal(correction.text, null);
    assert.deepEqual(correction.evidence_refs, []);
  }
});

test("CURRENT claims explicitly require no correction", () => {
  assert.deepEqual(buildCorrection({ claim: "The official account is linked.", status: "CURRENT" }), {
    status: "NOT_NEEDED", text: null, evidence_refs: [], limitations: []
  });
});

test("NOT_TIME_SENSITIVE is not converted into a truth verdict or correction", () => {
  const correction = buildCorrection({ claim: "Water freezes at 0°C.", status: "NOT_TIME_SENSITIVE" });
  assert.equal(correction.status, "NOT_APPLICABLE");
  assert.equal(correction.text, null);
  assert.match(correction.limitations[0], /not a truth verdict/);
});

test("NEEDS_REVIEW and UNVERIFIABLE always withhold corrections", () => {
  for (const status of ["NEEDS_REVIEW", "UNVERIFIABLE"]) {
    const correction = buildCorrection({ claim: "A changing claim", status, domainAdapter: "python2_lifecycle", domainEvidence: pythonEvidence });
    assert.equal(correction.status, "WITHHELD");
    assert.equal(correction.text, null);
  }
});

test("generic SUPERSEDED and CONTRADICTED findings do not receive invented replacements", () => {
  for (const status of ["SUPERSEDED", "CONTRADICTED"]) {
    const correction = buildCorrection({ claim: "A generic claim", status, domainAdapter: "generic", domainEvidence: null });
    assert.equal(correction.status, "WITHHELD");
    assert.equal(correction.text, null);
  }
});

test("explanation keeps event, publication, and retrieval dates separate", () => {
  const detail = buildExplanationDetail({
    claim: "Python 2.7 is still officially supported.",
    status: "SUPERSEDED",
    domainEvidence: pythonEvidence,
    sources: []
  });
  assert.equal(detail.date_interpretation.event_date, "2020-01-01");
  assert.equal(detail.date_interpretation.publication_date, null);
  assert.equal(detail.date_interpretation.retrieved_at, "2026-11-11T04:35:30.445Z");
  assert.match(detail.limitations[0], /page itself was not fetched/);
});

test("unsafe and invalid source URLs are never emitted as evidence references", () => {
  const detail = buildExplanationDetail({
    claim: "A claim that needs review",
    status: "NEEDS_REVIEW",
    sources: [
      { title: "bad", url: "javascript:alert(1)", snippet: "not evidence" },
      { title: "good", url: "https://example.org/fact", snippet: "review only" }
    ]
  });
  assert.equal(detail.evidence_basis.length, 1);
  assert.equal(detail.evidence_basis[0].url, "https://example.org/fact");
  assert.equal(detail.evidence_basis[0].relation, "NOT_ADJUDICATED");
});

test("explanation and correction objects always have stable fields", () => {
  const outcomes = buildProductOutcomes({ claim: "Unknown statement", status: "UNVERIFIABLE", sources: [] });
  assert.deepEqual(Object.keys(outcomes).sort(), ["correction", "explanation_detail"]);
  assert.deepEqual(Object.keys(outcomes.explanation_detail).sort(), ["date_interpretation", "evidence_basis", "limitations", "reason", "summary"]);
  assert.deepEqual(Object.keys(outcomes.correction).sort(), ["evidence_refs", "limitations", "status", "text"]);
});

test("unverified search event-date candidates are not promoted to adjudicated event dates", () => {
  const detail = buildExplanationDetail({
    claim: "A recent claim needs review.",
    status: "NEEDS_REVIEW",
    sources: [{ title: "Search result", url: "https://example.org/page", event_date_candidate: "2025-01-01", published_date: "2026-10-01", retrieved_at: "2026-11-11T00:00:00Z" }]
  });
  assert.equal(detail.date_interpretation.event_date, null);
  assert.equal(detail.date_interpretation.publication_date, "2026-10-01");
  assert.equal(detail.evidence_basis[0].event_date_candidate, "2025-01-01");
});

test("Python correction accepts the exact official page with harmless URL normalization", () => {
  const url = "https://www.python.org/doc/sunset-python-2?utm_source=search";
  const correction = buildCorrection({
    claim: "Python 2.7 is still officially supported.",
    status: "SUPERSEDED",
    domainAdapter: "python2_lifecycle",
    domainEvidence: { ...pythonEvidence, source: { ...pythonEvidence.source, url } },
    explanationDetail: { evidence_basis: [{ url: "https://www.python.org/doc/sunset-python-2/" }] }
  });
  assert.equal(correction.status, "PROVIDED");
  assert.equal(correction.evidence_refs[0].url, "https://www.python.org/doc/sunset-python-2/");
});

test("Python correction can use the validated official indexed source when domain source metadata is absent", () => {
  const correction = buildCorrection({
    claim: "Python 2.7 is still officially supported.",
    status: "SUPERSEDED",
    domainAdapter: "python2_lifecycle",
    domainEvidence: { method: pythonEvidence.method, event_date: pythonEvidence.event_date, limitation: pythonEvidence.limitation },
    sources: [{
      title: pythonEvidence.source.title,
      url: pythonEvidence.source.url,
      evidence_kind: "OFFICIAL_PYTHON2_SUNSET_NOTICE",
      acquisition_limitation: pythonEvidence.limitation
    }],
    explanationDetail: { evidence_basis: [{ url: pythonEvidence.source.url }] }
  });
  assert.equal(correction.status, "PROVIDED");
  assert.equal(correction.evidence_refs[0].url, "https://www.python.org/doc/sunset-python-2/");
  assert.match(correction.limitations[0], /page itself was not fetched/);
});

test("NOT_TIME_SENSITIVE correction limitation is localized for Arabic claims", () => {
  const correction = buildCorrection({ claim: "تدور الأرض حول الشمس.", status: "NOT_TIME_SENSITIVE" });
  assert.equal(correction.status, "NOT_APPLICABLE");
  assert.match(correction.limitations[0], /لم يُفعّل التحقق الزمني/);
});


const genericCorrectionSources = [
  { title: "Official source", url: "https://agency.gov.example/status", snippet: "The current official status is the replacement proposition.", source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN" },
  { title: "Institutional corroboration", url: "https://university.edu.example/research", snippet: "Independent institutional evidence confirms the replacement proposition.", source_reliability: "INSTITUTIONAL" }
];
const genericCorrectionCandidate = {
  text: "The service is now discontinued as of 2025-06-01.",
  assessment: {
    status: "SUPPORTED",
    method: "SEPARATE_MODEL_CANDIDATE_REVIEW",
    scope_match: "MATCHED",
    timeframe_match: "MATCHED",
    conflict_status: "NONE"
  },
  evidence: [
    { source_index: 0, relation: "SUPPORTS_CANDIDATE", supporting_quote: "The current official status is the replacement proposition." },
    { source_index: 1, relation: "SUPPORTS_CANDIDATE", supporting_quote: "Independent institutional evidence confirms the replacement proposition." }
  ],
  limitation: "The replacement is limited to the service and date stated in the cited evidence."
};

test("generic correction is provided only with independently assessed, scope-matched corroborating evidence", () => {
  const correction = buildCorrection({
    claim: "The service is currently available.",
    status: "SUPERSEDED",
    domainAdapter: "generic",
    correctionCandidate: genericCorrectionCandidate,
    sources: genericCorrectionSources
  });
  assert.equal(correction.status, "PROVIDED");
  assert.equal(correction.text, genericCorrectionCandidate.text);
  assert.equal(correction.evidence_refs.length, 2);
  assert.deepEqual(correction.evidence_refs.map(item => item.relation), ["SUPPORTS_CORRECTION", "SUPPORTS_CORRECTION"]);
  assert.match(correction.limitations[0], /limited to the service and date/);
});

test("generic correction is withheld when only one source supports the candidate", () => {
  const correction = buildCorrection({
    claim: "The service is currently available.",
    status: "SUPERSEDED",
    correctionCandidate: { ...genericCorrectionCandidate, evidence: [genericCorrectionCandidate.evidence[0]] },
    sources: genericCorrectionSources
  });
  assert.equal(correction.status, "WITHHELD");
  assert.equal(correction.text, null);
});

test("generic correction rejects duplicate hosts and non-independent corroboration", () => {
  const sameHost = [
    genericCorrectionSources[0],
    { ...genericCorrectionSources[1], url: "https://www.agency.gov.example/another-page" }
  ];
  const correction = buildCorrection({
    claim: "The service is currently available.",
    status: "CONTRADICTED",
    correctionCandidate: genericCorrectionCandidate,
    sources: sameHost
  });
  assert.equal(correction.status, "WITHHELD");
});

test("generic correction requires at least one primary source and eligible evidence excerpts", () => {
  const noPrimary = genericCorrectionSources.map(item => ({ ...item, source_reliability: "INSTITUTIONAL" }));
  const correction = buildCorrection({
    claim: "The service is currently available.",
    status: "SUPERSEDED",
    correctionCandidate: genericCorrectionCandidate,
    sources: noPrimary
  });
  assert.equal(correction.status, "WITHHELD");
  const noExcerpt = genericCorrectionSources.map(item => ({ ...item, snippet: "" }));
  const missingExcerpt = buildCorrection({
    claim: "The service is currently available.",
    status: "SUPERSEDED",
    correctionCandidate: genericCorrectionCandidate,
    sources: noExcerpt
  });
  assert.equal(missingExcerpt.status, "WITHHELD");
});

test("generic correction rejects mismatched scope, timeframe, or conflicting candidate assessments", () => {
  const variants = [
    { scope_match: "MISMATCHED" },
    { timeframe_match: "MISMATCHED" },
    { conflict_status: "CONFLICT" },
    { status: "NEEDS_REVIEW" },
    { method: "LEXICAL_OVERLAP_ONLY" }
  ];
  for (const patch of variants) {
    const correction = buildCorrection({
      claim: "The service is currently available.",
      status: "SUPERSEDED",
      correctionCandidate: {
        ...genericCorrectionCandidate,
        assessment: { ...genericCorrectionCandidate.assessment, ...patch }
      },
      sources: genericCorrectionSources
    });
    assert.equal(correction.status, "WITHHELD");
  }
});

test("generic correction evidence references must map to unique valid source indices", () => {
  for (const evidence of [
    [{ source_index: 0, relation: "SUPPORTS_CANDIDATE" }, { source_index: 0, relation: "SUPPORTS_CANDIDATE" }],
    [{ source_index: 0, relation: "SUPPORTS_CANDIDATE" }, { source_index: 8, relation: "SUPPORTS_CANDIDATE" }],
    [{ source_index: 0, relation: "CONTRADICTS_CANDIDATE" }, { source_index: 1, relation: "SUPPORTS_CANDIDATE" }]
  ]) {
    const correction = buildCorrection({
      claim: "The service is currently available.",
      status: "SUPERSEDED",
      correctionCandidate: { ...genericCorrectionCandidate, evidence },
      sources: genericCorrectionSources
    });
    assert.equal(correction.status, "WITHHELD");
  }
});

test("generic correction is never produced for CURRENT, NEEDS_REVIEW, UNVERIFIABLE, or NOT_TIME_SENSITIVE", () => {
  for (const status of ["CURRENT", "NEEDS_REVIEW", "UNVERIFIABLE", "NOT_TIME_SENSITIVE"]) {
    const correction = buildCorrection({
      claim: "The service is currently available.",
      status,
      correctionCandidate: genericCorrectionCandidate,
      sources: genericCorrectionSources
    });
    assert.notEqual(correction.status, "PROVIDED");
  }
});

test("generic correction candidate can flow through the stable product outcome contract", () => {
  const outcomes = buildProductOutcomes({
    claim: "The service is currently available.",
    status: "SUPERSEDED",
    correctionCandidate: genericCorrectionCandidate,
    sources: genericCorrectionSources,
    adjudication: { rationale: "A documented change is supported by independent evidence." }
  });
  assert.equal(outcomes.correction.status, "PROVIDED");
  assert.equal(outcomes.correction.evidence_refs.length, 2);
});


test("generic correction requires a verbatim quote contained in each cited source excerpt", () => {
  const missingQuote = {
    ...genericCorrectionCandidate,
    evidence: genericCorrectionCandidate.evidence.map(({ source_index, relation }) => ({ source_index, relation }))
  };
  const wrongQuote = {
    ...genericCorrectionCandidate,
    evidence: genericCorrectionCandidate.evidence.map((item, index) => ({
      ...item,
      supporting_quote: index === 0 ? "A quotation that does not occur in the official source excerpt." : item.supporting_quote
    }))
  };
  for (const correctionCandidate of [missingQuote, wrongQuote]) {
    const correction = buildCorrection({
      claim: "The service is currently available.",
      status: "SUPERSEDED",
      correctionCandidate,
      sources: genericCorrectionSources
    });
    assert.equal(correction.status, "WITHHELD");
  }
});

test("generic correction exposes the exact validated supporting quote beside each citation", () => {
  const correction = buildCorrection({
    claim: "The service is currently available.",
    status: "SUPERSEDED",
    correctionCandidate: genericCorrectionCandidate,
    sources: genericCorrectionSources
  });
  assert.equal(correction.status, "PROVIDED");
  assert.equal(correction.evidence_refs[0].supporting_quote, genericCorrectionCandidate.evidence[0].supporting_quote);
  assert.equal(correction.evidence_refs[1].supporting_quote, genericCorrectionCandidate.evidence[1].supporting_quote);
});
