import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence, registrableDomain } from "./evidence-adjudication.js";

const now = Date.parse("2026-11-12T00:00:00Z");
const source = url => ({
  url,
  title: "Official technical documentation",
  published_date: "2026-11-10",
  source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
  relevance_assessment: { relevance: "HIGH" }
});
const semantic = count => ({
  status: "COMPLETED_ADVISORY",
  assessments: Array.from({ length: count }, (_, source_index) => ({ source_index, relation: "SUPPORTS" }))
});

test("registrable domain collapses publisher subdomains and handles common country-code suffixes", () => {
  assert.equal(registrableDomain("https://learn.microsoft.com/security"), "microsoft.com");
  assert.equal(registrableDomain("https://docs.microsoft.com/security"), "microsoft.com");
  assert.equal(registrableDomain("https://a.example.co.uk/path"), "example.co.uk");
  assert.equal(registrableDomain("https://www.gov.uk/department"), "gov.uk");
  assert.equal(registrableDomain("https://sub.agency.example.gov.uk/path"), "example.gov.uk");
  assert.equal(registrableDomain("https://docs.example.com.sa/page"), "example.com.sa");
  assert.equal(registrableDomain("https://api.example.co.in/v1"), "example.co.in");
  assert.equal(registrableDomain("https://research.example.gov.in/paper"), "example.gov.in");
  assert.equal(registrableDomain("https://commission.europa.eu/news"), "europa.eu");
  assert.equal(registrableDomain("https://www.rfc-editor.org/rfc/rfc8996.html"), "rfc-editor.org");
  assert.equal(registrableDomain("http://insecure.example.com"), "");
});

test("two subdomains of one publisher cannot satisfy independent corroboration", () => {
  const sources = [source("https://learn.microsoft.com/security/tls"), source("https://docs.microsoft.com/security/tls")];
  const result = adjudicateEvidence({
    claim: "TLS 1.0 and TLS 1.1 are deprecated.",
    sources,
    semanticAssessment: semantic(2),
    now,
    temporalSensitive: false
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.adjudication_signals.independent_supporting_domains, 1);
});

test("two independent first-party registrable domains can satisfy corroboration", () => {
  const sources = [source("https://learn.microsoft.com/security/tls"), source("https://www.rfc-editor.org/rfc/rfc8996.html")];
  const result = adjudicateEvidence({
    claim: "TLS 1.0 and TLS 1.1 are deprecated.",
    sources,
    semanticAssessment: semantic(2),
    now,
    temporalSensitive: false
  });
  assert.equal(result.status, "CURRENT");
  assert.equal(result.adjudication_signals.independent_supporting_domains, 2);
});


test("domain decisive verdict is withheld when evidence URL is detached from retrieved sources", () => {
  const result = adjudicateEvidence({
    claim: "A specialist claim",
    sources: [source("https://official.example.com/current")],
    domainResult: {
      status: "CONTRADICTED",
      evidence: { source: { url: "https://lookalike.example.net/fabricated" } }
    },
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.method, "DOMAIN_ADAPTER_EVIDENCE_GATE");
  assert.equal(result.adjudication_signals.domain_evidence_bound_to_core_sources, false);
});

test("domain decisive verdict is withheld for stale or non-primary retrieved evidence", () => {
  const stale = {
    ...source("https://official.example.com/old"),
    published_date: "2024-01-01"
  };
  const result = adjudicateEvidence({
    claim: "A specialist claim",
    sources: [stale],
    domainResult: {
      status: "SUPERSEDED",
      evidence: { source: { url: stale.url } }
    },
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  const secondary = {
    ...source("https://news.example.com/report"),
    source_reliability: "SECONDARY"
  };
  const secondaryResult = adjudicateEvidence({
    claim: "A specialist claim",
    sources: [secondary],
    domainResult: {
      status: "CONTRADICTED",
      evidence: { source: { url: secondary.url } }
    },
    now
  });
  assert.equal(secondaryResult.status, "NEEDS_REVIEW");
});

test("domain decisive verdict remains available for recent eligible primary evidence", () => {
  const official = {
    ...source("https://official.example.com/current"),
    retrieved_at: "2026-11-11T12:00:00.000Z"
  };
  const result = adjudicateEvidence({
    claim: "A specialist claim",
    sources: [official],
    domainResult: {
      status: "CONTRADICTED",
      evidence: { source: { url: official.url } }
    },
    now
  });
  assert.equal(result.status, "CONTRADICTED");
  assert.equal(result.adjudication_signals.domain_evidence_bound_to_core_sources, true);
});

test("domain NEEDS_REVIEW remains safe when no validated source exists", () => {
  const result = adjudicateEvidence({
    claim: "A specialist claim",
    sources: [],
    domainResult: { status: "NEEDS_REVIEW", evidence: { method: "OFFICIAL_SOURCE_NOT_OBTAINED" } },
    now
  });
  assert.equal(result.status, "NEEDS_REVIEW");
});


test("two independent curated secondary publishers corroborate a narrow low-risk historical claim", () => {
  const sources = [
    { ...source("https://www.britannica.com/topic/example"), source_reliability: "SECONDARY_REPUTABLE", relevance_assessment: { relevance: "HIGH" } },
    { ...source("https://www.ebsco.com/research-starters/history/example"), source_reliability: "SECONDARY_REPUTABLE", relevance_assessment: { relevance: "HIGH" } }
  ];
  const semanticAssessment = {
    status: "COMPLETED_ADVISORY",
    assessments: sources.map((_, source_index) => ({ source_index, relation: "SUPPORTS" })),
    claim_assessment: { claim_type: "HISTORICAL_EVENT", claim_risk: "LOW" },
    source_assessments: sources.map((_, source_index) => ({
      source_index, directness: "DIRECT", scope_match: "EXACT", authority_role: "SECONDARY"
    }))
  };
  const result = adjudicateEvidence({ claim: "The European Central Bank was established in 1998.", sources, semanticAssessment, now, temporalSensitive: false });
  assert.equal(result.status, "CURRENT");
  assert.equal(result.method, "CORROBORATED_REPUTABLE_SECONDARY_EVIDENCE");
});

test("one reputable secondary publisher cannot decide a historical claim", () => {
  const secondary = { ...source("https://www.britannica.com/topic/example"), source_reliability: "SECONDARY_REPUTABLE", relevance_assessment: { relevance: "HIGH" } };
  const semanticAssessment = {
    status: "COMPLETED_ADVISORY",
    assessments: [{ source_index: 0, relation: "SUPPORTS" }],
    claim_assessment: { claim_type: "HISTORICAL_EVENT", claim_risk: "LOW" },
    source_assessments: [{ source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "SECONDARY" }]
  };
  const result = adjudicateEvidence({ claim: "The European Central Bank was established in 1998.", sources: [secondary], semanticAssessment, now, temporalSensitive: false });
  assert.equal(result.status, "NEEDS_REVIEW");
});

test("secondary corroboration cannot decide dynamic or high-risk claims", () => {
  const sources = [
    { ...source("https://www.britannica.com/topic/example"), source_reliability: "SECONDARY_REPUTABLE", relevance_assessment: { relevance: "HIGH" } },
    { ...source("https://www.ebsco.com/research-starters/history/example"), source_reliability: "SECONDARY_REPUTABLE", relevance_assessment: { relevance: "HIGH" } }
  ];
  const semanticAssessment = {
    status: "COMPLETED_ADVISORY",
    assessments: sources.map((_, source_index) => ({ source_index, relation: "SUPPORTS" })),
    claim_assessment: { claim_type: "CURRENT_STATE", claim_risk: "HIGH" },
    source_assessments: sources.map((_, source_index) => ({
      source_index, directness: "DIRECT", scope_match: "EXACT", authority_role: "SECONDARY"
    }))
  };
  const result = adjudicateEvidence({ claim: "The current president is X.", sources, semanticAssessment, now, temporalSensitive: true });
  assert.equal(result.status, "NEEDS_REVIEW");
});
