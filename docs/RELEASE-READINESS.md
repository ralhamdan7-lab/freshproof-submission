# Public Release Readiness — FreshProof v0.2.77

## Scope
This document describes only the public submission candidate in this repository. Private development infrastructure, account identifiers, internal CI links, and private deployment endpoints are intentionally excluded.

## Release candidate
- Current deployed baseline: 0.2.76
- Proposed candidate: 0.2.77
- Runtime: Cloudflare Worker with static browser assets
- Evidence retrieval: Tavily, server-side only
- Optional semantic triage: Cloudflare Workers AI; advisory and fail-closed
- Groq integration: excluded from this public build
- Storage: no application database or durable user-submission storage

## Implemented
- Claim-level extraction and bounded processing
- Temporal query planning and historical-source diversity
- Separate event/publication/retrieval date handling
- Source relevance, evidence adjudication, and conservative abstention
- Structured explanation and evidence-gated correction
- English/Arabic UI with RTL/LTR handling
- Request, query, result, and direct-fetch limits

## Required release gates
1. Node regression tests pass on the exact release commit.
2. Worker and browser JavaScript syntax checks pass.
3. Temporal smoke benchmark passes.
4. Browser acceptance passes against an isolated local Worker with deterministic API fixtures.
5. Secret and private-resource scan passes.
6. Independent public demo deployment health check passes.
7. Deployed Worker configuration is checked for the required rate-limit binding, semantic triage flag, AI binding, and server-side provider secret binding; configuration inspection is not a substitute for live enforcement tests.
8. Bounded live retrieval has passed on deployed baseline `0.2.76` (run #43704887636; provenance repeat #43705018545): one claim, HTTP 200, `SUPERSEDED`, six evidence records, two Tavily search calls, and an official Node.js lifecycle source. Evidence confidence was `LIMITED`; this is a domain-adapter smoke case, not a general accuracy metric. The owner confirmed the 8,000-credit hackathon promotional grant; PAYGO and automatic upgrade/recharge are disabled.
9. Cloudflare Workers Builds linkage is verified: merging to `main` automatically invokes `npx wrangler deploy` for the public demo Worker. A post-merge GitHub Actions acceptance workflow waits for health version `0.2.77`, then performs one bounded live verification request. Merge is therefore a public release action; the post-deploy workflow must pass before calling the candidate verified.

## Current limitations
- No general accuracy metrics are claimed without an audited held-out evaluation.
- Semantic model output is advisory, not a truth verdict.
- Retrieval quality depends on external provider availability and free quota.
- The public demo is not considered deployed until its independent URL and version are verified.

## Release decision
Pre-merge CI, deterministic browser acceptance, configuration inspection, and live baseline evidence-search acceptance have passed. Candidate `0.2.77` is not yet deployed; its post-merge live acceptance and deployed-URL browser acceptance remain pending. A green CI run is necessary but not sufficient. Do not label the release deployed or submitted until the corresponding live checks and owner submission are confirmed.
