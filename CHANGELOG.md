## 0.2.47 — source independence and domain evidence quality (2026-11-12)
- Independent corroboration now groups sources by registrable domain rather than raw hostname, preventing multiple subdomains of one publisher from being counted as independent evidence.
- Added focused regression tests for registrable-domain independence and evidence-confidence behavior.
- Expanded the curated first-party host registry for official technical documentation and standards publication domains (Microsoft Learn, Oracle Documentation, RFC Editor, and other official institutional roots); unlisted hosts remain UNASSESSED.
- Refined advisory semantic triage instructions to distinguish legal entry-into-force dates from later application/enforcement milestones. Exact milestone/date normalization is constrained by a matching named entity and does not override negated or different-instrument statements.
- Correction-candidate eligibility now uses registrable publisher domains too; sibling subdomains cannot satisfy the two-independent-source requirement.
- Staging acceptance now requires the TLS 1.0/1.1 deprecation case to produce a corroborated CURRENT result using independent official sources.
- This is a verification-policy hardening change. It does not lower the two-independent-registrable-domain threshold, change Production, or enable paid services.

## 0.2.43 — explicit wrong/right claim presentation (merged; Staging acceptance pending)
- Added a plain-language, per-claim comparison panel that preserves and displays the original claim under “What is wrong?” / “ما الخطأ؟”.
- Displays the evidence-supported replacement directly under “What is correct?” / “ما الصحيح؟” only when the correction builder returns a validated `PROVIDED` correction.
- For contradicted/outdated claims without a validated replacement, explicitly explains that the claim conflicts with evidence but no safe replacement has been established; it links users to the original evidence instead of guessing.
- For supported, needs-review, and unverifiable claims, uses distinct plain-language explanations and never implies that a missing correction means the original claim is correct.
- Adds Arabic/English answer-level summaries, counts validated corrections, and preserves claim-local RTL/LTR rendering.
- Keeps source URLs clickable and displays correction evidence/quotes and limitations in the adjacent evidence section.
- PR #52 merged into `main` as `88e5ca44ffe0f2294449ec21e88b831edad8b7b6`; PR CI #43065029135 passed 154/154 tests and all syntax/benchmark steps.
- Staging deployment #43065149282 succeeded (Cloudflare Version `bfb56ad1-4989-4b11-8213-c28a6ba500b6`); independent GET `/api/health` verified v0.2.43 (`ok=true`); live POST/browser acceptance remains pending. Production unchanged. No verification policy, AI inference, quota, billing, secrets, or Production configuration changed. Workers AI remains disabled by default.
## 0.2.42 — factual verification is primary; temporal assessment is secondary (merged and Staging deployed)
- Removed the temporal-heuristic short circuit: every extracted claim now enters bounded evidence retrieval and factual adjudication.
- Added a separate `temporal_assessment` response field; `NOT_TIME_SENSITIVE` is no longer used as a substitute for a factual verdict in the generic path.
- Stable claims may be adjudicated from two independent primary/official or institutional sources without an arbitrary publication-age requirement. Time-sensitive claims retain the recent primary-source requirement.
- Generic verdicts still require source-level semantic relations. If semantic triage is disabled/unavailable, the engine abstains rather than treating search relevance as proof.
- UI now labels evidence-supported, contradicted, outdated, review, and unverifiable outcomes distinctly; temporal sensitivity is a secondary note. Green is reserved for `CURRENT`; orange for `CONTRADICTED`/`SUPERSEDED`.
- Added synthetic Worker API tests for stable-claim support and fail-closed behavior when semantic assessment is disabled.
- Workers AI remains disabled unless its existing opt-in and free-quota gates are satisfied. No billing, quota, secret, or Production changes.
- Exact-branch CI run #43060766170 passed: 149/149 Node tests, Worker/adjudication/domain/browser syntax checks, and the 32-case synthetic temporal smoke benchmark (diagnostic only; not real-world accuracy).
- PR #51 is open and mergeable. Staging deployment, health check, and live browser acceptance remain pending. No real-world accuracy claim is made.

## 0.2.41 — 2026-11-11 (full-product offline integration; Staging deployed)
- Added Worker API integration fixtures for claim extraction, bounded synthetic retrieval, evidence adjudication, structured explanation, correction candidate review, final evidence/quote validation, and response contract.
- Positive controls cover corroborated support (`CURRENT` / `NOT_NEEDED`) and corroborated contradiction (`CONTRADICTED` / `PROVIDED`).
- Negative controls cover mixed relations, one-source insufficiency, same-host duplicates, invalid supporting quotes, and low-relevance sources; these must abstain or withhold correction.
- Added explicit checks that publication date is not promoted to an adjudicated event date.
- Added frontend regression coverage for text-only rendering of source excerpts and safe external source links.
- Fake search and AI responses are injected only in tests. No live provider request is made by the integration fixture. Generic correction runtime flags remain false.
- CI: 147/147 Node tests passed; Worker, adjudication, domain-adapter, and browser syntax checks passed; 32-case synthetic temporal smoke benchmark passed (diagnostic only; not real-world accuracy).
- PR #50 merged as `fd82a4b85bd32ff4598f260bc92bb4963c7a7568`.
- Staging deploy run #43042608131 succeeded; Worker Version ID `e551c628-2cbb-4ebb-8902-eab99a980f88`. Production unchanged.
- Competition demo script updated: Python 2.7 is the primary three-pillar live case; Node.js 16 is the secondary lifecycle verification case. The generic Acme scenario is explicitly an offline synthetic fixture, not a factual live demo.
- Independent health-endpoint re-read and owner-assisted browser POST/visual acceptance on v0.2.41 remain pending.

## 0.2.41 — 2026-11-11 (offline full-product integration test milestone)
- Add an offline Worker API integration fixture that exercises retrieval normalization, claim-level evidence adjudication, structured explanation, correction candidate assessment, final correction validation, and the returned claim response.
- Cover a supported correction path, mixed/conflicting relations, insufficient corroboration, duplicate source hosts, invalid supporting quotes, and low-relevance evidence exclusion.
- Inject deterministic fake AI responses and synthetic Tavily results in tests only; no live Workers AI or Tavily request is made by the test suite.
- Add a frontend contract regression test confirming supporting excerpts are rendered through textContent rather than HTML and remain attached to correction evidence links.
- Generic correction remains disabled by default in runtime configuration; the test-only flags and fake AI do not change Staging or Production settings.
- This milestone validates orchestration and contract wiring with controlled fixtures, not semantic truth, model quality, or real-world accuracy.

## 0.2.40 — 2026-11-11 (display correction supporting excerpts; Staging deployed)
- Display each validated generic-correction supporting quote directly below its source link in the claim result card.
- Add a clear bilingual label (SUPPORTING EXCERPT / مقتطف داعم من المصدر), direction-aware rendering, and compact styling.
- Render the quote as text content, never as HTML, preserving safe handling of untrusted source text.
- No verification status, evidence threshold, or correction eligibility changes. Generic model review remains disabled by default.
- CI passed: 145/145 Node tests, Worker/adjudication/domain/browser syntax checks, and temporal smoke benchmark (run #43033040476).
- PR #45 merged as `79683dd0c974ffeafcc9717de1a2149674d12e9e`.
- Staging deployment succeeded (run #43033119211), Worker Version ID `8ad7b2ab-ce53-4bfa-95f9-921dd1de7159`; independent `/api/health` returned `ok=true`, version `0.2.40`.
- Root application shell returned successfully. No interactive browser screenshot/visual acceptance was performed. Production unchanged.

## 0.2.39 — 2026-11-11 (verbatim evidence-quote provenance; Staging deployed)
- Require each source cited for a generic correction candidate to include a supporting quote of 20–500 characters copied contiguously from that exact source excerpt.
- Validate the quote against the source snippet using Unicode NFKC, zero-width character removal, whitespace normalization, and case-insensitive matching.
- Reject candidates with missing, paraphrased, altered, or source-mismatched quotes. Recheck quote provenance in the final correction builder before exposing a correction.
- Return the validated supporting quote alongside each correction evidence reference for auditability.
- This strengthens citation traceability but does NOT independently prove semantic entailment; model assessment remains advisory and the feature remains explicitly disabled by default.
- Added regression tests for valid quote mapping, missing/mismatched quotes, and paraphrased quote rejection.
- CI passed: 145/145 Node tests, Worker/adjudication/domain/browser syntax checks, and temporal smoke benchmark (run #43032308386).
- PR #43 merged as `34bbbdc65380717145095b8f4df42d4d4c40826a`.
- Staging deployment succeeded (run #43032308244), Worker Version ID `afbc829a-2c0a-46b4-858e-69db4d346efc`; independent `/api/health` returned `ok=true`, version `0.2.39`.
- Both correction-review flags remain explicitly false; no model inference was run. Production unchanged.

## 0.2.38 — 2026-11-11 (explicit zero-cost AI gate defaults; validation pending)
- Set `ENABLE_CORRECTION_CANDIDATE_REVIEW=false` and `FREE_WORKERS_AI_QUOTA_VERIFIED=false` explicitly in the Staging Wrangler variables.
- Prevent accidental Workers AI candidate-review inference until the account plan and current remaining free quota are verified.
- Bump Worker/package/API version to 0.2.38. Runtime candidate review remains opt-in and disabled.
- Cloudflare official pricing states Workers Free includes 10,000 Neurons/day; exceeding that on Free causes further operations to fail and requires upgrading to Workers Paid. Workers Paid usage above the free allocation is billed at $0.011/1,000 Neurons. Account-specific plan and remaining quota are not verified.
- CI passed: 142/142 tests, syntax checks, and temporal smoke benchmark (run #43007170472).
- Staging deployed and health-checked at v0.2.38; Worker Version ID `38ea5854-e3df-4a18-91a4-cd3b2bcc24a2` (run #43007170544).
- Both model-review flags are explicitly false in `wrangler.toml`; no Workers AI correction inference was run.
- Cloudflare free allocation is 10,000 Neurons/day; on Workers Free, exhausted allocation stops further requests; Workers Paid usage above the free allocation is billable. Official docs: https://developers.cloudflare.com/workers-ai/platform/pricing/ and https://developers.cloudflare.com/workers-ai/platform/limits/.
- Account-specific plan/quota not accessed. Production unchanged.

## 0.2.37 — 2026-11-11 (opt-in correction candidate review; disabled by default)
- Add a separate Workers AI candidate-review pass for SUPERSEDED and CONTRADICTED claims. The pass proposes a replacement only from supplied source excerpts and must identify at least two source indices supporting the replacement, matched scope/timeframe, and no conflict.
- The core generic correction validator remains the final gate and reconstructs citations from source indices; model-provided URLs are not accepted.
- Runtime invocation requires BOTH `ENABLE_CORRECTION_CANDIDATE_REVIEW=true` and `FREE_WORKERS_AI_QUOTA_VERIFIED=true`; neither is enabled by this change. At most two candidate-review calls are allowed per request.
- Model review is advisory and is not an independent source or a calibrated truth verdict. If it fails, conflicts, or is incomplete, correction remains WITHHELD.
- Added tests for disabled/ineligible cases, valid candidate schema, conflicts, scope/timeframe mismatch, malformed output, low-relevance sources, and prompt-injection handling.
- CI passed: 141/141 Node tests, syntax checks, and temporal smoke benchmark (run #43006491029).
- Staging deployed successfully (run #43006491098), Worker Version ID `f4766660-af1b-4df8-b273-e047d93c4952`; independent `/api/health` returned v0.2.37.
- Optional candidate inference remains disabled unless both runtime flags are set; neither was added to `wrangler.toml`, and no inference/quota use was intentionally triggered. Runtime account-level variable state was not independently inspected.
- No Production, billing, secret, or quota changes.

## 0.2.36 — 2026-11-11 (generic evidence-grounded correction contract; validation pending)
- Add a domain-neutral correction-candidate validator for SUPERSEDED and CONTRADICTED claims.
- Require an independently assessed candidate, exact scope/timeframe match, no unresolved conflict, at least two independent HTTPS source hosts, at least one primary/official source, eligible institutional corroboration, source excerpts, and candidate-specific SUPPORTS_CANDIDATE evidence references.
- Preserve the existing Python 2 deterministic rule and all abstention behavior; generic corrections remain withheld unless a trusted internal pipeline component supplies a candidate meeting the full contract.
- Wire the optional correction candidate from the domain-adapter/adjudication result into the product outcome builder.
- Add positive and negative regression coverage. CI, Staging deployment, and end-to-end candidate-producer integration pending.
- No Production, billing, quota, secret, or provider changes.

## 0.2.35 — 2026-11-11 (Arabic correction-state localization)
- Localize the NOT_APPLICABLE correction limitation according to the language of the claim.
- Add regression coverage for Arabic NOT_TIME_SENSITIVE output.
- CI passed: 129/129 Node tests, syntax checks, and the 32-case synthetic diagnostic benchmark.
- Staging deployed and health-checked at v0.2.35. Python 2 three-pillar browser acceptance subsequently passed with indexed-source limitations disclosed.
- Production unchanged.

## 0.2.35 — 2026-11-11 (Arabic correction-state localization; validation pending)
- Localize the NOT_APPLICABLE correction limitation when the claim text is Arabic, avoiding an English-only explanatory sentence inside an otherwise Arabic claim card.
- Add a regression test for Arabic NOT_TIME_SENSITIVE output.
- CI and Staging deployment pending. Production unchanged.

## 0.2.34 — 2026-11-11 (Python correction eligibility fix; validation pending)
- Fix official Python 2 sunset URL matching by canonicalizing the exact HTTPS Python.org page path while tolerating harmless trailing-slash and query-string differences.
- Allow the correction gate to use the validated `OFFICIAL_PYTHON2_SUNSET_NOTICE` source already present in the claim evidence set when domain evidence metadata does not carry a usable source URL.
- Keep strict safeguards: exact adapter, SUPERSEDED status, official Python.org hostname/path, official sunset adjudication method, 2020-01-01 event date, and a matching explanation evidence reference are all required.
- Add regression tests for URL normalization and indexed first-party evidence fallback. Other hosts/paths and non-official sources remain ineligible.
- CI, Staging deployment, and browser retest pending. Production unchanged.

## 0.2.33 — 2026-11-11
- Add structured `explanation_detail` to every claim with summary, rationale, evidence basis, separate event/publication/retrieval dates, and limitations.
- Add explicit `correction` outcome states: PROVIDED, NOT_NEEDED, WITHHELD, and NOT_APPLICABLE.
- Implement a deterministic, source-bound Python 2 correction only when the exact official Python.org sunset URL, adapter method, event date, and matching evidence reference validate.
- Withhold generic SUPERSEDED/CONTRADICTED corrections when no validated correction rule exists; always withhold for NEEDS_REVIEW and UNVERIFIABLE.
- Render separate explanation and correction sections in each claim card, including Arabic/English labels and claim-level text direction.
- Add focused unit tests for correction eligibility, date separation, source URL validation, Arabic output, and abstention.
- PR #32 merged as `2745e27f5e2239a177f8133a40751db616356d82`; PR and main CI passed 126/126 tests, syntax checks, and the 32-case synthetic diagnostic benchmark (not real-world accuracy evidence).\n- Staging deployment #43002784455 succeeded; Cloudflare Version ID `9c9cbe3c-a369-447c-9157-38f4bdcb6918`; independent health check verified v0.2.33.\n- Browser POST acceptance remains pending.

## 0.2.32 — 2026-11-11
- Handle Python.org direct-fetch HTTP 403 with a single request-budgeted, domain-restricted Tavily fallback.
- Accept only the exact first-party `/doc/sunset-python-2` page and an excerpt containing both the 2020-01-01 event date and explicit no-support wording.
- Preserve acquisition provenance as `TAVILY_INDEXED_FIRST_PARTY_PAGE`; disclose that the page itself was not fetched and keep publication date unknown.
- Reject off-domain, unrelated-path, and incomplete excerpts; abstain when no validated first-party excerpt is found.
- Add accepted/rejected fallback regression tests.
- CI #42959837845 and main push #42959897537 passed: 115/115 tests, all syntax checks, and the 32-case synthetic diagnostic benchmark.
- Staging deployment #42959897562 succeeded; Worker version `af23697f-0370-489f-b605-498f50d805c4`; health endpoint verified v0.2.32.
- Browser POST acceptance of the live Tavily fallback remains pending.

## v0.2.32 — Python.org HTTP 403 fallback (2026-11-11)
- When the official Python.org page denies direct Worker retrieval, the Python 2 lifecycle adapter now attempts a single request-budgeted, domain-restricted search-index fallback.
- Accept only the exact official `python.org/doc/sunset-python-2` page and an excerpt containing both the 2020-01-01 sunset date and explicit Python 2 no-support wording.
- Record `TAVILY_INDEXED_FIRST_PARTY_PAGE` as the acquisition method and disclose that the page itself was not fetched; publication date remains unavailable.
- Reject off-domain, unrelated-path, and incomplete search results; preserve NEEDS_REVIEW when fallback evidence is not validated.
- Added regression tests for validated fallback and rejection of off-domain/incomplete excerpts.
- CI and Staging validation pending.

## Unreleased — bounded evidence retrieval and observability (2026-11-11)
- Standardize first-party HTML retrieval with an eight-second timeout, expected-host/redirect validation, HTML content-type checks, and bounded response sizes.
- Pass the core-owned bounded fetch callback into Python.org, White House, and Node.js direct evidence adapters; cap direct fetches at eight per answer alongside the five-search request budget.
- Standardize adapter direct-evidence results as `sources[]` plus acquisition-only `diagnostics[]` while preserving legacy array adapters.
- Surface retrieval outcomes (provider failure, HTTP status, timeout, redirect/content validation, and no-results states) per claim; explicitly state that retrieval diagnostics are not claim evidence.
- Fix Python.org sunset validation to accept the canonical first-party page wording and store the event date as ISO `2020-01-01`, keeping publication date unavailable and retrieval time separate.
- Preserve conservative abstention when official evidence cannot be retrieved or validated.
- Added regression tests for canonical Python.org wording, injected fetch routing, host/content/size rejection, retrieval-failure transparency, and request budgets.
- Version 0.2.31 CI: PASSED on exact PR HEAD (run #42954777072); 113/113 Node tests passed, all syntax checks passed, and the 32-case synthetic temporal smoke benchmark passed. Staging deployment succeeded as Version `5d893901-72e3-4e4b-9775-1d7c6c8abf21`; `/api/health` independently returned version `0.2.31`. Browser POST acceptance remains pending.

## Unreleased — per-claim language and direction isolation (2026-11-11)
- Detect language independently for each extracted claim; mixed-language answers no longer switch the entire report to Arabic/RTL.
- Keep the report summary and shared evidence panels in English/LTR while applying Arabic labels and RTL only within Arabic claim content.
- Preserve source-title and source-snippet language/direction independently.
- Load the browser entrypoint as an ES module for the shared language-direction helper.
- Correct claim-level source metadata list construction.
- Validation: CI run #204 passed 109/109 Node tests, Worker/adjudication/domain-adapter/browser syntax checks, and the 32-case synthetic temporal smoke benchmark.
- Merged PR #28 into main at `8bb646ed645967b790434d7cfda2949aaffac588`; Staging deployment succeeded as version `fdbf221f-e1a7-4b16-a4bf-857de22b2067` after 109/109 tests and the synthetic benchmark passed. Browser acceptance is pending. Production remains unchanged.

## Unreleased — Node.js lifecycle evidence pinning (2026-11-10)
- Fetch Node.js Release schedule JSON from the exact immutable Git commit returned by GitHub, binding the source content to its own commit timestamp.
- Validate commit identity, timestamp freshness, bounded JSON size, version-keyed schema, and lifecycle date fields; remove the hard-coded v22 schema dependency.
- Update the end-to-end POST test to assert immutable commit-pinned evidence retrieval.
- Implemented on PR #23; full tests and live Staging verification remain pending.

## Unreleased — semantic analysis remains opt-in (2026-11-11)
- Add a deployment gate requiring verification of the Cloudflare Workers Free plan and daily AI usage before enabling inference; current account plan remains unverified, so deployment is blocked.
- Record that the official Workers AI docs list 10,000 free Neurons/day on Workers Free and list GLM-4.7-Flash as available on Free; this allowance must not be treated as proof of the connected account's plan.

- Keep Workers AI per-source semantic relation analysis disabled by default; explicit opt-in is `ENABLE_SEMANTIC_TRIAGE=true` only after verifying the account's Free plan, remaining quota, and privacy terms.
- Preserve the advisory-only boundary: semantic labels do not independently set final verification status, source reliability, or calibrated confidence.
- Add request-handler regression coverage for default invocation and explicit opt-out; unavailable bindings and invalid model responses fail closed.
- Update architecture, deployment configuration comments, and operator guidance to reflect the new policy.
- This change is implemented on PR #23 but not yet fully tested, live-inference evaluated, deployed, or released. No version bump is made before validation.

## Unreleased — domain-agnostic core refactor
- Introduce an isolated domain-adapter registry in `worker/domain-adapters.js`; the core no longer contains Twitter/X- or office-holder-specific branches.
- Move specialized context resolution, retrieval enrichment, relevance hints, and narrow adjudication behind adapter contracts.
- Preserve the general evidence pipeline as the owner of source normalization, ranking baseline, abstention, response shaping, and security controls.
- Enforce a request-wide maximum of five upstream search calls, including adapter-added searches; cache adapter evidence within a submitted answer to avoid duplicate calls.
- Render domain-specific findings through a generic adapter evidence panel.
- Add adapter contract and search-budget regression tests.
- Merged into `main` as `2971e8d43357e37cbc56116f3acc427a7af5f796`. CI verified: 65/65 tests passed, Worker/browser syntax checks passed, and the 32-case synthetic temporal diagnostic passed. Runtime/production verification and deployment remain pending.

## 0.2.23 — 2026-11-09
- Expand source-relevance screening with bounded concept aliases for identity and rebranding language (changed, renamed, replaced, formerly).
- Retain relevant evidence whose wording differs from the claim's surface vocabulary while continuing to exclude unrelated social posts.
- Keep relevance aliases strictly as retrieval triage; they do not establish entailment, source authority, support, contradiction, or a final verification status.
- Add regression tests for rebranding evidence, unrelated mentions, and the relevance-versus-verdict boundary.

## 0.2.22 — 2026-11-09
- Resolve pronoun-led Twitter/X identity clauses against an explicit antecedent in the original answer while preserving the user's original claim text.
- Use the resolved claim for retrieval and claim-level evidence alignment.
- Add bounded source-relevance screening (HIGH/MEDIUM/LOW), rank relevant evidence before coarse source-profile preference, and separate LOW results into `excluded_sources` for audit without treating them as evidence; relevance remains lexical triage, not entailment.
- Recognize x.com and twitter.com as official brand domains while leaving unrelated social platforms unassessed.
- Display resolved entity context and per-source relevance rationale in the UI.
- Keep final status conservative: no general semantic verdicts, no automatic CURRENT/SUPERSEDED, and no inference quota activation.
- Add regression tests for entity resolution, X brand alias alignment, unrelated recent content, and official-domain profiling.

## 0.2.21 — 2026-11-09
- Add entity-aware query expansion for X/Twitter brand-name continuity claims.
- Preserve the original full answer as bounded context when searching each independently extracted claim, so a pronoun-led clause (for example, "its official brand name has not changed") can inherit its entity for retrieval without merging claim assessments.
- Keep the one-year Tavily publication window and retain undated results as unknown-date evidence.
- Add regression coverage for entity context inheritance and unchanged generic temporal queries.
- This is retrieval query refinement only; it does not establish support, contradiction, source reliability, or a final verdict.

## 0.2.20 — 2026-11-09
- Temporal evidence searches now request a one-year publication/update window using Tavily `time_range: "year"`.
- Keep `filter_by_published_date: false` so sources with undetected publication dates are not automatically discarded; their dates remain unknown and cannot be treated as recent.
- Preserve `max_age_hours: 24` as a separate cache-freshness control; it does not mean the page was published in the last 24 hours.
- Add request-payload regression assertions. This change improves recency bias but does not guarantee source relevance, primary-source coverage, or a current verdict.

## 0.2.19 — 2026-11-09
- Treat explicit continuity and unchanged-state assertions (for example, "has not changed", "remains unchanged", "still available", and "formerly known as") as potentially time-sensitive.
- This prevents claims about current identity or an unchanged official name from bypassing evidence retrieval solely because they lack words such as "currently" or "today".
- Add regression coverage for English continuity/unchanged-state language.
- No verdict policy was relaxed: general claims still require evidence adjudication; old or unassessed sources do not establish current truth.

## 0.2.18 — 2026-11-09
- Add a bounded directory-focused fallback search when the initial official-domain results do not include a recent, dated, parseable office-holder identity.
- Deduplicate primary and fallback result URLs and cap the combined evidence set at 10 sources.
- Extract the fallback decision and source merge into independently testable helpers.
- Add regression tests for missing, stale, unrelated and valid official directory evidence, plus result deduplication and caps.
- Runtime deployment and full automated test execution remain pending; see the deployment checkpoint.

## 0.2.26 — 2026-11-10
- Add a narrow Node.js LTS lifecycle comparator using official nodejs.org LTS listings; distinguish the newest LTS major from older majors that may still remain in LTS.
- Emit CURRENT or SUPERSEDED only when an official listing explicitly exposes an ordered LTS block and the claim explicitly asks for the current/latest LTS line; otherwise abstain.
- Strip semantic-version tokens from generic numeric-conflict heuristics to avoid treating patch/minor version identifiers as contradictory quantities.
- Add mocked end-to-end regressions for Node.js 22 versus 24 LTS, version-number false conflicts, and patch-level abstention.

# Changelog

## 0.2.11 — 2026-11-09
- CORS now fails closed unless the exact allowed origin is configured; wildcard reflection was removed.
- Added a 10-second timeout to Tavily requests.
- Disabled Workers AI inference by default; explicit `ENABLE_SEMANTIC_TRIAGE=true` is required to consume the Free daily inference allocation.
- Added regression tests for default-off inference and unconfigured-origin rejection.
- Added a native Cloudflare Rate Limiting binding for verification requests (10 per 60 seconds per client IP per edge location); approximate limits are an abuse guard, not strict global accounting.
- Rate-limit binding errors fail closed; added regression coverage.
- Public deployment remains blocked pending deployed binding validation, live Tavily integration, and privacy review.

## 0.2.10 — 2026-11-09
- Fixed Workers AI response parsing to accept Cloudflare's chat-completion envelope.
- Added a regression test using the observed Cloudflare API response structure.
- Model output remains advisory and never changes final verification status.

## 0.2.9 — 2026-11-09
- Added optional Cloudflare Workers AI semantic relation triage.
- Added bounded source snippets, strict JSON/schema validation, fail-closed handling, and advisory-only labels.
- Added UI display of model triage and limitations.

## 0.2.8 — 2026-11-09
- Added conservative polarity and numeric disagreement screening plus cross-source conflict candidates.

## 0.2.7 — 2026-11-09
- Added per-source claim-term alignment metadata as a lexical reviewer aid only.

## 0.2.6 — 2026-11-09
- Added conservative clause segmentation and response-local claim IDs.

## 0.2.5 — 2026-11-09
- Treated future publication metadata as an anomaly and added Arabic event-year extraction.

## 0.2.4 — 2026-11-09
- Improved contextual temporal detection for changeable metrics and events.
- Added bilingual synthetic benchmark runner and diagnostic documentation.

## 0.2.0–0.2.3 — 2026-11-08 to 2026-11-09
- Initial bounded claim extraction, Tavily evidence retrieval, Arabic sentence/temporal support, publication freshness metadata, and conservative abstention.


## 0.2.12 — 2026-11-09

- Added a narrowly scoped office-holder temporal check for explicit US President claims.
- Rewrites those searches into a role-specific current-office query.
- Allows CONTRADICTED only when a recent (365-day) official-domain result explicitly names a different office holder; secondary, stale, ambiguous, or conflicting evidence continues to abstain as NEEDS_REVIEW.
- Exposes the claimed and officially reported names plus source links and limitations in the UI.
- Keeps general claim entailment conservative; no unsupported semantic verdicts or confidence scores are introduced.


## 0.2.12 — 2026-11-09

- Added a narrowly scoped office-holder temporal check for explicit US President claims.
- Rewrites those searches into a role-specific current-office query.
- Allows CONTRADICTED only when a recent (365-day) official-domain result explicitly names a different office holder; secondary, stale, ambiguous, or conflicting evidence continues to abstain as NEEDS_REVIEW.
- Exposes the claimed and officially reported names plus source links and limitations in the UI.
- Keeps general claim entailment conservative; no unsupported semantic verdicts or confidence scores are introduced.


## 0.2.13 — 2026-11-09

- Restrict specialized US President office-holder searches to the official White House domain using Tavily `include_domains`, reducing unrelated news results.
- Combine source title and snippet when extracting an explicitly stated office-holder name.
- Return the actual application version constant in the verification API response (fixes stale 0.2.11 response metadata).
- Preserve strict abstention when an official source is undated, stale, ambiguous, or does not explicitly identify the office holder.
- Extend regression coverage to assert the official-domain search restriction.


## 0.2.14 — 2026-11-09

- Fix the generated Cloudflare Worker bundle: embed the HTML constant using a version-line-independent build transformation. This resolves the runtime `ReferenceError` that caused Cloudflare Error 1101 on the page route.
- Keep the normal repository source split into HTML, CSS, and JavaScript; only the deployed artifact embeds the UI.


## 0.2.15 — 2026-11-09

- Parse flattened White House administration-directory snippets that identify the President before the First Lady and Vice President headings.
- Bound the extracted name at subsequent role headings to avoid confusing the President with the First Lady or Vice President.
- Add regression coverage for the exact flattened official snippet observed in the live test and for adjacent office-holder names.
- Update the API-version integration assertion to 0.2.15.


## 0.2.16 — 2026-11-09

- Preserve a bounded office-holder context window from the full Tavily result when the role-specific administration label appears beyond the first 900 characters.
- Keep the user-facing source snippet capped at 900 characters; the additional context is used only by the specialized office-holder adjudicator.
- Add end-to-end regression coverage for a long Tavily result where the President label occurs after the display-snippet cutoff.
- Add a positive-control regression ensuring a claim naming the same current office holder is not contradicted.


## 0.2.17 — 2026-11-09

- Prevent sentence segmentation after single-letter initials and dotted uppercase abbreviations (for example, `J. Trump` and `U.S. President`).
- Add claim-extraction regression coverage for full middle-initial names.
- Add an end-to-end mocked verification test confirming a matching official office-holder name is not falsely marked `CONTRADICTED`.
- Preserve abstention as `NEEDS_REVIEW` when matching evidence does not meet a separate positive-verification rule.


## 0.2.18 — 2026-11-09

- Add one bounded, White House administration-directory-focused Tavily fallback query when the initial official-domain results contain no parseable office-holder identity.
- Deduplicate sources across the two searches and retain strict official-domain, explicit-name, and recent-publication requirements before allowing `CONTRADICTED`.
- Add regression tests for the Joe Biden negative control, Donald J. Trump positive control, middle-initial segmentation, stale/undated evidence abstention, and irrelevant official releases.
- The fallback consumes one additional Tavily Basic-search credit only when needed; no paid services or inference are enabled.


## 0.2.44 — 2026-11-11
- Bump the application and package version to `0.2.44` so the deployed health endpoint and verification API identify the exact release containing the 1900s event-date extraction fix and expanded temporal regression coverage.
- No verification policy, feature flags, secrets, or production settings changed in this version bump.



## 0.2.46 — 2026-11-12

- Added claim-level semantic source-relation assessment as advisory evidence metadata; final adjudication remains conservative and evidence-gated.
- Enabled semantic triage and correction-candidate review explicitly in the dedicated Staging configuration.
- Removed the quota-verification gate that could silently suppress explicitly enabled functionality when account usage visibility was unavailable.
- Preserved bounded source/query/model work, fail-closed behavior, independent-source requirements, and abstention on mixed or insufficient evidence.
- Staging live acceptance workflow #43241870828 passed, including Arabic Python 2 lifecycle correction and three-claim correction isolation.
- No production deployment or hackathon submission was performed.


## 0.2.46 — randomized QA and Staging browser acceptance (2026-11-12)

- Added deterministic seeded randomized property coverage (1,950 generated iterations) and expanded regression suite to 200 tests.
- Fixed person-first US office-holder phrasing to recognize `is the current President` and equivalent US President wording.
- Added bounded randomized-order Staging acceptance for Arabic/English Python 2 lifecycle, office-holder contradiction, Node.js lifecycle, official pricing abstention, stable facts, and multi-claim isolation.
- Added browser acceptance for provided correction rendering, quote/citation display, safe links, inert HTML-like input, mobile layout, keyboard submission, and live API integration.
- Live randomized acceptance #43248554981 and browser acceptance #43247308055 passed.
- Kept existing request rate limiting unchanged; consolidated tests to remain within the configured limit.
