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
- Deployed Worker configuration read-only check confirmed `API_RATE_LIMITER` limit 3 / period 60 seconds, `AI` binding present, `ENABLE_SEMANTIC_TRIAGE=true`, `ENABLE_CORRECTION_CANDIDATE_REVIEW=false`, and server-side `TAVILY_API_KEY` secret binding present (secret value was not read).
- Live public `POST /api/verify` acceptance passed against deployed baseline `0.2.76` (GitHub Actions run #43704887636; provenance capture repeat #43705018545). One bounded claim request returned HTTP 200, one processed claim, `SUPERSEDED`, and six evidence records. The Node.js adapter bound the result to the official Node.js previous-releases table: support status `EOL`, row last-updated `2026-03-24`, latest LTS major `26`. Tavily search budget used 2 of 5; the direct official Node.js page and the official release schedule retrieval succeeded. `Evidence Confidence` was `LIMITED`; secondary sources were `UNASSESSED`. This is a single domain-adapter acceptance case, not a general accuracy evaluation.
- Browser acceptance remains deterministic and isolated (local UI + fixture); full browser acceptance against the deployed public URL remains outstanding.

## Guardrails, timezone and credential-transport fixes in this PR
- Correct public documentation to match the deployed `API_RATE_LIMITER` configuration: 3 requests per 60 seconds per client IP per edge location; this is approximate, not a global quota.
- Parse English Node.js release-table calendar dates with `Date.UTC` and validate the calendar components, avoiding local-time day shifts.
- Send the Tavily key only in `Authorization: Bearer ...`; never include it in the JSON body.
- Keep semantic triage enabled for the public evidence-adjudication path.
- Disable optional model-assisted correction candidate review to reduce inference consumption.
- Align security documentation with the actual configuration and its limitations.

## Remaining acceptance gates
- The deployed public Worker configuration has now been inspected read-only: `API_RATE_LIMITER` is present with 3 requests / 60 seconds; `AI` binding is present; semantic triage is `true`; optional correction-candidate review is `false`; and the Tavily secret binding exists (secret value not accessed). This confirms configuration presence, not live API enforcement or provider availability.
- Regression suite and deterministic isolated browser acceptance have passed on the current PR head; rerun if the head changes.
- Cloudflare Workers Builds linkage is now verified: the public demo Worker is connected to this GitHub repository, watches `main`, and runs `npx wrangler deploy` from `/`. Merging this PR to `main` will trigger an external public deployment. Treat merge as a production release action, not a documentation-only operation.
- The bounded live test ran under the project's zero-cost guardrails; no paid fallback or upgrade path was invoked.
- The live baseline test above passed; after merge, the live-acceptance workflow waits for public Worker version `0.2.77` and repeats one bounded evidence request. This post-deploy check is the final release gate.
- Official hackathon portal submission must be completed by the project owner; repository publication is not submission confirmation.

## Status
The public demo health endpoint and baseline evidence-search API have been verified. Candidate `0.2.77` is still not deployed; its post-merge live acceptance remains pending. Full deployed-URL browser acceptance, audited real-world accuracy metrics, and official hackathon portal submission remain unverified. Do not describe the product as fully end-to-end verified or officially submitted until those gates pass.
