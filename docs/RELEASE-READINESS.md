# Public Release Readiness — FreshProof v0.2.81

> **Historical record.** This document describes FreshProof as of v0.2.81. The current release is **v0.3.19** (547 tests). For the current state see the [README](../README.md) and the [release history](RELEASES.md).

Updated: 2026-11-15

## Public release identity

- Repository: https://github.com/ralhamdan7-lab/freshproof-submission
- Deployed Worker: freshproof-submission-demo
- Public demo: https://freshproof-submission-demo.ralhamdan7.workers.dev
- Verified live Worker version: 0.2.81
- Runtime: Cloudflare Worker with static browser assets
- Evidence retrieval: Tavily, server-side credential only
- Optional semantic assessment: Cloudflare Workers AI, advisory and fail-closed
- No application database or durable user-submission storage is required.

## Implemented product scope

- Claim-level extraction with original wording and dependent-clause preservation.
- Temporal triage kept separate from factual verification.
- Publisher-agnostic generic retrieval with narrow specialist adapters.
- Primary/official source preference where available.
- Event, publication/update, and retrieval time kept distinct where source data supports it.
- Evidence comparison, conservative adjudication, explicit abstention, explanation, and evidence-gated correction.
- Arabic RTL and English LTR interface.
- Bounded inputs, claim processing, searches, and direct source fetches.

## Verified public release gates

1. **Release CI — PASS:** [#43711250834](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250834): 321/321 tests in UTC and 321/321 in Asia/Riyadh; syntax checks and synthetic temporal diagnostic passed.
2. **Deterministic local browser acceptance — PASS:** [#43711250836](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250836).
3. **Live public API acceptance — PASS:** [#43711250878](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250878). Health reported exact version 0.2.81; one bounded POST /api/verify returned HTTP 200 and processed one claim.
4. **Deployed public browser acceptance — PASS:** [#43713578554](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43713578554). Playwright verified exact Worker version 0.2.81, submitted the Node.js 20 claim through the real UI, observed OUTDATED, rendered six evidence links including two official Node.js links, and recorded zero browser runtime errors.
5. **Live scenario — PASS, narrow scope:** “Node.js 20.x remains actively supported under LTS” was classified SUPERSEDED using the official Node.js lifecycle table. Six evidence records, two Tavily searches, Freshness FRESH, Evidence Confidence LIMITED. This validates one specialist software-lifecycle path only.
6. **Public patch scan — PASS, scoped:** PR #9 changed files contained no common credential patterns. This is not a full-repository secret-scanner attestation.
7. **Cost/security boundary — PASS by inspection:** no paid fallback, PAYG activation, billing change, or secret value access/change was part of the release work.

## Submission readiness

- Public source repository and detailed README: **READY**.
- Public deployed demo and health endpoint: **READY**.
- Editable 10-slide PowerPoint pitch deck: **PREPARED** as a separate portal-upload artifact.
- Portal-ready project description and demo script: **READY** in docs.
- Optional 2–4 minute demo recording: **NOT RECORDED**; the script is prepared.
- Official HackCulture portal submission and receipt: **PENDING**. Registration is confirmed, but a successful project-submission receipt has not been verified. Creating a project entry alone is not sufficient.

## Accuracy limitations

A representative, independently reviewed real-world accuracy evaluation is not complete. Do not claim general precision, recall, false-positive rate, citation correctness, calibrated confidence, or cost-per-claim. The 32-case synthetic diagnostic is not a real-world accuracy estimate. The Node.js scenario is not general-domain proof.

## Release decision

**PUBLIC PROTOTYPE DEPLOYED AND LIVE UI/API ACCEPTANCE VERIFIED FOR ONE BOUNDED SOFTWARE-LIFECYCLE SCENARIO.** The technical prototype, public repository, and pitch deck are ready for portal submission. The official portal submission remains a separate owner-authenticated action and must not be claimed until the platform confirms receipt.
