import test from "node:test";
import assert from "node:assert/strict";
import { assertRuntimeVersion } from "../scripts/lib/version-contract.mjs";

test("version contract accepts the package version deployed to Staging", () => {
  assert.equal(assertRuntimeVersion("0.2.75", "0.2.75", "test preflight"), true);
});

test("version contract rejects stale Staging deployments with an actionable error", () => {
  assert.throws(
    () => assertRuntimeVersion("0.2.75", "0.2.70", "held-out preflight"),
    /does not match package.json version 0.2.75.*Deploy the exact candidate commit/
  );
});

test("version contract rejects missing or malformed version metadata", () => {
  assert.throws(() => assertRuntimeVersion(undefined, "0.2.75"), /package version is missing/);
  assert.throws(() => assertRuntimeVersion("0.2.75", undefined), /deployed Worker version is missing/);
  assert.throws(() => assertRuntimeVersion("v0.2.75", "0.2.75"), /not valid SemVer/);
});
