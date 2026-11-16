import test from "node:test";
import assert from "node:assert/strict";
import { reconcileStatus } from "../worker/execution-status.js";
import { classifyClaimFrame } from "../worker/claim-frame.js";

test("v0.2.91: opinion / open-forecast classification survives provider limits", () => {
  const limited = { status: "PROVIDER_LIMITED", stages: { search: "OK", semantic: "LIMITED" } };
  assert.equal(reconcileStatus("UNVERIFIABLE", limited, { method: "FUTURE_OUTCOME_NOT_VERIFIABLE" }), "UNVERIFIABLE");
  assert.equal(reconcileStatus("UNVERIFIABLE", limited, { method: "NOT_A_FACTUAL_CLAIM" }), "UNVERIFIABLE");
  // Any evidence-dependent outcome still fails closed.
  assert.equal(reconcileStatus("CURRENT", limited, { method: "INDEPENDENT_SOURCE_CONSENSUS" }), "NOT_ASSESSED");
  assert.equal(reconcileStatus("UNVERIFIABLE", limited, { method: "INSUFFICIENT_EVIDENCE" }), "NOT_ASSESSED");
});

test("v0.2.91: evaluative superlatives are non-factual; measured superlatives stay factual", () => {
  assert.equal(classifyClaimFrame("Python is the best programming language ever created.").frame, "NON_FACTUAL");
  assert.equal(classifyClaimFrame("Thriller is the best-selling album of all time.").frame, "STABLE_FACT");
  assert.equal(classifyClaimFrame("Avatar is the highest-grossing film of all time.").frame, "STABLE_FACT");
  assert.equal(classifyClaimFrame("The Eiffel Tower was completed in 1889.").frame, "TIME_ANCHORED_EVENT");
});
