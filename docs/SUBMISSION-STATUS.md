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
- Public candidate head `d2a0d92ad1bdf0e3a96764c75b3686a23d8b1ab2`: **327/327 tests passed in UTC and 327/327 in Asia/Riyadh** (workflow run #43701704267). Added regression coverage for leap-day acceptance, preservation of `Aug 08, 2023` as `2023-08-08`, and rejection of impossible dates such as `Feb 30, 2024`. Worker/adjudication/adapter/browser syntax checks and temporal smoke benchmark passed in both jobs. The same head passed deterministic isolated browser acceptance (run #43701704209); this is fixture-based, not a live deployed-URL test.
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
- Regression suite and deterministic isolated browser acceptance have passed on the current PR head; rerun if the head changes.
- Confirm whether merging to public `main` triggers an external Cloudflare Workers Build; do not merge or redeploy until the public release/security gate is explicitly cleared.
- Perform a safe live smoke request against public `POST /api/verify` and record the actual result; do not infer it from health status.
- Confirm free provider quota and billing controls before live evidence-search demonstrations.
- Official hackathon portal submission must be completed by the project owner; repository publication is not submission confirmation.

## Status
The public demo URL and health endpoint have been verified previously. The public evidence-search API and full deployed browser acceptance are **not yet verified**. Do not describe the product as fully end-to-end verified or officially submitted until those gates pass.
