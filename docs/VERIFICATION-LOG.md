# Verification Log — 2026-11-12 (v0.2.47 final Staging gate)
- Commit: `2c76535cadaa074cdd5e0bf3b2c7d504bdfa3536`.
- Unit/integration/regression tests: **210/210 PASS**.
- Staging deploy workflow [#43265374345](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43265374345): SUCCESS.
- Cloudflare Staging Worker version ID: `a81e386c-221f-4a06-95a2-4713a998db6b`.
- Live randomized acceptance [#43265496909](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43265496909): SUCCESS, 16 cases across science, public health, technology, cybersecurity, economics, law, government, geopolitics, business, space, transport, sports and mixed-domain inputs.
- Confirmed: claim-local extraction and evidence; 4-claim mixed-time request; 5-claim cross-domain request; correction citations; abstention; TLS 1.0/1.1 CURRENT with two independent first-party technical domains.
- New safeguards: independent sources counted by registrable publisher domain; correction candidate review uses same grouping; exact legal milestone/date support is guarded against negation and different named instruments.
- Open gaps: WHO PHEIC retrieval found no relevant WHO primary page; current UK/EU membership sources contradicted the claim but failed the fresh/qualified independent-source threshold; EU AI Act had only one independent official publisher. The engine correctly returned NEEDS_REVIEW.
- UI browser acceptance for the unchanged UI passed previously; current code changes are Worker-side only. No Production deployment.
- No billing changes, paid service activation, API secret changes, or Production configuration modifications.
- State: IMPLEMENTED / TESTED / VERIFIED on Staging. DEPLOYED: Staging only. Production: not deployed. Submitted: no.

# Verification Log — 2026-11-12 (v0.2.47 source independence)
- Commit: `6d9dc2e611a95613706e69912189f59a557cb1cb` — 206/206 Node tests passed.
- Added registrable-domain independence so sibling subdomains from one publisher are not counted as independent corroboration.
- Added regression tests: two Microsoft subdomains do not satisfy the independent-source threshold; Microsoft Learn plus RFC Editor can satisfy it when both are high-relevance, first-party and semantically supporting.
- Curated official technical/standards domains: Microsoft Learn, Oracle Documentation, RFC Editor, and institutional domains; arbitrary domains remain UNASSESSED.
- Refined semantic relation instructions to distinguish legal entry-into-force dates from later application/enforcement milestones.
- Staging deployment for v0.2.47 is pending; previous deployment attempt was correctly blocked by the test failures caused by obsolete synthetic fixtures. Those fixtures were updated to use independent registrable domains and the full suite now passes.
- Production unchanged. No billing, paid service, API secrets, or Production configuration changed.
---
# Verification Log — 2026-11-12 (cross-domain live QA)
- Staging runtime: `0.2.46`; endpoint: `https://freshproof-staging.ralhamdan7.workers.dev`.
- Live acceptance run [#43261332019](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43261332019) completed SUCCESS on commit `a2c069a9e06eae881c84be17bc74f7fe6ba42c0d`.
- Randomized suite: 16 input cases across science, public health, technology, cybersecurity, economics/pricing, law/regulation, government, geopolitics, business, space, transport, sports, and cross-domain inputs.
- Four-claim mixed-timeframe result preserved claim-local status, temporal assessment and correction: Apollo 11 CURRENT; water NEEDS_REVIEW; Python 2.7 SUPERSEDED with one official correction reference; Joe Biden current-office claim CONTRADICTED with correction withheld.
- Five-claim cross-domain input extracted five distinct claims and five distinct claim IDs; all were NEEDS_REVIEW with source counts 2–5 and evidence-basis counts 2–5. Request-wide search budget: 5/5.
- The broader generic cases largely returned NEEDS_REVIEW. This is recorded as an unresolved capability gap, not a proven adjudication bug. Current code requires complete advisory semantic assessment and two independent high-relevance primary/institutional domains for generic definitive verdicts.
- Source-audit run [#43261880788](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43261880788) is in progress; it checks claim-local source alignment and emits source reliability/relevance, semantic relations, publication/event dates, and adjudication signals for four representative domains.
- Automated verification run [#43261899754](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43261899754): SUCCESS.
- No application Worker code or deployment was changed. No Production release, billing change, paid service, or secret modification.
- State: expanded suite IMPLEMENTED and TESTED; bounded live suite VERIFIED; source-level diagnosis PENDING; Production DEPLOYED: no; submission: no.

# Verification Log — 2026-11-11 (v0.2.43 owner-assisted acceptance)
- Environment: Staging `https://freshproof-staging.ralhamdan7.workers.dev`; application version shown in the current deployment record is `0.2.43`.
- Input: `Python 2.7 is still officially supported.`
- User supplied a full mobile screenshot of the result.
- Observed result: one claim; status `SUPERSEDED`; original claim preserved; correction `PROVIDED` with wording “Python 2 is no longer supported; its support ended on January 1, 2020.”
- Observed evidence: official Python.org sunset page URL and relevant excerpt; event date `2020-01-01`; source publication date `NOT PROVIDED`; retrieval timestamp separately displayed.
- Acquisition limitation: direct Python.org retrieval returned HTTP 403. The domain adapter accepted a domain-restricted indexed excerpt only after checking the exact first-party host/path and both the sunset date and explicit no-support wording. The report explicitly states the page itself was not fetched.
- Screenshot also shows Evidence Confidence `LIMITED`, which is appropriate for one source, and semantic triage disabled by default.
- Acceptance: PASS for this specialized live flow (claim extraction → narrow domain adjudication → correction eligibility → visible explanation and source link). This does not establish broad real-world precision/recall or generalize to other domains.
- New offline contract suite: `tests/acceptance-contracts.test.js`, seven cases, merged via PR #53 as `d4f26f7bf7ae49a59dba6c1455a203307e66e1b3`.
- PR CI run #43069227261: SUCCESS. Exact GitHub checkout executed 161/161 Node tests (0 failures), Worker/adjudication/domain-adapter/browser syntax checks, and the 32-case synthetic temporal smoke benchmark. This supersedes the earlier local-source limitation for test execution; the uploaded ZIPs remain historical snapshots only.
- Main-push CI run #43069341787 was queued after merge and is tracked separately.
- No Tavily live request was made during this continuation. No paid service, billing change, secret change, quota upgrade, production configuration change, or deployment was performed. GitHub Actions did execute the requested verification run within the available account configuration.
- Release state: tests IMPLEMENTED, TESTED and PR CI VERIFIED; merged to main; application/Staging unchanged; Production unchanged.

# Verification Log — 2026-11-09

## Ownership and provenance records
- `OWNERSHIP.md` and `docs/PROVENANCE.md` were created in the dedicated private FreshProof repository.
- Both files were fetched back from GitHub after creation and their content was confirmed.
- README and CHANGELOG references were fetched back and confirmed.
- Repository package metadata was re-fetched and confirmed at version 0.2.4.
- This verifies that the documentation commits are present on the default branch; it is not a legal registration of intellectual property.

## Supplied archive integrity and test
- Input: `freshproof-v0.2.zip`
- SHA-256: `8710824987b9ae27218d1e86c3f8be10a938a68b648935af870e36b903fc0108`
- Runtime: Node.js v22.16.0
- Command: `node --test`
- Result: 11 tests passed, 0 failed.
- Scope: exact supplied archive, version 0.2.0 only.

## Current repository
- Repository: `ralhamdan7-lab/freshproof`
- Branch: `main`
- Package version observed: `0.2.4`
- Exact source/test blob identifiers observed:
  - README.md: `78033cb2b484ac2821dd122b8f1a33cdc8b41530` (before ownership links; later changed)
  - package.json: `f944c0645620ab4a5b90ea7c3fdcf2f79649c702`
  - worker/index.js: `5fad1972ca9208151451a0df98196f644afc74ab`
  - tests/logic.test.js: `49324ab3c25828e33cb8ec7edb374f36fa0ca6b1`
- Full v0.2.4 test execution remains pending. A local Git clone attempt failed because github.com could not be resolved in the execution environment. GitHub source retrieval succeeded, but source retrieval is not code execution.

## Synthetic benchmark
- The repository contains a 32-case bilingual synthetic diagnostic benchmark and documents a 16 TP / 0 FP / 16 TN / 0 FN result after rule refinement.
- This is a hand-authored diagnostic set, not a held-out evaluation and not a real-world accuracy claim.
- It does not establish semantic verification quality, evidence correctness, citation correctness, or generalization.

## Next verification gate
1. Obtain an exact local copy of the current repository source through a supported file-transfer path.
2. Run `npm test` and `npm run benchmark:temporal` against that exact source.
3. Record command output, runtime, source commit, and results.
4. Do not deploy or make accuracy claims until the remaining security and evaluation gates pass.


## v0.2.11 security patch verification — 2026-11-09
- Added exact-origin CORS fail-closed behavior, 10-second Tavily timeout, and Workers AI opt-in default.
- Added Cloudflare native Rate Limiting binding: 10 verification requests per 60 seconds per client IP per edge location; approximate only, not a strict global quota.
- Rate-limit binding errors reject safely; rate-limit rejection is covered by a mocked unit test.
- Local test suite: 33 passed, 0 failed.
- Synthetic temporal benchmark: 32/32 expected cases; diagnostic only, not real-world accuracy.
- JavaScript syntax checks and ZIP integrity passed.
- No Tavily live request, Worker creation, or deployment has occurred.


## v0.2.22 implementation, CI, and deployment — 2026-11-09
- Repository: `ralhamdan7-lab/freshproof`; merged PR #14.
- Merge commit: `576c91f88ca881533cb93a3d7c92b41a8ec7fe76`.
- CI run: `42635872632`; 58/58 tests passed, 0 failed.
- Worker and browser JavaScript syntax checks passed.
- Synthetic temporal smoke benchmark: 32/32 expected classifications (TP=16, FP=0, TN=16, FN=0); diagnostic only.
- Deployed Worker version: 19; version ID `957f99c4-8482-4f24-8d6b-228644651364`.
- Deployment ID: `fcede8a0-0023-4546-ab9a-e177c3714970`; 100% traffic allocation.
- Post-deployment configuration inspection confirmed the exact allowed origin, native rate limiter (10/60 seconds per client IP per edge location), and continued presence of the `TAVILY_API_KEY` secret binding. Secret value was not retrieved.
- Dedicated Cloudflare account listed only the `freshproof` Worker at inspection time.
- Usage model reports `standard`; no paid service, payment method, or billing change was enabled. Billing-plan details could not be verified because the connected OAuth permissions do not include Billing Read.
- Live health endpoint and user-facing Tavily verification are pending; do not declare full acceptance until completed.


## Domain-agnostic core refactor — 2026-11-09
- Work branch: `refactor/domain-agnostic-core`, based on main commit `db46cba5cb1961ade7c76b6d7936a98b67556091`.
- Added `worker/domain-adapters.js` and routed the core request pipeline through a constrained adapter contract.
- Removed Twitter/X and office-holder conditional branches from `worker/index.js`; preserved the existing specialized behavior behind adapters.
- Added a request-wide five-call search budget and request-local caching for adapter evidence.
- Updated the UI to render generic adapter evidence, and updated architecture documentation.
- Added regression coverage for adapter selection and search-budget enforcement.
- Status: IMPLEMENTED on an isolated branch. Automated CI, full test execution, and runtime verification are pending. No production deployment or merge performed.


## Adapter refactor CI verification — 2026-11-09
- Pull request: #18 — `https://github.com/ralhamdan7-lab/freshproof/pull/18`.
- Tested merge commit: `f55b38919ebb70a92c341afed52ed522e7408ac9` (initial CI pass) and final head `f6b076b5573c1b87412e0c6cbf9a2ca41dfe110d`.
- Final GitHub Actions run: `42646997676`, workflow `FreshProof verification tests`, conclusion SUCCESS.
- Node test suite: 65 passed, 0 failed.
- Worker syntax check: passed.
- Browser application syntax check: passed.
- Synthetic temporal benchmark: 32 cases; precision 1.0, recall 1.0, false-positive rate 0.0. This is a hand-authored regression diagnostic only, not a real-world accuracy estimate.
- The first CI attempt found two regressions caused by adapter-local token normalization; both were corrected by delegating token normalization to the core. The next run passed all 65 tests.
- PR #18 was squash-merged into `main` as commit `2971e8d43357e37cbc56116f3acc427a7af5f796` after the successful CI run.
- Production Worker remained unchanged: version 21 (`0.2.24`), version ID `4e96bf6c-8d6f-4f29-93bd-124589b5bd69`, 100% traffic. The current deployment's 10/60-second rate-limit binding and secret binding were rechecked.
- No production deployment, secret change, billing change, or persistence change was performed.


## Live acceptance gate attempt — 2026-11-09
- Reconfirmed the default branch contains the merged domain-adapter refactor and the latest documentation checkpoint.
- Reconfirmed the existing production application URL from the project deployment record: `https://freshproof.ralhamdan7.workers.dev`.
- Automated GET to `/api/health` through the connected Cloudflare execution environment was blocked by that tool's outbound-request policy before reaching the Worker (HTTP 403 text: `Forbidden: requests to freshproof.ralhamdan7.workers.dev are not allowed`). This is a tooling/network restriction, not an application health response.
- Exa page extraction returned `CRAWL_EMPTY_CONTENT` for the Worker UI and JSON health route; this does not establish application failure or success.
- No POST to `/api/verify` was executed, so live Tavily connectivity, actual provider response, latency, and live source quality remain UNVERIFIED.
- Production remains on Worker v21 / v0.2.24. No staging Worker was created because the existing Tavily secret value is non-readable and must not be copied or exposed; no production deployment was attempted.
- Next owner-assisted acceptance check: open the live application in a normal browser, verify the health response reports version `0.2.24`, then submit the stale-office-holder test below. Record the exact returned status, source URLs, publication dates, and reported holder. This validates the existing live provider integration only; the refactored `0.2.25` remains CI-verified but not deployed.
- Test input: `As of November 2026, the President of the United States is Joe Biden.`
- Expected baseline behavior: if current, recent White House primary-source evidence explicitly identifies a different holder, the legacy production rule may return `CONTRADICTED`; otherwise it must abstain. A search result alone is not sufficient unless the returned source content actually identifies the current holder.


## Owner-assisted live acceptance — 2026-11-09
- The owner opened the production health endpoint and supplied screenshots showing `{"ok":true,"service":"FreshProof","version":"0.2.24","mode":"evidence-triage"}`.
- The owner then submitted: `As of November 2026, the President of the United States is Joe Biden.`
- The live production Worker returned one claim with status `CONTRADICTED`, publication freshness `FRESH` (newest publication date shown: 2026-10-19), and evidence confidence `LIMITED`.
- Screenshot inspection shows the primary displayed result is an unrelated White House presidential-action page titled “Advancing Women's Health to Improve Outcomes in All Phases of Life”. Its extracted text contains site-wide navigation (“About President Trump”) and a signature block. The result's lexical/relation screens explicitly state they do not establish entailment or a truth verdict.
- The displayed office-holder rule nevertheless promoted the name extracted from this page to a `CONTRADICTED` verdict. This is a false-positive risk: an official domain plus a recent publication date is not sufficient proof that the page is a current office-holder profile.
- Live integration is VERIFIED at the basic level: production health route, browser UI, upstream search result rendering, and response generation all worked. Correctness of this specific verdict is NOT VERIFIED and is considered a defect. No claim is made about the actual accuracy of the full engine from this one test.
- Remediation implemented on isolated branch `fix/office-holder-evidence-gating`: office-holder extraction now requires a URL under the official `/administration/` path; unrelated White House article pages are ineligible and should trigger the bounded fallback search instead. Added a regression test matching the observed navigation-only failure.
- Patch status: IMPLEMENTED. A local Node.js 22.16.0 isolated regression suite passed 9/9 focused cases covering: navigation-only article rejection; official administration directory/profile acceptance; unrelated host and lookalike-host rejection; malformed/missing URL rejection; VP/First Lady non-confusion; stale/missing-date fallback; and fallback suppression only for recent eligible official evidence. The first run exposed a lookalike-host gap (8/9); the helper was hardened to validate the parsed hostname as exactly `whitehouse.gov`, and the rerun passed 9/9. The repository regression test now includes this spoofed-host case. This is a focused helper-level suite, not the full repository suite. Full `node --test`, benchmark, and GitHub CI remain NOT YET VERIFIED. The checked-in workflow runs on pull requests to `main`; no PR was opened because that would trigger Actions and risk consuming exhausted free quota. Production remains Worker v21 / v0.2.24; no deployment was performed.


## Local full-suite verification — 2026-11-09
- Source integrity: the owner-supplied branch ZIP was checked against the latest GitHub branch blobs. SHA-1 Git blob IDs matched exactly for `worker/domain-adapters.js` (`b448187b2b3af4eafc45fe9d284f485d07863b6c`), `tests/logic.test.js` (`a385cfba4fbf567b7c9afe16a4aedf35d541c1f6`), and this verification log before this entry (`652a7b511313d817f08390c12936e8507dced2a3`).
- Runtime: Node.js `v22.16.0`.
- `node --test`: PASS — 66 tests, 0 failures, 0 skipped.
- Syntax checks: PASS — `node --check worker/index.js`, `node --check worker/domain-adapters.js`, and `node --check src/app.js`.
- Temporal smoke benchmark: PASS — 32 synthetic diagnostic cases; TP=16, FP=0, TN=16, FN=0; precision=1.0, recall=1.0, FPR=0.0. This dataset is synthetic and is not a real-world accuracy estimate.
- No GitHub Actions workflow was triggered. The full local test suite was executed against the exact source blobs from the latest branch ZIP.
- Release state: these results verify the branch's local test suite and smoke benchmark only. CI remains NOT RUN; PR is NOT OPENED; merge is NOT COMPLETED; production remains Worker v21 / app v0.2.24; no deployment was performed.


## Full local acceptance run from owner-provided branch archive — 2026-11-09
- Archive: `freshproof-fix-office-holder-evidence-gating.zip`; extracted to an isolated temporary workspace. Node.js `v22.16.0`.
- Archive source integrity: key source/test files were previously hash-compared with the corresponding GitHub branch content; this run executed the owner-provided archive contents.
- Full repository tests: `npm test` / `node --test` — **66 passed, 0 failed, 0 skipped**.
- Syntax checks: `node --check worker/index.js`, `node --check worker/domain-adapters.js`, and `node --check src/app.js` — all passed.
- Temporal smoke benchmark: `npm run benchmark:temporal` — 32 synthetic cases; TP=16, FP=0, TN=16, FN=0; precision=1.0, recall=1.0, FPR=0.0; zero error cases. Synthetic diagnostic only; not a real-world accuracy estimate.
- This establishes local test and syntax acceptance for the archive. GitHub Actions CI has not run for this branch. The existing workflow triggers on pull requests to `main`; opening a PR would consume Actions quota. No PR was opened, no merge was performed, and no production/staging deployment was performed.
- Release state remains: local tests PASS; GitHub CI PENDING; merge PENDING; staging acceptance PENDING; production remains Worker v21 / v0.2.24.



## PR #19 CI, merge, and isolated staging checkpoint — 2026-11-09
- Pull request #19: `fix: gate office-holder verdicts on official administration evidence`.
- GitHub Actions run: `42650700408`, run number 45, workflow `FreshProof verification tests`, conclusion SUCCESS. All job steps completed: checkout, Node tests, Worker syntax, browser-app syntax, and temporal smoke benchmark.
- PR #19 was squash-merged into `main`. Merge commit: `b0dba21a8d33308994aec8e9fedbd6483836ec72`. Post-merge inspection confirmed the exact-host and `/administration/` path guard is present in `main`.
- Changed files: `worker/domain-adapters.js`, `tests/logic.test.js`, and `docs/VERIFICATION-LOG.md`.
- Account-isolation clarification: the Cloudflare connector display label is not the account identity. The owner has explicitly confirmed that the Raed AI Superhero and FreshProof projects use separate Cloudflare accounts and separate email identities; this is the accepted project operating fact. The FreshProof-linked Cloudflare connection returned exactly one account, `cf293e4a6aee5d9dd87a883a00e08c4b`, named `Ralhamdan7@gmail.com's Account`, created `2026-11-09T07:00:16Z`. It lists the dedicated `freshproof` Worker. Do not block FreshProof work merely because the connector label contains the Raed AI Superhero product name.
- Created a separate staging Worker `freshproof-staging` in that FreshProof account from the exact `main` source modules `worker/index.js` and `worker/domain-adapters.js` (package version 0.2.25). Worker deployment ID: `15d3c9ee7a7846a485c1aa51f8fd34b5`; script tag: `411fe24ef9a5473d9595a885254f7f90`. Its workers.dev subdomain was enabled with preview URLs disabled; URL: `https://freshproof-staging.ralhamdan7.workers.dev`.
- Staging has a separate rate-limit namespace `27112027`, limit 10 requests / 60 seconds, and exact allowed origin set to the staging URL. The production Worker `freshproof` and its bindings were not modified.
- Staging limitation: the non-readable production `TAVILY_API_KEY` secret was not copied or exposed. The staging Worker currently has no Tavily secret binding and no static-assets binding. Therefore the staging Worker is deployed, but live verification requests requiring Tavily and the complete browser UI are NOT READY / NOT VERIFIED. The health route is implemented in the deployed source, but external runtime probing from this execution environment failed at DNS resolution (`curl: Could not resolve host`), so no live health response is claimed.
- Next gate: add the Tavily key directly through the official Cloudflare dashboard secret interface for `freshproof-staging` (never paste it into chat), configure staging static assets from the repository `src/` directory, then perform live health and controlled verify tests. Keep production at Worker v21 / app v0.2.24 until staging acceptance passes.
- Cost and release: no payment method, paid service, or billing change was made. The staging Worker uses standard Workers runtime and a dedicated rate-limit binding; actual account billing-plan entitlement remains unverified. Production remains unchanged and no production deployment was performed.


## Diverse claim acceptance plan and staging UI smoke verification — 2026-11-09
- Owner explicitly approved the diverse claim acceptance matrix and authorized continued work within FreshProof's isolated scope and available permissions. This does not authorize production deployment, paid services, billing changes, or use of other projects' resources.
- Added `docs/DIVERSE-CLAIM-ACCEPTANCE-MATRIX.md` (18 test scenarios) in commit `429e92537c6e8a5ef2aefa7031e93d233b3eff60`; fetched the file back from GitHub main and confirmed its content. Matrix status: PLANNED; matrix execution is not yet complete.
- Re-ran the supplied isolated archive `freshproof-fix-office-holder-evidence-gating.zip` with Node.js v22.16.0: `npm test` PASS — 66 tests, 0 failures, 0 skipped; `npm run benchmark:temporal` PASS — 32 synthetic diagnostic cases, TP=16, FP=0, TN=16, FN=0; precision=1, recall=1, FPR=0. These synthetic results are not live-provider or real-world accuracy evidence.
- Cloudflare account isolation preserved: account `cf293e4a6aee5d9dd87a883a00e08c4b`; staging Worker `freshproof-staging`; latest deployment ID `1e2536ce-04e1-4b99-adb0-ad9a2d6aadca`, version ID `6edaffa7-863e-40bc-86fc-2d803405424f`, 100% Staging traffic. Settings inspection confirmed the staging-only `TAVILY_API_KEY` secret binding, exact staging `ALLOWED_ORIGIN`, and dedicated rate limiter 10/60 seconds. Secret value was not read.
- Live GET verification through Exa page fetch: staging root returned the FreshProof UI page; `/api/health` returned `ok:true`, service `FreshProof`, version `0.2.25`, mode `evidence-triage`; `/styles.css` returned CSS content. This establishes public GET reachability and basic UI/health serving. The crawler rejected `/app.js` due to unexpected content type, so browser execution of the JavaScript bundle is not yet verified.
- Live POST `/api/verify` against Tavily has not yet been executed. Therefore the 18-case live acceptance matrix, the mandatory office-holder scenario on Staging, source/citation correctness, latency, and actual upstream Tavily behavior remain NOT VERIFIED.
- Production remains Worker v21 / app v0.2.24, unchanged. No production deployment, billing change, paid resource, or cross-project resource use occurred.
- Next step: execute controlled live POST verification cases on Staging through a browser-capable request path; inspect exact claim statuses, evidence URLs, event/publication dates, source reliability, and abstention. Keep the office-holder regression as a mandatory independent case. Do not promote to production before the full release gate.


## Owner-assisted Staging live batch 1 — five diverse claims — 2026-11-09
- User submitted five claims in one request through the Staging UI. Screenshot evidence shows exactly five claim cards (5/5).
- Aggregate UI summary: 5 claims; 0 CONTRADICTED; 0 SUPERSEDED; 2 NEEDS_REVIEW; 1 UNVERIFIABLE; 2 NOT_TIME_SENSITIVE.
- FP-T01 mandatory office-holder regression: `As of November 2026, the President of the United States is Joe Biden.`; result NEEDS_REVIEW, evidence confidence LIMITED. Retrieved White House pages concerned unrelated events/initiatives (UN speech, garden tours, and women's health initiative). The engine did not turn site navigation text into a specialized CONTRADICTED verdict. This is a cautious abstention; the current office-holder claim was not established.
- Stable science claim `Water is composed of hydrogen and oxygen atoms.`: NOT_TIME_SENSITIVE; no external evidence retrieved. Expected stable-claim path.
- Historical claim `Apollo 11 landed on the Moon in 1969.`: NOT_TIME_SENSITIVE; no external evidence retrieved. Expected stable historical-claim path.
- Software version claim `The latest stable Node.js version is 22.0.0.`: UNVERIFIABLE. The only displayed excluded lead was an irrelevant Node.js installation tutorial; no valid current official release evidence was shown. Abstention appropriate; retrieval quality poor.
- Price claim `The official US price of ChatGPT Plus is $20 per month.`: NEEDS_REVIEW, evidence confidence LIMITED. Displayed source was an unassessed Reddit discussion, not an official pricing source; current official price was not established. Abstention appropriate; retrieval quality and primary-source coverage insufficient.
- Semantic triage is shown as DISABLED_BY_DEFAULT for temporal claims. Generic pipeline retains leads for review and does not issue general CURRENT/SUPERSEDED/CONTRADICTED verdicts without specialized rules. Do not describe these outputs as fully verified truth judgments.
- Assessment: claim segmentation and stable-vs-temporal triage behaved as expected in this batch; retrieval for the presidential, Node.js version, and ChatGPT price claims was inadequate or insufficiently targeted. No false-positive contradiction was observed. This five-case sample is not an accuracy benchmark and establishes no precision/recall.
- Production remains unchanged at Worker v21 / app v0.2.24. No production deployment, billing change, or paid service was used.
- Next work: improve bounded query construction and primary-source targeting for general temporal claim classes (software releases, official pricing, current office holders), preserving the five-search request budget and fail-closed abstention. Then rerun these five claims and the wider matrix. Semantic triage remains opt-in pending free-quota and quality validation.


## Official-source retrieval improvements — isolated feature branch — 2026-11-09
- First live five-claim Staging batch showed weak retrieval for Node.js latest-version and ChatGPT Plus pricing claims (irrelevant installation tutorial and unassessed Reddit discussion). Results remained UNVERIFIABLE / NEEDS_REVIEW rather than forced verdicts.
- Created isolated branch `feat/general-temporal-retrieval`; production and current Staging deployment were not changed.
- Added narrow non-adjudicating adapters: Node.js version/release claims route to `nodejs.org`; OpenAI/ChatGPT pricing claims route to `openai.com` and `help.openai.com`. Added these domains to primary/official provenance classification. Neither adapter emits final truth verdicts; source content, version channel, geography, plan and effective dates still require inspection.
- Preserved the request-wide maximum of 5 Tavily searches. Each new adapter uses one bounded primary-domain query; no unbounded retry was added.
- Regression tests added for adapter matching, official-domain ranking, exclusion of Reddit from primary evidence, and Tavily `include_domains` enforcement.
- Prior session recorded local isolated working-tree validation on Node.js v22.16.0: `npm test` PASS — 71 tests, 0 failures, 0 skipped; syntax checks PASS; synthetic temporal benchmark PASS — 32 diagnostic cases (TP=16, FP=0, TN=16, FN=0). This run is documented as a prior-session report, not independently reproduced in this session; no matching GitHub Actions run was found for the feature-branch tip. Treat these results as provisional until reproducibly rerun against the exact branch commit. Synthetic results are not real-world accuracy evidence.
- Added ADR-0004 documenting decision, limitations, tests, and Workers AI free-tier assessment.
- Cloudflare official pricing page updated 2026-10-20: 10,000 free Neurons/day on Workers Free; on Free, operations fail after allocation exhaustion rather than auto-billing. Configured model `@cf/zai-org/glm-4.7-flash` is not listed among models requiring paid billing. However, Staging bindings inspection did not show native `AI` binding; semantic triage remains disabled and not operational until the binding is added and tested. No paid billing, prepaid credits, or billing method is authorized.
- Next: inspect feature-branch file contents and test diffs, then merge/deploy to Staging only after release checks. Add AI binding only to Staging, initially leave semantic flag off, inspect account Neuron usage, then run a single bounded advisory inference and confirm fail-closed behavior before considering wider use.
- Production remains Worker v21 / app v0.2.24 unchanged. Staging remains deployed at v0.2.25 until this branch passes the next gate.


## Owner approval — free-tier-first Cloudflare capability strategy — 2026-11-09
- Owner explicitly accepted the research findings and implementation recommendation, requested that the decision be saved, and authorized the necessary project-scoped permissions.
- Recorded the decision in `docs/ADR-0005-free-tier-first-cloudflare-capabilities.md`, commit `d5cbc5b57005e9fa48518e2f5ead00726542ffd9` on `feat/general-temporal-retrieval`.
- Accepted policy: Workers AI is the first semantic enhancement to evaluate, advisory-only and opt-in; AI Search/Vectorize are controlled experiment candidates; Browser Run is a bounded fallback; Queues/Workflows and persistence products remain deferred until measured need.
- FREE-ONLY / ZERO-COST remains mandatory. No paid plan, pay-as-you-go, prepaid credits, payment method, overage, or quota bypass is authorized. No production deployment or cross-project resource use is authorized.
- Authorization applies to FreshProof resources and existing connected permissions only. It does not itself grant new OAuth/API permissions; if a required permission is missing, request the narrowest additional authorization through the official integration flow.
- Validation correction: the earlier 71-test result for this branch remains provisional and is not treated as verified. Current branch CI/test execution and staging acceptance are still pending.
- Next checkpoint: verify the exact feature-branch tests and CI without risking exhausted GitHub Actions quota; inspect the staging AI binding and quota through the dedicated FreshProof account; then enable and test only the staging AI binding while keeping semantic triage disabled.
- Production remains unchanged; no billing or deployment changes were made.


## FreshProof Staging binding reinspection — 2026-11-09
- Read-only Cloudflare API inspection was performed against the dedicated account `cf293e4a6aee5d9dd87a883a00e08c4b` and Worker `freshproof-staging` only.
- Confirmed existing bindings: exact staging `ALLOWED_ORIGIN`, dedicated `API_RATE_LIMITER` namespace `27112027` (10 requests / 60 seconds), and `TAVILY_API_KEY` secret binding. The secret value was not accessed.
- Confirmed the native `AI` binding is currently ABSENT. The staging Worker remains configured with usage model `standard`; no binding or deployment mutation was made.
- Exact feature-branch source inspection confirms `SEMANTIC_MODEL = @cf/zai-org/glm-4.7-flash`; the inference path bounds source inputs to five, snippets to 900 characters, claim text to 1,200 characters, output to 650 tokens, validates one structured relation per source, and returns `FAILED_CLOSED` on provider/schema failure. Semantic triage is explicitly `DISABLED_BY_DEFAULT` unless `ENABLE_SEMANTIC_TRIAGE === "true"`; model classifications do not set final verification status.
- Cloudflare API OpenAPI inspection exposed Worker settings read/patch endpoints, but no dedicated account-level Workers AI Neurons usage endpoint was found in the connected API schema. The official pricing docs direct owners to the Workers AI dashboard for usage monitoring. Therefore current remaining daily Neurons allocation is NOT VERIFIED via the connected API.
- Decision: do not add the AI binding or invoke the model until the account's current Neurons usage/free allocation is visible and confirmed in the dedicated FreshProof dashboard. Binding configuration alone would not consume inference quota, but this is being held until the quota check and exact settings-patch semantics are confirmed to avoid accidental configuration or version changes.
- No Staging or Production configuration was changed. Production remains Worker v21 / app v0.2.24.


## Workers AI Staging binding deployment verification — 2026-11-09
- Read-only Cloudflare API inspection targeted the dedicated FreshProof account and Worker `freshproof-staging`.
- GET script settings returned `success:true` and confirmed native binding `{name:"AI", type:"ai"}`, plus the existing staging `ALLOWED_ORIGIN`, rate-limit namespace `27112027` (10 requests / 60 seconds), and `TAVILY_API_KEY` secret binding. Secret value was not retrieved.
- Latest version: version 7, ID `bcf3d934-c93f-4f4a-87e4-abe39c86a476`, created `2026-11-09T19:35:48.136182Z`, annotation: `Added Workers AI binding AI`.
- GET Worker deployments returned newest deployment ID `0d35eb9b-4a37-4727-8f4e-9dcd37107be2`, created `2026-11-09T19:35:49.490081Z`; its sole version allocation is version 7 at **100%**. Version 6 is the prior deployment.
- Therefore the native AI binding is deployed to Staging at 100% traffic, not merely saved as an unpublished draft.
- The separate Production Worker `freshproof` was not modified. No production deployment occurred.
- Owner's Workers AI dashboard screenshot shows account-level usage today of 27.97 / 10,000 Neurons, with the displayed model `@cf/zai-org/glm-4.7-flash`. Arithmetic remainder is 9,972.03 Neurons; this is account-wide usage, not a per-Worker allocation.
- No inference was invoked during this verification. Semantic triage remains intended to be disabled by default unless `ENABLE_SEMANTIC_TRIAGE === "true"`.
- Status: AI binding CONFIGURED; version 7 DEPLOYED to Staging at 100%; settings and deployment VERIFIED. Model invocation and fail-closed runtime behavior remain NOT TESTED. No billing or paid service enabled.
- Next: verify the deployed source and Staging health, then perform one bounded advisory inference while recording pre/post account-level Neurons usage, model response schema, latency, and fail-closed behavior. No merge or Production deployment without separate release approval.


## Workers AI bounded model smoke test and reasoning-control correction — 2026-11-09
- Staging health route rechecked via the Staging URL and returned `ok:true`, service `FreshProof`, version `0.2.25`, mode `evidence-triage`.
- Cloudflare official model documentation confirms GLM-4.7-Flash is a reasoning-capable model. The first two direct account API smoke attempts (max_tokens 100 and 300) returned reasoning-only/truncated output with `finish_reason:length`; they were not accepted as successful semantic classifications. Their reported usage was 4.1075 and 11.5635 Neurons respectively.
- A third bounded call supplied `chat_template_kwargs: { enable_thinking: false }`, max_tokens 120, temperature 0. The model returned a parseable JSON-fenced advisory relation `INSUFFICIENT` with a rationale consistent with the supplied evidence. Reported latency 1,594 ms, prompt 90 tokens, completion 64 tokens, total 154 tokens, usage 2.8246 Neurons, finish_reason `stop`.
- These model smoke tests used the dedicated account-level Cloudflare AI REST endpoint. They verify model availability and the reasoning-control parameter, but do **not** verify the Worker `env.AI` binding runtime path or the FreshProof request pipeline. Total Neurons reported by these three requests: 18.4956. Dashboard baseline screenshot earlier showed 27.97 account-level Neurons; dashboard post-test measurement has not yet been captured, so no final dashboard delta is claimed.
- Root cause: GLM-4.7-Flash defaults to reasoning mode; with the small bounded output budgets it consumed the output budget in reasoning and returned no usable `content`. Cloudflare model docs expose `chat_template_kwargs`; the successful bounded call confirms `enable_thinking:false` resolves this for the tested request.
- Implemented on `feat/general-temporal-retrieval`: `worker/index.js` now passes `chat_template_kwargs: { enable_thinking: false }` to `ai.run`, commit `85ee01f7854df5260b71da32629b1a3fa420b926`.
- Added a regression assertion in `tests/logic.test.js` requiring `chat_template_kwargs.enable_thinking === false` in the semantic triage call, commit `dd6af7998c8d1afe35472798ff246b7c9706f913`.
- The feature branch code containing general temporal adapters and semantic triage is not yet deployed to Staging. Staging currently serves version 0.2.25; its version 7 deployment only adds the native AI binding to the existing deployed source. Do not claim the application-level semantic integration is active.
- Test status for the two latest commits: IMPLEMENTED; automated test suite has not yet been rerun against the exact updated branch. No GitHub Actions run was triggered due to the project's zero-cost/limited Actions budget. No additional model calls should be made until the exact updated source is locally tested or a zero-cost safe test route is established.
- Next gate: run the full branch test suite and syntax checks against exact branch source without consuming paid quota; verify semantic flag remains default-off; then deploy the updated feature branch to Staging only and test the actual `env.AI` binding path with one bounded claim/source case. Keep Production unchanged.


## Local test environment investigation — 2026-11-09
- Available uploaded archive `freshproof-main-v0.2.4.zip` was inspected. It is a main-branch snapshot at app version `0.2.4`; it does not contain `worker/domain-adapters.js` and does not contain the feature branch semantic triage, Node.js/OpenAI adapters, or latest reasoning-control fix. It is not a valid substitute for the current branch.
- Attempted a shallow Git clone of `ralhamdan7-lab/freshproof` branch `feat/general-temporal-retrieval`; the execution environment could not resolve `github.com` (DNS/network unavailable). No repository files were changed by this attempt.
- Ran `npm test` against the available v0.2.4 archive only: 15 tests passed, 0 failed. This is a baseline archive smoke result, **not** verification of the current feature branch.
- Exact feature-branch source has been independently re-read from GitHub for `worker/index.js` (blob `a216ac94b2ddc931cc41f3cf31debd4f08a36de1`), `tests/logic.test.js` (blob `2dc2e9735bf9c82319fae19706e1652886ca600b`), and `package.json` (blob `695b9cbeec1c7f689fd6a4fd30ba71b4fe43367d`). The code and regression assertion are present in GitHub, but they have not been executed locally.
- Decision: do not deploy the feature branch to Staging until its exact source has been tested. This is a deliberate quality gate, not a product failure. Keep Staging's currently deployed source and Production unchanged.
- Next safe route: obtain a current archive/export of the exact branch through a permitted GitHub artifact or repository download path, or restore outbound GitHub network access in a dedicated isolated test runner. Then install only locked dependencies if required, run `node --check` and `npm test`, verify no paid CI is invoked, and proceed to Staging integration tests only on a clean pass.


## GitHub connector access recovery and local-source transfer guidance — 2026-11-09
- Revalidated the dedicated GitHub connection for `ralhamdan7-lab` using the currently eligible linked-account identifier. The earlier connector write failure (`link_id must identify an eligible linked account`) is no longer reproduced: branch search and fetch of this exact verification log both succeeded.
- Confirmed the target branch `feat/general-temporal-retrieval` exists and fetched the current `docs/VERIFICATION-LOG.md` from that branch. Current log blob before this entry: `193b2445a37b8f6d098f11225a46a11d22394e26`.
- This restores GitHub API connector read access. It does not restore outbound DNS from the isolated local execution environment and does not by itself transfer a complete repository checkout into that environment.
- No source, branch, deployment, or runtime configuration was modified by the access check. The only intended write is this documentation append on the existing feature branch.
- Local exact-branch test execution remains BLOCKED until the owner supplies the branch ZIP or an isolated runner obtains the branch source. Recommended owner action: GitHub repository > branch selector > `feat/general-temporal-retrieval` > Code > Download ZIP; upload that ZIP into this FreshProof conversation. Do not upload secrets or any other project's files. Then run syntax checks, `npm test`, and the temporal benchmark against that exact archive.


## Exact feature-branch archive validation and Staging-safe Wrangler correction — 2026-11-09
- Owner supplied `freshproof-feat-general-temporal-retrieval.zip`; archive SHA-256: `b84831b737e08d8bfc5778b7b0cf9e90eac56d5f1633979020393667a6cd4870`. Extracted into an isolated temporary workspace; no secrets or other-project files were used.
- Compared Git object blob hashes from the archive against the exact GitHub feature-branch source previously fetched. Four critical files matched exactly: `worker/index.js` `a216ac94b2ddc931cc41f3cf31debd4f08a36de1`; `worker/domain-adapters.js` `5ed4a0f7f54fa173cc506f57d5dddb8e5433e126`; `tests/logic.test.js` `2dc2e9735bf9c82319fae19706e1652886ca600b`; `package.json` `695b9cbeec1c7f689fd6a4fd30ba71b4fe43367d`. Thus the tested application and test sources are verified against GitHub's feature branch.
- Runtime: Node.js v22.16.0. `npm test`: PASS — 71 passed, 0 failed, 0 skipped. Syntax checks PASS for `worker/index.js`, `worker/domain-adapters.js`, `src/app.js`, and `benchmarks/run-temporal-benchmark.js`.
- `npm run benchmark:temporal`: PASS — 32 synthetic diagnostic cases; TP=16, FP=0, TN=16, FN=0; precision=1.0, recall=1.0, FPR=0.0. Synthetic diagnostic only; not a real-world accuracy estimate.
- Configuration safety review found a deployment hazard in the supplied `wrangler.toml`: it named the Worker `freshproof` (Production target) and referenced rate-limit namespace `27112026`, while the dedicated Staging Worker is `freshproof-staging` with namespace `27112027`. No deployment was attempted with the unsafe configuration.
- Corrected `wrangler.toml` on this feature branch only, commit `2980b6dd4f81b0dee86290878d14f099b3aa663b`: target name is now `freshproof-staging`; exact Staging origin is explicitly set; native AI binding remains declared; rate-limit namespace now matches `27112027` at 10 requests/60 seconds; browser assets map to the existing `./src` directory via `ASSETS`; Workers dev endpoint remains enabled. Parsed the TOML and asserted each target/binding/directory value locally. Re-ran `npm test` and benchmark after applying the corrected configuration locally; results remained 71/71 and 32/32.
- Read-only Cloudflare inspection of the dedicated FreshProof account confirmed the live Staging bindings currently include AI, exact ALLOWED_ORIGIN, rate limiter namespace `27112027` (10/60), and secret binding `TAVILY_API_KEY`; secret value was not read. Current Staging deployment remains version 7 / 100%. The existing configuration does not yet include an ASSETS binding; the corrected Wrangler configuration declares it for the UI bundle.
- Status: source integrity VERIFIED; local tests and syntax VERIFIED; synthetic benchmark VERIFIED; Wrangler config corrected and committed. CI was not run to avoid Actions quota consumption. The updated feature branch has NOT been deployed to Staging in this step; no Production resource or deployment was changed. Before Staging deployment, ensure Wrangler deployment preserves the existing secret binding and exact environment settings, and verify the resulting deployment/bindings/health endpoint. Semantic triage remains disabled by default; no model inference was invoked in this validation.


## Revalidation of owner-supplied branch archive and Staging deployment safety — 2026-11-09
- Re-executed the owner-supplied `freshproof-feat-general-temporal-retrieval.zip` in an isolated local workspace using Node.js v22.16.0.
- Exact Git blob SHA-1 matches against the current GitHub feature branch were confirmed for `worker/index.js` (`a216ac94b2ddc931cc41f3cf31debd4f08a36de1`), `worker/domain-adapters.js` (`5ed4a0f7f54fa173cc506f57d5dddb8e5433e126`), `tests/logic.test.js` (`2dc2e9735bf9c82319fae19706e1652886ca600b`), and `package.json` (`695b9cbeec1c7f689fd6a4fd30ba71b4fe43367d`). These core runtime/test files are identical to the current remote feature branch.
- The supplied ZIP is not a byte-for-byte snapshot of the latest branch tip: its `wrangler.toml` and `docs/VERIFICATION-LOG.md` predate the latest branch corrections. The current GitHub `wrangler.toml` blob is `bdb61fb618ed6b99f5320be82142637ac98c06d2`; it targets `freshproof-staging`, preserves the dedicated Staging origin, rate-limit namespace `27112027`, AI binding, and `src` assets configuration. The ZIP copy still targeted `freshproof` and namespace `27112026`; it was not used for deployment.
- For local revalidation only, the exact current `wrangler.toml` contents were synchronized from GitHub into the isolated workspace. Re-ran `npm test`: 71 passed, 0 failed, 0 skipped. Re-ran syntax checks for Worker, domain adapter, browser app, and Worker test files: all passed. Re-ran `npm run benchmark:temporal`: 32 synthetic diagnostic cases, TP=16, FP=0, TN=16, FN=0; precision=1, recall=1, FPR=0. Synthetic diagnostic only, not a real-world accuracy estimate.
- Read-only Cloudflare inspection of the dedicated account `cf293e4a6aee5d9dd87a883a00e08c4b` reconfirmed Staging script settings: `AI`, exact `ALLOWED_ORIGIN`, `API_RATE_LIMITER` namespace `27112027` at 10/60 seconds, and `TAVILY_API_KEY` secret binding. The secret value was not read. The active Staging deployment remains version 7 (`bcf3d934-c93f-4f4a-87e4-abe39c86a476`) at 100% traffic. Production was not queried for mutation and remains untouched.
- Deployment safety review: Cloudflare's documented direct static-asset upload flow requires a short-lived JWT from the assets-upload-session endpoint, multipart asset upload to the dedicated Workers Assets endpoint, and then a version/script update. The connected Cloudflare execution action cannot securely forward that short-lived JWT as a custom Authorization header to the separate upload endpoint. The version-upload endpoint also does not expose the same asset completion-token field as the script-upload endpoint. Therefore no Worker version was uploaded and no deployment was created; this avoids risking loss of the existing secret binding or static assets.
- Status: core source and tests VERIFIED against current remote branch; tests/syntax/benchmark TESTED locally; Wrangler configuration VERIFIED from current GitHub branch and locally revalidated; Cloudflare Staging settings VERIFIED read-only; feature deployment BLOCKED pending a safe asset-upload path that preserves the non-readable Tavily secret and existing static assets. Production unchanged; no paid service, billing change, or Actions workflow used.


## Staging asset upload attempt and required owner intervention — 2026-11-09
- Rechecked the Cloudflare direct-upload API and official documentation. A Staging assets-upload session was successfully created for the three current UI files (`index.html`, `app.js`, `styles.css`); the session returned the expected asset hashes/buckets.
- Attempted the documented asset transfer to `POST /accounts/{account_id}/workers/assets/upload?base64=true` using the short-lived upload-session JWT as the Bearer token. The direct HTTPS request returned HTTP 401 Unauthorized. Retried through the connected Cloudflare API action; it also returned HTTP 401 because that connector authenticates with its account connection and does not expose a supported custom Authorization-header parameter for substituting the short-lived asset JWT.
- The Cloudflare connector's documented `request` contract supports FormData bodies but not caller-supplied headers. No unsupported header injection or query-string token workaround was attempted. The JWT was not logged or disclosed. No asset content was accepted, no Worker version was uploaded, no deployment was created, and no existing binding/secret/asset was modified.
- Local execution environment DNS resolution fails for both `api.cloudflare.com` and `github.com`, so Wrangler cannot be used from this runtime as an alternate transfer path.
- Current active Staging remains version 7 at 100% traffic. Its version detail lists AI, ALLOWED_ORIGIN, API_RATE_LIMITER (namespace 27112027, 10/60), and TAVILY_API_KEY secret binding; it has no ASSETS binding in the active version. The secret value was never read.
- Status: upload session CREATED; asset transfer ATTEMPTED and BLOCKED (401); Worker version NOT uploaded; Staging NOT deployed; Production unchanged.
- Owner action required: use an environment with outbound DNS/network access and Wrangler authenticated to the dedicated FreshProof Cloudflare account, then run `npx wrangler deploy --config wrangler.toml` from the exact feature-branch checkout after verifying Wrangler is using only the dedicated account. This is the supported path because Wrangler handles the static-assets manifest, upload JWT, and Worker version flow. Do not share API tokens in chat; authenticate locally using the official Cloudflare login flow. Do not proceed if Wrangler requests enabling paid billing, a payment method, or overage.


## Live Staging Node.js release retrieval finding and bounded fallback — 2026-11-10
- Owner completed the Staging deployment from the dedicated local checkout. Cloudflare deployment inspection confirmed the active Staging deployment is served by version 9 (843b82e1-c250-46a0-89b4-7cea8895bf47) at 100% traffic, with ASSETS, AI, API_RATE_LIMITER (namespace 27112027, 10/60), ALLOWED_ORIGIN, and the TAVILY_API_KEY secret binding. Secret value was not read. Production unchanged.
- Owner's live test of: “The latest stable Node.js release is Node.js 20.” returned UNVERIFIABLE, zero usable sources, UNKNOWN publication freshness, and the domain adapter reported ANY_STABLE release scope. This is a valid fail-closed abstention, but it does not demonstrate temporal-change detection because no current official release evidence was retrieved.
- The earlier official Node.js release page inspected by the owner identifies Node.js 24.20.0 LTS, dated 2026-08-26, and the page navigation also references Node.js 26.x Current releases. The release-channel ambiguity (LTS vs Current) must remain explicit; search presence or version ordering alone must not produce a final verdict.
- Implemented on isolated branch fix/nodejs-release-retrieval: if the Node.js official-domain Tavily query returns zero results, perform exactly one broader fallback query without the domain filter. The adapter still admits only nodejs.org sources into its specialized relevance path. This consumes at most one additional request and remains within the global five-query budget. It does not relax source-authority rules or create an automated verdict.
- Added regression coverage for empty first query, broad fallback, official-host result retention, and query-budget accounting. Local validation on Node.js v22.16.0: npm test — 72 passed, 0 failed, 0 skipped. This was run against the supplied feature archive with the exact changes applied locally; it is not a GitHub Actions run and does not consume Actions quota.
- Status: issue reproduced from live Staging report; fallback IMPLEMENTED on isolated fix branch; local tests TESTED and passing. Fix branch NOT YET DEPLOYED or merged. A further live Staging test is required to determine whether Tavily's empty response was transient or whether additional retrieval changes are needed. Production unchanged; semantic triage remains disabled by default; no paid service or billing change.


## Corrective review: Tavily cache age and specialized-source gate — 2026-11-10
- Re-reviewed Tavily's `max_age_hours` semantics against the API contract and the existing request tests. The setting constrains the age of Tavily's cached page copy; it is not the source publication date or event date. Retain `max_age_hours: 24` as an intentional cache-freshness guard. Removing it would trade retrieval recall for potentially older cached copies and is not accepted as a freshness fix.
- The live Staging Worker v0.2.27 was confirmed to retain `max_age_hours: 24`; this is expected. `filter_by_published_date: false` also remains intentional so undated results are not silently discarded; their publication freshness remains UNKNOWN.
- Additional defect found in the Node.js broad-fallback path: specialized adapter `rankSource` returns null for sources that fail the official-host gate, but the generic ranking expression previously used `|| baseRelevance`, restoring generic relevance and potentially allowing non-official sources into evidence. Corrected by treating explicit null as LOW / excluded, never as generic relevance.
- Added regression test with both a third-party result and an official Node.js result returned by the broad fallback. Expected behavior: only the official nodejs.org result appears in evidence; the third-party lead appears only in excluded_sources.
- Existing Tavily request regression explicitly asserts `max_age_hours: 24`, `time_range: "year"`, and `filter_by_published_date: false`; retain these assertions.
- Search policy: one official-domain primary query, plus at most one broader fallback only when the primary result set is empty; official-host eligibility remains enforced; request-wide maximum remains five.
- Status: source gate IMPLEMENTED; regression TEST ADDED. Reconstructed local test tree (feature archive plus PR fallback/source-gate changes) TESTED: Node.js v22.16.0, 73 passed, 0 failed, 0 skipped. The local tree is not byte-identical to the remote PR head; GitHub Actions were not run. No deployment or merge performed. Production unchanged.


## 0.2.26 — Node.js LTS lifecycle and numeric-version regression remediation — 2026-11-10
- Branch: `fix/software-release-lifecycle-and-version-conflicts`, based on `feat/general-temporal-retrieval`.
- Added a narrowly scoped Node.js LTS-major comparator. It requires an explicit current/latest LTS claim, a parsed Node.js major version, an official `nodejs.org` source, and an explicitly bounded LTS section with parseable major tracks.
- When the official listing shows a newer LTS major, the result is `SUPERSEDED` and explicitly records whether the claimed major remains listed as LTS. When the claimed major is the newest listed LTS major, it may return `CURRENT`. No patch-level or generic release claim receives an automatic verdict.
- Changed the Node.js LTS query to request the official lifecycle listing.
- Excluded semantic version identifiers (for example, `26.0.0`, `26.12.0`, and `24.x`) from generic numeric-disagreement heuristics, preventing version labels from being mistaken for conflicting measurements.
- Added three mocked end-to-end regression tests: Node.js 22 vs 24 LTS lifecycle; semantic-version false-conflict suppression; and patch-level abstention.
- Package/Worker version set to 0.2.26.
- Validation status at this checkpoint: source changes committed; full local test suite, syntax checks, and live Staging deployment are PENDING. GitHub Actions intentionally not triggered because the project's free Actions quota is exhausted. No Staging or Production deployment performed by this change yet.
- Key acceptance criteria: Node.js 22 claim against official LTS list [24, 22] must return SUPERSEDED while recording that 22 remains LTS; version-number-only differences must not produce numeric conflict candidates; latest patch claims must remain NEEDS_REVIEW absent a dedicated authoritative patch-level adjudicator.


## 0.2.26 — merged and deployed to isolated Staging — 2026-11-10
- PR #21 merged into `feat/general-temporal-retrieval`; merge commit `6829801894be86f089eba68cc1756bb819a605f6`.
- Local full-suite result reported in PR validation: 76 passed, 0 failed, 0 skipped/cancelled/todo (Node.js v22.16.0; owner-provided local output). GitHub Actions were not run because the free quota was exhausted.
- Deployed only to dedicated `freshproof-staging` using the Cloudflare Workers API. Active deployment `0bcfbc47-2ab4-41ab-b5ba-c94aeca04a12`, version `0bcfbc47-2ab4-41ab-b5ba-c94aeca04a12`, 100% traffic.
- Re-read Staging settings and confirmed AI, exact ALLOWED_ORIGIN, ASSETS, API_RATE_LIMITER (namespace 27112027, 10/60), and TAVILY_API_KEY secret binding. Secret value not accessed.
- Verified Production deployment record remains unchanged: Worker version `4e96bf6c-8d6f-4f29-93bd-124589b5bd69`, deployment `5e2c2dd9-b72b-4b5e-960c-43a754b6db02`.
- External live HTTP request was attempted through the Cloudflare connector but blocked by its outbound-request policy (HTTP 403 policy text before reaching Worker). Health endpoint, live Tavily retrieval, and browser acceptance therefore remain UNVERIFIED.
- Status: PR MERGED; Staging DEPLOYED; Staging configuration VERIFIED; live functional acceptance PENDING; Production unchanged.


## Ongoing Node.js LTS support claim remediation — 2026-11-10
- Live Staging acceptance screenshots exposed a confirmed false-negative: “Node.js 22 remains supported as an LTS release” was classified NOT_TIME_SENSITIVE with NOT_ASSESSED, so no official lifecycle evidence was retrieved.
- Root cause confirmed in the deployed v0.2.26 source: TEMPORAL_PATTERNS did not include “remains supported” / “still supported”; the Node.js lifecycle adapter also required a current/latest/newest qualifier and therefore could not adjudicate a support-membership claim.
- Implemented on isolated branch fix/nodejs-ongoing-lts-support:
  - Added “remains supported”, “remain supported”, “still supported”, and related maintained/active variants to temporal detection.
  - Routed explicit Node.js ongoing LTS-support claims to the existing official nodejs.org lifecycle adapter.
  - Added a narrowly scoped OFFICIAL_NODEJS_ACTIVE_LTS_MEMBERSHIP adjudication: return CURRENT only when the claimed major is explicitly present in the parsed active-LTS list from an official Node.js source; otherwise abstain. This does not claim patch-level currency or infer EOL from absence in an incomplete snippet.
  - Added regression tests for phrase detection, official active-LTS membership, and fail-closed abstention when lifecycle evidence is absent.
- GitHub commits: domain adapter cdcab1fe6b30aa89e5c09df380e51a8b78c7594d; temporal detector 1008eb67eb50d28dc0a8c8a63ff0796f34c99aee; regression tests 744dc3d4c0a988f0feb927dbc85fac4642428792.
- Validation: source changes are committed to the isolated branch. Tests have been added but have NOT yet been executed locally; GitHub Actions remain intentionally unused due to exhausted free quota. No Staging or Production deployment performed. Production unchanged.
- Acceptance gate before Staging: execute the complete Node.js test suite and syntax checks against the exact branch tip; verify the existing “Node.js 22 is current LTS” regression still returns SUPERSEDED and records 22 as active LTS; verify “Node.js 22 remains supported” retrieves official lifecycle evidence and returns CURRENT only when 22 appears in the active list; verify missing/ambiguous evidence abstains; then deploy to Staging only and repeat the three-claim live test.

- Follow-up hardening on the same branch: ongoing-support adjudication now requires a dated official lifecycle snapshot no more than 365 days old and rejects future-dated or undated snapshots; added regression coverage for stale/undated abstention. Temporal detection also recognizes “remains actively supported”. Commits: 2f052586f0f9ee516987d3392d3fd01424909dad (dated evidence gate), 1d9760f880ead41cb9afe5a6b15de25dd58452e8 (temporal phrase), 254707a22c849bba60a470c728dcb9c045e5edb7 (stale/undated regression). These tests remain unexecuted pending an exact branch checkout in a local Node.js environment.

- Targeted branch-source smoke validation executed against the exact fetched worker/domain-adapters.js and TEMPORAL_PATTERNS source at branch tip 2b97076e84230b0b7ac48324eb5f3af8180b6779: 8/8 checks passed — remains supported detection; still supported detection; stable water claim remains non-temporal; Node.js 22 active-LTS membership returns CURRENT with a recent official listing; Node.js 22 current-LTS claim returns SUPERSEDED against [26,24,22]; stale and undated lifecycle snapshots abstain; third-party source abstains. This is an isolated source-level smoke harness, NOT the full Node.js test suite and NOT the deployed Worker POST integration test. Full npm test, syntax checks on a byte-identical checkout, and live Staging POST acceptance remain pending. No deployment or merge.

- Exact-branch ZIP validation completed on 2026-11-10. The supplied archive's Git blob SHA-1 values match GitHub branch files byte-for-byte for worker/domain-adapters.js (9a5e8c3322542bd80986f8c518ee238f99459fb9), worker/index.js (a2a25c0329f07fbfc55dcd23215a90e1aff254cc), tests/logic.test.js (84fd7c9a102d8fe4ac32475d155e27ef979dbbca), and this verification log at pre-validation tip (4d8d92c7e82fe90e0e563d29267a8dfe030d3ed5). Native Node.js v22.16.0 / npm 10.9.2 execution: npm test PASS, 81 tests passed, 0 failed, 0 skipped, duration 281.9 ms. Syntax validation: node --check passed for all 7 JavaScript files. No dependencies were installed and no network or paid services used. This establishes full repository test-suite and syntax success for the supplied byte-identical code; it does not establish a live Cloudflare Worker deployment or Staging POST acceptance. No merge or deployment performed.


## Node.js LTS support lifecycle refinement — 2026-11-10

- Refined the ongoing-support adjudicator to distinguish Active LTS, Maintenance LTS, and End of Life.
- A CURRENT support verdict now requires a recent, dated official Node.js lifecycle source and an explicit claimed-major row containing both LTS-start and EOL dates. Bare LTS labels, missing lifecycle boundaries, stale/undated sources, and non-official sources abstain.
- Maintenance LTS remains CURRENT while the explicit EOL boundary is in the future; an elapsed EOL boundary returns SUPERSEDED. This does not imply latest-version or patch-level currency.
- Added regression coverage for Maintenance LTS, elapsed EOL, missing lifecycle dates, and the mocked POST retrieval path.
- Local validation on Node.js v22.16.0: 83 tests passed, 0 failed, 0 skipped. Syntax check passed for worker/domain-adapters.js. No dependencies installed, no Actions run, no paid resources used.
- GitHub branch updated in two commits: lifecycle adjudication and regression tests. Live Staging deployment and live POST acceptance of this refinement remain pending; Production remains unchanged.


## Node.js release-table adjudication correction — 2026-11-10

- Live Staging POST acceptance exposed a second defect: the official Node.js release schedule is a table of version, codename, first-release date, last-updated date, and status (LTS/EOL), not a lifecycle timeline containing explicit LTS-start and EOL dates.
- Replaced the incorrect lifecycle-date parser with parsing of the official release-table row. Ongoing support returns CURRENT only when the claimed major's row explicitly says LTS and its row-level last-updated date is within 365 days; EOL returns SUPERSEDED; missing, stale, or unsupported rows abstain.
- The result separately reports whether the supported major is also the newest LTS major. This prevents confusing “still supported” with “latest LTS”.
- The official Node.js page currently exposes the v22 row as LTS with a row-level last-updated date of 2026-10-20, while v26 and v24 are also LTS. This supports “Node.js 22 remains an LTS release” but not “Node.js 22 is the current/latest LTS release”.
- Regression tests updated for official table parsing, EOL, stale/missing rows, and the mocked POST path.
- Tests have been authored but not yet executed against this revision. Staging deployment and live POST acceptance remain pending. Production remains unchanged.


## Node.js authoritative schedule JSON adapter — 2026-11-10

- Repeated live Staging checks showed that Tavily's snippets for the Node.js previous-releases page did not contain the structured version status needed for deterministic adjudication.
- Identified the Node.js Release Working Group's canonical machine-readable schedule: `https://github.com/nodejs/Release/blob/main/schedule.json` (raw JSON is available from the same official repository).
- Updated the adapter to accept only the official Node.js domain and the `nodejs/Release` GitHub/raw-content paths, parse per-major `lts`, `maintenance`, and `end` dates, and derive Active LTS / Maintenance LTS / EOL against the verification timestamp.
- The latest-LTS comparison is now distinct from ongoing-support membership. As of 2026-11-10, the official schedule places v22 in Maintenance LTS through 2027-04-30, while v26 is the newest LTS line.
- Updated regression fixtures for the official schedule JSON and mocked POST retrieval.
- This revision has NOT yet been locally executed or deployed. Do not treat it as verified; Production and current Staging remain unchanged until syntax/tests pass and the updated adapter is deployed.


## Direct Node.js schedule retrieval hardening — 2026-11-10

- Root-cause review found that the Worker normalized Tavily result content to a 900-character UI snippet and discarded the full content field. A machine-readable schedule JSON document can therefore be truncated before lifecycle parsing.
- Added a bounded direct retrieval path for the canonical raw file at `https://raw.githubusercontent.com/nodejs/Release/main/schedule.json`, restricted to the official `nodejs/Release` repository.
- Added a separate GitHub commit-metadata lookup for the exact `schedule.json` path; the schedule is eligible for adjudication only when its official file commit date is present, not future-dated, and no more than 365 days old.
- Updated snapshot selection to rank JSON candidates by source update date, not by future lifecycle dates such as EOL. This prevents an older schedule snapshot from outranking a newer one merely because it contains a later planned EOL date.
- Added regression coverage for direct raw JSON retrieval, official commit-date metadata, stale/undated schedule abstention, and newest-snapshot selection.
- Commits: adapter retrieval `5786182e9d3e4069f8f863aa7d3bbd04f7f027a1`; direct retrieval tests `423dc4ce77a459765ebb192d274999ee1efdb2a4`; snapshot ordering `67d1de64cd9ce77a04f79bd2293e15a11c1482c2`; snapshot-order regression `d721bf03fe4af37435a056d6ddb94a4c67cc11fd`.
- Current status: IMPLEMENTED on the isolated PR branch. Exact-branch full test suite and syntax checks have NOT yet been executed after these latest changes. GitHub Actions were not invoked to protect the exhausted free quota. No Staging deployment, Production change, or merge performed.

- Follow-up efficiency guard: the direct schedule and commit-metadata requests execute only for explicit Node.js LTS / long-term-support claims; non-LTS latest-version claims do not trigger this extra retrieval.


## Semantic analysis default-on policy — 2026-11-10

- User direction: do not restrict essential semantic analysis merely to conserve free inference quota; product correctness and evidence quality take priority while retaining FREE-ONLY / ZERO-COST (no paid inference, billing, or quota overage).
- Code audit found a material product limitation: Workers AI semantic relation analysis was disabled by default and required `ENABLE_SEMANTIC_TRIAGE=true`, explicitly to protect free daily inference quota.
- Changed the Worker to run semantic relation analysis by default when the AI binding is configured. It can be disabled only by an explicit `ENABLE_SEMANTIC_TRIAGE=false` deployment override.
- Kept the safety boundary: semantic output remains advisory, cannot independently set final verification status, and returns explicit not-configured / fail-closed states when the binding or model response is unavailable.
- Replaced the prior disabled-by-default test with request-handler coverage proving default invocation and explicit opt-out.
- This change is IMPLEMENTED on the isolated PR branch; tests have not yet been executed. Deployment configuration must still be inspected to ensure no stale explicit false override is present. No Staging or Production deployment performed.


## Node.js lifecycle evidence hardening — 2026-11-10
- Changed direct schedule retrieval to resolve the latest `schedule.json` commit first and fetch the raw JSON using that immutable 40-character commit SHA. This binds source content to its exact commit metadata and avoids a concurrent-main-branch race.
- Added commit SHA validation, commit timestamp sanity/freshness checks, bounded response size (65,536 characters), and structural validation of version-keyed release rows and ISO lifecycle dates.
- Removed the hard-coded requirement that the schedule contain `v22`; future Node.js major releases remain eligible for parsing.
- Updated the POST integration-test mock to return commit metadata and the immutable raw-file URL, and to assert that the resulting evidence URL includes the exact commit SHA.
- Code and test fixtures are implemented on PR #23. Full Node.js test execution and live Staging acceptance have NOT yet been run for this HEAD. No deployment or merge.


## Evidence Adjudication Layer — implementation checkpoint — 2026-11-10

- Added deterministic claim-level adjudication combining advisory semantic relations, source authority, publication-date freshness, independent-domain corroboration, and cross-source conflict candidates.
- Generic CURRENT and CONTRADICTED require two independent, recent primary/official domains with matching semantic relations; MIXED evidence or conflict candidates force NEEDS_REVIEW. Stale or undated returned sources remain NEEDS_REVIEW; an empty usable evidence set yields UNVERIFIABLE.
- Narrow domain-specific rules retain precedence, including immutable Node.js lifecycle evidence. Model output cannot independently create or override a final verdict.
- Event-date candidates remain separate from publication dates and are not substituted for source freshness.
- Added regression coverage for corroborated support, corroborated contradiction, stale/undated abstention, mixed evidence, and domain-rule precedence.
- IMPLEMENTED on PR #23. Runtime tests, syntax checks, integration acceptance, and deployment are pending; no version bump, deployment, or merge.


## Exact PR branch automated verification — 2026-11-10
- Corrected a pre-existing Node.js adapter defect: over-escaped word-boundary expressions prevented LTS detection in targeted-query and immutable-schedule guards.
- Narrowed Tavily search scope back to nodejs.org; GitHub commit metadata and immutable raw JSON are fetched separately by the bounded official-source adapter.
- Replaced a legacy latest-LTS test fixture that did not mock the new immutable schedule retrieval with a deterministic commit-pinned schedule fixture.
- GitHub Actions run: https://github.com/ralhamdan7-lab/freshproof/actions/runs/42865518920
- Exact tested HEAD at run time: 8274ddbeaec037e5063369df68e6527ac8f02b30.
- Result: 86/86 Node tests passed; Worker syntax check passed; browser application syntax check passed; temporal smoke benchmark completed with 32 cases, precision 1.0, recall 1.0, false-positive rate 0.0, and no error cases. These benchmark metrics apply only to the bounded synthetic fixture, not real-world production accuracy.
- Latest follow-up commits after this successful run may require a fresh run if they change executable code. No deployment, version bump, merge, or submission performed.


## Exact PR HEAD verification and operational gate — 2026-11-10

- Current tested branch HEAD: `b9b72381644457af5672cf997f3b5e91ddb074e3` (PR #23, `fix/nodejs-ongoing-lts-support`).
- GitHub Actions run #66 (push): PASS. Run #67 (pull_request): PASS. Both executed against the exact current HEAD.
- Each run: Node.js test suite 86 passed / 0 failed; syntax checks passed for `worker/index.js`, `worker/evidence-adjudication.js`, `worker/domain-adapters.js`, and `src/app.js`; temporal smoke benchmark completed with 32 synthetic cases (TP=16, FP=0, TN=16, FN=0; precision=1.0, recall=1.0, FPR=0.0; no error cases). These are synthetic diagnostic results, not real-world accuracy estimates.
- Workflow expanded to syntax-check the evidence adjudication and domain adapter modules. README corrected to remove a stale statement that Workers AI was disabled by default and refreshed with the exact current validation state.
- Live GET checks to the documented Staging and Production workers could not reach DNS from the execution environment (temporary name-resolution failure). No HTTP response was received; live health is UNVERIFIED, not failed.
- The available Cloudflare connector is linked to a different project account. It was deliberately not used, preserving FreshProof account isolation. Consequently, the dedicated FreshProof account's plan, Workers AI usage, bindings, and deployment state were not re-read in this session.
- No deployment, version bump, Production change, merge, or public release. PR #23 remains Draft and unmerged pending dedicated-account access, free-plan/usage verification, and live Staging acceptance.


## Dedicated Cloudflare account read-only audit — 2026-11-10
- Correct dedicated Cloudflare connection confirmed: `ralhamdan7-Lab`, authenticated profile `ralhamdan7@gmail.com`; account ID `cf293e4a6aee5d9dd87a883a00e08c4b`. No other Cloudflare account was used for FreshProof.
- Read-only account inventory confirmed two isolated Workers: `freshproof` and `freshproof-staging`.
- Staging active deployment: deployment `f33301e7-bc3a-4f05-af06-845b02bc129e`, version 17 (`362bec17-dd03-4e5e-b409-ddb852e2b7db`), 100% traffic, commit annotation `1faadeedee4ada4275092bc8da17e3cc8cf22eeb`. This is older than current PR HEAD and is not the current branch build.
- Staging bindings verified by metadata only: AI, ASSETS, ALLOWED_ORIGIN exact staging origin, API_RATE_LIMITER 10 requests / 60 seconds, and TAVILY_API_KEY secret binding. Production Worker remains version `4e96bf6c-8d6f-4f29-93bd-124589b5bd69` at 100% traffic; Production was not modified. Secret values were never read.
- Both Workers report `usage_model: standard`; this is not sufficient to infer the account's Workers Free vs Workers Paid plan.
- Billing profile, billing usage, account subscriptions, and user subscriptions return HTTP 403 because this OAuth connection does not include Billing Read. The current connector exposes no account-specific Workers AI Neuron usage endpoint. Plan status and current Neuron usage therefore remain UNVERIFIED.
- Direct requests to both `workers.dev` health URLs are blocked by the connected execution environment with policy 403 before reaching the Worker. No Worker HTTP response was received; live health and POST acceptance remain UNVERIFIED.
- No resources were created or modified in Cloudflare. No deployment, paid activation, billing change, secret read, or Production change occurred.


## 2026-11-11 — Node.js 16 live visual acceptance and integration checkpoint
- Owner-provided Staging screenshots confirm the exact claim `Node.js 16 is currently an actively supported LTS release.` returns `SUPERSEDED` in the browser UI.
- The report visibly renders `EOL`, `end_of_life: 2023-09-11`, LTS start `2021-10-26`, Maintenance LTS start `2022-10-18`, and latest LTS major `v26`, with official Node.js Release Working Group schedule evidence.
- Staging deployment verified: `freshproof-staging`, deployment `f131d20e-ceb3-43a5-bfd7-ae878302480c`, Version 21 `8acfc0df-e6cf-4c2a-aff5-3da4c4bd607e`, 100% traffic.
- Production remains unchanged: deployment `5e2c2dd9-b72b-4b5e-960c-43a754b6db02`, Version `4e96bf6c-8d6f-4f29-93bd-124589b5bd69`, 100% traffic.
- PR #23 merged into `feat/general-temporal-retrieval` at `577930efe1a9062bc1742285631c8b29e476d95d` after 88/88 tests passed on exact HEAD and visual Staging acceptance completed.
- Safety correction: Workers AI semantic inference is disabled by default even when the AI binding exists. It requires explicit `ENABLE_SEMANTIC_TRIAGE=true` after account Free-plan status, remaining daily quota, and privacy terms are verified. Tests cover both disabled-by-default and explicit opt-in behavior. No plan/usage claim is made because Billing Read and Neurons usage are unavailable through the current Cloudflare connection.
- CI now tests pushes to `main` and `feat/general-temporal-retrieval`; the Staging deploy workflow is restricted to `main` and runs only on main push or manual dispatch. Production deployment is not part of this workflow.
- Integration PR #24 is the controlled path to bring the development branch into default `main`. Do not merge until its exact-head CI is green and the branch reconciliation is clean.
- Status: targeted live UI acceptance VERIFIED; source safety correction IMPLEMENTED; CI validation IN PROGRESS; Staging redeployment of safety correction PENDING; Production unchanged.


## 2026-11-11 — main integration and safety redeployment
- PR #24 merged into default branch `main` at `1d9b6ee41ec990240967e7f48705589eb223f242`; branch history was reconciled and the PR was mergeable/clean before merge.
- Main push workflow #42934144598 completed SUCCESS on exact main HEAD; 89/89 tests passed, 0 failed, 0 skipped; all Worker/adjudication/domain/browser syntax checks passed; 32-case synthetic temporal diagnostic passed (not a real-world accuracy estimate).
- Staging-only workflow #42934144543 completed SUCCESS on exact main HEAD. Wrangler 4.36.0 deployed only `freshproof-staging`; it uploaded no changed static assets and created deployment `e0cba86c-f5f9-4e97-a28f-25e263a1c3a4`, Version `4e6e7533-450a-4aa2-ab8a-aa625e34de7c`, 100% traffic.
- Staging settings re-read after deployment: AI, ALLOWED_ORIGIN, API_RATE_LIMITER, ASSETS, TAVILY_API_KEY bindings present. No secret value read. No `ENABLE_SEMANTIC_TRIAGE=true` variable is configured; code defaults to `DISABLED_BY_DEFAULT` even when AI binding exists.
- Production audit remains unchanged: deployment `5e2c2dd9-b72b-4b5e-960c-43a754b6db02`, Version `4e96bf6c-8d6f-4f29-93bd-124589b5bd69`, 100% traffic.
- Browser-side smoke test of the newly deployed Staging Version is still pending. The previous visual Node.js 16 acceptance screenshot was on the prior Staging Version 21; re-run the exact claim on the new Version and confirm `SUPERSEDED`, `EOL`, and `2023-09-11`, plus `DISABLED_BY_DEFAULT` semantic triage.
- Status: main integration MERGED; CI TESTED; safety version DEPLOYED to Staging; Staging deployment VERIFIED by Cloudflare API; latest browser smoke test PENDING; Production unchanged.


## 2026-11-11 — Staging deployment final pointer and CI trigger guard
- Two subsequent main documentation commits caused the push-triggered Staging workflow to run again before its path filter was added. Both Staging runs completed successfully; neither changed application source or assets.
- Latest Staging deployment pointer: `8b5f3479-e88f-447f-95c6-ac2b52a0e734`, Version `a32c8c4b-a5bd-4e7c-b920-ca7f1ae0db4f`, 100% traffic, created 2026-11-11T00:50:23Z.
- Production remains unchanged at deployment `5e2c2dd9-b72b-4b5e-960c-43a754b6db02`, Version `4e96bf6c-8d6f-4f29-93bd-124589b5bd69`, 100% traffic.
- Added path filters to the Staging workflow: only runtime code/config changes under `worker/**`, `src/**`, `wrangler.toml`, `package.json`, and `package-lock.json` trigger automatic Staging deployment. Documentation-only changes no longer redeploy the Worker. Manual dispatch remains restricted to `main`.
- Latest browser smoke test on Version `a32c8c4b` is still pending; do not claim visual acceptance of the post-safety deployment until the owner tests the URL.


## 2026-11-11 — Latest Staging browser acceptance and ownership visibility
- Owner supplied two browser screenshots of the Staging verification report for: `Node.js 16 is currently an actively supported LTS release.`
- Visible result: `SUPERSEDED`; support status `EOL`; LTS start `2021-10-26`; maintenance LTS start `2022-10-18`; end of life `2023-09-11`; latest LTS major `v26`.
- Official Node.js Release Working Group schedule evidence is displayed, alongside source publication metadata and bounded relevance/relation caveats.
- Semantic triage visibly reports `DISABLED BY DEFAULT`; conflict candidates are explicitly labeled as review signals, not verdicts.
- This records owner-assisted visual acceptance of the latest Staging test result. The screenshots do not expose a Worker Version identifier, so the exact runtime version cannot be independently tied to the image alone.
- No claim is made that this single specialized Node.js case validates generic claim verification across other domains.


## 2026-11-11 — Person-first US office-holder claim fix
- The owner-assisted live test for `Joe Biden is currently the President of the United States.` returned `NEEDS_REVIEW`; the displayed search results were historical/secondary and did not surface the current White House administration directory. No incorrect contradiction verdict was emitted.
- Root cause confirmed by code inspection: the US office-holder adapter recognized role-first forms (for example, `The President of the United States is Joe Biden`) but not person-first forms (for example, `Joe Biden is currently the President of the United States`). The specialized primary-source route therefore did not activate.
- Implemented person-first detection for full office title and US President variants, including optional currently/now/presently wording. Original claim text is preserved.
- Added four regression tests: exact live phrasing detection; contradiction against recent dated official White House directory; matching current-holder abstention; and abstention for undated, stale, or non-official sources.
- Version bumped to `0.2.27`.
- Exact code HEAD `9dcd242ee98690fe803d95cbc383b920e98a6f7f`: GitHub Actions test workflow #42938485908 SUCCESS, 93/93 tests passed, 0 failed. An earlier run failed only because a separate legacy test still expected version 0.2.26; that stale fixture was updated and the exact subsequent HEAD passed.
- Staging workflow #42938485899 SUCCESS. Cloudflare deployment API confirms latest Staging deployment `b3a0ca48-c419-4271-8b65-812ab3eae794`, version `e9c45c62-76d8-4620-b80a-ca1637b95f30`, 100% traffic, created 2026-11-11T01:22:51Z.
- Production was not modified. No secret values were read. No paid service, billing change, or Workers AI opt-in was enabled.
- Browser acceptance of the exact person-first claim on this new Staging version remains PENDING. The code-level regression verifies the detector and adjudicator against a fixture; it does not prove live Tavily retrieval returns the current White House source.


## 2026-11-11 — White House administration fallback query refinement (v0.2.28)
- Owner's browser test on Staging v0.2.27 returned `NEEDS_REVIEW`. Results included White House news/archive pages but not the dedicated current administration directory; the adapter correctly abstained because article-domain presence alone is not sufficient proof of the office holder.
- Refined the specialized fallback search query to target the White House administration directory and request the President, Vice President, and First Lady identity context. The adjudicator remains restricted to eligible `whitehouse.gov/administration` sources and still requires dated evidence; ordinary White House articles and archive pages are not sufficient.
- Version: `0.2.28`.
- Exact HEAD `b26d26cee7b12a26a7b78dfb0ed143e5d0ab354c`: GitHub Actions run #42939201133 SUCCESS; 94/94 tests passed, 0 failed.
- Staging workflow #42939201061 SUCCESS. Cloudflare deployment API confirms deployment `4786faf6-bfec-4c0f-899c-6d5b0796baa4`, Version `5e9bcea8-c878-4e49-a3ab-7237438e8953`, 100% traffic, created 2026-11-11T01:28:57Z.
- Production remains unchanged. No secrets were read; no paid services, billing changes, or AI opt-in were enabled.
- Browser acceptance of the exact Joe Biden claim on v0.2.28 remains PENDING. A successful unit suite and deployment do not establish live retrieval/adjudication success.


## 2026-11-11 — Direct official administration directory evidence (v0.2.29)
- Owner's v0.2.28 browser retest remained `NEEDS_REVIEW`; results showed White House news/archive content but not the dedicated administration directory. This was not treated as proof of a classified/restricted source.
- Public-source check located the official directory at https://www.whitehouse.gov/administration/. The indexed official page identifies "President Donald J. Trump" and "45th & 47th President of the United States"; the indexed publication date is 2025-01-20. The page is publicly indexed; there is no evidence in this check that it is classified or access-restricted.
- Implemented a bounded direct HTML fetch of the official directory, with strict final-host/path checks, HTML content-type check, 1 MB response bound, and conservative parsing of the President heading. Off-domain redirects and non-HTML responses are rejected.
- Publication date and retrieval timestamp are now separate fields. A dated page publication in 2025 is not misrepresented as a 2026 update. For this specifically identified live official directory only, the verdict gate accepts a retrieval timestamp no older than 15 minutes, alongside official host/path and role-holder extraction. If fetch fails, the response is non-HTML, the page structure changes, or the holder cannot be parsed, the adapter abstains.
- Regression coverage includes HTML parsing, distinct publication/retrieval dates, mocked direct-fetch success, off-domain redirect rejection, non-HTML rejection, and adjudication. Exact HEAD `ff3b9321662125bee5767ce2ff4fd45799096bfc`: GitHub Actions #42940293741 SUCCESS, 97/97 tests passed, 0 failed.
- Staging deployment workflow #42940293675 SUCCESS. Cloudflare API confirms deployment `4878202f-8d92-4362-8978-4d21d72fb604`, Version `f7987106-f04f-45a0-8c3e-fc1799e02d55`, 100% traffic, created 2026-11-11T01:36:30Z.
- Important limitation: direct fetch has been unit-tested with controlled fixtures, and the public official page content was independently confirmed through indexed official-source results. A live fetch from the deployed Worker runtime has not yet been directly observed. Browser acceptance of the exact Joe Biden claim on v0.2.29 remains PENDING.
- Production unchanged. No secrets read; no paid services, billing changes, or AI opt-in enabled.


## 2026-11-11 — Office-holder evidence provenance display correction (v0.2.30)
- The owner visually accepted the live White House administration-directory result as `CONTRADICTED` for the Joe Biden current-president claim on Staging v0.2.29.
- Follow-up review identified two auditability issues: the specialized verdict limitation still referred to search snippets, and the UI did not expose the direct-fetch retrieval timestamp alongside the absent source publication date.
- Updated the adjudication explanation for live directory evidence: explicitly states that the directory was fetched directly during verification, that the page did not expose a source publication date, and that retrieval time is separately recorded. Search-snippet-based verdicts retain a distinct limitation.
- Added evidence metadata: publication date, publication-date semantics, retrieval timestamp, evidence kind, and source URL/title.
- Updated UI to display source publication date (or `NOT PROVIDED BY SOURCE`) separately from `RETRIEVED AT ... (UTC)`; specialized finding now also shows publication-date semantics and retrieval time.
- Added regression coverage for missing publication date, distinct retrieval timestamp, and the live-directory-specific limitation.
- Worker version `0.2.30`; GitHub Actions #42941291279 SUCCESS. The final full suite is green. Staging workflow #42941291142 SUCCESS.
- Cloudflare Staging deployment: `b1f2eb02-f825-4094-bc31-832f8450918a`, version `5fecaf47-a3d1-4805-9100-33a807e2f576`, 100% traffic, created 2026-11-11T01:46:20Z.
- Production unchanged. No secret values read; no paid services, billing changes, or Workers AI opt-in enabled.
- Owner browser acceptance of the corrected date/provenance display on v0.2.30 remains pending. The prior v0.2.29 verdict remains accepted; UI correction is deployed but awaits visual confirmation.


## 2026-11-11 — Owner visual acceptance of Staging v0.2.30 provenance correction
- Owner supplied browser screenshots from the current Staging application after rerunning the Joe Biden current-president claim.
- Visually confirmed: `CONTRADICTED`; official White House administration-directory adjudication; source publication date `NOT PROVIDED BY SOURCE`; publication semantics `NOT_PROVIDED`; separate UTC evidence retrieval timestamp; limitation explicitly says the directory was fetched directly and retrieval time is separately recorded.
- The direct-directory source card also displays source publication as not provided and the retrieval timestamp separately.
- Owner visual acceptance: PASS. This closes the v0.2.30 browser acceptance gate.
- Remaining caveat: generic search snippets are still shown as supplementary evidence and their lexical relevance/conflict labels are not semantic entailment; the UI correctly preserves that limitation. Proceed with the agreed modest balanced claim matrix, not additional scope expansion.


## 2026-11-11 — Expanded balanced matrix with technology coverage
- Owner accepted v0.2.30 provenance display; acceptance gate closed.
- Matrix refined to nine claims across three technology lifecycle cases (Node.js 16, Python 2.7, Windows 10), public officeholder, institutional X account identity, official ChatGPT Plus US pricing, a historical temporal fact, and English/Arabic stable controls.
- Two browser batches (5 + 4) respect the Worker limit of five claims and five search calls per request. The previously accepted Joe Biden case may be reused as evidence rather than spending another search.
- Primary-source research identified Python 2 support end date as 2020-01-01 and official OpenAI Help Center price as US$20/month. These are research inputs, not yet FreshProof test results.
- The X account case is deliberately conservative: a U.S. Embassy page lists @WhiteHouse, but that secondary institutional list alone is not sufficient proof from the account operator. `NEEDS_REVIEW` is acceptable if FreshProof cannot obtain stronger first-party evidence.


## 2026-11-11 — Technology-inclusive balanced matrix and repository regression run
- Expanded `docs/BALANCED-TEST-MATRIX.md` to nine representative claims: Node.js 16, Python 2.7, Windows 10, Joe Biden officeholder (already owner-accepted), White House X account identity, ChatGPT Plus US pricing, Python 2 historical EOL, and English/Arabic stable controls.
- The plan explicitly separates the accepted officeholder case from remaining browser work, and uses two batches (maximum five claims per request). Identity and pricing acceptance rules are conservative and scope-specific.
- Primary-source research: Python.org states Python 2 was sunset on 2020-01-01 and no longer supported; OpenAI Help Center states ChatGPT Plus is $20/month. These are source-research facts only, not FreshProof execution results.
- CI on matrix/documentation HEAD `b0e05b516bdf4d1c277a22c574784d792926abdd`: workflow #42942804705 SUCCESS, 98/98 tests passed, 0 failed.
- No application runtime code changed; Staging remains v0.2.30. Browser/live API execution of the remaining matrix has not been performed from the connected tool context; connected browser session is unavailable here. Owner browser verification is therefore still required for the live cases.


## 2026-11-11 — Browser Batch A results and pricing temporal-gate defect
Owner screenshots from Staging v0.2.30 show four claims:
- Node.js 16 currently actively supported LTS: PASS. Status `SUPERSEDED`; official Node.js schedule evidence; LTS start 2021-10-26, maintenance LTS 2022-10-18, EOL 2023-09-11.
- Python 2.7 currently supported: `NEEDS_REVIEW`. Returned sources were Google App Engine deprecation and Ansible discussion, not direct Python.org/PEP primary evidence. Abstention is appropriate; evidence quality/retrieval is insufficient for this claim.
- Windows 10 currently supported: `NEEDS_REVIEW`. Microsoft Learn result explicitly states Windows 10 reached end of support on 2025-10-14, but generic adjudication did not produce a verdict. This is a missed adjudication opportunity, not a false verdict.
- ChatGPT Plus costs US$20/month in the US: incorrectly classified `NOT_TIME_SENSITIVE`, no evidence retrieved. Root cause: temporal pre-filter omitted common price expressions such as `costs`, `pricing`, `monthly`, and `subscription fee`, so the official pricing adapter never ran.
- Implemented narrow fix in `worker/index.js`: temporal vocabulary now includes prices/pricing/cost(s), monthly, subscription, per month, fee(s).
- Added regression test in `worker/index.test.js` for representative pricing phrasings and adapter selection.
- CI run #42943447708 SUCCESS: 99/99 tests passed, 0 failed, on commit `d17ab392be72350291012685f684a749495e10a3`.
- Staging deployment workflow #42943447716 was still in progress at the time of this record. Do not retest browser until its deployment/version is confirmed.
- No Production changes; no secret reads; semantic triage remains disabled by default.


## 2026-11-11 — Pricing temporal detector fix deployed to Staging
- Pricing temporal vocabulary fix and regression test are present in `main` commit `d17ab392be72350291012685f684a749495e10a3`.
- CI #42943447708 SUCCESS: 99/99 tests passed, 0 failures.
- Staging deployment workflow #42943447716 SUCCESS.
- Cloudflare Staging deployment verified: deployment `f2adb46a-f3b6-48f3-8a7c-5464f6624de1`, Version `925b3b7f-d494-44cb-9d26-8952d67fc10a`, version number 36, 100% traffic, created 2026-11-11T02:05:07Z.
- Browser retest of ChatGPT Plus US pricing is pending. Do not mark the pricing case passed until it reaches the official pricing adapter and displays relevant official OpenAI evidence with correct country/currency/billing-period scope.
- Production remains unchanged.


## 2026-11-11 — Owner browser retest of ChatGPT Plus pricing on Staging v0.2.30 / Version 36
- Exact claim: `ChatGPT Plus costs US$20 per month in the United States.`
- Temporal detection fix is confirmed in browser: claim is no longer mislabeled `NOT_TIME_SENSITIVE`; FreshProof retrieved multiple OpenAI-domain results.
- The first OpenAI result (`Introducing ChatGPT Go, now available worldwide | OpenAI`, source publication shown as 2026-11-05) explicitly states ChatGPT Plus is US$20/month. Another OpenAI result (`Our approach to advertising and expanding access to ChatGPT | OpenAI`) also states Plus is US$20/month.
- Observed final status: `NEEDS_REVIEW`, evidence confidence `MULTI_SOURCE`, source profile `PRIMARY_OR_OFFICIAL_DOMAIN, UNASSESSED`.
- Assessment: temporal classification and official-source retrieval PASS; final adjudication is conservative but incomplete. The displayed lexical overlap matches ChatGPT/Plus/month but does not semantically establish the full scoped claim (especially United States). The report correctly avoids a definitive `CURRENT` verdict absent explicit scoped corroboration.
- This is not a full pricing-case PASS. Record as `DETECTION_PASS / ADJUDICATION_NEEDS_REVIEW`.
- No additional runtime change made after observing this retest.


## 2026-11-11 — Workers AI semantic triage enabled on Staging for full-feature validation
- Owner clarified that all product features should be enabled and functionally tested; free quota availability is not a reason to keep features disabled. Only paid-plan requirements are disallowed.
- Verified current official Cloudflare Workers AI documentation: Workers AI is available on Workers Free and Paid plans with 10,000 Neurons/day free allocation; models `@cf/zai-org/glm-4.7-flash` is explicitly listed as available on Workers Free. Source: https://developers.cloudflare.com/workers-ai/platform/pricing/ and https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/.
- Verified FreshProof Staging already has the Workers AI `AI` binding and uses `@cf/zai-org/glm-4.7-flash` in code.
- Enabled plain-text binding `ENABLE_SEMANTIC_TRIAGE=true` on **Staging only** via Cloudflare API. No secret values read or changed.
- Cloudflare created Version 37: `30508d47-f853-476f-a1cd-14a6c54fc045`; deployment `8c70b7fd-03dc-41b0-9d8b-3e6b8ebecdc2`; 100% Staging traffic. Settings and version metadata independently verified, including AI binding and enabled flag.
- Production remains unchanged and semantic triage remains disabled there.
- Configuration is `IMPLEMENTED / VERIFIED`; actual model invocation and semantic adjudication behavior remain `FUNCTIONAL TEST PENDING`. The next browser claim batch must inspect per-claim semantic assessment and verify the model actually ran; a configured flag alone is not acceptance.


## 2026-11-11 — Batch B browser findings and temporal-gate regression fix
Owner browser screenshot on Staging Version 37 contained four claims; all were immediately returned as `NOT_TIME_SENSITIVE` with no evidence:
- White House official X account identity — false negative; identity claims need temporal/verification retrieval.
- Python 2.7 reached end of life on 2020-01-01 — false negative; explicit lifecycle phrase was not recognized.
- Gold chemical symbol is Au — expected stable control; `NOT_TIME_SENSITIVE` is correct.
- Arabic water molecule composition — expected stable control; `NOT_TIME_SENSITIVE` is correct.
- Code inspection confirmed the early `!isLikelyTemporal` branch bypasses search and semantic model invocation. Thus semantic triage was enabled in Staging configuration but not invoked for any of these four claims. This is expected for stable controls, but an unacceptable false-negative for the identity and EOL claims.
- Implemented temporal patterns for reached/reaches/reach end-of-life/EOL/end-of-support/end-of-service, and official/verified/authentic social account/profile/handle identity including X/Twitter.
- Added regression tests for Python 2 EOL, White House X identity, and stable English/Arabic controls.
- CI #42946155319 SUCCESS on `e9ba5caec84360d24ba9775f1990d0c94ca0a087`. Staging deployment workflow #42946155305 was still in progress at documentation time; do not browser retest until deployment/version is verified.
- Expected after deployment: White House and Python EOL proceed to evidence retrieval and semantic triage; gold and Arabic water remain `NOT_TIME_SENSITIVE` and should not trigger retrieval/model calls.


## 2026-11-11 — Temporal-gate fix deployed; semantic flag restored and verified
- CI #42946155319 SUCCESS on `e9ba5caec84360d24ba9775f1990d0c94ca0a087`.
- Staging deployment workflow #42946155305 SUCCESS.
- Deployment initially produced Version 39 but reset the dashboard-applied semantic flag to false. This was detected by reading version binding metadata; no browser retest was requested on that version.
- Restored `ENABLE_SEMANTIC_TRIAGE=true` on Staging after deployment and independently re-read the new active version.
- Final Staging Version 40: `61ecb7ab-ecc2-4f3e-ae19-5aabf8f7066e`, deployment `a5e0ec7e-921a-47fc-9ee5-78bf63814419`, 100% traffic; AI binding present and semantic flag true.
- Production unchanged.
- Next browser retest must be run against Version 40. Expected: White House X identity and Python 2 EOL pass temporal gate, retrieve evidence, and invoke Workers AI semantic triage; gold and Arabic water remain `NOT_TIME_SENSITIVE` as stable controls. Verify actual model invocation, not only the configured flag.


## 2026-11-11 — Batch B retest analysis (Staging Version 40)
Owner supplied four screenshots:
- White House X identity: `NEEDS_REVIEW`. Search results included unrelated White House posts, X snippets, an official U.S. Embassy social-media directory, and a White House page whose footer/social links include `https://x.com/whitehouse`. Semantic triage completed and correctly marked several sources insufficient; however, the first-party account-link evidence was not cleanly isolated/retained as direct proof for the claim. Independently verified through Exa that a page on `whitehouse.gov` links to `https://x.com/whitehouse`; source page URL: https://www.whitehouse.gov/media-bias/the-washington-post-4/. This supports the handle as a first-party linked account, but the app's evidence pipeline should retrieve and present it explicitly.
- Python 2.7 EOL: `NEEDS_REVIEW`. Semantic triage completed and classified the surfaced sources as supporting the date. Search did not surface the official Python.org sunset page. Independently verified official source: https://www.python.org/doc/sunset-python-2/; it explicitly says January 1, 2020 was the Python 2 sunset date and that Python 2 is no longer supported as of that date.
- Gold symbol: `NOT_TIME_SENSITIVE`, correct stable-control classification.
- Arabic water molecule claim: `NOT_TIME_SENSITIVE`, correct temporal classification; claim text was extracted and displayed in Arabic. However, UI labels and explanations remain English. Arabic output/localization is not yet accepted.
- Semantic triage actual invocation: VERIFIED for White House and Python claims by visible `COMPLETED ADVISORY` with per-source relation outputs. Stable controls correctly bypass retrieval/model invocation.
- Remaining defects: first-party evidence retrieval/adjudication for White House and Python; Arabic-language UI/explanation; search noise and relevance quality for identity claims. No final verdict accepted for the two temporal claims.


## 2026-11-11 — FreshProof v0.2.31 evidence retrieval verification
- Merged PR #29 at `ecdffaefacc37aeccd3d09d2de8f09976181dc5c`.
- CI #42954850693: 113/113 Node tests passed; all syntax checks and the 32-case synthetic diagnostic passed.
- Staging deployment #42954911415 succeeded; version `5d893901-72e3-4e4b-9775-1d7c6c8abf21`.
- Independent health GET returned `ok=true`, service `FreshProof`, version `0.2.31`.
- Production unchanged. Browser POST acceptance remains pending.


## 2026-11-11 — FreshProof v0.2.32 Python.org HTTP 403 remediation
- Owner screenshots demonstrated direct Python.org fetch HTTP 403; v0.2.31 correctly abstained but failed to recover first-party evidence.
- PR #30 merged as `d3ba40fb443c1b6588e3a1d886ed2d7f936c1608`.
- Strict fallback: domain-restricted Tavily search; exact Python.org sunset-page path; excerpt must include both event date 2020-01-01 and explicit no-support wording; off-domain/incomplete excerpts rejected.
- Provenance explicitly states `TAVILY_INDEXED_FIRST_PARTY_PAGE`, page itself not fetched, publication date unavailable.
- CI #42959837845 and main CI #42959897537 passed 115/115 tests, syntax checks, and synthetic 32-case benchmark.
- Staging deploy #42959897562 succeeded; version `af23697f-0370-489f-b605-498f50d805c4`; independent health endpoint verified v0.2.32.
- Live browser POST acceptance of Tavily fallback remains pending. Production unchanged.


## 2026-11-11 — Three-pillar product architecture adopted
- Owner approved VERIFY, EXPLAIN, and CORRECT as mandatory claim-level outcomes across FreshProof, not a domain-specific feature.
- Added `docs/THREE-PILLAR-PRODUCT-ARCHITECTURE.md` and aligned `docs/ARCHITECTURE.md`, `docs/API.md`, and `README.md`.
- Defined conservative verification statuses, structured explanation target, status-gated correction policy, target API objects, UI acceptance, metrics, and delivery sequence.
- Explicit implementation boundary: VERIFY partial, EXPLAIN partial, general CORRECT not yet implemented.
- Documentation-only change; runtime behavior unchanged. PR CI and merge pending.


## 2026-11-11 — Three-pillar architecture merged and validated
- PR #31 merged to main as `e12f9875c6846d4e7e260f951578e4b223b8a44c`.
- PR CI #42960562784 and main CI #42960599642 passed: 115/115 tests, all Worker/adjudication/domain-adapter/browser syntax checks, and 32-case synthetic temporal smoke benchmark (diagnostic only).
- Documentation-only change; runtime and Staging behavior unchanged.
- Next implementation work: backward-compatible structured explanation/correction response contract, deterministic evidence-gated correction builder, UI presentation, and labelled correction evaluation.


## v0.2.43 Staging deployment verification — 2026-11-11
- Repository: `ralhamdan7-lab/freshproof`, private; default branch `main`.
- Merge commit deployed: `88e5ca44ffe0f2294449ec21e88b831edad8b7b6`.
- GitHub Actions Staging deployment run: `43065149282`, event `push`, conclusion `success`.
- Job: `Verify and deploy Staging only`; test suite 154/154 passed; Worker/adjudication/domain-adapter/browser syntax checks passed; temporal smoke benchmark passed (32 synthetic cases; diagnostic only).
- Wrangler output: uploaded `freshproof-staging`; deployment completed successfully; URL `https://freshproof-staging.ralhamdan7.workers.dev`; Cloudflare Version ID `bfb56ad1-4989-4b11-8213-c28a6ba500b6`.
- Deployment log confirms `ENABLE_CORRECTION_CANDIDATE_REVIEW=false` and `FREE_WORKERS_AI_QUOTA_VERIFIED=false`; no Workers AI inference was enabled.
- Production Worker was not targeted by the workflow; no production deployment was performed.
- Independent HTTP health and browser POST/visual acceptance remain unverified: container DNS lookup for the Staging `workers.dev` hostname failed before an HTTP connection could be made. This is an execution-environment limitation, not an application response.
- Generic model-assisted corrections remain gated off until the FreshProof account's Free plan, remaining quota, and provider privacy terms are verified. No paid fallback is authorized.


## v0.2.43 independent Staging HTTP health verification — 2026-11-11
- Retrieved `https://freshproof-staging.ralhamdan7.workers.dev/api/health` through the Exa webpage fetch tool.
- Exact response: `{"ok":true,"service":"FreshProof","version":"0.2.43","mode":"evidence-triage"}`.
- Retrieved the Staging root page successfully; page title and main input prompt were present.
- This independently verifies public GET reachability, Worker health, and deployed version 0.2.43.
- It does not verify browser JavaScript execution, form submission, POST `/api/verify`, live Tavily retrieval, claim adjudication, correction rendering, or RTL/LTR visual behavior.
- Browser connector access could not be initialized because no originating browser context was available. Container DNS resolution also failed on the earlier path; Exa fetch succeeded through a separate route.
- Production unchanged. No secrets, billing, quota, or account configuration changed.


## 2026-11-11 — v0.2.44 release identity correction
- Main CI for merge commit `0b09a59da92f4dc0f1462b34b4c2e6e7f738283d` completed successfully; the expanded suite contains 165 passing tests.
- Staging deploy workflow `43070648836` completed successfully, but independent health GET still returned application version `0.2.43`.
- Root cause identified by source inspection: both `package.json` and `worker/index.js` still declared `0.2.43`; deployment of new code did not automatically bump the application-reported version.
- Corrective release metadata update: bump both declarations to `0.2.44`. This is a release-identity correction, not a claim of new verification capability. Staging redeployment and independent health verification are pending.
- Production remains unchanged.


## v0.2.44 Staging deployment verification — 2026-11-11
- Main CI run `43077063846` completed successfully on commit `8093b5b7d484436f7fac8d2643766f96aaf1b8c1`.
- The passing workflow ran the full Node test suite, Worker/application syntax checks, and temporal smoke benchmark before deployment.
- Staging deployment run `43077063887` completed successfully. Wrangler reported `Uploaded freshproof-staging`, `Deployed freshproof-staging`, and Current Version ID `8745570d-9764-4085-aa18-c42e7260481a`.
- Independent health verification with a cache-busting query returned exactly `{"ok":true,"service":"FreshProof","version":"0.2.44","mode":"evidence-triage"}`.
- The Staging root page also returned the FreshProof product title, input heading, and privacy reminder.
- This verifies release identity, deployment completion, health endpoint, and root-page HTTP reachability. It does not verify browser-side execution, live `/api/verify` POST, Tavily retrieval with the configured secret, or end-user rendering of claim evidence.
- Production was not deployed or modified. No paid service, billing, payment method, or quota expansion was enabled.

## PR #55 — evidence scope and source-tier abstention regressions — 2026-11-11
- Added three focused tests in `tests/temporal-regressions.test.js`:
  1. Two recent secondary/unassessed domains with advisory SUPPORTS labels cannot establish CURRENT for a time-sensitive claim; qualified primary-source count remains zero.
  2. A cross-source scope/jurisdiction conflict candidate blocks CURRENT even when two primary sources carry nominal SUPPORTS labels.
  3. Explicit INSUFFICIENT semantic relations are not counted as supporting evidence.
- PR #55: https://github.com/ralhamdan7-lab/freshproof/pull/55; squash-merged to main as `20831e6ce4650cb3337bc6f1ac0158b3c309a95b`.
- PR CI run #43077675613: SUCCESS. Exact suite: 168/168 Node tests passed; Worker, adjudication, domain-adapter and browser syntax checks passed; 32-case synthetic temporal smoke benchmark passed (16 TP, 0 FP, 16 TN, 0 FN; diagnostic only, not real-world accuracy).
- Runtime behavior unchanged; test-only change. No Staging deployment was triggered or required. Production and Staging configurations remain unchanged.
- This verifies conservative behavior against controlled fixtures only. It does not verify live-provider source quality or broad field accuracy.

## 2026-11-11 — Staging live-provider acceptance (v0.2.44)
- Added isolated workflow `.github/workflows/staging-live-smoke.yml`, triggered only by changes to that workflow on `main` or manual dispatch. It submits two fixed, non-sensitive test claims directly to the Staging API; it does not read, print, or modify API secrets and does not deploy code.
- Live acceptance run #43078258475: SUCCESS. Exact Staging API `POST /api/verify` requests returned HTTP 200 for both cases. The normal offline CI run #43078258533 also completed successfully.
- Staging identity: response version `0.2.44`. A cache-busted independent health GET also returned `0.2.44`; an earlier non-cache-busted extraction showed `0.2.43`, demonstrating a stale intermediary response rather than a new deployment regression.
- FP-PYTHON-LIVE-01 input: `Python 2.7 is still officially supported.`
  - Live result: `SUPERSEDED`; temporal assessment `TEMPORAL_REVIEW_REQUIRED`; one eligible official evidence basis; correction `PROVIDED` with one evidence reference.
  - Exact source: https://www.python.org/doc/sunset-python-2/; event date `2020-01-01`; publication date unavailable.
  - Acquisition: Tavily returned results; direct Python.org retrieval returned HTTP 403; strict domain/path/date/no-support validation accepted a first-party indexed excerpt (`TAVILY_INDEXED_FIRST_PARTY_PAGE`). The API exposed this limitation in both explanation and correction.
  - Bounded retrieval used 2 of 5 allowed searches. This is a successful live end-to-end specialized adapter flow, not evidence of broad generic correction accuracy.
- FP-STABLE-LIVE-01 input: `Water is composed of hydrogen and oxygen.`
  - Live result: `NEEDS_REVIEW`; temporal assessment `NOT_TIME_SENSITIVE`; five sources were returned; semantic assessment `DISABLED_BY_DEFAULT`; correction `WITHHELD`.
  - This confirms the product rule that stable claims still undergo retrieval, but cannot be declared CURRENT without semantic relation assessment; no unsupported correction is generated.
- No Workers AI setting was enabled. No generic correction gate was changed. No production deployment, billing, payment, quota upgrade, or secret operation occurred.
- Live-provider status: Tavily retrieval and API response are VERIFIED for these two bounded examples. Browser-side JavaScript execution, visual/RTL-LTR acceptance, broad multi-domain live matrix, and generic semantic-verification quality remain NOT VERIFIED.


## 2026-11-11 — Arabic/LTR direction contract regression coverage
- Added `tests/text-direction.test.js` with five deterministic cases: Arabic RTL, English LTR, Arabic prose containing Latin acronyms/numbers, balanced/empty input fallback, and non-string input normalization.
- This directly tests the shared direction classifier consumed by the claim-report renderer. It does **not** constitute real-browser layout, visual rendering, keyboard, mobile viewport, or accessibility verification.
- CI run #43083818469: SUCCESS. Node test suite: 173/173 passed; Worker, adjudication, domain-adapter and browser application syntax checks passed; 32-case temporal smoke benchmark passed (synthetic diagnostic only).
- No application runtime code, API behavior, Staging deployment, Production resource, provider configuration, secret, or billing setting changed.


## 2026-11-11 — Workers AI free-tier and privacy feasibility review
- Reviewed official Cloudflare Workers AI pricing and data-usage documentation: https://developers.cloudflare.com/workers-ai/platform/pricing/ and https://developers.cloudflare.com/workers-ai/platform/data-usage/.
- Public docs state Workers Free receives 10,000 Neurons/day, resets at 00:00 UTC, and requests fail with HTTP 429 when the free allocation is exhausted; Workers Paid can bill above the free allocation. The current pricing page lists `@cf/zai-org/glm-4.7-flash` at 5,500 Neurons per million input tokens and 36,400 per million output tokens.
- Cloudflare states standard stateless Workers AI inference has zero data retention after request processing and does not use Customer Content to train models, subject to documented stateful/logging/caching and third-party routing exceptions. Operational metadata may still be retained.
- Added `docs/WORKERS-AI-FREE-PRIVACY-GATE.md` with FreshProof-specific activation gates and the official-source findings.
- Decision: **NO-GO for activation now** because the dedicated FreshProof account's actual plan, remaining quota, and model eligibility were not independently verified. Existing feature flags remain disabled; no account configuration, inference, deployment, billing, or payment setting changed.


## 2026-11-11 — Staging browser acceptance verified
- Added `scripts/staging-browser-smoke.mjs` and `.github/workflows/staging-browser-acceptance.yml`. The browser script is deliberately outside Node's default test discovery and is run only by the dedicated browser workflow.
- Main-push browser workflow run #43085188592: SUCCESS. Chromium opened the actual Staging root at `https://freshproof-staging.ralhamdan7.workers.dev` and received HTTP 200.
- The browser test used a deterministic intercepted `POST /api/verify` fixture (no Tavily quota consumed; no live claim content sent) and verified: empty-input validation; character counter; Verify button interaction; rendered report and two claim cards; Arabic claim `lang=ar, dir=rtl`; English claim `lang=en, dir=ltr`; evidence link destination; correction-withheld panel; 390px mobile viewport with no horizontal overflow; and zero uncaught browser JavaScript errors.
- The test exercises the real deployed Staging UI assets and browser execution, but the API response is mocked. It does **not** establish live-provider accuracy, real API-to-UI integration, keyboard/screen-reader accessibility, or visual comparison across all devices.
- Main verification workflow run #43085188577: SUCCESS on merge commit `32bf131f95a341d9377263caae0c9813234b8081`; the full Node suite, syntax checks, and 32-case synthetic temporal smoke benchmark passed.
- PR #58 merged as `32bf131f95a341d9377263caae0c9813234b8081`; PR #57 merged as `a658ff1b99a2150dd58a530d9d1720a357be143c`. Both are tests/documentation/workflow only. No runtime application code changed and no deployment was performed.
- Workers AI remains disabled; no account settings, secrets, billing, or payment methods changed. Production remains untouched.


## 2026-11-11 — Diverse live Staging matrix and Arabic lifecycle fixes
- Live acceptance workflow #43087345295: SUCCESS after Staging deployment #43087254820; main verification CI #43087254696: SUCCESS. Staging runtime remains v0.2.44; the deploy contained a narrowly scoped Arabic detection fix, not a runtime version bump. Production was not touched.
- FP-LIVE-OFFICEHOLDER-01: "As of November 11, 2026, the President of the United States is Joe Biden." returned CONTRADICTED with TEMPORAL_REVIEW_REQUIRED. The office-holder adapter identified the current holder from the official White House administration directory; five sources were returned, with official White House URLs in the evidence basis. Correction remained WITHHELD because no independently validated replacement sentence was authorized by the correction policy. This is a positive stale-claim detection result, not a generic correction test.
- FP-LIVE-AR-PYTHON2-01: "لا يزال Python 2.7 مدعوماً رسمياً." returned SUPERSEDED, TEMPORAL_REVIEW_REQUIRED, and PROVIDED Arabic correction linked to https://www.python.org/doc/sunset-python-2. Direct Python.org fetch returned HTTP 403; the domain-restricted indexed first-party excerpt was accepted only after exact host/path and content checks. No source publication date was supplied; event date 2020-01-01 remained distinct. The acquisition limitation is disclosed. One eligible official source only; do not generalize this to multi-source corroboration.
- FP-LIVE-HISTORICAL-01: "Apollo 11 landed on the Moon in 1969." returned NOT_TIME_SENSITIVE as temporal metadata, factual status NEEDS_REVIEW, and correction WITHHELD. The retrieved results included secondary/tertiary pages; the engine correctly abstained rather than converting topical retrieval into factual support. Sources included 2026 publication dates and 1969 event-date candidates, demonstrating the distinction but not validating every candidate extraction.
- The first live matrix attempt failed because the workflow had no repository checkout. After adding checkout, it exposed two genuine Arabic gaps: the Python 2 lifecycle adapter did not recognize Arabic support phrasing, and temporal sensitivity still marked that claim NOT_TIME_SENSITIVE. Both were fixed, regression-tested, and re-deployed to Staging. A workflow race was removed by triggering live acceptance only after the Staging deploy workflow completes successfully. Failed runs are retained as engineering evidence; the final post-deploy matrix passed.
- Offline suite after Arabic fixes: CI #43086878153 SUCCESS; later main CI #43087254696 SUCCESS. The earlier 174/174 count applied before the final Arabic temporal test addition; do not claim that count for the final commit without retrieving the final run log.
- No semantic model was enabled. No billing/payment configuration, secret, account, or Production resource changed. The live matrix used three additional bounded single-claim requests plus the two pre-existing smoke cases.


## 2026-11-11 — Live browser-to-Worker integration
- Browser workflow #43088378058: SUCCESS on main after merge of PR #67. Main Node/syntax/benchmark workflow #43088378187: SUCCESS; final suite count 175/175, zero failures.
- The Playwright suite retains its deterministic API fixture test for repeatable UI rendering and adds a separate real Staging request from a second Chromium page.
- Real browser path: navigate to Staging; locate the textarea by its associated accessible label; submit using keyboard Tab + Enter; observe POST /api/verify return HTTP 200; validate FreshProof v0.2.44 response; confirm one stable claim is NOT_TIME_SENSITIVE, factual status NEEDS_REVIEW or UNVERIFIABLE while semantic triage is disabled, correction WITHHELD; verify the report renders and no uncaught browser errors occur.
- This verifies browser-to-Worker integration for one stable control claim and basic keyboard reachability. It does not constitute a full WCAG audit, screen-reader test, or broad live-provider accuracy evaluation.
- The first live browser integration attempt timed out because the test created a second page without navigating it. The harness was corrected, then passed on the PR run and again on main. No application defect was involved.
- One additional bounded Tavily request is made by each browser workflow run; all requests are non-sensitive fixed test claims. Production untouched.


## 2026-11-11 — Final bounded live acceptance closeout
- PR #75 merged as `3247e58ec31858693f10523e1683b487e174642e`. Main verification run #43090725391 passed **176/176 tests**, zero failures.
- Post-deploy Staging live acceptance #43090725287: SUCCESS. ChatGPT Plus adapter fetched the exact official Help Center article `https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus` (HTTP 200), validated it as `OFFICIAL_CHATGPT_PLUS_PRICING_HELP_ARTICLE`, and correctly retained `NEEDS_REVIEW` with correction withheld. This confirms retrieval, not a universal or regional price verdict.
- Node.js v20 lifecycle case returned `SUPERSEDED` with temporal review required; official Node.js release evidence was fetched, without fabricating an EOL date.
- Apollo 11 remained `NOT_TIME_SENSITIVE` as temporal metadata, factual status `NEEDS_REVIEW`, correction withheld. Event dates and publication dates remain distinct.
- The same bounded live matrix retained the current office-holder contradiction and Arabic Python 2.7 supersession cases. These selected cases are acceptance evidence, not a representative accuracy benchmark.
- Staging deploy #43090482458 and subsequent main verification/live workflows succeeded. Production untouched; Workers AI disabled; no billing/payment settings changed.


## 2026-11-11 — Owner-submitted three-claim live Staging acceptance (v0.2.44)
- Owner supplied five mobile screenshots of one live Staging report containing exactly three independently rendered claims: water composition, Apollo 11 landing, and Python 2.7 support.
- Claim 1, “Water is composed of hydrogen and oxygen.”: factual status NEEDS_REVIEW; temporal assessment NOT_TIME_SENSITIVE; correction withheld. The report explicitly says lexical/source relevance is not semantic entailment and that evidence did not meet the independent-source and semantic-relation threshold.
- Claim 2, “Apollo 11 landed on the Moon in 1969.”: factual status NEEDS_REVIEW; temporal assessment NOT_TIME_SENSITIVE; correction withheld. The report displays multiple retrieved results, distinguishes possible event dates from publication dates, and abstains rather than treating topical matches as proof.
- Claim 3, “Python 2.7 is still officially supported.”: UI status OUTDATED (the product-facing label for the specialized superseded lifecycle finding); time-sensitive review; a correction is provided: “Python 2 is no longer supported; its support ended on January 1, 2020.” The correction links the official Python.org sunset page. The report discloses direct retrieval HTTP 403 and use of a validated domain-restricted first-party indexed excerpt; publication date is not provided and retrieval timestamp is separate.
- Cross-claim isolation is visually verified: each claim has its own status, explanation, evidence, and correction decision; no correction from the Python claim is applied to water or Apollo 11.
- Acceptance result: PASS for owner-assisted live multi-claim UI behavior and conservative VERIFY/EXPLAIN/CORRECT separation, based on the supplied screenshots.
- Limitations: this is visual owner-assisted acceptance, not an independently captured raw API response or automated workflow log. The screenshots do not establish broad real-world accuracy. Water and Apollo 11 remain unresolved (NEEDS_REVIEW), not verified as true. Source profiles remain unassessed in the displayed report; some retrieved results are secondary/tertiary and must not be represented as authoritative corroboration.
- No code, deployment, secret, billing, quota, or Production configuration was changed by this acceptance. Production remains NOT APPROVED.


## 2026-11-11 — Evidence-confidence calibration guard (implementation; CI/deploy pending)
- Review of the owner-submitted three-claim Staging screenshots identified a presentation risk: the UI labeled retrieved sources as `MULTI_SOURCE_WITH_DATES` even though the adjudicator correctly abstained and the source profiles shown were mostly `UNASSESSED`. Retrieval count and publication-date presence are coverage/freshness metadata, not evidence confidence.
- Implemented a fail-closed guard in `worker/index.js`: no sources => `NONE`; without a completed advisory relation assessment => `LIMITED`; a corroboration-candidate label requires at least two distinct qualified domains assigned the same `SUPPORTS` or `CONTRADICTS` advisory relation. It remains a candidate label, not a calibrated confidence score or final verdict.
- Added `tests/evidence-confidence.test.js` covering retrieval-only inflation, no sources, qualified independent same-relation sources, duplicate-host exclusion, and conflicting relations.
- Commits: `3fe973cd301ff02304402aeb989cee71cfdacea0` (implementation), `03feec736533f66decd7756a4bf1bbee4b4cc242` (tests), `a5cc0f69cf3bf08ae0195404e0f362af9fb51aa8` (duplicate-host fixture correction).
- GitHub Actions push runs were created for these commits but remained `queued` at the latest API inspection; no job logs or pass/fail conclusion were available. The Staging Worker remains v0.2.44 and does not yet contain this change. Do not describe the fix as tested or deployed until CI completes and Staging health/version plus live output are checked.
- No semantic model was enabled; no secrets, billing, payment, or Production settings changed.


## 2026-11-12 — CI verification of evidence-confidence guard

- Workflow: [FreshProof verification tests #43098923491](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43098923491)
- Commit: `f5169d3d1f5050c2733b3bba5e90a97571f4b5f1`
- Result: SUCCESS.
- Node tests: 181 passed, 0 failed, 0 skipped.
- Syntax checks: Worker, evidence adjudication, domain adapters, and browser application all passed.
- Synthetic temporal diagnostic: 32 samples; TP=16, FP=0, TN=16, FN=0 on the hand-authored dataset only. Not a real-world accuracy estimate.
- Evidence-confidence guard tests are included in the 181-test run.
- Independent Staging health check after CI still reports version `0.2.44`; the guard is not yet deployed or live-accepted on Staging.
- Production untouched; Workers AI remains disabled; no billing or paid services enabled.



## 2026-11-12 — v0.2.46 semantic evidence adjudication and live multi-claim acceptance

- Staging source version: `0.2.46`; staging configuration explicitly enables `ENABLE_SEMANTIC_TRIAGE=true` and `ENABLE_CORRECTION_CANDIDATE_REVIEW=true`. The AI binding is present. Semantic model output is advisory and cannot independently determine the final verdict. No quota-based feature gate is applied.
- Relevant implementation commits: `b03d68c72ed6b0e4d1b1710ddcff247d6b616633` (remove quota-verification gate from correction review), `e2b917b63d4dee03ad45c6eda1d173eb19b77642` (explicit Staging feature flags), and `890dc81362ca05828c843e1d36825d39c0ed94f4` (test/config follow-up).
- Live acceptance workflow run [#43241870828](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43241870828) completed with conclusion **SUCCESS** at 2026-11-12T14:56:55Z, commit `890dc81362ca05828c843e1d36825d39c0ed94f4`.
- The workflow submitted bounded live claims to the Staging API and verified stable-claim abstention with secondary `NOT_TIME_SENSITIVE`, a diverse temporal claim matrix, Arabic Python 2 lifecycle correction, and a three-claim request with claim-specific outcomes and correction isolation.
- Observed live outcomes included: current office-holder case `CONTRADICTED` with White House evidence; Arabic Python 2 lifecycle `SUPERSEDED` with a Python.org first-party correction; Node lifecycle `SUPERSEDED` with correction withheld; OpenAI pricing `NEEDS_REVIEW`; historical Apollo 11 and stable-science controls `NEEDS_REVIEW` with secondary `NOT_TIME_SENSITIVE`. These conservative abstentions are accepted; the workflow does not assert that every claim must receive a definitive status.
- Multi-claim request returned three independent claims in 8,897 ms in the recorded run; only the Python 2 claim received a correction. Search budget observed: 4 of 5. This single run is not a latency benchmark or accuracy estimate.
- Workflow log ended with: `PASS: bounded live multi-claim acceptance — three independent claims, claim-specific temporal classification, and correction isolation.`
- This verifies the bounded Staging integration path and the specific assertions in the workflow. It does not establish general real-world precision/recall, calibrated confidence, or comprehensive browser/device accessibility.
- Production remains unchanged. No production release, public deployment, hackathon submission, billing change, payment method, or paid service activation occurred.


## 2026-11-12 — randomized multi-language live QA and browser acceptance

- Added deterministic seeded property suite `tests/randomized-properties.test.js`: 1,950 generated iterations across bounded claim segmentation, temporal classifier totality, conservative evidence adjudication, malformed semantic assessments, duplicate hosts, stale/future publications, and stable factual claims.
- Exact PR-head CI [#43245447023](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43245447023) passed 200/200 Node tests, syntax checks, and the 32-case synthetic temporal diagnostic. The final merged main verification after the subsequent QA harness changes also passed; see [#43248050700](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43248050700).
- Randomized live Staging acceptance [#43248554981](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43248554981) completed SUCCESS on 2026-11-12. The suite made seven sequential randomized-order requests (plus two smoke controls, nine total) without exceeding the existing per-client request limit.
- Live cases passed: stable scientific claim `NEEDS_REVIEW / NOT_TIME_SENSITIVE / WITHHELD`; Arabic and English Python 2.7 claims `SUPERSEDED` with first-party Python.org correction; person-first stale US President claim `CONTRADICTED`; Node.js v20 lifecycle `SUPERSEDED` using official Node.js evidence, correction withheld; current ChatGPT Plus pricing `NEEDS_REVIEW` with official Help Center evidence; and a three-claim mixed-timeframe request with independent outcomes and correction isolation.
- In the three-claim case, Water and Apollo 11 remained `NEEDS_REVIEW / NOT_TIME_SENSITIVE / WITHHELD`; Python 2.7 was `SUPERSEDED / TEMPORAL_REVIEW_REQUIRED` with a Python.org correction. Search budget was 4/5 for that request.
- The office-holder phrase gap found during earlier random QA was fixed in PR #83 and deployed to Staging. The revised person-first wording then passed live randomized acceptance.
- Browser acceptance [#43247308055](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43247308055) passed: empty-input validation, Arabic RTL and English LTR rendering, provided correction and evidence quote rendering, safe external links, inert HTML-like text (no injected DOM image), mobile overflow, keyboard submission, and real browser-to-Worker API verification.
- One earlier combined live workflow correctly received HTTP 429 because the duplicate matrices exceeded the configured rate limit. The QA workflow was consolidated to nine total requests; the limit was not raised or disabled. The consolidated workflow passed.
- This evidence establishes the tested Staging behaviors only. It is not a representative real-world accuracy, latency, or cost benchmark. Production remains unchanged; no submission was made.



## 2026-11-12 — final v0.2.46 acceptance and public source parity

- Latest private main verification: [#43250018092](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43250018092) — SUCCESS; 200/200 tests.
- Staging-only deployment after final code-comment cleanup: [#43250018023](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43250018023) — SUCCESS.
- Post-deployment live acceptance: [#43250121860](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43250121860) — SUCCESS, including the consolidated randomized-order suite.
- Public submission source synchronization merged through [PR #2](https://github.com/ralhamdan7-lab/freshproof-submission/pull/2), merge commit `3a51834b3d7732e9b13c681ef1e2768c7242d2ea`.
- Public repository's own CI: [#43250280181](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43250280181) — SUCCESS, 200/200 tests.
- Public repository browser acceptance: [#43250280219](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43250280219) — SUCCESS.
- Public repository live Staging acceptance: [#43250280631](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43250280631) — SUCCESS.
- Post-merge content comparison verified exact matches for Worker core, domain adapters, logic tests, randomized properties, evidence-adjudication tests, randomized live test script, browser smoke script, and both acceptance workflows. Public package version is `0.2.46`.
- Targeted secret-pattern scan of all public PR #2 changed files found no credential-pattern matches. No deployment secrets or account-specific private configuration were synchronized.
- Production remains unchanged; hackathon submission remains NOT SUBMITTED. Presentation/video remains deferred until final product sign-off.
