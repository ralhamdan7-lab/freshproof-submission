// v0.2.84 — execution status is separate from the factual verdict.
import test from "node:test";
import assert from "node:assert/strict";
import { deriveExecution, reconcileStatus } from "../worker/execution-status.js";

const search = status => ({ provider: "TAVILY", stage: "SEARCH", status });

test("an internal exception is FAILED and never a factual status", () => {
  const execution = deriveExecution({ exception: true });
  assert.equal(execution.status, "FAILED");
  assert.equal(reconcileStatus("UNVERIFIABLE", execution), "NOT_ASSESSED");
  assert.equal(reconcileStatus("CURRENT", execution), "NOT_ASSESSED");
});

test("search outage with no evidence is PROVIDER_LIMITED -> NOT_ASSESSED, not UNVERIFIABLE", () => {
  for (const status of ["RATE_LIMITED", "UPSTREAM_FAILED", "UPSTREAM_REJECTED", "CIRCUIT_OPEN"]) {
    const execution = deriveExecution({ retrievalDiagnostics: [search(status)], sourceCount: 0 });
    assert.equal(execution.status, "PROVIDER_LIMITED", status);
    assert.equal(reconcileStatus("UNVERIFIABLE", execution), "NOT_ASSESSED", status);
  }
});

test("a request-local search budget exhaustion with no evidence is also not a finding", () => {
  const execution = deriveExecution({ retrievalDiagnostics: [search("REQUEST_SEARCH_LIMIT_REACHED")], sourceCount: 0 });
  assert.equal(execution.stages.search, "LIMITED");
  assert.equal(reconcileStatus("UNVERIFIABLE", execution), "NOT_ASSESSED");
});

test("UNVERIFIABLE is kept only when searches completed and found nothing", () => {
  const execution = deriveExecution({ retrievalDiagnostics: [search("NO_RESULTS"), search("NO_RESULTS")], sourceCount: 0 });
  assert.equal(execution.status, "COMPLETED");
  assert.equal(reconcileStatus("UNVERIFIABLE", execution), "UNVERIFIABLE");
});

test("exhausted model allocation with acquired evidence is PROVIDER_LIMITED", () => {
  const execution = deriveExecution({ retrievalDiagnostics: [search("RESULTS_FOUND")], semanticAssessment: { status: "FAILED_CLOSED", failure_code: "PROVIDER_LIMIT_OR_QUOTA" }, sourceCount: 3 });
  assert.equal(execution.status, "PROVIDER_LIMITED");
  assert.equal(execution.stages.semantic, "LIMITED");
  assert.equal(reconcileStatus("NEEDS_REVIEW", execution), "NOT_ASSESSED");
});

test("a deterministic specialist verdict that did not need the model survives a model outage", () => {
  const execution = deriveExecution({ retrievalDiagnostics: [search("RESULTS_FOUND")], semanticAssessment: { status: "DISABLED_BY_PROVIDER_QUOTA" }, sourceCount: 2 });
  assert.equal(reconcileStatus("SUPERSEDED", execution, { method: "DOMAIN_SPECIFIC_RULE" }), "SUPERSEDED");
  assert.equal(reconcileStatus("CURRENT", execution, { method: "CONSERVATIVE_EVIDENCE_ADJUDICATION" }), "NOT_ASSESSED");
});

test("semantic disabled by configuration is PARTIAL and keeps the gate's abstention", () => {
  const execution = deriveExecution({ retrievalDiagnostics: [search("RESULTS_FOUND")], semanticAssessment: { status: "DISABLED_BY_CONFIGURATION" }, sourceCount: 2 });
  assert.equal(execution.status, "PARTIAL");
  assert.equal(reconcileStatus("NEEDS_REVIEW", execution), "NEEDS_REVIEW");
});

test("summary fallback records and 'no fetchable candidate' do not distort execution state", () => {
  const execution = deriveExecution({ retrievalDiagnostics: [search("RESULTS_FOUND"), { stage: "INDEPENDENT_DOMAIN_FALLBACK", status: "NO_RESULTS" }, { stage: "GENERIC_PAGE_FETCH", status: "NO_FETCHABLE_CANDIDATE" }], semanticAssessment: { status: "COMPLETED_ADVISORY" }, sourceCount: 2 });
  assert.equal(execution.status, "COMPLETED");
  assert.equal(execution.stages.fetch, "NOT_RUN");
});
