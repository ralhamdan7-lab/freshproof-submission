// v0.2.84 supersession: one validated issuer change notice + independent
// corroboration; month-precision and Arabic event dates; transition verbs.
// Synthetic entities only.
import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateTemporalSupersession, extractDateMentions } from "../worker/temporal-adjudication.js";

const now = Date.parse("2026-11-15T12:00:00.000Z");
const CLAIM = "Velmora is not a member of the Ardent Customs Union.";
const NOTICE = "On 4 April 2023 Velmora ended its status as a non-member of the Ardent Customs Union by joining the union.";

function issuer(overrides = {}) {
  const snippet = "Press release. " + NOTICE + " The union now has nine members.";
  return {
    url: "https://www.ardent-union.int/news/velmora-accession",
    snippet,
    date_mentions: extractDateMentions(snippet),
    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
    relevance_assessment: { relevance: "HIGH" },
    published_date: "2023-04-04",
    ...overrides
  };
}
function corroborator(overrides = {}) {
  return {
    url: "https://www.larkspur-institute.edu/velmora-membership",
    snippet: "Velmora has been a member of the Ardent Customs Union since 2023.",
    date_mentions: [],
    source_reliability: "INSTITUTIONAL",
    relevance_assessment: { relevance: "HIGH" },
    published_date: "2025-02-10",
    ...overrides
  };
}
function relations(sources, { relationsByIndex = null, issuerOverrides = {} } = {}) {
  const sourceByIndex = new Map();
  const byIndex = new Map();
  sources.forEach((source, index) => {
    const relation = relationsByIndex?.[index] || "CONTRADICTS";
    byIndex.set(index, relation);
    if (index === 0) {
      const dateIndex = source.date_mentions.findIndex(item => item.mention === "4 April 2023");
      sourceByIndex.set(0, { source_index: 0, directness: "DIRECT", scope_match: "EXACT", authority_role: "ORIGINATING_AUTHORITY", temporal_role: "CHANGE_NOTICE", change_type: "INTRODUCED", event_date_mention_index: dateIndex, change_statement_quote: NOTICE, old_state_quote: "Velmora ended its status as a non-member of the Ardent Customs Union", new_state_quote: "joining the union", ...issuerOverrides });
    } else {
      sourceByIndex.set(index, { source_index: index, directness: "DIRECT", scope_match: "EXACT", authority_role: "SECONDARY", temporal_role: "CURRENT_STATE_RECORD", change_type: "NONE" });
    }
  });
  return { claimAssessment: { claim_type: "CURRENT_STATE", claim_risk: "MEDIUM", temporal_claim_kind: "CURRENT_STATE" }, sourceByIndex, byIndex };
}
const run = (sources, options) => adjudicateTemporalSupersession({ claim: CLAIM, sources, relations: relations(sources, options), temporalSensitive: true, frameIsCurrentState: true, now });

test("date mentions: month-year, Arabic day-month-year and transition verbs are event candidates", () => {
  const month = extractDateMentions("The kingdom was renamed in April 2018 by decree.");
  assert.deepEqual(month.map(x => [x.normalized_date, x.precision, x.role_hint]), [["2018-04-01", "MONTH", "EVENT_CANDIDATE"]]);
  const joined = extractDateMentions("Velmora joined the union on 4 April 2023.");
  assert.equal(joined[0].role_hint, "EVENT_CANDIDATE");
  const arabic = extractDateMentions("انضمت فيلمورا إلى الاتحاد في ٤ نيسان ٢٠٢٣.");
  assert.deepEqual(arabic.map(x => [x.mention, x.normalized_date, x.precision, x.role_hint]), [["٤ نيسان ٢٠٢٣", "2023-04-04", "DAY", "EVENT_CANDIDATE"]]);
  const published = extractDateMentions("Report published 12 May 2024.");
  assert.equal(published[0].role_hint, "PUBLICATION_CANDIDATE");
});

test("one validated issuer change notice plus independent corroboration is SUPERSEDED", () => {
  const result = run([issuer(), corroborator()]);
  assert.equal(result?.status, "SUPERSEDED");
  assert.equal(result.method, "ISSUER_CHANGE_NOTICE_WITH_CORROBORATION");
  assert.equal(result.temporal_evidence.event_date, "2023-04-04");
  assert.equal(result.adjudication_signals.publication_date_used_as_event_date, false);
});

test("supersession is blocked without valid corroboration or with later support", () => {
  assert.equal(run([issuer(), corroborator({ url: "https://news.ardent-union.int/velmora" })]), null, "same registrable domain is not independent");
  assert.equal(run([issuer(), corroborator({ source_reliability: "UNASSESSED" })]), null, "corroborator must be qualified");
  assert.equal(run([issuer(), corroborator({ published_date: "2022-12-01" })]), null, "corroborator dated before the change cannot confirm it");
  assert.equal(run([issuer(), corroborator(), corroborator({ url: "https://www.quilomab-review.org/velmora", published_date: "2025-06-01" })], { relationsByIndex: { 2: "SUPPORTS" } }), null, "later qualified support blocks supersession");
});

test("the issuer's per-source checks still apply (quotes, date, role)", () => {
  assert.equal(run([issuer(), corroborator()], { issuerOverrides: { change_statement_quote: "Velmora joined the union in a ceremony that never happened in the snippet." } }), null, "quote must be verbatim");
  assert.equal(run([issuer(), corroborator()], { issuerOverrides: { temporal_role: "EVENT_REPORT" } }), null, "must be a change notice");
  assert.equal(run([issuer({ source_reliability: "SECONDARY_REPUTABLE" }), corroborator()]), null, "issuer must be primary or institutional");
  assert.equal(run([issuer(), corroborator()], { issuerOverrides: { event_date_mention_index: null } }), null, "event date must be a validated mention");
});

test("claim anchors may come from the verbatim change statement when the old-state quote is short", () => {
  const notice = "Velmora became the ninth member of the Ardent Customs Union on 4 April 2023.";
  const snippet = "Press release. " + notice;
  const src = issuer({ snippet, date_mentions: extractDateMentions(snippet) });
  const sources = [src, corroborator()];
  const rel = relations(sources, { issuerOverrides: { change_statement_quote: notice, old_state_quote: "Velmora", new_state_quote: "ninth member", change_type: "INTRODUCED" } });
  const result = adjudicateTemporalSupersession({ claim: CLAIM, sources, relations: rel, temporalSensitive: true, frameIsCurrentState: true, now });
  assert.equal(result?.status, "SUPERSEDED");
  const unrelated = "Larkspur became the ninth member of the Quilomab Trade Pact on 4 April 2023.";
  const other = issuer({ snippet: "Press release. " + unrelated, date_mentions: extractDateMentions("Press release. " + unrelated) });
  const relOther = relations([other, corroborator()], { issuerOverrides: { change_statement_quote: unrelated, old_state_quote: "Larkspur", new_state_quote: "ninth member", change_type: "INTRODUCED" } });
  assert.equal(adjudicateTemporalSupersession({ claim: CLAIM, sources: [other, corroborator()], relations: relOther, temporalSensitive: true, frameIsCurrentState: true, now }), null, "a change about another entity never supersedes the claim");
});
