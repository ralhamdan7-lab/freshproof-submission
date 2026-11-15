# FreshProof — Public Submission Status

Updated: 2026-11-15

## Public candidate
- Repository: this public submission repository.
- Candidate version: 0.2.76 (source version; no application code change in this guardrail patch).
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
- Node regression suite: **324 passed, 0 failed in UTC**. A date-parsing test fails when the suite is run in a positive local timezone such as Asia/Riyadh; see the timezone-specific issue in the review record.
- Synthetic temporal smoke benchmark passed; it is an engineering diagnostic, not a real-world accuracy evaluation.
- Public Worker health endpoint previously returned `ok: true`, service `FreshProof`, version `0.2.76`, mode `evidence-triage`.
- Public `POST /api/verify` evidence-search path has not yet passed a live end-to-end request test.
- Full browser acceptance against the deployed public URL remains outstanding.

## Guardrails in this PR
- Bind the native Cloudflare rate limiter as `API_RATE_LIMITER` at 10 requests per 60 seconds per client IP per edge location; this is approximate, not a global quota.
- Keep semantic triage enabled for the public evidence-adjudication path.
- Disable optional model-assisted correction candidate review to reduce inference consumption.
- Align security documentation with the actual configuration and its limitations.

## Remaining acceptance gates
- The rate-limit binding must be verified in the deployed Worker; a binding/configuration error fails verification requests closed with HTTP 503.
- Re-run the complete regression suite and browser acceptance on the final PR head.
- Perform a safe live smoke request against public `POST /api/verify` and record the actual result; do not infer it from health status.
- Confirm free provider quota and billing controls before live evidence-search demonstrations.
- Official hackathon portal submission must be completed by the project owner; repository publication is not submission confirmation.

## Status
The public demo URL and health endpoint have been verified previously. The public evidence-search API and full deployed browser acceptance are **not yet verified**. Do not describe the product as fully end-to-end verified or officially submitted until those gates pass.
