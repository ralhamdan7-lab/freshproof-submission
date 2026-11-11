# API

## `GET /api/health`
Returns service identity and version. Does not require Tavily credentials.

## `POST /api/verify`
Content-Type: `application/json`

Request:
```json
{"text":"The current CEO was appointed in 2025. A stable scientific fact follows."}
```

Limits: 12,000 input characters; maximum five sentence candidates; maximum five search results per time-sensitive claim. Tavily search requests set `max_age_hours: 24` and `include_published_date: true`; the former constrains the age of Tavily's cached page copy, not the source publication date or event date.

Each claim may return:
- `status`: `CURRENT`, `SUPERSEDED`, `CONTRADICTED`, `UNVERIFIABLE`, `NEEDS_REVIEW`, or `NOT_TIME_SENSITIVE`. Generic verdicts remain subject to conservative adjudication rules; specialized statuses may be limited to domain adapters.
- `freshness`: publication freshness label, newest publication date, and age in days (when available).
- `evidence_confidence`: qualitative evidence-breadth category, not a probability.
- `source_reliability`: coarse domain-profile labels, not a calibrated trust score.
- `sources[]`: title, original URL, excerpt, publication date, possible event-date candidate, domain profile, retrieval method, and search relevance where available.
- `excluded_sources[]`: low-relevance results retained for audit but excluded from adjudication.
- `cross_source_conflicts[]`, `semantic_assessment`, and `adjudication`: review/adjudication details where available.
- `retrieval_diagnostics[]`: evidence-acquisition outcomes only; never evidence for or against the claim.
- `explanation`: concise adjudication rationale retained for compatibility.
- `explanation_detail`: structured `summary`, `reason`, `evidence_basis[]`, distinct `date_interpretation` fields (`event_date`, `publication_date`, `retrieved_at`), and `limitations[]`.
- `correction`: `status` (`PROVIDED`, `NOT_NEEDED`, `WITHHELD`, `NOT_APPLICABLE`), nullable `text`, `evidence_refs[]`, and `limitations[]`. A provided correction must cite an evidence reference used by the claim outcome. In v0.2.33, deterministic correction text is intentionally limited to the validated Python 2 sunset adapter; other changed/contradicted claims are withheld until a tested correction rule exists.

Errors: 400 invalid JSON/empty text; 403 disallowed origin; 405 unsupported method; 413 oversized input; 422 no complete sentence candidate; 429 rate limit exceeded; 503 missing Tavily secret or rate limiter unavailable; 404 unknown API route. Verification requests use Cloudflare's approximate per-edge rate limiter (10 requests per 60 seconds per client IP); it is not a strict global quota.


## v0.2.22 claim-context and relevance fields
- `resolved_context` reports a narrowly resolved entity/antecedent when the answer explicitly names Twitter/X and a later clause begins with a supported pronoun. The original `text` remains unchanged.
- `sources[].relevance_assessment` reports HIGH/MEDIUM/LOW bounded lexical relevance, matched terms, unmatched terms, and lexical coverage. It is a retrieval/reviewer aid only, not a semantic support or contradiction verdict.
- `sources[].claim_alignment` is calculated against the resolved claim where resolution succeeds.
- `x.com` and `twitter.com` are profiled as official brand domains; this does not make every page or snippet on those domains sufficient evidence.


## v0.2.22 claim-context and relevance fields
- `resolved_context` reports a narrowly resolved entity/antecedent when the answer explicitly names Twitter/X and a later clause begins with a supported pronoun. The original `text` remains unchanged.
- `sources[].relevance_assessment` reports HIGH/MEDIUM/LOW bounded lexical relevance, matched terms, unmatched terms, and lexical coverage. Only HIGH/MEDIUM items remain in `sources[]` for evidence review.
- `excluded_sources[]` retains LOW-relevance search results for audit and display, but they are excluded from evidence adjudication and do not contribute to freshness or evidence breadth.
- `sources[].claim_alignment` is calculated against the resolved claim where resolution succeeds.
- `x.com` and `twitter.com` are profiled as official brand domains; this does not make every page or snippet on those domains sufficient evidence.


## v0.2.31 retrieval diagnostics and direct-fetch budget
Each temporally reviewed claim may include `retrieval_diagnostics[]`. Entries describe evidence acquisition only, for example:
- `TAVILY / SEARCH / RESULTS_FOUND`, `NO_RESULTS`, `UPSTREAM_FAILED`, or `BUDGET_EXHAUSTED`.
- `PYTHON_ORG / VALIDATED`, `HTTP_ERROR`, `TIMEOUT`, `REDIRECT_HOST_REJECTED`, `UNEXPECTED_CONTENT_TYPE`, `RESPONSE_TOO_LARGE`, or `CONTENT_NOT_VALIDATED`.

The response methodology includes request-wide `search_budget` (maximum 5) and `direct_fetch_budget` (maximum 8). Retrieval diagnostics are not evidence for or against a claim and cannot independently change its verification status. The direct-fetch adapter contract receives the core-bounded `fetch` callback; adapters must not call global network APIs directly.


## v0.2.32 Python.org 403 fallback
When direct Python.org retrieval is denied, the adapter may perform a domain-restricted search for the official sunset page. It accepts only the exact first-party page URL and an excerpt containing both the 2020-01-01 sunset date and explicit no-support wording. The claim's domain evidence records `acquisition_method: "TAVILY_INDEXED_FIRST_PARTY_PAGE"` and explicitly states that the page itself was not fetched. Search-index evidence is not equivalent to direct source retrieval; publication date remains unknown. The fallback consumes the same request-wide search budget.


## Product outcome architecture — VERIFY / EXPLAIN / CORRECT
The adopted product standard requires three claim-level outcomes:
- **VERIFY:** a conservative verification status or explicit abstention.
- **EXPLAIN:** an evidence-linked reason, source relationships, date interpretation, and limitations.
- **CORRECT:** a source-grounded replacement only when correction eligibility is satisfied; otherwise the API must explicitly withhold correction.

### Implementation status
In v0.2.32, verification is partially implemented and explanation is partially implemented through the current rationale, source, date, and provenance fields. A general correction object is **not yet implemented**. Do not assume a correction is available merely because a claim has `SUPERSEDED` or `CONTRADICTED` status.

### Target response extension (not yet shipped)
The next backward-compatible response revision will add:
- `explanation_detail`: structured `summary`, `reason`, `evidence_basis[]`, `date_interpretation`, and `limitations[]`.
- `correction`: `status` (`PROVIDED`, `NOT_NEEDED`, `WITHHELD`, `NOT_APPLICABLE`), nullable `text`, eligible evidence references, and limitations.

A `PROVIDED` correction must cite at least one source used in adjudication. `NEEDS_REVIEW` and `UNVERIFIABLE` must withhold correction. `NOT_TIME_SENSITIVE` does not imply truth. Full rules and examples: [Three-Pillar Product Architecture](THREE-PILLAR-PRODUCT-ARCHITECTURE.md).


## v0.2.33 structured three-pillar outcomes
Every claim now includes two additive response objects:
- `explanation_detail`: a stable explanation contract with summary, adjudication reason, evidence basis links, event/publication/retrieval date separation, and limitations.
- `correction`: an explicit decision object. `PROVIDED` includes replacement text and source references; `NOT_NEEDED` is used for `CURRENT`; `NOT_APPLICABLE` is used for `NOT_TIME_SENSITIVE`; `WITHHELD` is used when evidence is insufficient or no validated correction rule exists.

Correction policy is deliberately narrow in this release. A `SUPERSEDED` Python 2 lifecycle claim can receive a replacement only when the exact Python.org sunset URL, official adapter method, 2020-01-01 event date, and matching evidence reference are all present. Generic `SUPERSEDED` and `CONTRADICTED` claims do not receive model-invented replacement text. This is an initial deterministic capability, not general-purpose correction coverage.


## v0.2.34 Python 2 correction eligibility hardening
The Python 2 correction gate canonicalizes only HTTPS `python.org` / `www.python.org` URLs whose path is exactly `/doc/sunset-python-2`; harmless query strings and trailing slash differences do not block a match. If the nested domain evidence source URL is unavailable, the gate may use the same validated `OFFICIAL_PYTHON2_SUNSET_NOTICE` source already present in the claim evidence set. The adapter ID, SUPERSEDED status, official adjudication method, event date 2020-01-01, and matching explanation evidence reference remain mandatory. No general-purpose correction rule is added.


## Generic correction candidate (internal pipeline contract; v0.2.36)

The `POST /api/verify` request remains unchanged. A candidate is supplied only by trusted internal adjudication/domain-adapter code; it is not accepted from user input.

For a generic correction to be `PROVIDED`, the internal candidate must include:
- bounded `text`;
- `assessment.status=SUPPORTED`;
- `assessment.method=INDEPENDENT_CANDIDATE_REVIEW`;
- `scope_match=MATCHED`, `timeframe_match=MATCHED`, `conflict_status=NONE`;
- at least two unique `evidence` entries with `relation=SUPPORTS_CANDIDATE`, each mapping to an existing source index.

The core additionally validates HTTPS URLs, unique independent hosts, at least one primary/official source, institutional-or-primary corroboration, non-empty excerpts, no LOW relevance, and an eligible original status (`SUPERSEDED` or `CONTRADICTED`). The response evidence references are reconstructed from validated source objects.

A missing or invalid candidate results in `WITHHELD`. The API does not accept a caller-supplied correction candidate. This contract is implemented in v0.2.36; a generic candidate producer and end-to-end runtime acceptance remain pending.


## Optional model-assisted correction review (v0.2.37)

The candidate-review pass is disabled by default and is not a user-facing API option. It runs only when both Worker environment flags are explicitly set:
- `ENABLE_CORRECTION_CANDIDATE_REVIEW=true`
- `FREE_WORKERS_AI_QUOTA_VERIFIED=true`

The second flag is an operator assertion that current free quota and overage behavior have been checked; this release does not set it. The pass is bounded to two candidate reviews per request, uses only supplied source excerpts, and returns source indices rather than URLs. It does not alter the original verification status. The generic validator remains the final gate. Any unsupported, conflicting, ambiguous, or malformed candidate is withheld.


## Zero-cost runtime defaults (v0.2.38)

The Staging Wrangler configuration explicitly sets `ENABLE_CORRECTION_CANDIDATE_REVIEW=false` and `FREE_WORKERS_AI_QUOTA_VERIFIED=false`. Enabling model-assisted candidate review is prohibited until the account's actual Workers plan and remaining free quota are verified. Cloudflare documents a 10,000-Neuron/day free allocation; on Workers Free, further operations fail after the limit and require an upgrade to Workers Paid. Workers Paid usage above the free allocation is billable. Account-specific remaining quota is not inferred from public pricing documentation.


Official Cloudflare quota references (checked 2026-11-11): [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and [Workers AI limits](https://developers.cloudflare.com/workers-ai/platform/limits/). Workers Free includes 10,000 Neurons/day; on Free, exhausted allocation stops further operations and requires an upgrade for more use. Workers Paid usage above the free allocation is billable. FreshProof does not enable model-assisted correction until account-specific plan and quota are verified.


## Generic correction evidence quote contract (v0.2.39)

For every `evidence` item with `relation=SUPPORTS_CANDIDATE`, the internal candidate reviewer must provide:
- `source_index`: an integer referencing the bounded source array supplied to the review pass;
- `supporting_quote`: a 20–500 character contiguous excerpt copied verbatim from that exact source's `snippet`.

The candidate-review boundary and final correction builder both validate the quote against the mapped snippet using Unicode NFKC normalization, zero-width character removal, whitespace collapse, and case-insensitive matching. A missing, paraphrased, altered, or mismatched quote rejects the entire candidate. The returned correction citation includes `supporting_quote`.

This contract establishes quote-to-source provenance, not semantic entailment: a quote can be real but still fail to support the replacement proposition. The model's semantic assessment remains advisory, and model-assisted correction remains disabled by default until account-specific free quota is verified.


## User-interface presentation of supporting quotes (v0.2.40)

When a generic correction evidence reference includes `supporting_quote`, the claim card displays the source link followed by a labelled supporting excerpt. The label is bilingual, the quote follows the detected claim direction, and all content is inserted using text nodes/textContent rather than HTML parsing. Quotes are not shown when absent. This is a presentation layer only and does not change verification or correction decisions.
