# Public Release Readiness — FreshProof v0.2.77

## Scope
This document describes only the public submission candidate in this repository. Private development infrastructure, account identifiers, internal CI links, and private deployment endpoints are intentionally excluded.

## Release
- Deployed version: `0.2.77`
- Release commit: `1eebb41c5699ae416ce990f168852593d0500d2f`
- Cloudflare Worker: `freshproof-submission-demo`
- Deployed Worker version ID: `41ea7111-2c5c-45cf-a914-207ac1c95689`
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

## Release-gate results
1. Node regression suite: **PASS**, 327/327 in UTC and 327/327 in Asia/Riyadh (main workflow #43705319290).
2. Worker and browser JavaScript syntax checks: **PASS**.
3. Temporal smoke benchmark: **PASS** (engineering diagnostic only).
4. Deterministic browser acceptance against an isolated local Worker: **PASS** (workflow #43705319266); this does not establish full public-URL browser acceptance.
5. Static scan of changed PR patches: no common provider/API token patterns or known private-project references found. This was scoped to changed PR patches, not a full-repository third-party secret scan.
6. Public health/version gate: **PASS**; post-deploy workflow observed version `0.2.77`.
7. Deployed Worker configuration inspection: **PASS** for the 3/60-second rate limiter, AI binding, semantic triage flag, disabled correction-candidate review, and server-side provider secret binding. Secret value was not read.
8. Bounded live evidence retrieval: **PASS** on deployed `0.2.77` (workflow #43705319250): one claim, HTTP 200, `SUPERSEDED`, six evidence records, two Tavily search calls, and official Node.js lifecycle evidence. Evidence Confidence was `LIMITED`; this is a specialized domain-adapter smoke case, not a general accuracy metric.
9. Cloudflare Workers Builds: **PASS**. The verified `main` push triggered `npx wrangler deploy`; Cloudflare recorded successful build completion and deployed Worker version `41ea7111-2c5c-45cf-a914-207ac1c95689`.

## Current limitations
- No general accuracy metrics are claimed without an audited held-out evaluation.
- The live acceptance covers one software-release lifecycle scenario only; do not generalize its result to arbitrary domains.
- Semantic model output is advisory, not a truth verdict.
- The local browser acceptance is not equivalent to full browser acceptance against the deployed public URL.
- Official hackathon portal submission has not been confirmed.

## Release decision
**DEPLOYED — LIVE API ACCEPTANCE PASSED.** Version `0.2.77` is deployed and the bounded live evidence-search path passed on that exact version. Full deployed-URL browser acceptance, audited real-world accuracy evaluation, and official hackathon submission remain pending.
