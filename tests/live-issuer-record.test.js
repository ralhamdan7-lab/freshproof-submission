// v0.2.84 live issuer record for current-state claims. Synthetic entities only.
import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence } from "../worker/evidence-adjudication.js";

const now = Date.parse("2026-11-15T12:00:00.000Z");
const CURRENT = { frame: "CURRENT_STATE", is_time_sensitive: true, temporal_status: "TEMPORAL_REVIEW_REQUIRED" };
const CLAIM = "Velmora is a member of the Ardent Customs Union.";

const record = (overrides = {}) => ({
  title: "Member states",
  url: "https://www.ardent-union.int/members",
  snippet: "Member states of the Ardent Customs Union: Larkspur, Quilomab, Velmora.",
  source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
  evidence_origin: "DIRECT_PAGE_PASSAGES",
  retrieved_at: "2026-11-15T11:58:00.000Z",
  relevance_assessment: { relevance: "HIGH" },
  ...overrides
});
const semantic = (relation, sourceOverrides = {}, extra = []) => ({
  status: "COMPLETED_ADVISORY",
  claim_assessment: { claim_type: "CURRENT_STATE", claim_risk: "MEDIUM", temporal_claim_kind: "CURRENT_STATE" },
  assessments: [{ source_index: 0, relation }, ...extra.map((r, i) => ({ source_index: i + 1, relation: r }))],
  source_assessments: [
    { source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY", temporal_role: "CURRENT_STATE_RECORD", change_type: "NONE", ...sourceOverrides },
    ...extra.map((_, i) => ({ source_index: i + 1, directness: "INDIRECT", scope_match: "EXACT", authority_role: "SECONDARY", temporal_role: "BACKGROUND", change_type: "NONE" }))
  ]
});
const run = (sources, semanticAssessment, claim = CLAIM) => adjudicateEvidence({ claim, sources, semanticAssessment, claimFrame: CURRENT, temporalSensitive: true, now });

test("the issuer's undated live record settles a current-state claim (support and contradiction)", () => {
  const supported = run([record()], semantic("SUPPORTS"));
  assert.equal(supported.status, "CURRENT");
  assert.equal(supported.method, "LIVE_ISSUER_RECORD");
  assert.equal(supported.adjudication_signals.source_trace[0].live_issuer_record, true);
  const contradicted = run([record({ snippet: "Member states: Larkspur, Quilomab." })], semantic("CONTRADICTS"));
  assert.equal(contradicted.status, "CONTRADICTED");
  assert.equal(contradicted.method, "LIVE_ISSUER_RECORD");
});

test("every live-record condition is required", () => {
  const cases = {
    "search snippet only": [record({ evidence_origin: "SEARCH_SNIPPET" }), semantic("SUPPORTS")],
    "not a primary publisher": [record({ source_reliability: "SECONDARY_REPUTABLE" }), semantic("SUPPORTS")],
    "secondary role": [record(), semantic("SUPPORTS", { authority_role: "SECONDARY" })],
    "historical record role": [record(), semantic("SUPPORTS", { temporal_role: "HISTORICAL_RECORD" })],
    "partial scope": [record(), semantic("SUPPORTS", { scope_match: "PARTIAL" })],
    "indirect": [record(), semantic("SUPPORTS", { directness: "INDIRECT" })],
    "old dated page": [record({ published_date: "2023-04-04", published_date_basis: "PAGE_METADATA" }), semantic("SUPPORTS")],
    "stale retrieval": [record({ retrieved_at: "2026-11-14T08:00:00.000Z" }), semantic("SUPPORTS")],
    "no retrieval time": [record({ retrieved_at: undefined }), semantic("SUPPORTS")]
  };
  for (const [name, [src, sem]] of Object.entries(cases)) {
    const result = run([src], sem);
    assert.notEqual(result.method, "LIVE_ISSUER_RECORD", name);
    assert.equal(result.status, "NEEDS_REVIEW", name);
  }
});

test("any conflicting assessed source blocks the live-record verdict", () => {
  const second = { ...record({ url: "https://news.example.net/velmora", source_reliability: "UNASSESSED", evidence_origin: "SEARCH_SNIPPET" }) };
  const result = run([record(), second], semantic("SUPPORTS", {}, ["CONTRADICTS"]));
  assert.notEqual(result.method, "LIVE_ISSUER_RECORD");
  assert.equal(result.status, "NEEDS_REVIEW");
});

test("the live-record rule does not apply outside current-state claims or to compound claims", () => {
  const event = adjudicateEvidence({ claim: "Velmora joined the Ardent Customs Union on 4 April 2023.", sources: [record()], semanticAssessment: semantic("SUPPORTS"), claimFrame: { frame: "TIME_ANCHORED_EVENT" }, temporalSensitive: true, now });
  assert.notEqual(event.method, "LIVE_ISSUER_RECORD");
  const compound = run([record()], semantic("SUPPORTS"), "Velmora is a member of the Ardent Customs Union and Larkspur is a member of the Quilomab Pact.");
  assert.notEqual(compound.method, "LIVE_ISSUER_RECORD");
});
