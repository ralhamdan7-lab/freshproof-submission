# Public Release Readiness — FreshProof v0.2.77

## Scope
This document describes only the public submission candidate in this repository. Private development infrastructure, account identifiers, internal CI links, and private deployment endpoints are intentionally excluded.

## Release
- Deployed version: `0.2.77`
- Release commit: `1eebb41c5699ae416ce990f168852593d0500d2f`
- Latest public workflow commit: `59cc4414384910a69569dd7d14b6b63a58ce10ad`
- Cloudflare Worker: `freshproof-submission-demo`
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
1. Node regression suite: **PASS**, 327/327 in UTC and 327/327 in Asia/Riyadh (workflow #43706073119).
2. Worker and browser JavaScript syntax checks: **PASS**.
3. Temporal smoke benchmark: **PASS** (engineering diagnostic only).
4. Deterministic browser acceptance against an isolated local Worker: **PASS**.
5. Static scan of changed PR patches: no common provider/API token patterns or known private-project references found. This was scoped to changed PR patches, not a full-repository third-party secret scan.
6. Public health/version gate: **PASS**; live workflows observed version `0.2.77`.
7. Deployed Worker configuration inspection: **PASS** for the 3/60-second rate limiter, AI binding, semantic triage flag, disabled correction-candidate review, and server-side provider secret binding. Secret value was not read.
8. Bounded live evidence retrieval: **PASS** on deployed `0.2.77` (workflow #43705319250): one claim, HTTP 200, `SUPERSEDED`, six evidence records, two Tavily search calls, and official Node.js lifecycle evidence. Evidence Confidence was `LIMITED`; this is a specialized domain-adapter smoke case, not a general accuracy metric.
9. Deployed public browser flow: **PASS** (workflow #43706073070). Playwright loaded the actual public page, submitted one claim, observed the rendered `OUTDATED` result, found six evidence links including two official Node.js links, and recorded zero browser runtime errors.
10. Cloudflare Workers Builds: **PASS**. The `main` push triggered `npx wrangler deploy`; Cloudflare recorded successful build completion and deployed the same verified 0.2.77 Worker source.

## Current limitations
- No general accuracy metrics are claimed without an audited held-out evaluation.
- The live acceptance covers one software-release lifecycle scenario only; do not generalize its result to arbitrary domains.
- Semantic model output is advisory, not a truth verdict.
- Arabic, conflicting-evidence, insufficient-evidence, and broad generic temporal cases still require audited live evaluation.
- Official hackathon portal submission has not been confirmed.

## Release decision
**DEPLOYED — LIVE API AND PUBLIC BROWSER ACCEPTANCE PASSED FOR ONE BOUNDED SCENARIO.** Version `0.2.77` is deployed and its actual public browser flow and evidence-search API passed the Node.js lifecycle acceptance. General real-world accuracy evaluation and official hackathon submission remain pending.
