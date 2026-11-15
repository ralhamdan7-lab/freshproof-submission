import test from "node:test";
import assert from "node:assert/strict";
import { extractDateMentions, adjudicateTemporalSupersession } from "../worker/temporal-adjudication.js";
import { adjudicateEvidence } from "../worker/evidence-adjudication.js";

const now = Date.parse("2026-11-15T00:00:00.000Z");
const claim = "John Doe is the current CEO of Acme.";
const snippets = [
  "On January 20, 2025, Acme announced that John Doe was replaced by Jane Roe as CEO of Acme.",
  "On January 22, 2025, Acme's board confirmed that John Doe was replaced by Jane Roe as CEO of Acme."
];

function fixture({ sameHost = false, publicationInsteadOfEvent = false, oldClaimDate = null, temporalKind = "CURRENT_STATE", relation = "CONTRADICTS", sourceQuality = true } = {}) {
  const sources = snippets.map((snippet, index) => {
    const dateMentions = extractDateMentions(snippet);
    return {
      title: "Acme leadership transition",
      url: index === 0 || sameHost ? "https://acme.gov/leadership" : "https://records.gov/leadership",
      snippet: publicationInsteadOfEvent
        ? snippet.replace("On January " + (index === 0 ? "20" : "22") + ", 2025", "Published on March 1, 2026")
        : snippet,
      published_date: "2026-03-01",
      date_mentions: publicationInsteadOfEvent
        ? extractDateMentions(snippet.replace("On January " + (index === 0 ? "20" : "22") + ", 2025", "Published on March 1, 2026"))
        : dateMentions,
      source_reliability: sourceQuality ? "PRIMARY_OR_OFFICIAL_DOMAIN" : "UNASSESSED",
      relevance_assessment: { relevance: "HIGH" }
    };
  });
  const sourceAssessments = sources.map((source, index) => {
    const eventIndex = source.date_mentions.findIndex(item => item.role_hint === "EVENT_CANDIDATE");
    return {
      source_index: index,
      directness: "DIRECT",
      scope_match: "EXACT",
      authority_role: "ORIGINATING_AUTHORITY",
      temporal_role: "CHANGE_NOTICE",
      change_type: "REPLACED",
      event_date_mention_index: publicationInsteadOfEvent ? 0 : eventIndex,
      change_statement_quote: source.snippet,
      old_state_quote: "John Doe",
      new_state_quote: "Jane Roe as CEO of Acme"
    };
  });
  return {
    sources,
    relations: {
      byIndex: new Map([[0, relation], [1, relation]]),
      sourceByIndex: new Map(sourceAssessments.map(item => [item.source_index, item])),
      claimAssessment: { temporal_claim_kind: temporalKind }
    },
    semanticAssessment: {
      status: "COMPLETED_ADVISORY",
      assessments: sources.map((_, source_index) => ({ source_index, relation })),
      claim_assessment: {
        claim_type: "CURRENT_STATE",
        claim_risk: "HIGH",
        temporal_claim_kind: temporalKind
      },
      source_assessments: sourceAssessments
    },
    claim: oldClaimDate ? oldClaimDate + " " + claim : claim
  };
}

test("date extraction retains multiple dates and distinguishes event from publication context", () => {
  const dates = extractDateMentions("The report was published on March 1, 2026 about a policy change effective on January 20, 2025.");
  assert.equal(dates.length, 2);
  assert.equal(dates[0].role_hint, "PUBLICATION_CANDIDATE");
  assert.equal(dates[1].role_hint, "EVENT_CANDIDATE");
  assert.equal(dates[1].normalized_date, "2025-01-20");
});

test("generic temporal supersession requires two independent, source-bound change notices", () => {
  const f = fixture();
  const result = adjudicateTemporalSupersession({
    claim: f.claim,
    sources: f.sources,
    relations: f.relations,
    temporalSensitive: true,
    now
  });
  assert.equal(result.status, "SUPERSEDED");
  assert.equal(result.method, "CORROBORATED_TEMPORAL_CHANGE_EVENT");
  assert.equal(result.temporal_evidence.event_date, "2025-01-22");
  assert.equal(result.adjudication_signals.independent_change_notice_domains, 2);
});

test("generic adjudicator emits SUPERSEDED for a corroborated dated transition", () => {
  const f = fixture();
  const result = adjudicateEvidence({
    claim: f.claim,
    sources: f.sources,
    semanticAssessment: f.semanticAssessment,
    temporalSensitive: true,
    now
  });
  assert.equal(result.status, "SUPERSEDED");
  assert.equal(result.evidence.length, 2);
});

test("one source cannot establish a generic supersession", () => {
  const f = fixture();
  assert.equal(adjudicateTemporalSupersession({
    claim: f.claim, sources: f.sources.slice(0, 1),
    relations: { ...f.relations, byIndex: new Map([[0, "CONTRADICTS"]]), sourceByIndex: new Map([[0, f.relations.sourceByIndex.get(0)]]) },
    temporalSensitive: true, now
  }), null);
});

test("recent publication date cannot substitute for an old event date", () => {
  const f = fixture({ publicationInsteadOfEvent: true });
  assert.equal(adjudicateTemporalSupersession({
    claim: f.claim, sources: f.sources, relations: f.relations, temporalSensitive: true, now
  }), null);
});

test("a transition before the claim's explicit reference year cannot supersede it", () => {
  const f = fixture({ oldClaimDate: "As of 2026," });
  assert.equal(adjudicateTemporalSupersession({
    claim: f.claim, sources: f.sources, relations: f.relations, temporalSensitive: true, now
  }), null);
});

test("historical or stable claims are not reclassified as superseded", () => {
  for (const temporalKind of ["HISTORICAL_EVENT", "STABLE", "UNKNOWN"]) {
    const f = fixture({ temporalKind });
    assert.equal(adjudicateTemporalSupersession({
      claim: f.claim, sources: f.sources, relations: f.relations, temporalSensitive: true, now
    }), null);
  }
});

test("unassessed publishers and supporting relations cannot establish supersession", () => {
  const lowQuality = fixture({ sourceQuality: false });
  assert.equal(adjudicateTemporalSupersession({
    claim: lowQuality.claim, sources: lowQuality.sources, relations: lowQuality.relations, temporalSensitive: true, now
  }), null);
  const supporting = fixture({ relation: "SUPPORTS" });
  assert.equal(adjudicateTemporalSupersession({
    claim: supporting.claim, sources: supporting.sources, relations: supporting.relations, temporalSensitive: true, now
  }), null);
});

test("same-publisher subdomains do not count as independent transition evidence", () => {
  const f = fixture({ sameHost: true });
  assert.equal(adjudicateTemporalSupersession({
    claim: f.claim, sources: f.sources, relations: f.relations, temporalSensitive: true, now
  }), null);
});

test("future change events cannot supersede a current-state claim", () => {
  const f = fixture();
  assert.equal(adjudicateTemporalSupersession({
    claim: f.claim, sources: f.sources, relations: f.relations, temporalSensitive: true,
    now: Date.parse("2025-01-01T00:00:00.000Z")
  }), null);
});

test("a single incidental token cannot anchor the prior state to a multi-token claim", () => {
  // v0.2.84: anchors may come from the old-state quote or the verbatim change
  // statement, so both are reduced to a single incidental shared token here.
  const f = fixture();
  f.sources.forEach((source, index) => {
    source.snippet = `On January ${index === 0 ? 20 : 22}, 2025, Acme replaced its logistics provider with Northwind as part of a restructuring.`;
    source.date_mentions = extractDateMentions(source.snippet);
    const assessment = f.relations.sourceByIndex.get(index);
    assessment.change_statement_quote = source.snippet;
    assessment.old_state_quote = "Acme";
    assessment.new_state_quote = "Northwind as part of a restructuring";
    assessment.event_date_mention_index = source.date_mentions.findIndex(item => item.role_hint === "EVENT_CANDIDATE");
  });
  assert.equal(adjudicateTemporalSupersession({
    claim: f.claim, sources: f.sources, relations: f.relations, temporalSensitive: true, now
  }), null);
});

test("an incidental later-mentioned year cannot override an explicit claim reference date", () => {
  const f = fixture();
  f.claim = "As of 2024, John Doe is the current CEO of Acme; Acme was founded in 1998.";
  f.sources.forEach((source, index) => {
    source.snippet = source.snippet.replaceAll("2025", "2015");
    source.date_mentions = extractDateMentions(source.snippet);
    const assessment = f.relations.sourceByIndex.get(index);
    assessment.change_statement_quote = source.snippet;
    assessment.event_date_mention_index = source.date_mentions.findIndex(item => item.role_hint === "EVENT_CANDIDATE");
  });
  assert.equal(adjudicateTemporalSupersession({
    claim: f.claim, sources: f.sources, relations: f.relations, temporalSensitive: true, now
  }), null);
});


test("a corroborated transition after the explicit claim reference date remains eligible", () => {
  const f = fixture();
  f.claim = "As of 2024, John Doe is the current CEO of Acme; Acme was founded in 1998.";
  const result = adjudicateTemporalSupersession({
    claim: f.claim, sources: f.sources, relations: f.relations, temporalSensitive: true, now
  });
  assert.equal(result?.status, "SUPERSEDED");
  assert.equal(result?.temporal_evidence.event_date, "2025-01-22");
});
