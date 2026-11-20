# Public Verification Log — FreshProof v0.2.76

> **Historical record.** This document describes FreshProof as of v0.2.76. The current release is **v0.3.21** (560 tests). For the current state see the [README](../README.md) and the [release history](RELEASES.md).

This log records only public release evidence. It contains no credentials or personal data.

## 2026-11-15 — Public candidate preparation
- Ported the general-purpose temporal verification engine modules into the public release branch.
- Excluded the private Groq provider adapter and private runtime configuration.
- Updated public package/runtime version to 0.2.76.
- Updated browser application assets from the current reviewed product line.
- Replaced the public live-smoke workflow with a health-only check that does not submit evidence-search requests.
- Reworked browser acceptance to run against an isolated local Worker with a deterministic API fixture; it does not call external evidence providers or consume provider quota.

## Validation evidence
- Exact-commit GitHub Actions runs are recorded in the repository's Actions page.
- A passing Node test suite, syntax checks, and temporal smoke benchmark are required before release.
- Browser acceptance must pass on the same candidate commit.
- Live public demo and live evidence retrieval remain separate gates.

## Evidence policy
- Synthetic benchmark results are not general accuracy claims.
- A successful health check does not prove that live evidence retrieval works.
- No provider quota, live latency, or cost-per-claim claim is made without direct measurement.


## Public v0.2.81 release verification — 2026-11-15

- Public PR #9 merged as `31dfc83516faae9fdb86611792ebdb601239e4e4`.
- CI [#43711250834](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250834): 321/321 PASS in UTC and 321/321 PASS in Asia/Riyadh; syntax and synthetic temporal diagnostic passed.
- Deterministic browser acceptance [#43711250836](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250836): PASS; deployed live-browser step skipped.
- Public live deployment/API acceptance [#43711250878](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250878): exact Worker version 0.2.81 verified; one bounded live request HTTP 200, one claim processed, result SUPERSEDED for Node.js 20.x continuing LTS support, official Node.js release-table evidence, six sources, two search calls.
- This is one specialist integration case; no broad accuracy/generalization claim is made. No paid services, billing/PAYG, or secret changes.
