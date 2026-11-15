# FreshProof — Public Submission Status

Updated: 2026-11-15

## Product and release

- Public repository: https://github.com/ralhamdan7-lab/freshproof-submission
- Public demo: https://freshproof-submission-demo.ralhamdan7.workers.dev
- Deployed Worker: `freshproof-submission-demo`
- Verified live version: `0.2.81`
- Public parity PR: [#9](https://github.com/ralhamdan7-lab/freshproof-submission/pull/9), merged.

## Implemented

- Claim-level extraction with dependent-clause preservation.
- Temporal triage distinct from factual verification.
- Publisher-agnostic generic evidence retrieval.
- Primary-source preference and narrow specialist adapters.
- Event/publication/update/retrieval date separation where available.
- Evidence comparison, conservative adjudication, abstention, explanation, and evidence-gated correction.
- English and Arabic RTL/LTR UI.
- Bounded requests and provider operations.

## Verification evidence

- Release CI [#43711250834](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250834): **321/321 tests passed in UTC and 321/321 in Asia/Riyadh**; syntax and temporal smoke checks passed.
- Latest documentation CI [#43712624254](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43712624254): **SUCCESS**.
- Deterministic local browser acceptance [#43711250836](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250836): **PASS**.
- Deployed public browser acceptance [#43713578554](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43713578554): **PASS** against exact Worker version 0.2.81. Playwright submitted the Node.js 20 claim through the real UI, observed OUTDATED, rendered six evidence links including two official Node.js links, and recorded zero browser runtime errors.
- Live public API acceptance [#43711250878](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250878): **PASS**. Health endpoint reported version 0.2.81; one bounded POST /api/verify returned HTTP 200.
- Live proposition: “Node.js 20.x remains actively supported under LTS.” Actual API result: **SUPERSEDED**, using the official Node.js previous-releases/lifecycle table. Six evidence records, two Tavily searches, Freshness FRESH, Evidence Confidence LIMITED.
- This specialist scenario validates one narrow software-lifecycle path only; it is not a general accuracy benchmark.
- Public PR #9 patch scan found no common credential patterns, private Staging hostname, or unrelated-project names. This is a diff-scoped scan, not a full-repository scanner attestation.
- No paid fallback, PAYG activation, billing change, or secret value access/change.

## Outstanding submission gates

1. Deployed-browser acceptance against exact version 0.2.81.
2. Complete and audit the 54-case held-out v2 evaluation. Its gold review is an owner-approved assistant audit, not independent external adjudication.
3. Finish the pitch deck and actual 2–4 minute demo recording; confirm the video plays in a logged-out browser if uploaded.
4. Complete the official Global AI Hackathon portal submission and verify its receipt.

## Official event timing

The organizer's Geek Room page lists prototype submission on 15 November 2026 and judging on 29 November 2026. The HackCulture event listing is reported as closing at 23:59 IST (18:29 UTC) on 15 November. Recheck the live portal countdown before submitting.

## Current status

**DEPLOYED:** v0.2.81.  
**TESTED:** CI and deterministic local browser acceptance.  
**LIVE API VERIFIED:** one bounded Node.js lifecycle scenario.  
**PENDING:** deployed-browser acceptance on v0.2.81; full held-out report and audit; final deck/video; official submission receipt.

Do not claim general accuracy or official submission until the relevant evidence exists.
