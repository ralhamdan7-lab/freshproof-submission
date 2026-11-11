# Architecture — FreshProof v0.2.25 adapter refactor

## Core and extension boundary

The core is domain-agnostic. It owns:
1. Request validation, exact-origin CORS, rate limiting, and input bounds.
2. Claim candidate extraction and temporal triage.
3. Request-wide search and direct-fetch budgeting, provider invocation, and retrieval diagnostics.
4. Evidence normalization, source-profile signals, freshness metadata, and evidence comparison.
5. Conservative status selection, abstention, and API response shaping.

Domain-specific behavior is isolated in `worker/domain-adapters.js`. The adapter contract may provide:
- explicit claim/context matching and safe antecedent resolution;
- bounded primary search query and domain restrictions;
- optional fallback/additional searches and first-party direct retrieval using core-provided bounded `search` and `fetch` callbacks;
- structured retrieval results (`sources[]` plus non-adjudicative `diagnostics[]`) so missing evidence can be distinguished from HTTP, timeout, content-type, redirect, size, and parsing failures;
- source relevance adjustments and ordering hints;
- an optional, narrowly scoped adjudication function.

The core remains responsible for the global request budgets (maximum five upstream search calls and eight direct source fetches per answer), result caps, evidence filtering, and response safety. Adapters receive a bounded fetch callback and cannot access secrets, invoke unbounded network access, persist user data, or bypass core limits.

## Current adapters

| Adapter | Scope | Permitted behavior |
|---|---|---|
| `office_holder` | Explicit US presidential office-holder statements | White House-focused retrieval and a narrow recent official-source name-conflict rule; matching, stale, missing, or ambiguous evidence abstains |
| `social_brand_identity` | Twitter/X identity and rebranding claims | Context resolution, official/institutional retrieval enrichment, and relevance ordering only; no truth verdict |
| `python2_lifecycle` | Python 2 end-of-life/support claims | Directly validates the official Python.org sunset notice and separates event date from publication/retrieval dates |
| `whitehouse_x_identity` | Official White House X-account identity | Requires a first-party link from whitehouse.gov; validates host, content type, redirects, and bounded page size |
| `software_release` | Node.js LTS lifecycle claims | Retrieves immutable official schedule evidence through the bounded core fetch callback, with a first-party HTML fallback |

These adapters are compatibility examples, not privileged paths for the core. New domains should be implemented behind the same interface.

## Request path

`Browser UI -> Core API -> Domain Adapter (optional) -> Tavily Search Adapter -> Core Evidence Triage -> Conservative Result`

## Runtime components

- Cloudflare Worker + static assets.
- Tavily Basic Search API, invoked only by the core search adapter.
- Cloudflare Workers AI `@cf/zai-org/glm-4.7-flash` relation analysis is disabled by default, even when the `AI` binding is available; explicit `ENABLE_SEMANTIC_TRIAGE=true` is required after the free-quota and privacy gate.
- No database, KV, Durable Objects, Redis, vector database, accounts, analytics, or background queue.

## Node.js lifecycle adapter
- Direct official schedule retrieval is commit-pinned: commit metadata is resolved first, then raw schedule JSON is fetched from the exact immutable SHA.
- The adapter validates commit age, response size, version-keyed rows, and lifecycle dates; it does not assume a fixed Node.js major version.
- Invalid, stale, undated, or incomplete schedules produce abstention rather than a lifecycle verdict.

## Guardrails

- Maximum 12,000 input characters and five claim candidates.
- Maximum five search results per claim, five upstream search calls, and eight direct evidence fetches per submitted answer, including adapter-added retrieval.
- Tavily request timeout: 10 seconds.
- Direct first-party fetch timeout: 8 seconds; expected-host, HTML content-type, redirect, and response-size checks are applied before evidence is accepted.
- Per-claim `retrieval_diagnostics[]` records bounded provider outcomes (for example `NO_RESULTS`, `HTTP_ERROR`, `TIMEOUT`, `CONTENT_NOT_VALIDATED`, `VALIDATED`). These are acquisition diagnostics, never claim evidence or truth signals.
- CORS requires exact `ALLOWED_ORIGIN`; CORS is not authentication.
- No persistence; API responses set `Cache-Control: no-store`.
- Retrieved content is untrusted and rendered as text.
- Lexical relevance and adapter relevance hints do not establish entailment or truth.
- Semantic relation output is per-source advisory triage only. It must not set final verification status without independently validated evidence and domain rules.
- Semantic prompts treat claims and retrieved source text as untrusted data, distinguish publication date from event date, and require INSUFFICIENT/MIXED when entity, scope, units, timeframe, or context do not match.
- Missing AI bindings, malformed model output, incomplete source-index coverage, and model errors fail closed.
- Semantic inference is opt-in and disabled by default. Enable only after verifying Workers Free plan status, remaining daily Neurons, provider privacy terms, and bounded usage. No paid fallback, billing activation, or quota overage is permitted.
- No durable rate limiting or authentication exists; public deployment remains subject to the security gate.

## Deliberate non-goals

Generic CURRENT and CONTRADICTED require two independent, recent primary/official domains with matching advisory semantic relations and no material conflict candidate. Generic SUPERSEDED remains domain-rule-only because lifecycle expiry requires explicit domain semantics. Missing or stale-only evidence remains NEEDS_REVIEW when sources exist; no usable sources yields UNVERIFIABLE. No confidence percentages are shown without calibration.

## Key trade-off

FreshProof prefers abstention to false certainty. Search recency, source profile, lexical relevance, event date, and model relation labels remain distinct signals.


### Workers AI free-tier gate
Cloudflare's current Workers AI pricing documentation (updated 2026-10-20) states that Workers Free includes 10,000 Neurons per day at no charge and that requests fail after the daily allocation is exceeded; `@cf/zai-org/glm-4.7-flash` remains listed among models available on Workers Free. This does not establish the plan attached to the connected FreshProof account. Therefore, default-on semantic inference may be deployed only after the account is verified as Workers Free and the inference usage monitor is checked. If the account is on Workers Paid or plan status cannot be verified, do not enable inference in a deployed environment; keep this branch change undeployed until a verified zero-cost path is established. No billing, paid-plan activation, or payment method is authorized.


## Evidence Adjudication Layer
- The core invokes a deterministic claim-level adjudicator after bounded retrieval and advisory per-source semantic triage.
- Domain-specific rules (for example, the official immutable Node.js lifecycle schedule) take precedence and remain independently auditable.
- Generic CURRENT / CONTRADICTED require two independent, recent primary/official domains whose model-advisory relations agree; a mixed relation or rule-based cross-source conflict candidate forces NEEDS_REVIEW.
- The semantic model never supplies source reliability, calibrated confidence, freshness, or a final status by itself.
- Publication date is used only for evidence recency; event-date candidates are carried separately and never substituted for publication date.
- No usable sources yields UNVERIFIABLE. Stale, undated, conflicting, or otherwise insufficient returned sources remain NEEDS_REVIEW rather than being silently discarded.
- These are conservative deterministic thresholds, not empirically calibrated accuracy claims. Their precision/recall must be measured on a labeled corpus before any public performance claim.


## Python.org direct-fetch denial fallback (v0.2.32)
The Python 2 lifecycle adapter first attempts a bounded direct fetch of the official Python.org sunset page. If that request fails (for example, HTTP 403), it may use one request-budgeted, domain-restricted search callback. A candidate is accepted only when:
- its URL host is exactly `python.org` (or `www.python.org`) and its path is `/doc/sunset-python-2`;
- the returned excerpt contains both the explicit January 1, 2020 sunset date and explicit Python 2 no-support wording;
- the resulting evidence records `acquisition_method=TAVILY_INDEXED_FIRST_PARTY_PAGE`, unknown publication date, retrieval time, and a limitation that the page itself was not fetched.

A search-index excerpt is weaker than direct page retrieval and must never be described as a direct fetch. Off-domain URLs, unrelated paths, and incomplete excerpts are rejected. The core request-wide five-search budget remains authoritative.


## Product-level architecture decision — VERIFY / EXPLAIN / CORRECT
FreshProof adopts three mandatory, claim-level product outcomes across the entire application:
1. **VERIFY:** extract and scope claims, retrieve and adjudicate evidence, and issue a conservative status or abstain.
2. **EXPLAIN:** provide an evidence-linked rationale, date semantics, source relationships, and explicit limitations.
3. **CORRECT:** provide a source-grounded replacement only when the verification status and evidence satisfy the correction policy; otherwise explicitly withhold it.

The correction builder is a separate post-adjudication component. It consumes the final status, structured facts, and eligible source references; it cannot perform unbounded research or treat model world knowledge, search relevance, or retrieval diagnostics as evidence. Generic `NEEDS_REVIEW` and `UNVERIFIABLE` results must not produce replacement claims. `CURRENT` means no correction is required within the supported scope; `NOT_TIME_SENSITIVE` is not a truth verdict.

The complete product contract, target response shapes, correction eligibility matrix, UI acceptance rules, and delivery gates are defined in [THREE-PILLAR-PRODUCT-ARCHITECTURE.md](THREE-PILLAR-PRODUCT-ARCHITECTURE.md).

**Implementation boundary:** VERIFY is partially implemented; EXPLAIN is partially implemented through rationale/provenance/source cards; CORRECT is not yet implemented as a general capability. Adoption of this architecture is not a claim that all three pillars have shipped. The response contract and correction builder remain implementation work.
