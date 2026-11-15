import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence } from "./evidence-adjudication.js";

const now = Date.parse("2026-11-15T12:00:00.000Z");
function source(host) {
  return {
    title: "Historical official record",
    url: "https://" + host + "/record",
    published_date: "2006-04-20",
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
    relevance_assessment: { relevance: "HIGH" }
  };
}
const assessment = {
  status: "COMPLETED_ADVISORY",
  assessments: [
    { source_index: 0, relation: "SUPPORTS" },
    { source_index: 1, relation: "SUPPORTS" }
  ]
};
test("old primary records remain eligible for a time-anchored historical event", () => {
  const result = adjudicateEvidence({
    claim: "The convention entered into force on 20 April 2006.",
    sources: [source("convention-secretariat.org"), source("treaty-depositary.net")],
    semanticAssessment: assessment,
    claimFrame: { frame: "TIME_ANCHORED_EVENT", is_time_sensitive: true, temporal_status: "TEMPORAL_REVIEW_REQUIRED" },
    temporalSensitive: true,
    now
  });
  assert.equal(result.status, "CURRENT");
  assert.equal(result.adjudication_signals.qualified_sources, 2);
});
test("the same old records do not satisfy a current-state claim freshness gate", () => {
  const result = adjudicateEvidence({
    claim: "The treaty remains in force.",
    sources: [source("convention-secretariat.org"), source("treaty-depositary.net")],
    semanticAssessment: assessment,
    claimFrame: { frame: "CURRENT_STATE", is_time_sensitive: true, temporal_status: "TEMPORAL_REVIEW_REQUIRED" },
    temporalSensitive: true,
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
});
test("mixed and unresolved frames never receive a decisive factual verdict", () => {
  for (const frame of ["MIXED_OR_AMBIGUOUS", "UNRESOLVED", "SCHEDULED_FUTURE", "NON_FACTUAL"]) {
    const result = adjudicateEvidence({
      claim: "A proposition with unresolved temporal scope.",
      sources: [source("convention-secretariat.org"), source("treaty-depositary.net")],
      semanticAssessment: assessment,
      claimFrame: { frame },
      temporalSensitive: true,
      now
    });
    assert.equal(result.status, "NEEDS_REVIEW", frame);
    assert.equal(result.method, "CLAIM_FRAME_REQUIRES_REVIEW");
  }
});

// v0.2.84: the specialist-adapter gate follows the same frame-aware policy.
const oldAdapterSource = {
  title: "Official historical record",
  url: "https://records.ardent-registry.gov.au/event",
  published_date: "2009-06-01",
  source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
  relevance_assessment: { relevance: "HIGH" }
};
test("adapter verdict on a time-anchored event is not withheld because its record is old", () => {
  const result = adjudicateEvidence({
    claim: "The Ardent registry opened on 1 June 2009.",
    sources: [oldAdapterSource],
    domainResult: { status: "CURRENT", evidence: { source: { url: oldAdapterSource.url } } },
    claimFrame: { frame: "TIME_ANCHORED_EVENT" },
    now
  });
  assert.equal(result.status, "CURRENT");
  assert.equal(result.adjudication_signals.claim_frame_recency_policy, "NOT_REQUIRED_FOR_TIME_ANCHORED_EVENT");
});
test("adapter verdict on a current-state claim still needs recent or validated evidence", () => {
  const result = adjudicateEvidence({
    claim: "The Ardent registry is currently open.",
    sources: [oldAdapterSource],
    domainResult: { status: "CURRENT", evidence: { source: { url: oldAdapterSource.url } } },
    claimFrame: { frame: "CURRENT_STATE" },
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.method, "DOMAIN_ADAPTER_EVIDENCE_GATE");
});
test("adapter verdict with no known frame stays conservative", () => {
  const result = adjudicateEvidence({
    claim: "The Ardent registry opened on 1 June 2009.",
    sources: [oldAdapterSource],
    domainResult: { status: "CURRENT", evidence: { source: { url: oldAdapterSource.url } } },
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
});

// v0.2.84: a dated discrete event attested by its originating authority.
function eventSource(host, reliability = "PRIMARY_OR_OFFICIAL_DOMAIN") {
  return { title: "Accession record", url: "https://" + host + "/accession", published_date: "2014-01-10", source_reliability: reliability, relevance_assessment: { relevance: "HIGH" } };
}
function eventAssessment(relation, risk, roles = ["ORIGINATING_AUTHORITY"]) {
  return {
    status: "COMPLETED_ADVISORY",
    claim_assessment: { claim_type: "OTHER", claim_risk: risk, temporal_claim_kind: "HISTORICAL_EVENT" },
    assessments: roles.map((_, source_index) => ({ source_index, relation })),
    source_assessments: roles.map((authority_role, source_index) => ({ source_index, directness: "DIRECT", scope_match: "EXACT", authority_role, temporal_role: "HISTORICAL_RECORD", change_type: "NONE" }))
  };
}
const EVENT = { frame: "TIME_ANCHORED_EVENT", is_time_sensitive: true, temporal_status: "TEMPORAL_REVIEW_REQUIRED" };
test("a TIME_ANCHORED_EVENT frame lets one originating primary source settle a non-high-risk dated event", () => {
  const claim = "Velmora joined the Ardent Customs Union in 2010.";
  const contradicted = adjudicateEvidence({ claim, sources: [eventSource("mfa.velmora.gov")], semanticAssessment: eventAssessment("CONTRADICTS", "MEDIUM"), claimFrame: EVENT, temporalSensitive: true, now });
  assert.equal(contradicted.status, "CONTRADICTED");
  assert.equal(contradicted.method, "SINGLE_AUTHORITATIVE_PRIMARY_EVIDENCE");
  assert.equal(contradicted.adjudication_signals.single_source_basis, "TIME_ANCHORED_EVENT_FRAME");
  const highRisk = adjudicateEvidence({ claim, sources: [eventSource("mfa.velmora.gov")], semanticAssessment: eventAssessment("CONTRADICTS", "HIGH"), claimFrame: EVENT, temporalSensitive: true, now });
  assert.equal(highRisk.status, "NEEDS_REVIEW");
  const currentState = adjudicateEvidence({ claim: "Velmora is a member of the Ardent Customs Union.", sources: [eventSource("mfa.velmora.gov")], semanticAssessment: eventAssessment("SUPPORTS", "MEDIUM"), claimFrame: { frame: "CURRENT_STATE" }, temporalSensitive: true, now });
  assert.notEqual(currentState.method, "SINGLE_AUTHORITATIVE_PRIMARY_EVIDENCE");
  const secondaryRole = adjudicateEvidence({ claim, sources: [eventSource("mfa.velmora.gov")], semanticAssessment: eventAssessment("CONTRADICTS", "MEDIUM", ["SECONDARY"]), claimFrame: EVENT, temporalSensitive: true, now });
  assert.equal(secondaryRole.status, "NEEDS_REVIEW", "the source must still be the originating authority");
});
test("a TIME_ANCHORED_EVENT frame allows two independent reputable secondary publishers to corroborate", () => {
  const claim = "The Larkspur Bridge opened in November 1989.";
  const result = adjudicateEvidence({ claim, sources: [eventSource("larkspur-news.example", "SECONDARY_REPUTABLE"), eventSource("velmora-times.example", "SECONDARY_REPUTABLE")], semanticAssessment: eventAssessment("SUPPORTS", "MEDIUM", ["SECONDARY", "SECONDARY"]), claimFrame: EVENT, temporalSensitive: true, now });
  assert.equal(result.status, "CURRENT");
  assert.equal(result.method, "CORROBORATED_REPUTABLE_SECONDARY_EVIDENCE");
});
