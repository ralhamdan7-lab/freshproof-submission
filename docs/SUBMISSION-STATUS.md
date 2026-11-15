# FreshProof — Public Submission Status

Updated: 2026-11-15

## Public release
- Repository: this public submission repository.
- Current deployed release: `0.2.77` (0.2.81 parity candidate is under review; not deployed).
- Release commit: `1eebb41c5699ae416ce990f168852593d0500d2f`.
- Latest public main release commit: `31dfc83516faae9fdb86611792ebdb601239e4e4` (PR #9).
- Cloudflare Worker: `freshproof-submission-demo`.
- Public demo: `https://freshproof-submission-demo.ralhamdan7.workers.dev`.

## Implemented in the public source
- Claim extraction and temporal assessment
- Bounded evidence retrieval and source diversity
- Evidence adjudication and conservative abstention
- Explanation and evidence-gated correction
- English/Arabic browser UI
- Standalone embedded-asset fallback for an independent Worker deployment
- Regression tests and synthetic temporal smoke benchmark
- Public documentation sanitized to remove private operational history

## Verified on release 0.2.77
- Main-branch verification workflow #43706073119: **327/327 tests passed in UTC and 327/327 in Asia/Riyadh**, with 0 failures. Worker/adjudication/adapter/browser syntax checks and temporal smoke benchmark passed.
- Deterministic local browser acceptance passed on the same main commit.
- Cloudflare Workers Build for main commit `59cc4414384910a69569dd7d14b6b63a58ce10ad` completed with `build_outcome: success`; `npx wrangler deploy` succeeded. The deployed script ETag is unchanged from the verified 0.2.77 code release.
- Post-deploy live API acceptance workflow #43705319250 waited for public health version `0.2.77`, then sent one bounded `POST /api/verify` request. HTTP 200; exactly one claim processed.
- Live test proposition: `Node.js 20.x remains actively supported under LTS.` Result: `SUPERSEDED`, domain adapter `software_release`. Official Node.js release table evidence reports support status `EOL`, row last-updated `2026-03-24`, and latest LTS major `26`.
- Six evidence records were returned, including official Node.js first-party records. Two Tavily search calls were used (request-wide search budget 2/5). Freshness was `FRESH`; Evidence Confidence was `LIMITED`; secondary publishers were `UNASSESSED`.
- **Deployed public browser acceptance passed** in workflow #43706073070 against the actual public URL. Playwright opened the page, confirmed the title and claim controls, submitted the same bounded claim through the browser UI, and observed `OUTDATED`. Six evidence links rendered, including two official `nodejs.org` links; browser runtime errors: 0.
- This is one specialized software-lifecycle scenario. It is not a general accuracy evaluation, proof of calibrated confidence, or evidence that all domains meet the same standard.
- Read-only Cloudflare inspection confirmed `API_RATE_LIMITER` at 3 requests / 60 seconds, `AI` binding present, `ENABLE_SEMANTIC_TRIAGE=true`, `ENABLE_CORRECTION_CANDIDATE_REVIEW=false`, and server-side `TAVILY_API_KEY` binding present. Secret value was not accessed.
- Static scan of changed PR patches found no common Tavily/GitHub/OpenAI/Cloudflare token patterns, private project names, private staging hostname, or internal Cloudflare account identifier. This was a diff-scoped scan, not a full-repository third-party secret-scanner report.

## Guardrails in release 0.2.77
- Public documentation matches the deployed limits: 3 processed claims per request and 3 requests per 60 seconds per client IP/edge location (approximate per-edge rate limiting).
- English Node.js release-table dates are parsed as validated UTC calendar dates, avoiding local-time day shifts.
- Tavily credentials are sent only in the `Authorization: Bearer` header, never in the JSON request body.
- Semantic triage remains advisory; optional model-assisted correction candidate review is disabled.
- No application database or durable user-submission storage is configured.

## Remaining validation and submission work
- Audited held-out real-world evaluation is still required before publishing precision, recall, false-positive rate, citation correctness, abstention rate, latency, or cost-per-claim metrics.
- The live browser/API acceptance above covers one Node.js software-lifecycle scenario only. Broader claim types, Arabic claims, conflicting evidence, insufficient evidence, and generic supersession need audited evaluation.
- Official hackathon portal submission and its receipt are not verified; repository publication is not submission confirmation.

## Status
Release `0.2.77` is **DEPLOYED**. Its public evidence-search API and actual public browser flow are **LIVE-ACCEPTANCE VERIFIED** for the bounded Node.js scenario above. The product is not yet generally accuracy-validated or officially submitted.


## v0.2.81 public parity and deployment verification — 2026-11-15
- PR #9 merged: [universal verification architecture parity](https://github.com/ralhamdan7-lab/freshproof-submission/pull/9).
- Main CI [#43711250834](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250834): **321/321 tests passed in UTC and 321/321 in Asia/Riyadh**; Worker/adjudication/adapter/browser syntax and temporal smoke diagnostic passed.
- Deterministic browser acceptance [#43711250836](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250836): PASS. The deployed live-browser step was skipped; no deployed browser result is claimed for 0.2.81.
- Public live deployment/API acceptance [#43711250878](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250878): exact public Worker health version **0.2.81** verified; one bounded POST /api/verify request returned HTTP 200 and processed one claim.
- Test claim: Node.js 20.x remains actively supported under LTS. Actual result: **SUPERSEDED**, software_release adapter, official Node.js release table reports EOL; six evidence records, two Tavily searches. Freshness was FRESH and Evidence Confidence LIMITED. This is one specialist scenario, not a general accuracy result.
- Public diff-scoped scan found no common credential patterns, private Staging hostname, or other-project names in PR #9 changes.
- No paid fallback, billing/PAYG activation, or secret change.
