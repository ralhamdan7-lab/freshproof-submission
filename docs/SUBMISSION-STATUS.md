# FreshProof — Public Submission Status

Updated: 2026-11-15

## Public candidate
- Repository: this public submission repository.
- Main remains at 0.2.76; proposed public candidate is 0.2.77 with timezone-safe date parsing and Tavily Bearer authentication.
- Public source baseline: `b8b525a5977d1a082b053ab057c9a04f28ea812c`; this PR adds release guardrails and documentation corrections.
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

## Verified on the public source baseline
- Node regression suite: **325 passed, 0 failed** on the latest main baseline (run #43676443268). The UTC/Asia-Riyadh matrix in PR #7 reproduced a one-day shift for the Node.js release-table date `Aug 08, 2023` under Asia/Riyadh; the PR branch replaces local-time parsing with validated UTC calendar parsing. It also moves the Tavily key to the Authorization Bearer header and removes it from the JSON body. Both matrix jobs passed 325/325 on the pre-auth-hardening head; final CI for the current 0.2.77 head is pending.
- Synthetic temporal smoke benchmark passed; it is an engineering diagnostic, not a real-world accuracy evaluation.
- Public Worker health endpoint previously returned `ok: true`, service `FreshProof`, version `0.2.76`, mode `evidence-triage`.
- Public `POST /api/verify` evidence-search path has not yet passed a live end-to-end request test.
- Full browser acceptance against the deployed public URL remains outstanding.

## Guardrails, timezone and credential-transport fixes in this PR
- Correct public documentation to match the deployed `API_RATE_LIMITER` configuration: 3 requests per 60 seconds per client IP per edge location; this is approximate, not a global quota.
- Parse English Node.js release-table calendar dates with `Date.UTC` and validate the calendar components, avoiding local-time day shifts.
- Send the Tavily key only in `Authorization: Bearer ...`; never include it in the JSON body.
- Keep semantic triage enabled for the public evidence-adjudication path.
- Disable optional model-assisted correction candidate review to reduce inference consumption.
- Align security documentation with the actual configuration and its limitations.

## Remaining acceptance gates
- The rate-limit binding must be verified in the deployed Worker; a binding/configuration error fails verification requests closed with HTTP 503.
- Re-run the complete regression suite and browser acceptance on the final PR head.
- Confirm whether merging to public `main` triggers an external Cloudflare Workers Build; do not merge or redeploy until the public release/security gate is explicitly cleared.
- Perform a safe live smoke request against public `POST /api/verify` and record the actual result; do not infer it from health status.
- Confirm free provider quota and billing controls before live evidence-search demonstrations.
- Official hackathon portal submission must be completed by the project owner; repository publication is not submission confirmation.

## Status
The public demo URL and health endpoint have been verified previously. The public evidence-search API and full deployed browser acceptance are **not yet verified**. Do not describe the product as fully end-to-end verified or officially submitted until those gates pass.
