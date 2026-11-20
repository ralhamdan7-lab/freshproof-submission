# FreshProof v0.2.90 – v0.2.91: evidence coverage engine

> **Historical record.** This document describes FreshProof as of v0.2.91. The current release is **v0.3.20** (553 tests). For the current state see the [README](../README.md) and the [release history](RELEASES.md).

State labels follow the project convention: PLANNED / IMPLEMENTED / TESTED / VERIFIED / DEPLOYED.

| Area | State |
|---|---|
| Code changes below | IMPLEMENTED, TESTED (510 Node tests, UTC and Asia/Riyadh; sealed-v2 leakage check passes) |
| Local UI acceptance (EN / AR / mixed, progressive per-claim verification) | TESTED locally with headless Chrome |
| Staging | DEPLOYED to isolated Staging and exercised with the development diagnostic (section 6) |
| Public demo | Released by the owner's delegation of 2026-11-16 (see CHANGELOG) |

## 1. Goal

v0.2.84 never issued a wrong decisive verdict in live checks, but decided only 3–9% of diverse claims. Most abstentions came from four generic causes:

- retrieval did not reach authoritative pages;
- the relevance screen rejected pages that state a different value;
- corroboration rules required a directly read page and recent dates even where that does not apply;
- free-tier model quotas ran out.

v0.2.90–0.2.91 address these causes without topic or publisher routing. They do not lower the bar for any single source.

## 2. Model-planned retrieval (v0.2.90)

- **Claim decomposition (`/api/extract`):** splits long or compound text into atomic claims. Each claim must be a verbatim span of the input and may contain no number absent from that span. Each claim is marked FACT / OPINION / PREDICTION / OTHER.
- **Search planning:** produces neutral queries, always including an English query, plus candidate authority domains (official records and latest status). The domains are validated (no IPs, no local or internal hosts) and searched with `include_domains`.
- **Cross-lingual relevance:** an Arabic claim can be screened against English pages through the planned queries. Passage selection uses the same anchors.
- **Progressive UI:** the browser extracts claims first, then verifies each claim in its own request. Opinions and predictions are shown as not checkable.

## 3. Graded evidence (v0.2.90 – v0.2.91)

Every rule requires all of the following:

- a semantic relation from the model;
- EXACT scope;
- directness other than UNCLEAR;
- HIGH relevance;
- independent lineages (registrable domain, organisation and near-duplicate text).

Community content and unconfirmed first-party pages never count. Verdicts from these rules carry `confidence_tier: MODERATE`, or `STRONG` when the existing primary-source rules apply.

| Method | When |
|---|---|
| `INDEPENDENT_SOURCE_CONSENSUS` | Normal claims: 2 lineages with 1 classified publisher, or 3 lineages with a directly read page. High-risk claims: 3 lineages, 1 classified publisher, and either a direct page or 2 classified publishers. |
| `CURRENT_STATE_PERSISTENCE_CONSENSUS` | Present-state claims, after a search for later changes, using sources inside a per-state persistence window. |
| `DOCUMENTED_CHANGE_CONSENSUS` | Independent sources document a change away from the claimed present state, and no later source supports the old state → `SUPERSEDED`. |
| `UNCONTESTED_CURRENT_STATE_CONTRADICTION` | No assessed source supports a present-state claim after a latest-status search, and 3 lineages contradict it with classified publishers (2 for high-risk claims) → `SUPERSEDED` (described as past) or `CONTRADICTED`. |
| `TEMPORAL_ORDER_RECONCILIATION` | Every supporting source is dated before every contradicting source, and the contradicting side meets consensus → `SUPERSEDED`. |
| Minority dissent | A single dissenting page from one unclassified publisher does not block a side with 3 lineages and 2 classified publishers. The dissent is recorded in `minority_dissent_domains`. |

Claim types: opinions (including evaluative superlatives) and open forecasts are classified from their wording. They return `UNVERIFIABLE` with their own reason, and no search or model call is made.

## 4. Evidence quality and reach (v0.2.91)

- **Value-masked relevance:** "The Titanic sank in 1915" is also screened without its number, so pages stating 1912 can contradict it.
- **Ranking:** among equally relevant sources, classified publishers and directly read pages fill the model's evidence window first.
- **Reliability priors:** extended to intergovernmental organisations, major scientific journals and museums, international news agencies and public broadcasters (English and Arabic), and reference publishers. These are priors only.
- **Latest-status search:** present-state claims always search for later changes before other planned queries.
- **Tolerant parsing:** model output with case variants or partial per-source records is kept. Missing records get the most conservative values, which can never corroborate.

## 5. Corrections

A false or superseded claim shows a correction only when two independent publishers quote the replacement verbatim and at least one of them is classified (official, institutional or established reference/news). The reviewer must also confirm matching scope and timeframe and no conflict. The correction reports its basis: `OFFICIAL_AND_INDEPENDENT_SOURCES` or `INDEPENDENT_CLASSIFIED_SOURCES`.

## 6. Capacity (free tier only)

- **Groq pacing:** uses the token usage the provider reports, not a worst-case estimate. This removed about 60 s of artificial waiting per claim.
- **Model order:** qwen3.8-27b first for evidence assessment, because it followed the evidence contract best in live diagnostics. The smallest model is used for decomposition and planning.
- **Result cache:** a per-claim cache using the Workers Cache API, keyed by version. Present-state claims are kept 3 h and other claims 24 h. Each cached result is marked with its assessment time. `NOT_ASSESSED` and context-resolved claims are never cached.
- **Shared quotas:** the Workers AI daily allocation and Groq organisation limits are shared by Staging and the public demo. Heavy testing reduces demo capacity.

## 7. Development diagnostic (not a benchmark)

`benchmarks/dev-diverse-v1.json` contains 54 assistant-authored cases (EN/AR) plus 2 long texts. The labels are not human-audited, so results are development diagnostics only.

| Run | Decisive | Wrong decisive | Needs review | Not assessed |
|---|---|---|---|---|
| v0.2.84 (earlier, v3 diagnostic) | 3–9% | 0 | — | — |
| v0.2.90, 40 cases | 57.5% | 0 | 32.5% | 10% (quota) |

Targeted v0.2.91 reruns turned several previously abstaining cases into correct decisive results, with no wrong decisive result. Examples: a Nobel Prize year, a water boiling point (with a provided correction), a lunar landing, a former UN Secretary-General as "current", and an Arabic capital. Most remaining non-decisive results were provider quota limits.

## 8. Known limits

- Comparative claims ("A is taller than B") need values from two sources, and the model often answers INSUFFICIENT.
- Official social-media accounts are not fetched. Social platforms remain discovery leads, never evidence.
- Free-tier capacity bounds daily throughput. The cache and the no-model path for non-checkable claims reduce, but do not remove, the limit.
