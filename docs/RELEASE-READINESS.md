# Public Release Readiness — FreshProof v0.2.81

Updated: 2026-11-15

## Scope and isolation

This document covers only the public submission repository and its public Worker. Private Staging infrastructure, credentials, held-out datasets, and internal audit material are excluded.

## Release identity

- Public repository: `ralhamdan7-lab/freshproof-submission`
- Deployed Worker: `freshproof-submission-demo`
- Public URL: https://freshproof-submission-demo.ralhamdan7.workers.dev
- Current deployed version: `0.2.81`
- Public release parity: PR #9 merged
- Runtime: Cloudflare Worker and static browser assets
- Evidence search: Tavily, server-side only
- Optional semantic assessment: Cloudflare Workers AI, advisory
- Groq/private configuration: excluded
- Durable user-submission storage: not configured

## Implemented

- Claim extraction that preserves original wording and dependent clauses.
- Temporal sensitivity assessment separate from factual status.
- Publisher-agnostic generic retrieval, with narrow domain adapters only where justified.
- Bounded evidence retrieval, source normalization, and provenance.
- Distinct event, publication/update, and retrieval time handling where source data supports it.
- Evidence adjudication, explicit abstention, explanation, and evidence-gated correction.
- Arabic RTL and English LTR interface.
- Input, claim, search, result, and fetch bounds.

## Verified release gates

1. **CI — PASS:** release run [#43711250834](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250834): 321/321 tests in UTC and 321/321 in Asia/Riyadh; syntax checks and synthetic temporal diagnostic passed.
2. **Latest documentation CI — PASS:** [#43712624254](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43712624254).
3. **Deterministic local browser acceptance — PASS:** [#43711250836](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250836). This test's deployed-browser step was skipped.
4. **Live public API acceptance — PASS:** [#43711250878](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250878). Health returned exact version 0.2.81; one bounded POST /api/verify returned HTTP 200 and processed one claim.
5. **Live scenario — PASS, narrow scope:** Node.js 20.x continuing LTS support was classified SUPERSEDED using the official Node.js release table. Six evidence records, two Tavily searches, Freshness FRESH, Evidence Confidence LIMITED. This is not a general accuracy result.
6. **Public patch scan — PASS, scoped:** PR #9 changes contained no common credential patterns, private Staging hostname, or unrelated-project names. This is a changed-patch scan, not a full repository secret-scanner attestation.
7. **Billing/security boundary — PASS by inspection:** no paid fallback, PAYG activation, billing change, or secret value access/change was part of the release work.

## Remaining gates

- Deployed-browser acceptance specifically against version 0.2.81: **PASS** [#43713578554](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43713578554). Playwright verified the exact live Worker version, submitted the Node.js 20 claim through the real UI, observed OUTDATED, rendered six evidence links including two official Node.js links, and recorded zero browser runtime errors.
- The 54-case held-out v2 run must complete and its report must be audited before publishing its metrics. The recorded gold review is owner-approved assistant audit, not independent external adjudication.
- General real-world accuracy is not established. Do not publish precision, recall, false-positive rate, citation correctness, or cost-per-claim unless the relevant audited denominators and measurements are valid.
- Prepare and check the actual pitch deck and 2–4 minute demo recording against the live product.
- Complete the official hackathon portal entry and verify its receipt. GitHub publication is not submission confirmation.

## Release decision

**DEPLOYED — LIVE API ACCEPTANCE PASSED FOR ONE BOUNDED SOFTWARE-LIFECYCLE SCENARIO.** The public source and deterministic local browser suite passed. Full deployed-browser acceptance, broad held-out evaluation, final demo artifact, and official portal submission remain separate gates.
