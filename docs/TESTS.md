## Final v0.2.47 Staging gate — 2026-11-12
- Final code commit: `2c76535cadaa074cdd5e0bf3b2c7d504bdfa3536`.
- Node verification: **210/210 PASS**; syntax checks and temporal smoke benchmark passed.
- Staging deployment: [#43265374345](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43265374345) **SUCCESS**. Cloudflare Worker version ID: `a81e386c-221f-4a06-95a2-4713a998db6b`.
- Live randomized acceptance: [#43265496909](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43265496909) **SUCCESS**, 16 cases spanning 12+ subject areas, including 4-claim and 5-claim mixed-domain inputs.
- Confirmed deterministic regression contracts: independent corroboration by registrable domain; correction review also rejects sibling subdomains; exact legal milestone/date matches do not become MIXED solely due to later application dates; negation and named-instrument mismatch prevent the milestone override.
- Live confirmed outcomes include: Python 2.7 SUPERSEDED with a claim-local official correction; obsolete US-president claim CONTRADICTED; TLS 1.0/1.1 deprecation CURRENT with two independent official sources; stable/historical claims can still abstain when evidence qualification is insufficient.
- Remaining conservative abstentions: WHO PHEIC termination and current UK/EU membership returned NEEDS_REVIEW. WHO retrieval did not find a relevant primary WHO page; Brexit sources were semantically contradictory but failed the fresh/qualified independent-source gate. These are retrieval/qualification gaps, not evidence for lowering thresholds.
- EU AI Act entry-into-force sources were all semantically SUPPORTS after milestone normalization, but final status remained NEEDS_REVIEW because only one independent official registrable domain qualified.
- Staging v0.2.47 is verified. Production remains unchanged. No paid services, billing changes, secret modifications, or Production deployments.

## v0.2.47 source-independence regression — 2026-11-12
- Node test suite completed **206/206 PASS** on commit `6d9dc2e611a95613706e69912189f59a557cb1cb`.
- New tests prove sibling subdomains of one publisher cannot count as independent corroboration, while two independent registrable domains can satisfy the corroboration threshold.
- Official first-party source recognition expanded selectively for Microsoft Learn, Oracle Documentation, RFC Editor and additional official institutional roots; arbitrary hosts remain UNASSESSED.
- Semantic prompt regression now distinguishes legal entry-into-force dates from later application/enforcement dates.
- Staging deploy on the code commit was blocked by outdated synthetic test fixtures; fixtures were corrected to use independent registrable domains. A fresh Staging deployment and v0.2.47 live acceptance are still required before calling this version Staging-verified.
- No threshold relaxation, Production deployment, paid-service activation, billing change, or secret change.

## Cross-domain English live acceptance — 2026-11-12 (v0.2.46)
- Private source commit tested: `a2c069a9e06eae881c84be17bc74f7fe6ba42c0d`.
- GitHub Actions live Staging run [#43261332019](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43261332019): **SUCCESS**.
- The seeded randomized-order suite exercised 16 cases spanning science, public health, technology/software lifecycle, cybersecurity, economics/pricing, law/regulation, government, geopolitics, business leadership, space, transport, sports, and two multi-claim inputs (4 claims and 5 claims).
- Assertions passed for claim counts and unique IDs, supported status/temporal enums, evidence and explanation structures, correction/citation contracts, claim-local correction isolation, Node lifecycle evidence, official pricing abstention, and the specialized Python/office-holder cases.
- The five-claim cross-domain request extracted five independent claims, stayed within the five-search request budget, and returned five distinct claim-level evidence structures. All five were conservatively classified `NEEDS_REVIEW`; this is not a factual-accuracy pass for those domains.
- Several generic single-domain cases (public health, law, cybersecurity, geopolitics, business, space, transport, sports, science) also returned `NEEDS_REVIEW` despite retrieving sources. This is a product-capability gap to investigate, not a confirmed false verdict: the engine currently requires complete semantic relation assessments and at least two independent high-relevance primary/institutional domains for generic definitive outcomes.
- Follow-up source-audit run [#43261880788](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43261880788) is in progress; it adds per-source reliability/relevance, semantic relation, publication/event date, adjudication-signal diagnostics and checks evidence-basis URLs against each claim's own source set.
- Node CI verification run [#43261899754](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43261899754): **SUCCESS** after the audit-test changes.
- No Worker/application code, Staging configuration, Production Worker, paid service, billing setting, or API secret was changed by this test expansion. The Staging runtime remains v0.2.46.
- Do not claim real-world precision/recall or general accuracy from this bounded live matrix. Production release remains blocked pending source-level diagnosis, broader acceptance, and security/privacy review.

## v0.2.43 — explicit wrong/right claim presentation (PR #52 merged; Staging deployed)
- Added a bilingual per-claim comparison that preserves the exact original claim and explains what is wrong, outdated, or unresolved.
- The correct-statement section displays a replacement only when the existing correction contract returns `PROVIDED`; otherwise it explains why no safe alternative can yet be stated.
- Added five UI contract regression tests for Arabic/English labels, validated-only correction rendering, safe abstention, clickable source links, verbatim quote support, and distinct visual states.
- Exact PR-head CI run #43065029135 passed: 154/154 Node tests; Worker, adjudication, domain-adapter, and browser syntax checks passed; temporal smoke benchmark passed.
- PR #52 merged into `main` as `88e5ca44ffe0f2294449ec21e88b831edad8b7b6`.
- Staging deployment #43065149282 succeeded from merge commit `88e5ca44ffe0f2294449ec21e88b831edad8b7b6`; Wrangler reported Cloudflare Version `bfb56ad1-4989-4b11-8213-c28a6ba500b6`. The deploy job reran all 154 tests, syntax checks, and the 32-case synthetic benchmark successfully before deployment. Independent GET `/api/health` returned `ok=true`, service `FreshProof`, version `0.2.43`, mode `evidence-triage` on 2026-11-11 via Exa page fetch; the root UI page was also retrieved. Live POST and interactive browser/visual acceptance remain pending. Production unchanged.

# Test Record — FreshProof v0.2.22

## Automated CI verification
- Pull request: #14 (merged).
- Tested head commit: `a431dac1bf54ff2a9d78f0299a233e2b914eae63`.
- GitHub Actions run: `42635872632`.
- `npm test`: **58 passed, 0 failed**.
- `node --check worker/index.js`: passed.
- `node --check src/app.js`: passed.
- `npm run benchmark:temporal`: 32/32 expected synthetic diagnostic cases (TP=16, FP=0, TN=16, FN=0).
- The benchmark is hand-authored and synthetic; it is not a real-world accuracy estimate.

## v0.2.22 coverage
- Explicit antecedent resolution for pronoun-led Twitter/X claims while preserving original claim text.
- Query context propagation and resolved-claim evidence alignment.
- Alias-aware X/Twitter relevance and official brand-domain profiling.
- Low-relevance source exclusion from adjudication with a separate audit list.
- End-to-end mocked verification that retains X brand-toolkit evidence and excludes unrelated Instagram content.
- Regression coverage preserving the specialized official office-holder rule.
- Workers AI remains disabled by default; no inference quota consumed by these tests.

## Deployment verification
- Worker version 19 deployed with 100% traffic allocation.
- Post-deployment Cloudflare API inspection confirmed version, deployment, exact origin, rate-limit binding, and presence of the Tavily secret binding.
- Live `/api/health` and browser verification against Tavily remain pending.

## Limitations
Lexical relevance is not semantic entailment. LOW results are separated from adjudication but retained for audit. The engine continues to abstain when available sources are insufficient. No real-world precision/recall, citation correctness, latency, or cost-per-claim claims are made without a held-out evaluation set.


## v0.2.41 — full-product offline integration fixtures (2026-11-11)
- Added `tests/product-integration.test.js`, which sends a synthetic request through the Worker `POST /api/verify` handler and exercises the integrated VERIFY → EXPLAIN → CORRECT response path.
- Positive fixtures: (a) two independent synthetic official sources contradict the stale claim and support a scope/timeframe-matched replacement (`PROVIDED`); (b) two independent sources support the original claim (`CURRENT`, `NOT_NEEDED`).
- The generic fixture also asserts that a newly published source about an older event keeps publication date separate from an unadjudicated event-date candidate.
- Negative fixtures: mixed support/contradiction, one-source insufficiency, duplicate URLs on the same host, invalid/non-source-backed quote, and low-relevance evidence exclusion. These must abstain or withhold correction.
- Fake AI and fake Tavily responses are injected locally by the test. No network search or model inference is performed.
- Frontend contract test checks that correction quotes are inserted as text content and source links use safe external-link attributes. This is not a browser screenshot or interactive visual acceptance test.
- Exact-HEAD CI run #43042607997 passed: 147/147 Node tests; Worker, adjudication, domain-adapter, and browser syntax checks passed; 32-case synthetic temporal smoke benchmark passed (diagnostic only).
- Staging deploy run #43042608131 succeeded; Worker Version ID `e551c628-2cbb-4ebb-8902-eab99a980f88`.
- Production unchanged. Independent `/api/health` re-read and browser POST/visual acceptance remain pending. Synthetic integration coverage is not a real-world accuracy estimate or proof of semantic entailment.


## v0.2.42 — factual verification for all claims (PR #51)
- Added a separate temporal-assessment field and removed the non-time-sensitive early return.
- Added Worker API fixtures showing a stable claim can reach `CURRENT` only when two independent institutional sources are explicitly assessed as supporting it.
- Added a negative control showing the same stable claim remains `NEEDS_REVIEW` and correction is withheld when semantic assessment is disabled, even when search results exist.
- Added frontend contract checks for plain-language evidence verdicts and the secondary temporal note.
- Exact-branch CI run #43060766170 passed: 149/149 Node tests; Worker, adjudication, domain-adapter, and browser syntax checks passed; 32-case synthetic temporal diagnostic passed.
- Synthetic fixtures prove pipeline wiring and fail-closed behavior only. They do not establish real-world semantic accuracy or citation correctness.
- Workers AI remains disabled unless the existing explicit opt-in and free-quota gates are satisfied. The PR validation run itself did not deploy. After merge, main CI #43061144562 passed and Staging-only deployment #43061144474 succeeded (Worker Version `83c025c2-79e5-4440-ae08-ba842c80d5bf`). Production remains unchanged.



## v0.2.46 — semantic evidence assessment and bounded live acceptance (2026-11-12)
- Semantic source-relation triage and correction-candidate review are explicitly enabled in the dedicated Staging configuration. Semantic output is advisory; final verdict policy remains deterministic and evidence-gated.
- The previous `FREE_WORKERS_AI_QUOTA_VERIFIED` feature gate was removed. Feature availability is controlled by the explicit feature flags; missing bindings or unavailable/malformed model output fail closed. No feature is disabled merely because a quota-visibility permission is unavailable.
- Live Staging acceptance run [#43241870828](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43241870828) completed SUCCESS on commit `890dc81362ca05828c843e1d36825d39c0ed94f4`.
- Live checks passed for stable-claim abstention and secondary temporal classification, current office-holder contradiction, Arabic Python 2 supersession/correction, Node lifecycle supersession, official pricing abstention, historical-claim abstention, and a three-claim request.
- Multi-claim assertions verified independent claim outcomes, temporal classification per claim, and that a correction is attached only to its eligible claim. Recorded request duration was 8,897 ms; this is one run, not a performance benchmark.
- The stable-control workflow wording has been aligned with the enabled advisory semantic triage: the stable claim still requires independent factual evidence and correctly abstains when evidence is insufficient.
- Live acceptance is bounded integration evidence, not a representative accuracy evaluation. Synthetic fixtures and the 32-case benchmark remain regression diagnostics only.


## 2026-11-12 — seeded randomized and live acceptance expansion

- Added five seeded property tests covering 1,950 generated iterations: claim segmentation bounds/determinism, temporal classifier totality, evidence adjudication invariants, malformed semantic assessment abstention, and stable-claim factual verification.
- Main CI passed **200/200** Node tests, Worker/adjudication/domain/browser syntax checks, and the 32-case synthetic temporal diagnostic.
- Live Staging run [#43248554981](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43248554981) passed seven sequential randomized-order requests plus two smoke controls (nine total): stable claim, Arabic/English Python 2 lifecycle, person-first office-holder, Node.js lifecycle, official pricing, and a three-claim answer.
- Observed expected live outcomes: stable science `NEEDS_REVIEW / NOT_TIME_SENSITIVE`; Python 2.7 (Arabic and English) `SUPERSEDED` with Python.org correction; stale US office-holder `CONTRADICTED`; Node.js v20 `SUPERSEDED` with correction withheld; ChatGPT Plus pricing `NEEDS_REVIEW`; three-claim isolation passed.
- The randomized live suite validates response schema, unique claim IDs, temporal assessment per claim, correction evidence references, official source/date wording for the Python lifecycle adapter, and conservative abstention.
- Browser acceptance [#43247308055](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43247308055) passed the four-card deterministic fixture (Arabic RTL, English LTR, validated correction, inert HTML-like text), mobile viewport, keyboard submission, safe citation links, and live Worker API integration.
- The synthetic 32-case benchmark remains a hand-authored regression diagnostic, not a real-world accuracy estimate. Live cases are bounded acceptance tests, not held-out evaluation.
