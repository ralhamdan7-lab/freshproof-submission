# FreshProof — Public Submission Status

Updated: 2026-11-15

## Public release
- Repository: this public submission repository.
- Current deployed release: `0.2.77`.
- Release commit: `1eebb41c5699ae416ce990f168852593d0500d2f`.
- Cloudflare Worker: `freshproof-submission-demo`.
- Deployed Worker version ID: `41ea7111-2c5c-45cf-a914-207ac1c95689`.
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
- Main-branch verification workflow #43705319290: **327/327 tests passed in UTC and 327/327 in Asia/Riyadh**, with 0 failures. Worker/adjudication/adapter/browser syntax checks and temporal smoke benchmark passed.
- Deterministic browser acceptance workflow #43705319266: PASS using a local static UI and deterministic API fixture. This is not a full browser test against the deployed public URL.
- Cloudflare Workers Build for release commit completed with `build_outcome: success`; `npx wrangler deploy` completed successfully and deployed Worker version `41ea7111-2c5c-45cf-a914-207ac1c95689`.
- Post-deploy live acceptance workflow #43705319250 waited until the public health endpoint reported version `0.2.77`, then sent one bounded `POST /api/verify` request. HTTP 200; exactly one claim processed.
- Live test proposition: `Node.js 20.x remains actively supported under LTS.` Result: `SUPERSEDED`, domain adapter `software_release`. Official Node.js release table evidence reports support status `EOL`, row last-updated `2026-03-24`, and latest LTS major `26`.
- Six evidence records were returned, including official Node.js first-party records. Two Tavily search calls were used (request-wide search budget 2/5). Freshness was `FRESH`; Evidence Confidence was `LIMITED`; secondary publishers were `UNASSESSED`.
- The live case validates one specialized software-lifecycle adapter path. It is not a general accuracy evaluation, proof of calibrated confidence, or evidence that all domains meet the same standard.
- Read-only Cloudflare inspection confirmed `API_RATE_LIMITER` at 3 requests / 60 seconds, `AI` binding present, `ENABLE_SEMANTIC_TRIAGE=true`, `ENABLE_CORRECTION_CANDIDATE_REVIEW=false`, and server-side `TAVILY_API_KEY` binding present. Secret value was not accessed.
- Static scan of changed PR patches found no common Tavily/GitHub/OpenAI/Cloudflare token patterns, private project names, private staging hostname, or internal Cloudflare account identifier. This was a diff-scoped scan, not a full-repository third-party secret-scanner report.

## Guardrails in release 0.2.77
- Public documentation matches the deployed limits: 3 processed claims per request and 3 requests per 60 seconds per client IP/edge location (approximate per-edge rate limiting).
- English Node.js release-table dates are parsed as validated UTC calendar dates, avoiding local-time day shifts.
- Tavily credentials are sent only in the `Authorization: Bearer` header, never in the JSON request body.
- Semantic triage remains advisory; optional model-assisted correction candidate review is disabled.
- No application database or durable user-submission storage is configured.

## Remaining validation and submission work
- Full browser acceptance against the deployed public URL remains outstanding; current browser automation uses deterministic local fixtures.
- Audited held-out real-world evaluation is still required before publishing precision, recall, false-positive, citation-correctness, abstention, latency, or cost metrics.
- Official hackathon portal submission and its receipt are not verified; repository publication is not submission confirmation.

## Status
Release `0.2.77` is **DEPLOYED** and its public evidence-search API is **LIVE-ACCEPTANCE VERIFIED** for the bounded scenario above. The product is not yet fully end-to-end browser-verified, generally accuracy-validated, or officially submitted.
