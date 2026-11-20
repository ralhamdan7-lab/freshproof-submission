// v0.3.21 originating issuer rule: one official source settles a claim in any
// field when it is the body that itself issued or holds the stated fact.
import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence } from "../worker/evidence-adjudication.js";

const now = Date.parse("2026-11-20T18:00:00.000Z");
const EVENT = { frame: "TIME_ANCHORED_EVENT", is_time_sensitive: false, temporal_status: "NOT_TIME_SENSITIVE" };
const STABLE = { frame: "STABLE_FACT", is_time_sensitive: false, temporal_status: "NOT_TIME_SENSITIVE" };
const CURRENT = { frame: "CURRENT_STATE", is_time_sensitive: true, temporal_status: "TEMPORAL_REVIEW_REQUIRED" };

const official = (overrides = {}) => ({
  title: "Member States", url: "https://www.un.org/en/about-us/member-states",
  snippet: "South Sudan became the 193rd Member State of the United Nations on 14 July 2011.",
  source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", reliability_basis: "CURATED_OR_SUFFIX_REGISTRY",
  evidence_origin: "DIRECT_PAGE_PASSAGES", retrieved_at: "2026-11-20T17:58:00.000Z",
  relevance_assessment: { relevance: "HIGH" }, ...overrides
});
const other = (overrides = {}) => ({
  title: "A blog", url: "https://notes.example.net/post", snippet: "Background.",
  source_reliability: "UNKNOWN", reliability_basis: "UNCLASSIFIED_PUBLISHER", evidence_origin: "SEARCH_SNIPPET",
  relevance_assessment: { relevance: "HIGH" }, ...overrides
});
const semantic = (relation, { claimType = "INSTITUTIONAL_RECORD", risk = "HIGH", src = {}, extra = [] } = {}) => ({
  status: "COMPLETED_ADVISORY",
  claim_assessment: { claim_type: claimType, claim_risk: risk, temporal_claim_kind: "HISTORICAL_EVENT" },
  assessments: [{ source_index: 0, relation }, ...extra.map((r, i) => ({ source_index: i + 1, relation: r }))],
  source_assessments: [
    { source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY", temporal_role: "HISTORICAL_RECORD", change_type: "NONE", ...src },
    ...extra.map((_, i) => ({ source_index: i + 1, directness: "DIRECT", scope_match: "EXACT", authority_role: "SECONDARY", temporal_role: "BACKGROUND", change_type: "NONE" }))
  ]
});
const run = (claim, sources, semanticAssessment, { enabled = true, frame = EVENT } = {}) =>
  adjudicateEvidence({ claim, sources, semanticAssessment, claimFrame: frame, temporalSensitive: frame.is_time_sensitive, now, originatingIssuer: enabled });

const UN_CLAIM = "South Sudan became the 194th United Nations Member State in July 2011.";
const LAW_CLAIM = "The Personal Data Protection Law was published in the Official Gazette on 24 September 2021.";

test("the issuing body's own official record settles claims in any field, including high-impact ones", () => {
  const un = run(UN_CLAIM, [official()], semantic("CONTRADICTS"));
  assert.equal(un.status, "CONTRADICTED");
  assert.equal(un.method, "ORIGINATING_ISSUER");
  assert.deepEqual(un.adjudication_signals.originating_issuers, ["un.org"]);
  const law = run(LAW_CLAIM, [official({ url: "https://www.example.gov.sa/gazette/pdpl", reliability_basis: "GOVERNMENT_OR_INTERGOVERNMENTAL_DOMAIN_PATTERN", snippet: "The Personal Data Protection Law was published in the Official Gazette on 24 September 2021." })], semantic("SUPPORTS"));
  assert.equal(law.status, "CURRENT");
  assert.equal(law.method, "ORIGINATING_ISSUER");
  const product = run("The Velmora V2 sensor has a resolution of 48 megapixels.", [official({ url: "https://www.velmora.example/v2/specs", reliability_basis: "FIRST_PARTY_ENTITY_DOMAIN", snippet: "V2 sensor resolution: 48 MP." })], semantic("SUPPORTS", { claimType: "OTHER" }), { frame: STABLE });
  assert.equal(product.method, "ORIGINATING_ISSUER");
  const study = run("The Arden Trial reported a 31% reduction in admissions.", [official({ url: "https://journal.example.edu/arden", source_reliability: "INSTITUTIONAL", reliability_basis: "ACADEMIC_DOMAIN_PATTERN", snippet: "Admissions fell by 31%." })], semantic("SUPPORTS", { claimType: "ATTRIBUTED_RESEARCH_RESULT", src: { authority_role: "PRIMARY_RESEARCH" } }));
  assert.equal(study.method, "ORIGINATING_ISSUER");
});

test("the rule is off unless the rollout switch enables it", () => {
  const result = run(UN_CLAIM, [official()], semantic("CONTRADICTS"), { enabled: false });
  assert.notEqual(result.method, "ORIGINATING_ISSUER");
});

test("an official domain is not enough: the source must be the issuer and pass every gate", () => {
  const cases = {
    "reports another body's fact": [UN_CLAIM, [official()], semantic("CONTRADICTS", { src: { authority_role: "SECONDARY" } })],
    "unclassified publisher": [UN_CLAIM, [official({ source_reliability: "UNKNOWN", reliability_basis: "UNCLASSIFIED_PUBLISHER" })], semantic("CONTRADICTS")],
    "first party not confirmed": [UN_CLAIM, [official({ reliability_basis: "FIRST_PARTY_UNCONFIRMED_BY_PAGE" })], semantic("CONTRADICTS")],
    "search snippet only": [UN_CLAIM, [official({ evidence_origin: "SEARCH_SNIPPET" })], semantic("CONTRADICTS")],
    "partial scope": [UN_CLAIM, [official()], semantic("CONTRADICTS", { src: { scope_match: "PARTIAL" } })],
    "indirect": [UN_CLAIM, [official()], semantic("CONTRADICTS", { src: { directness: "INDIRECT" } })],
    "insufficient": [UN_CLAIM, [official()], semantic("INSUFFICIENT")],
    "research role without an attributed study claim": [UN_CLAIM, [official()], semantic("CONTRADICTS", { src: { authority_role: "PRIMARY_RESEARCH" } })]
  };
  for (const [name, [claim, sources, sem]] of Object.entries(cases)) {
    const result = run(claim, sources, sem);
    assert.notEqual(result.method, "ORIGINATING_ISSUER", name);
    assert.notEqual(result.status, "CONTRADICTED", name);
  }
});

test("contested, consensus, compound and self-promotional claims are excluded", () => {
  for (const claimType of ["CONTESTED", "SCIENTIFIC_CONSENSUS", "COMPOUND"]) {
    assert.notEqual(run(UN_CLAIM, [official()], semantic("CONTRADICTS", { claimType })).method, "ORIGINATING_ISSUER", claimType);
  }
  assert.notEqual(run("South Sudan joined the United Nations and the African Union in 2011.", [official()], semantic("SUPPORTS")).method, "ORIGINATING_ISSUER");
  const marketing = run("The Velmora V2 is the world's fastest sensor.", [official({ url: "https://www.velmora.example/v2", reliability_basis: "FIRST_PARTY_ENTITY_DOMAIN" })], semantic("SUPPORTS", { claimType: "OTHER" }), { frame: STABLE });
  assert.notEqual(marketing.method, "ORIGINATING_ISSUER");
  assert.notEqual(marketing.status, "CURRENT");
});

test("any disagreement, even from an unclassified source, blocks the rule", () => {
  assert.notEqual(run(UN_CLAIM, [official(), other()], semantic("CONTRADICTS", { extra: ["SUPPORTS"] })).method, "ORIGINATING_ISSUER");
  assert.notEqual(run(UN_CLAIM, [official(), other()], semantic("CONTRADICTS", { extra: ["MIXED"] })).method, "ORIGINATING_ISSUER");
});

test("a current-state claim still needs a recent or live issuer page", () => {
  const stale = run("Velmora is a member of the Ardent Customs Union.", [official({ published_date: "2021-03-01", published_date_basis: "PAGE_METADATA" })],
    semantic("SUPPORTS", { claimType: "CURRENT_STATE", src: { temporal_role: "HISTORICAL_RECORD" } }), { frame: CURRENT });
  assert.notEqual(stale.method, "ORIGINATING_ISSUER");
  assert.notEqual(stale.status, "CURRENT");
});

test("a research result is settled only by the study itself, not by another body reporting it", () => {
  const reported = run("The Arden Trial reported a 31% reduction in admissions.", [official({ url: "https://www.health.example.gov/news/arden", reliability_basis: "GOVERNMENT_OR_INTERGOVERNMENTAL_DOMAIN_PATTERN", snippet: "The Arden Trial reported a 31% reduction in admissions." })],
    semantic("SUPPORTS", { claimType: "ATTRIBUTED_RESEARCH_RESULT" }));
  assert.notEqual(reported.method, "ORIGINATING_ISSUER");
});
