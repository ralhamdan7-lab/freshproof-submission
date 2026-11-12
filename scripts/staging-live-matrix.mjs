// Live acceptance matrix for the currently deployed Staging API; keep version checks in workflow aligned with package release.
// Bounded live matrix; script-only changes run against the already-deployed Staging Worker.
const BASE = process.env.FRESH_PROOF_BASE_URL || "https://freshproof-staging.ralhamdan7.workers.dev";
const cases = [
  {
    id: "FP-LIVE-OFFICEHOLDER-01",
    text: "As of November 11, 2026, the President of the United States is Joe Biden.",
    verify(claim) {
      if (claim.domain_adapter !== "office_holder") throw new Error("Office-holder domain adapter did not activate.");
      if (claim.status !== "CONTRADICTED") throw new Error("Mandatory office-holder regression did not identify the stale holder from current official evidence.");
      const evidence = claim.officeholder_evidence || claim.domain_evidence;
      if (!evidence?.reported_current_holder || !Array.isArray(evidence.supporting_sources) || evidence.supporting_sources.length < 1) {
        throw new Error("Office-holder contradiction is missing its named current holder or official source references.");
      }
    }
  },
  {
    id: "FP-LIVE-AR-PYTHON2-01",
    text: "لا يزال Python 2.7 مدعوماً رسمياً.",
    verify(claim) {
      if (claim.domain_adapter !== "python2_lifecycle") throw new Error("Arabic Python 2 lifecycle adapter did not activate.");
      if (claim.status !== "SUPERSEDED") throw new Error("Arabic Python 2 lifecycle claim was not marked SUPERSEDED.");
      if (claim.temporal_assessment?.status !== "TEMPORAL_REVIEW_REQUIRED") throw new Error("Arabic ongoing-support claim was not classified as time-sensitive.");
      if (claim.correction?.status !== "PROVIDED" || !claim.correction.text || !(claim.correction.evidence_refs || []).some(x => x.url === "https://www.python.org/doc/sunset-python-2/")) {
        throw new Error("Arabic Python 2 correction is not tied to the official sunset citation.");
      }
    }
  },
  {
    id: "FP-LIVE-NODE-LIFECYCLE-01",
    text: "Node.js v20 remains actively supported under LTS.",
    verify(claim) {
      if (claim.domain_adapter !== "software_release") throw new Error("Node.js release lifecycle adapter did not activate.");
      if (claim.status !== "SUPERSEDED") throw new Error("Node.js v20 LTS claim was not marked SUPERSEDED from the official lifecycle schedule.");
      const lifecycle = claim.domain_evidence || {};
      if (lifecycle.support_status !== "EOL") {
        throw new Error("Node.js lifecycle verdict did not report EOL: " + JSON.stringify({ support_status: lifecycle.support_status, method: lifecycle.method }));
      }
      const sourceUrl = new URL(lifecycle.source?.url || "https://invalid.example");
      if (lifecycle.method === "OFFICIAL_NODEJS_RELEASE_SCHEDULE_JSON") {
        const endOfLife = Date.parse(lifecycle.end_of_life || "");
        if (sourceUrl.hostname !== "raw.githubusercontent.com" || !sourceUrl.pathname.includes("/nodejs/Release/") || !Number.isFinite(endOfLife) || endOfLife > Date.now()) {
          throw new Error("Immutable Node.js schedule evidence is missing its valid past EOL date.");
        }
      } else if (lifecycle.method === "OFFICIAL_NODEJS_RELEASE_TABLE_STATUS") {
        if (sourceUrl.hostname !== "nodejs.org" || !Number.isFinite(Date.parse(lifecycle.last_updated || "")) || !Number.isFinite(Date.parse(lifecycle.source?.retrieved_at || ""))) {
          throw new Error("Official Node.js release-table evidence must preserve last_updated and retrieval time separately.");
        }
      } else {
        throw new Error("Unexpected Node.js lifecycle evidence method: " + lifecycle.method);
      }
    }
  },
  {
    id: "FP-LIVE-OPENAI-PRICING-01",
    text: "ChatGPT Plus currently costs $20 per month in the United States.",
    verify(claim) {
      if (claim.domain_adapter !== "official_pricing") throw new Error("Official pricing retrieval adapter did not activate.");
      if (claim.status !== "NEEDS_REVIEW") throw new Error("Pricing adapter must not emit a truth verdict without independent price adjudication.");
      const officialPrice = claim.sources.find(source => source.url === "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus" && source.evidence_kind === "OFFICIAL_CHATGPT_PLUS_PRICING_HELP_ARTICLE" && /\$20\/month/i.test(source.snippet || ""));
      if (!officialPrice) throw new Error("Pricing evidence did not include the exact official Help Center article and visible monthly price excerpt.");
    }
  },
  {
    id: "FP-LIVE-HISTORICAL-01",
    text: "Apollo 11 landed on the Moon in 1969.",
    verify(claim) {
      if (claim.temporal_assessment?.status !== "NOT_TIME_SENSITIVE") throw new Error("Historical stable fact was not classified NOT_TIME_SENSITIVE.");
      if (!["NEEDS_REVIEW", "UNVERIFIABLE"].includes(claim.status)) throw new Error("Stable historical claim must abstain when advisory semantic analysis cannot establish sufficient factual evidence.");
      if (claim.correction?.status !== "WITHHELD") throw new Error("Correction must remain withheld without independently validated replacement evidence.");
    }
  }
];

for (const item of cases) {
  const response = await fetch(BASE + "/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ text: item.text }),
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(item.id + " returned HTTP " + response.status);
  const body = await response.json();
  if (body.product !== "FreshProof" || body.version !== "0.2.47" || !Array.isArray(body.claims) || body.claims.length !== 1) {
    throw new Error(item.id + " returned an unexpected response contract or runtime version.");
  }
  const claim = body.claims[0];
  for (const key of ["status", "sources", "explanation_detail", "correction", "temporal_assessment", "retrieval_diagnostics"]) {
    if (!(key in claim)) throw new Error(item.id + " missing response field " + key);
  }
  if (!Array.isArray(claim.sources) || !Array.isArray(claim.explanation_detail?.evidence_basis)) throw new Error(item.id + " malformed evidence arrays.");
  for (const source of claim.sources) {
    let url;
    try { url = new URL(source.url); } catch { throw new Error(item.id + " contains an invalid source URL."); }
    if (url.protocol !== "https:") throw new Error(item.id + " contains a non-HTTPS source URL.");
    for (const dateField of ["published_date", "event_date_candidate"]) {
      if (source[dateField] != null && Number.isNaN(Date.parse(source[dateField]))) throw new Error(item.id + " contains malformed " + dateField + ".");
    }
  }
  item.verify(claim);
  console.log(JSON.stringify({
    case: item.id,
    status: claim.status,
    temporal_status: claim.temporal_assessment?.status,
    domain_adapter: claim.domain_adapter,
    source_count: claim.sources.length,
    evidence_basis_count: claim.explanation_detail.evidence_basis.length,
    publication_dates: claim.sources.map(x => x.published_date).filter(Boolean),
    event_date_candidates: claim.sources.map(x => x.event_date_candidate).filter(Boolean),
    correction_status: claim.correction?.status,
    evidence_urls: claim.explanation_detail.evidence_basis.map(x => x.url),
    retrieval: (claim.retrieval_diagnostics || []).map(x => ({provider:x.provider,stage:x.stage,status:x.status,http_status:x.http_status ?? null}))
  }));
}
console.log("PASS: 5 bounded live Staging cases — current office-holder, Arabic lifecycle correction, and historical stable fact.");

// One request containing three independent claims: verifies the end-to-end multi-claim
// contract, claim-local temporal metadata, and correction/evidence isolation.
{
  const text = "Water is composed of hydrogen and oxygen. Apollo 11 landed on the Moon in 1969. Python 2.7 is still officially supported.";
  const startedAt = Date.now();
  const response = await fetch(BASE + "/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error("FP-LIVE-MULTICLAIM-01 returned HTTP " + response.status);
  const body = await response.json();
  if (body.product !== "FreshProof" || body.version !== "0.2.47" || !Array.isArray(body.claims) || body.claims.length !== 3) {
    throw new Error("Multi-claim request did not return exactly three claims at the expected runtime version.");
  }
  const normalized = body.claims.map((claim) => ({
    text: String(claim.text || "").toLowerCase(),
    claim
  }));
  const find = (needle) => normalized.find(x => x.text.includes(needle))?.claim;
  const water = find("water");
  const apollo = find("apollo 11");
  const python = find("python 2.7");
  if (!water || !apollo || !python) throw new Error("One or more independent claims were lost or merged during extraction.");
  if (new Set(body.claims.map(x => x.claim_id)).size !== 3) throw new Error("Claim identifiers are not unique.");
  for (const claim of [water, apollo, python]) {
    if (!Array.isArray(claim.sources) || !Array.isArray(claim.explanation_detail?.evidence_basis) || !Array.isArray(claim.retrieval_diagnostics)) {
      throw new Error("A claim is missing its own evidence or retrieval structures.");
    }
    if (!claim.correction || !("status" in claim.correction)) throw new Error("A claim is missing the correction decision.");
  }
  if (water.temporal_assessment?.status !== "NOT_TIME_SENSITIVE" ||
      apollo.temporal_assessment?.status !== "NOT_TIME_SENSITIVE" ||
      python.temporal_assessment?.status !== "TEMPORAL_REVIEW_REQUIRED") {
    throw new Error("Temporal classification leaked across claims or failed to remain claim-specific.");
  }
  if (python.domain_adapter !== "python2_lifecycle" || python.status !== "SUPERSEDED" ||
      python.correction?.status !== "PROVIDED" ||
      !(python.correction.evidence_refs || []).some(x => x.url === "https://www.python.org/doc/sunset-python-2/")) {
    throw new Error("The Python lifecycle correction lost its claim-local official evidence.");
  }
  if (water.correction?.status !== "WITHHELD" || apollo.correction?.status !== "WITHHELD") {
    throw new Error("A correction was incorrectly transferred to an unrelated claim.");
  }
  const searchBudget = body.methodology?.search_budget;
  if (searchBudget && Number(searchBudget.used ?? searchBudget.total_used ?? 0) > 5) {
    throw new Error("The multi-claim request exceeded the five-search budget.");
  }
  console.log(JSON.stringify({
    case: "FP-LIVE-MULTICLAIM-01",
    version: body.version,
    claim_count: body.claims.length,
    elapsed_ms: Date.now() - startedAt,
    claims: [
      { kind: "stable_scientific", status: water.status, temporal_status: water.temporal_assessment.status, source_count: water.sources.length, correction: water.correction.status },
      { kind: "historical_event", status: apollo.status, temporal_status: apollo.temporal_assessment.status, source_count: apollo.sources.length, correction: apollo.correction.status },
      { kind: "changed_lifecycle", status: python.status, temporal_status: python.temporal_assessment.status, source_count: python.sources.length, correction: python.correction.status, correction_refs: python.correction.evidence_refs.map(x => x.url) }
    ],
    search_budget: searchBudget ?? null
  }, null, 2));
}
console.log("PASS: bounded live multi-claim acceptance — three independent claims, claim-specific temporal classification, and correction isolation.");
