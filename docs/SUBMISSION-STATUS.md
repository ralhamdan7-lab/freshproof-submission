# FreshProof — Public Submission Status

Updated: 2026-11-16

## Product and release

- Public repository: https://github.com/ralhamdan7-lab/freshproof-submission
- Public demo: https://freshproof-submission-demo.ralhamdan7.workers.dev
- Deployed Worker: `freshproof-submission-demo`
- Verified live version: `0.2.84` (release PR [#12](https://github.com/ralhamdan7-lab/freshproof-submission/pull/12), merged as `e52cf5d`)
- Previous release: `0.2.81` (public parity PR [#9](https://github.com/ralhamdan7-lab/freshproof-submission/pull/9)).

## Implemented

New in v0.2.84:
- Deterministic claim frames (event, current state, past state, future, stable, attributed, opinion) with frame-aware recency.
- `NOT_ASSESSED` execution status, kept separate from the verdict.
- Bounded research plan (value-masked and change queries).
- No orphan claims.
- Scope-vs-value semantic rule.
- Live issuer records for current-state claims.
- Validated supersession (issuer change notice + corroboration).
- Arabic and month-precision event dates.
- Per-source verdict trace shown in the UI.

Carried over:

- Claim-level extraction with dependent-clause preservation.
- Temporal triage distinct from factual verification.
- Publisher-agnostic generic evidence retrieval.
- Primary-source preference and narrow specialist adapters.
- Event/publication/update/retrieval date separation where available.
- Evidence comparison, conservative adjudication, abstention, explanation, and evidence-gated correction.
- English and Arabic RTL/LTR UI.
- Bounded requests and provider operations.

## Verification evidence

### v0.2.84 (2026-11-16)
- Release PR CI: **484/484 tests in UTC and in Asia/Riyadh**; deterministic browser acceptance **PASS**.
- Cloudflare Workers Build for `e52cf5d`: **SUCCESS**.
- Post-deploy live acceptance [#43776684159](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43776684159): **PASS**. The health endpoint reported `0.2.84`, and one bounded `POST /api/verify` returned HTTP 200. The Node.js 20 lifecycle claim returned **SUPERSEDED** from the official Node.js release table: specialist adapter `software_release`, two Tavily searches, Evidence Confidence `LIMITED`.
- Main-branch browser acceptance [#43776684086](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43776684086): **PASS**.
- Before release, the same engine was checked on an isolated staging Worker (bounded runs, each rolled back afterwards):
  - English and Arabic temporal regression claims returned the expected statuses;
  - browser acceptance passed.
- These are integration checks, not a general accuracy benchmark.

### v0.2.81 (2026-11-15)

- Release CI [#43711250834](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250834): **321/321 tests passed in UTC and 321/321 in Asia/Riyadh**; syntax and temporal smoke checks passed.
- Latest documentation CI [#43714968300](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43714968300): **SUCCESS**.
- Deterministic local browser acceptance [#43711250836](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250836): **PASS**.
- Deployed public browser acceptance [#43713578554](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43713578554): **PASS** against exact Worker version 0.2.81. Playwright submitted the Node.js 20 claim through the real UI, observed OUTDATED, rendered six evidence links including two official Node.js links, and recorded zero browser runtime errors.
- Live public API acceptance [#43711250878](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250878): **PASS**. Health endpoint reported version 0.2.81; one bounded POST /api/verify returned HTTP 200.
- Live proposition: “Node.js 20.x remains actively supported under LTS.” Actual API result: **SUPERSEDED**, using the official Node.js previous-releases/lifecycle table. Six evidence records, two Tavily searches, Freshness FRESH, Evidence Confidence LIMITED.
- This specialist scenario validates one narrow software-lifecycle path only; it is not a general accuracy benchmark.
- Public PR #9 patch scan found no common credential patterns in the changed files. This is a diff-scoped scan, not a full-repository scanner attestation.
- No paid fallback, PAYG activation, billing change, or secret value access/change.

## Outstanding submission gates
1. Complete the official Global AI Hackathon portal submission, or its update form (the deadline was extended to 21 November 2026), and verify its receipt.
2. Optional but recommended: record and review the actual 2–4 minute demo video; confirm playback before sharing it.

## Accuracy limitation
A representative, independently reviewed real-world accuracy evaluation is not complete. No general precision, recall, false-positive rate, citation correctness, calibrated confidence, or cost-per-claim is claimed.


## Official event timing

The organizer's Geek Room page lists prototype submission on 15 November 2026 and judging on 29 November 2026. Some third-party listings report a 23:59 IST close on 15 November; this exact time is not confirmed by the organizer page. Use the authenticated portal countdown as the final authority.

## Current status
**DEPLOYED:** v0.2.81.  
**TESTED:** CI, deterministic local browser, and deployed public browser acceptance on v0.2.81.  
**LIVE API VERIFIED:** one bounded Node.js lifecycle scenario.  
**READY:** editable 10-slide pitch deck, portal-ready project copy/checklist, and demo-video recording script.  
**PENDING:** official portal submission receipt; optional demo recording.

Do not claim general accuracy or official submission until the relevant evidence exists.
