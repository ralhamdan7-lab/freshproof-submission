// v0.2.90 graded evidence: MODERATE-confidence verdicts from independent
// agreement, current-state persistence and temporal-order reconciliation.
// Every positive case has negative counterparts. Synthetic entities only.
import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateEvidence, isOpenForecast } from "../worker/evidence-adjudication.js";

const now = Date.parse("2026-11-15T12:00:00.000Z");
const TEXTS = [
  "The Larkspur Dam on the Velmora River was completed in 1998 after six years of construction.",
  "Records show construction of the Larkspur Dam finished in 1998, creating Lake Quilomab upstream.",
  "Engineers completed the Larkspur hydroelectric dam in 1998; it remains the region's largest reservoir.",
  "According to the regional archive, the Larkspur Dam project reached completion in 1998.",
  "A 1998 completion date is recorded for the Larkspur Dam in the national register of dams."
];
function src(host, { reliability = "UNASSESSED", basis = "UNCLASSIFIED_PUBLISHER", origin = "DIRECT_PAGE_PASSAGES", date = null, text = null, i = 0 } = {}) {
  return {
    title: "Larkspur Dam", url: `https://www.${host}/larkspur-dam`, snippet: text || TEXTS[i % TEXTS.length],
    source_reliability: reliability, reliability_basis: basis, evidence_origin: origin,
    relevance_assessment: { relevance: "HIGH" }, ...(date ? { published_date: date, published_date_basis: "PAGE_METADATA" } : {}),
    retrieved_at: "2026-11-15T11:58:00.000Z"
  };
}
function sem(relations, { risk = "MEDIUM", roles = [], temporal = [], scope = [], directness = [] } = {}) {
  return {
    status: "COMPLETED_ADVISORY",
    claim_assessment: { claim_type: "OTHER", claim_risk: risk, temporal_claim_kind: "STABLE" },
    assessments: relations.map((relation, source_index) => ({ source_index, relation })),
    source_assessments: relations.map((_, source_index) => ({
      source_index, directness: directness[source_index] || "DIRECT", scope_match: scope[source_index] || "EXACT",
      authority_role: roles[source_index] || "SECONDARY", temporal_role: temporal[source_index] || "HISTORICAL_RECORD", change_type: "NONE"
    }))
  };
}
const STABLE = { frame: "STABLE_FACT" };
const run = (sources, semanticAssessment, extra = {}) => adjudicateEvidence({ claim: "The Larkspur Dam was completed in 1998.", sources, semanticAssessment, claimFrame: STABLE, temporalSensitive: false, now, ...extra });

test("two independent lineages with one qualified publisher reach a MODERATE verdict", () => {
  const result = run([src("reference-review.org", { reliability: "SECONDARY_REPUTABLE", basis: "CURATED_OR_SUFFIX_REGISTRY", i: 0 }), src("dam-history.net", { i: 1 })], sem(["SUPPORTS", "SUPPORTS"]));
  assert.equal(result.status, "CURRENT");
  assert.equal(result.method, "INDEPENDENT_SOURCE_CONSENSUS");
  assert.equal(result.confidence_tier, "MODERATE");
  assert.equal(result.adjudication_signals.lineages, 2);
  const contradicted = run([src("reference-review.org", { reliability: "SECONDARY_REPUTABLE", i: 0 }), src("dam-history.net", { i: 1 })], sem(["CONTRADICTS", "CONTRADICTS"]));
  assert.equal(contradicted.status, "CONTRADICTED");
});

test("unclassified publishers need three independent lineages; two are not enough", () => {
  assert.equal(run([src("dam-history.net", { i: 0 }), src("rivers-blog.com", { i: 1 })], sem(["SUPPORTS", "SUPPORTS"])).status, "NEEDS_REVIEW");
  const three = run([src("dam-history.net", { i: 0 }), src("rivers-blog.com", { i: 1 }), src("engineering-notes.io", { i: 2 })], sem(["SUPPORTS", "SUPPORTS", "SUPPORTS"]));
  assert.equal(three.status, "CURRENT");
  assert.equal(three.confidence_tier, "MODERATE");
});

test("syndicated copies count as one lineage", () => {
  const same = TEXTS[0];
  const result = run([src("dam-history.net", { text: same }), src("rivers-blog.com", { text: same }), src("engineering-notes.io", { text: same })], sem(["SUPPORTS", "SUPPORTS", "SUPPORTS"]));
  assert.equal(result.status, "NEEDS_REVIEW");
});

test("v0.2.91: excerpts from a classified publisher plus independent agreement decide; unclassified-only excerpts never do", () => {
  const classified = run([src("reference-review.org", { reliability: "SECONDARY_REPUTABLE", basis: "CURATED_OR_SUFFIX_REGISTRY", origin: "SEARCH_SNIPPET", i: 0 }), src("dam-history.net", { origin: "SEARCH_SNIPPET", i: 1 }), src("rivers-blog.com", { origin: "SEARCH_SNIPPET", i: 2 })], sem(["SUPPORTS", "SUPPORTS", "SUPPORTS"]));
  assert.equal(classified.status, "CURRENT");
  assert.equal(classified.confidence_tier, "MODERATE");
  const unclassified = run([src("dam-history.net", { origin: "SEARCH_SNIPPET", i: 0 }), src("rivers-blog.com", { origin: "SEARCH_SNIPPET", i: 1 }), src("engineering-notes.io", { origin: "SEARCH_SNIPPET", i: 2 })], sem(["SUPPORTS", "SUPPORTS", "SUPPORTS"]));
  assert.equal(unclassified.status, "NEEDS_REVIEW");
});

test("any opposing source, a qualified MIXED source, partial scope or unclear directness blocks consensus", () => {
  const base = () => [src("reference-review.org", { reliability: "SECONDARY_REPUTABLE", i: 0 }), src("dam-history.net", { i: 1 }), src("rivers-blog.com", { i: 2 })];
  assert.equal(run(base(), sem(["SUPPORTS", "SUPPORTS", "CONTRADICTS"])).status, "NEEDS_REVIEW", "opposition");
  assert.equal(run(base(), sem(["MIXED", "SUPPORTS", "SUPPORTS"])).status, "NEEDS_REVIEW", "qualified MIXED");
  assert.equal(run(base().slice(0, 2), sem(["SUPPORTS", "SUPPORTS"], { scope: ["EXACT", "PARTIAL"] })).status, "NEEDS_REVIEW", "partial scope");
  assert.equal(run(base().slice(0, 2), sem(["SUPPORTS", "SUPPORTS"], { directness: ["DIRECT", "UNCLEAR"] })).status, "NEEDS_REVIEW", "unclear directness");
});

test("user-generated content and unconfirmed first-party pages never corroborate", () => {
  const ugc = src("rivers-blog.com", { basis: "USER_GENERATED_CONTENT_ON_DOMAIN", i: 1 });
  assert.equal(run([src("reference-review.org", { reliability: "SECONDARY_REPUTABLE", i: 0 }), ugc], sem(["SUPPORTS", "SUPPORTS"])).status, "NEEDS_REVIEW");
  const parked = { ...src("larkspur-dam.com", { i: 1 }), reliability_basis: "FIRST_PARTY_UNCONFIRMED_BY_PAGE", first_party_confirmation: "NOT_CONFIRMED_BY_PAGE_IDENTITY" };
  assert.equal(run([src("reference-review.org", { reliability: "SECONDARY_REPUTABLE", i: 0 }), parked], sem(["SUPPORTS", "SUPPORTS"])).status, "NEEDS_REVIEW");
});

test("high-risk claims need three lineages including a qualified publisher and two fetched pages", () => {
  const two = [src("reference-review.org", { reliability: "SECONDARY_REPUTABLE", i: 0 }), src("dam-history.net", { i: 1 })];
  assert.equal(run(two, sem(["SUPPORTS", "SUPPORTS"], { risk: "HIGH" })).status, "NEEDS_REVIEW");
  const three = [...two, src("rivers-blog.com", { i: 2 })];
  const result = run(three, sem(["SUPPORTS", "SUPPORTS", "SUPPORTS"], { risk: "HIGH" }));
  assert.equal(result.status, "CURRENT");
  assert.equal(result.adjudication_signals.high_risk_threshold_applied, true);
  const unqualified = [src("dam-history.net", { i: 0 }), src("rivers-blog.com", { i: 1 }), src("engineering-notes.io", { i: 2 })];
  assert.equal(run(unqualified, sem(["SUPPORTS", "SUPPORTS", "SUPPORTS"], { risk: "HIGH" })).status, "NEEDS_REVIEW");
});

// Current-state persistence ------------------------------------------------
const CAPITAL = "Velmora City is the capital of Velmora.";
const capitalTexts = ["Velmora City is the capital of Velmora and its largest port.", "The capital, Velmora City, hosts the national parliament of Velmora.", "Velmora's capital city is Velmora City, seat of government since independence."];
const csrc = (host, opts = {}) => src(host, { text: capitalTexts[opts.i || 0], ...opts });
const currentRun = (sources, semanticAssessment, extra = {}) => adjudicateEvidence({ claim: CAPITAL, sources, semanticAssessment, claimFrame: { frame: "CURRENT_STATE", state_class: "OTHER" }, temporalSensitive: true, now, ...extra });

test("undated current-state records agree and a change search found nothing: MODERATE persistence verdict", () => {
  const sources = [csrc("reference-review.org", { reliability: "SECONDARY_REPUTABLE", i: 0 }), csrc("atlas-world.net", { i: 1 })];
  const semantic = sem(["SUPPORTS", "SUPPORTS"], { temporal: ["CURRENT_STATE_RECORD", "CURRENT_STATE_RECORD"] });
  const result = currentRun(sources, semantic, { changeSearchPerformed: true });
  assert.equal(result.status, "CURRENT");
  assert.equal(result.method, "CURRENT_STATE_PERSISTENCE_CONSENSUS");
  assert.equal(result.confidence_tier, "MODERATE");
  assert.deepEqual(result.adjudication_signals.currency_basis, ["UNDATED_CURRENT_STATE_RECORD"]);
  assert.equal(currentRun(sources, semantic, { changeSearchPerformed: false }).status, "NEEDS_REVIEW", "no change search, no persistence");
  const undatedBackground = sem(["SUPPORTS", "SUPPORTS"], { temporal: ["BACKGROUND", "BACKGROUND"] });
  assert.equal(currentRun(sources, undatedBackground, { changeSearchPerformed: true }).status, "NEEDS_REVIEW", "undated pages must be current-state records");
});

test("persistence windows depend on the state class, and a contradicting change notice disables persistence", () => {
  const dated = [csrc("reference-review.org", { reliability: "SECONDARY_REPUTABLE", date: "2024-09-01", i: 0 }), csrc("atlas-world.net", { date: "2024-06-01", i: 1 })];
  const semantic = sem(["SUPPORTS", "SUPPORTS"]);
  assert.equal(currentRun(dated, semantic, { changeSearchPerformed: true }).status, "CURRENT", "two-year-old sources within the structural-state window");
  const office = adjudicateEvidence({ claim: "Ana Larkspur is the president of the Velmora Council.", sources: dated, semanticAssessment: semantic, claimFrame: { frame: "CURRENT_STATE", state_class: "OFFICE_HOLDER" }, temporalSensitive: true, now, changeSearchPerformed: true });
  assert.equal(office.status, "NEEDS_REVIEW", "office holders do not persist on two-year-old pages");
  const withNotice = [...dated, csrc("velmora-news.org", { i: 2, date: "2026-01-10" })];
  const noticeSemantic = sem(["SUPPORTS", "SUPPORTS", "CONTRADICTS"], { temporal: ["HISTORICAL_RECORD", "HISTORICAL_RECORD", "CHANGE_NOTICE"] });
  assert.notEqual(currentRun(withNotice, noticeSemantic, { changeSearchPerformed: true }).status, "CURRENT");
});

test("temporal-order reconciliation: all support older than all contradiction, contradiction agrees independently", () => {
  const sources = [
    csrc("old-almanac.net", { date: "2009-05-01", i: 0 }),
    csrc("travel-archive.com", { date: "2011-03-01", i: 1 }),
    csrc("reference-review.org", { reliability: "SECONDARY_REPUTABLE", date: "2021-02-01", text: "Since 2019 the capital of Velmora has been New Ardent, replacing Velmora City." }),
    csrc("atlas-world.net", { date: "2023-07-01", text: "New Ardent became Velmora's capital in 2019; Velmora City remains the largest port." })
  ];
  const result = currentRun(sources, sem(["SUPPORTS", "SUPPORTS", "CONTRADICTS", "CONTRADICTS"]));
  assert.equal(result.status, "SUPERSEDED");
  assert.equal(result.method, "TEMPORAL_ORDER_RECONCILIATION");
  assert.equal(result.confidence_tier, "MODERATE");
  const interleaved = sources.map((source, index) => index === 1 ? { ...source, published_date: "2024-01-01" } : source);
  assert.equal(currentRun(interleaved, sem(["SUPPORTS", "SUPPORTS", "CONTRADICTS", "CONTRADICTS"])).status, "NEEDS_REVIEW", "a newer supporting source blocks reconciliation");
  const undatedSupport = sources.map((source, index) => index === 0 ? { ...source, published_date: undefined } : source);
  assert.equal(currentRun(undatedSupport, sem(["SUPPORTS", "SUPPORTS", "CONTRADICTS", "CONTRADICTS"])).status, "NEEDS_REVIEW", "every involved source must be dated");
});

test("open forecasts are recognised; scheduled plans are not forecasts", () => {
  assert.equal(isOpenForecast("The Velmora token will trade above 500,000 credits by 2030."), true);
  assert.equal(isOpenForecast("Fuel prices in Velmora are expected to exceed 3 credits next year."), true);
  assert.equal(isOpenForecast("ستتجاوز أسعار الوقود 300 وحدة في عام 2030."), true);
  assert.equal(isOpenForecast("The Larkspur Games are scheduled to be held in Port Ash in 2028."), false);
  assert.equal(isOpenForecast("The new terminal will open in March 2027."), false);
});

test("v0.2.91: older sources documenting a change make a present-state claim SUPERSEDED after a change search", () => {
  const CURRENT = { frame: "CURRENT_STATE", state_class: "MEMBERSHIP" };
  const texts = [
    "On 31 January 2023 the Republic of Velmora withdrew from the Quilomab Customs Union after a referendum.",
    "Velmora left the Quilomab Customs Union in January 2023 and now trades under separate agreements.",
    "Since its 2023 withdrawal, Velmora is no longer a member of the Quilomab Customs Union."
  ];
  const sources = [
    src("velmora-trade.org", { reliability: "SECONDARY_REPUTABLE", basis: "CURATED_OR_SUFFIX_REGISTRY", date: "2023-02-02", text: texts[0] }),
    src("customs-review.net", { date: "2023-03-10", text: texts[1] }),
    src("trade-atlas.io", { text: texts[2] })
  ];
  const semantic = sem(["CONTRADICTS", "CONTRADICTS", "CONTRADICTS"], { temporal: ["CHANGE_NOTICE", "CHANGE_NOTICE", "CURRENT_STATE_RECORD"] });
  const claim = "Velmora is a member of the Quilomab Customs Union.";
  const result = adjudicateEvidence({ claim, sources, semanticAssessment: semantic, claimFrame: CURRENT, temporalSensitive: true, now, changeSearchPerformed: true });
  assert.equal(result.status, "SUPERSEDED");
  assert.equal(result.method, "DOCUMENTED_CHANGE_CONSENSUS");
  assert.equal(result.confidence_tier, "MODERATE");
  // Without a search for later developments, old documents cannot decide.
  const noChangeSearch = adjudicateEvidence({ claim, sources, semanticAssessment: semantic, claimFrame: CURRENT, temporalSensitive: true, now, changeSearchPerformed: false });
  assert.equal(noChangeSearch.status, "NEEDS_REVIEW");
  // A later source supporting the old state again blocks the verdict.
  const reversal = adjudicateEvidence({ claim, sources: [...sources, src("velmora-news.com", { date: "2026-10-01", text: "Velmora rejoined the Quilomab Customs Union this autumn and is a member again." })], semanticAssessment: sem(["CONTRADICTS", "CONTRADICTS", "CONTRADICTS", "SUPPORTS"], { temporal: ["CHANGE_NOTICE", "CHANGE_NOTICE", "CURRENT_STATE_RECORD", "CHANGE_NOTICE"] }), claimFrame: CURRENT, temporalSensitive: true, now, changeSearchPerformed: true });
  assert.notEqual(reversal.status, "SUPERSEDED");
  assert.notEqual(reversal.status, "CONTRADICTED");
});

test("v0.2.91: a lone unclassified dissent does not block a strongly corroborated side; qualified or repeated dissent does", () => {
  const q = (host, i) => src(host, { reliability: "SECONDARY_REPUTABLE", basis: "CURATED_OR_SUFFIX_REGISTRY", i });
  const agreeing = [q("reference-review.org", 0), q("encyclopedia-one.com", 1), src("dam-history.net", { i: 2 })];
  const loneDissent = run([...agreeing, src("rivers-blog.com", { i: 3 })], sem(["SUPPORTS", "SUPPORTS", "SUPPORTS", "CONTRADICTS"]));
  assert.equal(loneDissent.status, "CURRENT");
  assert.equal(loneDissent.confidence_tier, "MODERATE");
  assert.deepEqual(loneDissent.adjudication_signals.minority_dissent_domains, ["rivers-blog.com"]);
  const qualifiedDissent = run([...agreeing, q("atlas-review.org", 3)], sem(["SUPPORTS", "SUPPORTS", "SUPPORTS", "CONTRADICTS"]));
  assert.equal(qualifiedDissent.status, "NEEDS_REVIEW");
  const twoDissents = run([...agreeing, src("rivers-blog.com", { i: 3 }), src("engineering-notes.io", { i: 4 })], sem(["SUPPORTS", "SUPPORTS", "SUPPORTS", "CONTRADICTS", "CONTRADICTS"]));
  assert.equal(twoDissents.status, "NEEDS_REVIEW");
  const weakSide = run([q("reference-review.org", 0), src("dam-history.net", { i: 2 }), src("rivers-blog.com", { i: 3 })], sem(["SUPPORTS", "SUPPORTS", "CONTRADICTS"]));
  assert.equal(weakSide.status, "NEEDS_REVIEW", "two lineages with one qualified publisher cannot override dissent");
});

test("v0.2.91: uncontested present-state contradiction after a latest-status search (three lineages, classified publishers)", () => {
  const CURRENT = { frame: "CURRENT_STATE", state_class: "OFFICE_HOLDER" };
  const claim = "Orvan Telis is the current director of the Kessel Basin Authority.";
  const variants = ["Orvan Telis served as director of the Kessel Basin Authority from 2009 to 2016; Mira Sand has led the authority since 2017.", "Former director Orvan Telis left the Kessel Basin Authority in 2016 and was succeeded by Mira Sand.", "The Kessel Basin Authority, once run by Orvan Telis, has been directed by Mira Sand for several years."];
  const mk = (host, opts) => src(host, { ...opts, text: variants[opts.i] });
  const sources = [mk("basin-review.org", { reliability: "SECONDARY_REPUTABLE", basis: "CURATED_OR_SUFFIX_REGISTRY", date: "2018-01-10", i: 0 }), mk("water-almanac.com", { reliability: "SECONDARY_REPUTABLE", basis: "CURATED_OR_SUFFIX_REGISTRY", i: 1 }), mk("regional-notes.net", { date: "2019-05-01", i: 2 })];
  const semantic = sem(["CONTRADICTS", "CONTRADICTS", "CONTRADICTS"], { temporal: ["HISTORICAL_RECORD", "HISTORICAL_RECORD", "HISTORICAL_RECORD"] });
  const base = { claim, semanticAssessment: semantic, claimFrame: CURRENT, temporalSensitive: true, now };
  const result = adjudicateEvidence({ ...base, sources, changeSearchPerformed: true });
  assert.equal(result.status, "SUPERSEDED");
  assert.equal(result.method, "UNCONTESTED_CURRENT_STATE_CONTRADICTION");
  assert.equal(result.confidence_tier, "MODERATE");
  assert.equal(adjudicateEvidence({ ...base, sources, changeSearchPerformed: false }).status, "NEEDS_REVIEW", "requires a latest-status search");
  assert.equal(adjudicateEvidence({ ...base, sources: sources.slice(0, 2), semanticAssessment: sem(["CONTRADICTS", "CONTRADICTS"], { temporal: ["HISTORICAL_RECORD", "HISTORICAL_RECORD"] }), changeSearchPerformed: true }).status, "NEEDS_REVIEW", "two lineages are not enough");
  const withSupport = adjudicateEvidence({ ...base, sources: [...sources, src("kessel-news.com", { i: 3, text: "Orvan Telis remains director of the Kessel Basin Authority." })], semanticAssessment: sem(["CONTRADICTS", "CONTRADICTS", "CONTRADICTS", "SUPPORTS"], { scope: ["EXACT", "EXACT", "EXACT", "PARTIAL"] }), changeSearchPerformed: true });
  assert.equal(withSupport.status, "NEEDS_REVIEW", "any assessed support blocks the rule");
});
