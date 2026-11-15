// FreshProof v0.2.84 — execution status, kept separate from the factual verdict.
//
// A factual status (CURRENT, SUPERSEDED, CONTRADICTED, NEEDS_REVIEW,
// UNVERIFIABLE) describes the proposition. Execution status describes whether
// FreshProof actually ran the evidence process. A runtime exception, a search
// provider outage or an exhausted model allocation must never surface as a
// statement about the claim; such claims are NOT_ASSESSED.

const SEARCH_OK = new Set(["RESULTS_FOUND", "NO_RESULTS"]);
const SEARCH_FAILED = new Set(["RATE_LIMITED", "UPSTREAM_REJECTED", "UPSTREAM_FAILED", "CIRCUIT_OPEN", "NOT_CONFIGURED"]);
const SEARCH_LIMITED = new Set(["REQUEST_SEARCH_LIMIT_REACHED", "QUERY_BUDGET_LIMITED"]);
const DECISIVE = new Set(["CURRENT", "SUPERSEDED", "CONTRADICTED"]);

function searchStage(diagnostics) {
  // Only actual provider calls (stage SEARCH) count; fallback/strategy records
  // are summaries of those calls, not additional evidence of success.
  const searches = diagnostics.filter(item => item?.stage === "SEARCH");
  const statuses = searches.map(item => item.status);
  if (statuses.some(status => SEARCH_OK.has(status) || status === "RESULTS_FOUND")) {
    return statuses.some(status => SEARCH_FAILED.has(status) || SEARCH_LIMITED.has(status)) ? "PARTIAL" : "OK";
  }
  if (statuses.some(status => SEARCH_FAILED.has(status))) return "FAILED";
  if (statuses.some(status => SEARCH_LIMITED.has(status))) return "LIMITED";
  return statuses.length ? "OK" : "NOT_RUN";
}

function semanticStage(semanticAssessment, sourceCount) {
  const status = semanticAssessment?.status;
  if (!sourceCount) return "NOT_RUN";
  if (status === "COMPLETED_ADVISORY") return "OK";
  if (status === "DISABLED_BY_PROVIDER_QUOTA") return "LIMITED";
  if (status === "FAILED_CLOSED") return semanticAssessment?.failure_code === "PROVIDER_LIMIT_OR_QUOTA" ? "LIMITED" : "FAILED";
  if (status === "DISABLED_BY_DEFAULT" || status === "DISABLED_BY_CONFIGURATION" || status === "NOT_CONFIGURED") return "DISABLED";
  return status ? "OK" : "NOT_RUN";
}

function fetchStage(diagnostics) {
  // Only real page attempts count; "no fetchable candidate" is not a failure.
  const fetches = diagnostics.filter(item => item?.stage === "GENERIC_PAGE_FETCH" && item.status !== "NO_FETCHABLE_CANDIDATE" && !/BUDGET/.test(String(item.status || "")));
  if (!fetches.length) return "NOT_RUN";
  const ok = fetches.filter(item => item.status === "CLAIM_PASSAGES_EXTRACTED" || item.status === "NO_CLAIM_RELEVANT_PASSAGE").length;
  if (ok === fetches.length) return "OK";
  return ok ? "PARTIAL" : "FAILED";
}

/**
 * @returns {{status: "COMPLETED"|"PARTIAL"|"FAILED"|"PROVIDER_LIMITED", stages: object, failures: object[]}}
 */
export function deriveExecution({ retrievalDiagnostics = [], semanticAssessment = null, sourceCount = 0, exception = null } = {}) {
  const diagnostics = Array.isArray(retrievalDiagnostics) ? retrievalDiagnostics : [];
  if (exception) {
    return { status: "FAILED", stages: { search: "UNKNOWN", fetch: "UNKNOWN", semantic: "UNKNOWN" }, failures: [{ stage: "PIPELINE", code: "INTERNAL_EXCEPTION", retryable: true }] };
  }
  const stages = { search: searchStage(diagnostics), fetch: fetchStage(diagnostics), semantic: semanticStage(semanticAssessment, sourceCount) };
  const failures = [];
  if (stages.search === "FAILED") failures.push({ stage: "SEARCH", code: "SEARCH_PROVIDER_UNAVAILABLE", retryable: true });
  if (stages.search === "LIMITED") failures.push({ stage: "SEARCH", code: "REQUEST_SEARCH_BUDGET_EXHAUSTED", retryable: true });
  if (stages.semantic === "LIMITED") failures.push({ stage: "SEMANTIC", code: "MODEL_ALLOCATION_EXHAUSTED", retryable: true });
  if (stages.semantic === "FAILED") failures.push({ stage: "SEMANTIC", code: "MODEL_CALL_FAILED", retryable: true });
  if (stages.fetch === "FAILED") failures.push({ stage: "FETCH", code: "NO_PAGE_ACQUIRED", retryable: false });

  let status = "COMPLETED";
  if ((stages.search === "FAILED" || stages.search === "LIMITED") && sourceCount === 0) status = "PROVIDER_LIMITED";
  else if ((stages.semantic === "LIMITED" || stages.semantic === "FAILED") && sourceCount > 0) status = "PROVIDER_LIMITED";
  else if (stages.search === "PARTIAL" || stages.fetch === "FAILED" || stages.fetch === "PARTIAL" || stages.semantic === "DISABLED") status = "PARTIAL";
  return { status, stages, failures };
}

/**
 * Combine the adjudicated factual status with execution state.
 * - FAILED / PROVIDER_LIMITED: NOT_ASSESSED, unless a decisive verdict was
 *   reached by a deterministic specialist path that did not need the failed
 *   stage (the adjudication method says so).
 * - UNVERIFIABLE requires a search stage that actually completed.
 */
export function reconcileStatus(adjudicatedStatus, execution, adjudication = null) {
  const method = String(adjudication?.method || "");
  const deterministicDecisive = DECISIVE.has(adjudicatedStatus) && /DOMAIN|ADAPTER|SPECIALIST/.test(method);
  if (execution?.status === "FAILED") return "NOT_ASSESSED";
  if (execution?.status === "PROVIDER_LIMITED" && !deterministicDecisive) return "NOT_ASSESSED";
  if (adjudicatedStatus === "UNVERIFIABLE" && execution?.stages?.search !== "OK") return "NOT_ASSESSED";
  return adjudicatedStatus;
}

export const EXECUTION_STATUSES = Object.freeze(["COMPLETED", "PARTIAL", "FAILED", "PROVIDER_LIMITED"]);
