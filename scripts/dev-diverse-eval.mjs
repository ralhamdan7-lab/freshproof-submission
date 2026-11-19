// FreshProof development diagnostic: one /api/verify request per claim (the
// product's progressive path), plus /api/extract on long texts. Prints one
// compact line per case and a metrics line. Results are development
// diagnostics on assistant-authored labels, not accuracy estimates.
import { readFile } from "node:fs/promises";

const BASE_URL = String(process.env.FRESH_PROOF_BASE_URL || "").replace(/\/$/, "");
if (!BASE_URL) throw new Error("FRESH_PROOF_BASE_URL is required");
const data = JSON.parse(await readFile(new URL("../benchmarks/dev-diverse-v1.json", import.meta.url), "utf8"));
const only = process.env.DEV_CASES ? new Set(process.env.DEV_CASES.split(",")) : null;
const cases = data.cases.filter(item => !only || only.has(item.id));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const headers = { "content-type": "application/json", origin: BASE_URL, ...(process.env.FRESH_PROOF_EXPERIMENT ? { "x-freshproof-experiment": process.env.FRESH_PROOF_EXPERIMENT } : {}) };

async function post(path, payload) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const started = Date.now();
    let response;
    try {
      response = await fetch(BASE_URL + path, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(240000) });
    } catch (error) {
      return { error: String(error?.name || error), ms: Date.now() - started };
    }
    if (response.status === 429) { await sleep(20000); continue; }
    const body = await response.json().catch(() => null);
    return { status: response.status, body, ms: Date.now() - started };
  }
  return { error: "RATE_LIMITED", ms: 0 };
}

const rows = [];
for (const item of cases) {
  let result;
  let claims;
  if (process.env.DEV_UI_PATH) {
    // The browser's progressive path: /api/extract, then one /api/verify per extracted claim.
    const extracted = await post("/api/extract", { text: item.claim });
    const parts = (extracted.body?.claims || []).map(c => c.claim).filter(Boolean);
    console.log("DEVEXTRACTED " + JSON.stringify({ id: item.id, http: extracted.status || extracted.error, method: extracted.body?.method, diagnostics: extracted.body?.diagnostics || null, parts }));
    if (process.env.DEV_EXTRACT_ONLY) { await sleep(4000); continue; }
    claims = [];
    result = { ms: extracted.ms || 0, status: extracted.status };
    for (const part of parts.length ? parts : [item.claim]) {
      const verified = await post("/api/verify", { text: part });
      if (!verified.body?.claims?.length) console.log("DEVPARTFAIL " + JSON.stringify({ id: item.id, part, http: verified.status || null, error: verified.error || null, body: JSON.stringify(verified.body || null).slice(0, 300) }));
      result.ms += verified.ms || 0;
      if (verified.error) result.error = verified.error;
      result.status = verified.status;
      claims.push(...(verified.body?.claims || []));
      await sleep(3000);
    }
  } else {
    result = await post("/api/verify", { text: item.claim });
    claims = result.body?.claims || [];
  }
  const statuses = claims.map(claim => claim.status);
  // A claim the engine split into parts counts as the most severe part status.
  const severity = ["CONTRADICTED", "SUPERSEDED", "CURRENT", "UNVERIFIABLE", "NEEDS_REVIEW", "NOT_ASSESSED"];
  const status = statuses.length ? [...statuses].sort((a, b) => severity.indexOf(a) - severity.indexOf(b))[0] : (result.error || "HTTP_" + result.status);
  const first = claims[0] || {};
  const row = {
    id: item.id, group: item.group, lang: item.lang, accept: item.accept, status,
    ok: item.accept.includes(status), decisive: ["CURRENT", "CONTRADICTED", "SUPERSEDED"].includes(status),
    confidence: claims.map(claim => claim.confidence_tier), method: claims.map(claim => claim.adjudication?.method),
    frame: claims.map(claim => claim.claim_frame?.frame), parts: claims.length, ms: result.ms,
    provider: first.semantic_assessment?.provider || null, semantic: first.semantic_assessment?.status || null,
    plan: (first.retrieval_diagnostics || []).find(d => d.stage === "MODEL_SEARCH_PLAN")?.status || null,
    plan_failure: (first.retrieval_diagnostics || []).find(d => d.stage === "MODEL_SEARCH_PLAN")?.failure || null,
    plan_provider: (first.retrieval_diagnostics || []).find(d => d.stage === "MODEL_SEARCH_PLAN")?.provider || null,
    reason: first.abstention_diagnosis?.primary_reason || null,
    model: first.semantic_assessment?.model || null,
    fallback: first.semantic_assessment?.fallback_reason || null,
    failure: first.semantic_assessment?.failure_code ? `${first.semantic_assessment.failure_code}:${first.semantic_assessment.failure_details?.http_status || ""}:${first.semantic_assessment.failure_details?.safe_message || ""}` : null,
    attempts: first.semantic_assessment?.attempts ?? null,
    excluded: (first.adjudication?.adjudication_signals?.source_trace || []).filter(s => !s.eligible && (s.relation === "SUPPORTS" || s.relation === "CONTRADICTS")).map(s => `${s.registrable_domain}:${(s.exclusion_reasons || []).join("+")}:${s.scope_match || "-"}:${s.authority_role || "-"}`).slice(0, 6),
    temporal: (first.semantic_assessment?.source_assessments || []).filter(a => a.temporal_role && a.temporal_role !== "UNKNOWN").map(a => `${a.source_index}:${a.temporal_role}:${a.change_type}`).slice(0, 6),
    stages: first.execution?.stages || null,
    consensus: first.adjudication?.adjudication_signals?.consensus_trace || null,
    origins: (first.sources || []).map((source, index) => `${index}:${source.evidence_origin || "-"}:${source.relevance_assessment?.relevance || "-"}`).slice(0, 6),
    directness: (first.semantic_assessment?.source_assessments || []).map(a => `${a.source_index}:${a.directness}`).slice(0, 6),
    risk: first.semantic_assessment?.claim_assessment?.claim_risk || null,
    relations: (first.semantic_assessment?.assessments || []).map(a => `${a.source_index}:${a.relation}`).slice(0, 6),
    defaulted: (first.semantic_assessment?.source_assessments || []).filter(a => a.defaulted).length,
    parse: first.semantic_assessment?.parse_telemetry || null,
    timings: first.timings || null,
    correction_stage: (first.retrieval_diagnostics || []).filter(d => ["CORRECTION_CANDIDATE_REVIEW", "IN_ASSESSMENT_CORRECTION"].includes(d.stage)).map(d => `${d.status}:${d.model || "-"}:${d.reason || "-"}`),
    correction: first.correction ? `${first.correction.status}:${first.correction.basis || "-"}:${String(first.correction.text || "").slice(0, 120)}` : null,
    searches_detail: (first.retrieval_diagnostics || []).filter(d => /MODEL_SEARCH_PLAN_QUERY|RESEARCH_PLAN/.test(d.stage || "")).map(d => `${d.purpose}:${d.status}`).slice(0, 8),
    eligible: (first.adjudication?.adjudication_signals?.source_trace || []).filter(s => s.eligible || s.relation === "SUPPORTS" || s.relation === "CONTRADICTS").map(s => `${s.registrable_domain}:${s.relation}:${s.reliability}${s.eligible ? "" : ":x"}`).slice(0, 6),
    searches: (first.retrieval_diagnostics || []).filter(d => d.stage && /SEARCH|RESEARCH_PLAN|MODEL_SEARCH_PLAN_QUERY|INDEPENDENT_DOMAIN/.test(d.stage) && d.provider === "TAVILY").length
  };
  rows.push(row);
  console.log("DEVCASE " + JSON.stringify(row));
  if (process.env.DEV_RAW) {
    for (const [index, claim] of claims.entries()) {
      console.log("DEVRAW " + JSON.stringify({
        id: item.id, part: index, claim: claim.claim || claim.text, status: claim.status, confidence: claim.confidence_tier,
        method: claim.adjudication?.method, reason: claim.abstention_diagnosis?.primary_reason || null,
        correction: claim.correction || null,
        claim_assessment: claim.semantic_assessment?.claim_assessment || null,
        assessments: (claim.semantic_assessment?.assessments || []).map(a => ({ i: a.source_index, rel: a.relation, method: a.method || null, model_rel: a.model_relation || null, why: String(a.rationale || "").slice(0, 220) })),
        sources: (claim.sources || []).map((s, i) => ({ i, url: s.url, rel: s.source_reliability, basis: s.reliability_basis || null, date: s.published_date || s.evidence_date || null, title: String(s.title || "").slice(0, 120), snippet: String(s.snippet || "").slice(0, 420) })),
        trace: (claim.adjudication?.adjudication_signals?.source_trace || []).map(t => `${t.registrable_domain}:${t.relation}:${t.reliability}:${t.eligible ? "ok" : (t.exclusion_reasons || []).join("+")}`),
        consensus: claim.adjudication?.adjudication_signals?.consensus_trace || null,
        searches: (claim.retrieval_diagnostics || []).filter(d => d.provider === "TAVILY" || /PLAN|SEARCH/.test(d.stage || "")).map(d => `${d.stage}:${d.purpose || "-"}:${d.status}:${String(d.query || "").slice(0, 90)}`).slice(0, 14),
        plan_domains: (claim.retrieval_diagnostics || []).find(d => d.stage === "MODEL_SEARCH_PLAN")?.authority_domains || null
      }));
    }
  }
  await sleep(4500);
}

const extraction = [];
if (!only) {
  for (const item of data.long_texts) {
    const result = await post("/api/extract", { text: item.text });
    const row = { id: item.id, status: result.status, method: result.body?.method, claims: (result.body?.claims || []).map(c => `${c.kind}: ${c.claim}`), ok: (result.body?.claims || []).length >= item.expect_min_claims, diagnostics: result.body?.diagnostics || null, ms: result.ms };
    extraction.push(row);
    console.log("DEVEXTRACT " + JSON.stringify(row));
    await sleep(4500);
  }
}

const n = rows.length;
const factual = rows.filter(r => !["opinion", "forecast"].includes(r.group));
const metrics = {
  cases: n,
  agreement_rate: +(rows.filter(r => r.ok).length / n).toFixed(3),
  decisive_rate: +(rows.filter(r => r.decisive).length / n).toFixed(3),
  needs_review_rate: +(rows.filter(r => r.status === "NEEDS_REVIEW").length / n).toFixed(3),
  not_assessed_rate: +(rows.filter(r => r.status === "NOT_ASSESSED").length / n).toFixed(3),
  wrong_decisive: rows.filter(r => r.decisive && !r.ok).map(r => r.id),
  decisive_precision: rows.filter(r => r.decisive).length ? +(rows.filter(r => r.decisive && r.ok).length / rows.filter(r => r.decisive).length).toFixed(3) : null,
  factual_decisive_rate: +(factual.filter(r => r.decisive).length / Math.max(1, factual.length)).toFixed(3),
  arabic_decisive_rate: +(rows.filter(r => r.lang === "ar" && r.decisive).length / Math.max(1, rows.filter(r => r.lang === "ar").length)).toFixed(3),
  moderate_share_of_decisive: rows.filter(r => r.decisive).length ? +(rows.filter(r => r.decisive && r.confidence.includes("MODERATE")).length / rows.filter(r => r.decisive).length).toFixed(3) : null,
  mean_latency_ms: Math.round(rows.reduce((sum, r) => sum + (r.ms || 0), 0) / Math.max(1, n)),
  extraction_ok: extraction.filter(r => r.ok).length + "/" + extraction.length
};
console.log("DEVMETRICS " + JSON.stringify({ dataset: data.dataset_id, status: data.status, base: BASE_URL, metrics }));
