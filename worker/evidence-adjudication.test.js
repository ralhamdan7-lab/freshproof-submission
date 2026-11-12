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
