import assert from "node:assert/strict";

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Enforce that the deployed Worker and repository candidate use the same release.
 * package.json is the single source of truth; no evaluator should pin a historical version.
 */
export function assertRuntimeVersion(packageVersion, runtimeVersion, context = "Runtime preflight") {
  assert.equal(typeof packageVersion, "string", `${context}: package version is missing`);
  assert.match(packageVersion, SEMVER, `${context}: package.json version is not valid SemVer`);
  assert.equal(typeof runtimeVersion, "string", `${context}: deployed Worker version is missing`);
  assert.match(runtimeVersion, SEMVER, `${context}: deployed Worker version is not valid SemVer`);
  assert.equal(
    runtimeVersion,
    packageVersion,
    `${context}: deployed Worker version ${runtimeVersion} does not match package.json version ${packageVersion}. Deploy the exact candidate commit before running live evaluation.`
  );
  return true;
}
