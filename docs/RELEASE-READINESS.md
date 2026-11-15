# Public Release Readiness — FreshProof v0.2.77

## Scope
This document describes only the public submission candidate in this repository. Private development infrastructure, account identifiers, internal CI links, and private deployment endpoints are intentionally excluded.

## Release candidate
- Version: 0.2.76
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
7. Bounded live retrieval is tested only after the free provider quota and secret binding are verified.

## Current limitations
- No general accuracy metrics are claimed without an audited held-out evaluation.
- Semantic model output is advisory, not a truth verdict.
- Retrieval quality depends on external provider availability and free quota.
- The public demo is not considered deployed until its independent URL and version are verified.

## Release decision
A green CI run is necessary but not sufficient. Do not label the release deployed, demo-ready, or submitted until the corresponding live checks and owner submission are confirmed.
