// v0.3.20 normative specification rule. A claim about what a published standard
// specifies is settled by the standard's own official text, under strict gates.
import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence, isNormativeSpecificationUrl } from "../worker/evidence-adjudication.js";

const now = Date.parse("2026-11-20T18:00:00.000Z");
const STABLE = { frame: "STABLE_FACT", is_time_sensitive: false, temporal_status: "NOT_TIME_SENSITIVE" };
const CLAIM = "TLS 1.3 allows clients to encrypt the premaster secret using the server's RSA public key during the handshake.";

const rfc = (overrides = {}) => ({
  title: "RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3",
  url: "https://www.rfc-editor.org/rfc/rfc8446.html",
  snippet: "TLS supports three basic key exchange modes: (EC)DHE (Diffie-Hellman over either finite fields or elliptic curves), PSK-only, PSK with (EC)DHE. Static RSA and Diffie-Hellman cipher suites have been removed.",
  source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
  evidence_origin: "DIRECT_PAGE_PASSAGES",
  published_date: "2018-08-10",
  retrieved_at: "2026-11-20T17:54:38.000Z",
  relevance_assessment: { relevance: "HIGH" },
  ...overrides
});
const blog = (overrides = {}) => ({
  title: "Introduction to TLS v1.3", url: "https://example-notes.dev/posts/tls13",
  snippet: "Several key exchange algorithms have been removed: RSA key transport and static Diffie-Hellman.",
  source_reliability: "UNKNOWN", evidence_origin: "SEARCH_SNIPPET", relevance_assessment: { relevance: "HIGH" }, ...overrides
});
const semantic = (relation, sourceOverrides = {}, extra = []) => ({
  status: "COMPLETED_ADVISORY",
  claim_assessment: { claim_type: "OTHER", claim_risk: "MEDIUM", temporal_claim_kind: "STABLE" },
  assessments: [{ source_index: 0, relation }, ...extra.map((r, i) => ({ source_index: i + 1, relation: r }))],
  source_assessments: [
    { source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY", temporal_role: "BACKGROUND", change_type: "NONE", ...sourceOverrides },
    ...extra.map((_, i) => ({ source_index: i + 1, directness: "DIRECT", scope_match: "EXACT", authority_role: "SECONDARY", temporal_role: "BACKGROUND", change_type: "NONE" }))
  ]
});
const run = (sources, semanticAssessment, { claim = CLAIM, enabled = true, frame = STABLE } = {}) =>
  adjudicateEvidence({ claim, sources, semanticAssessment, claimFrame: frame, temporalSensitive: false, now, normativeSpecification: enabled });

test("published-standard hosts and paths are recognised; drafts and other pages are not", () => {
  for (const url of [
    "https://www.rfc-editor.org/rfc/rfc8446.html", "https://www.rfc-editor.org/info/rfc8446",
    "https://datatracker.ietf.org/doc/html/rfc8446", "https://datatracker.ietf.org/doc/rfc9110/",
    "https://www.ietf.org/rfc/rfc2616.txt", "https://www.w3.org/TR/webauthn-2/",
    "https://www.iso.org/standard/62085.html", "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
    "https://csrc.nist.gov/pubs/sp/800/63/b/upd2/final", "https://ecma-international.org/publications-and-standards/standards/ecma-262/",
    "https://www.unicode.org/reports/tr9/", "https://www.itu.int/rec/T-REC-H.264", "https://standards.ieee.org/ieee/802.11/7028/"
  ]) assert.equal(isNormativeSpecificationUrl(url), true, url);
  for (const url of [
    "https://datatracker.ietf.org/doc/html/draft-ietf-tls-tls13-05", "https://www.ietf.org/blog/tls13/",
    "https://www.rfc-editor.org/", "https://www.w3.org/blog/2024/", "https://www.w3.org/TR/2023/WD-css-grid-3-20230101/",
    "https://blog.cloudflare.com/rfc-8446-aka-tls-1-3/", "http://www.rfc-editor.org/rfc/rfc8446.html",
    "https://rfc-editor.org.evil.example/rfc/rfc8446", "https://www.iso.org/news/2024.html"
  ]) assert.equal(isNormativeSpecificationUrl(url), false, url);
});

test("the standard's own text settles a claim about what it specifies (contradiction and support)", () => {
  const contradicted = run([rfc(), blog()], semantic("CONTRADICTS", {}, ["CONTRADICTS"]));
  assert.equal(contradicted.status, "CONTRADICTED");
  assert.equal(contradicted.method, "NORMATIVE_SPECIFICATION");
  assert.deepEqual(contradicted.adjudication_signals.normative_specifications, ["rfc-editor.org"]);
  const supported = run([rfc({ snippet: "TLS 1.3 supports three key exchange modes: (EC)DHE, PSK-only and PSK with (EC)DHE." })],
    semantic("SUPPORTS"), { claim: "TLS 1.3 supports PSK with (EC)DHE key exchange." });
  assert.equal(supported.status, "CURRENT");
  assert.equal(supported.method, "NORMATIVE_SPECIFICATION");
});

test("the rule is off unless the rollout switch enables it", () => {
  const result = run([rfc()], semantic("CONTRADICTS"), { enabled: false });
  assert.notEqual(result.method, "NORMATIVE_SPECIFICATION");
  assert.equal(result.status, "NEEDS_REVIEW");
});

test("every gate is required", () => {
  const cases = {
    "search snippet only": [[rfc({ evidence_origin: "SEARCH_SNIPPET" })], semantic("CONTRADICTS")],
    "not classified primary": [[rfc({ source_reliability: "SECONDARY_REPUTABLE" })], semantic("CONTRADICTS")],
    "draft, not a published standard": [[rfc({ url: "https://datatracker.ietf.org/doc/html/draft-ietf-tls-tls13-05" })], semantic("CONTRADICTS")],
    "obsoleted standard": [[rfc({ snippet: "Obsoleted by: 9846. TLS supports three basic key exchange modes." })], semantic("CONTRADICTS")],
    "secondary role": [[rfc()], semantic("CONTRADICTS", { authority_role: "SECONDARY" })],
    "partial scope": [[rfc()], semantic("CONTRADICTS", { scope_match: "PARTIAL" })],
    "indirect": [[rfc()], semantic("CONTRADICTS", { directness: "INDIRECT" })],
    "insufficient relation": [[rfc()], semantic("INSUFFICIENT")]
  };
  for (const [name, [sources, sem]] of Object.entries(cases)) {
    const result = run(sources, sem);
    assert.notEqual(result.method, "NORMATIVE_SPECIFICATION", name);
    assert.notEqual(result.status, "CONTRADICTED", name);
  }
});

test("claim-level guards block the rule: current-state frame, dynamic wording, compound claims", () => {
  const current = run([rfc()], semantic("CONTRADICTS"), { frame: { frame: "CURRENT_STATE", is_time_sensitive: true, temporal_status: "TEMPORAL_REVIEW_REQUIRED" } });
  assert.notEqual(current.method, "NORMATIVE_SPECIFICATION");
  const dynamic = run([rfc()], semantic("CONTRADICTS"), { claim: "TLS 1.3 is currently the latest version of TLS." });
  assert.notEqual(dynamic.method, "NORMATIVE_SPECIFICATION");
  const compound = run([rfc()], semantic("CONTRADICTS"), { claim: "TLS 1.3 supports static RSA and static Diffie-Hellman key exchange." });
  assert.notEqual(compound.method, "NORMATIVE_SPECIFICATION");
});

test("any disagreement blocks the rule", () => {
  const qualifiedOpposing = run([rfc(), blog({ url: "https://www.bbc.co.uk/news/tls", source_reliability: "SECONDARY_REPUTABLE" })], semantic("CONTRADICTS", {}, ["SUPPORTS"]));
  assert.notEqual(qualifiedOpposing.method, "NORMATIVE_SPECIFICATION");
  assert.notEqual(qualifiedOpposing.status, "CONTRADICTED");
  const anyMixed = run([rfc(), blog()], semantic("CONTRADICTS", {}, ["MIXED"]));
  assert.notEqual(anyMixed.method, "NORMATIVE_SPECIFICATION");
  const unqualifiedOpposing = run([rfc(), blog()], semantic("CONTRADICTS", {}, ["SUPPORTS"]));
  assert.notEqual(unqualifiedOpposing.method, "NORMATIVE_SPECIFICATION");
  const twoStandardsDisagree = run([rfc(), rfc({ url: "https://datatracker.ietf.org/doc/html/rfc8446" })],
    { ...semantic("CONTRADICTS"), assessments: [{ source_index: 0, relation: "CONTRADICTS" }, { source_index: 1, relation: "SUPPORTS" }],
      source_assessments: [0, 1].map(i => ({ source_index: i, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY", temporal_role: "BACKGROUND", change_type: "NONE" })) });
  assert.notEqual(twoStandardsDisagree.method, "NORMATIVE_SPECIFICATION");
});
