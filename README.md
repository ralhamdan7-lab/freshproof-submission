# FreshProof

**Evidence-First Temporal Verification Engine**

**Verify · Explain · Correct — with evidence, dates, and explicit uncertainty.**

FreshProof checks AI-generated answers at the claim level. It extracts independent propositions, identifies potentially time-sensitive claims, retrieves bounded source evidence, compares supporting and conflicting material, and returns explainable outcomes with traceable sources.

A recent publication date is not proof of a recent event. FreshProof distinguishes event date, source publication date, source update date, and retrieval time wherever evidence exposes them.

## What it does

- Extracts bounded claim candidates while preserving original wording and dependent clauses.
- Separates temporal sensitivity from factual status: a stable claim is still assessed on evidence.
- Retrieves claim-specific evidence, preferring primary and official sources when available.
- Compares supporting, conflicting, mixed, irrelevant, and insufficient evidence.
- Abstains when evidence is weak, conflicting, inaccessible, or insufficient.
- Explains each result with source provenance and evidence references.
- Offers corrections only when the correction contract is satisfied; otherwise withholds them.
- Supports Arabic (RTL) and English (LTR).

## Verification outcomes

- `CURRENT`
- `SUPERSEDED`
- `CONTRADICTED`
- `NEEDS_REVIEW`
- `UNVERIFIABLE`

`NOT_TIME_SENSITIVE` is a temporal classification, not a factual verdict. Evidence relation labels are not final verdicts. Freshness, evidence confidence, source reliability, and verification status are separate dimensions. The prototype does not claim calibrated probabilities of truth.

## Architecture

```text
Browser UI
  -> Cloudflare Worker API
      -> bounded claim extraction and temporal triage
      -> claim-specific Tavily evidence retrieval
      -> source normalization and date/provenance handling
      -> optional advisory Cloudflare Workers AI assessment
      -> evidence adjudication, abstention, explanation
      -> evidence-gated correction
```

The semantic model is advisory; it cannot independently establish truth or override evidence adjudication.

## Public prototype

- **Current deployed version:** `0.2.81`
- **Public demo:** https://freshproof-submission-demo.ralhamdan7.workers.dev
- **Health:** https://freshproof-submission-demo.ralhamdan7.workers.dev/api/health
- **Runtime:** Cloudflare Worker with static browser assets
- **Evidence retrieval:** Tavily, server-side credential only
- **Optional semantic assessment:** Cloudflare Workers AI, advisory and fail-closed
- **Storage:** no application database or durable user-submission storage is required
- **Public release scope:** independently configured for public review; provider credentials remain server-side and no private user data is included

The public repository is an independently configured submission build. It includes the general claim extraction, temporal retrieval, evidence adjudication, and explanation improvements. It uses its own Worker name, allowed origin, and deployment configuration.

## Verified release evidence (2026-11-15)

- Public main CI [#43714968300](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43714968300): passed after the latest documentation update. The v0.2.81 release test run [#43711250834](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250834) passed **321/321 tests in UTC and 321/321 in Asia/Riyadh**, plus syntax checks and the synthetic temporal diagnostic.
- Deterministic local browser acceptance [#43711250836](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250836): passed.
- Deployed public browser acceptance [#43713578554](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43713578554): passed against exact Worker version 0.2.81. Playwright loaded the public UI, submitted the Node.js 20 lifecycle claim, observed OUTDATED, rendered six evidence links including two official nodejs.org links, and recorded zero browser runtime errors.
- Public live API acceptance [#43711250878](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250878): the deployed health endpoint reported exact version `0.2.81`; one bounded `POST /api/verify` returned HTTP 200 and processed one claim.
- Demonstrated claim: “Node.js 20.x remains actively supported under LTS.” The API returned `SUPERSEDED` using the official Node.js release/lifecycle table. Six evidence records were returned, two Tavily searches were used, Freshness was `FRESH`, and Evidence Confidence was `LIMITED`.
- This is one specialist software-lifecycle scenario, not a general-domain accuracy study. No general precision, recall, false-positive rate, citation correctness, or cost-per-claim figure is claimed.


## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm test
npm run benchmark:temporal
npm run dev
```

Create a local `.dev.vars` file (never commit it):

```env
TAVILY_API_KEY=your_key
ALLOWED_ORIGIN=http://localhost:8787
```

The optional Workers AI binding is configured by Wrangler. Never place provider keys in browser code, source files, screenshots, or logs.

## Limits and evaluation

The prototype applies bounded input, claim, search, result, and source-fetch limits. It is intended for demonstration and review, not as a guarantee that every claim can be conclusively verified.

Automated tests and synthetic temporal benchmarks are engineering diagnostics, not representative real-world accuracy studies. A single live integration test is not a substitute for a representative, independently reviewed accuracy evaluation. Abstention is an intentional safe outcome.

## Security and privacy

- Provider credentials are server-side Worker secrets only.
- Submitted text is processed in the request flow; durable storage is not required.
- Retrieved content is untrusted evidence, never executable instructions.
- Input and provider operations are bounded.
- Configure an exact allowed browser origin; CORS is not authentication.
- Native Cloudflare rate limiting is an approximate per-edge abuse guard, not a strict global quota.
- Semantic triage is advisory; model-assisted correction review is disabled in the public configuration.
- Do not submit confidential or personal information to the public demo.

## Hackathon submission status

This repository is the public source snapshot. The official Global AI Hackathon prototype deadline is listed as **15 November 2026**; the portal listing indicates **23:59 India Standard Time (18:29 UTC)**. The organizer's event page lists judging on **29 November 2026**. Verify the portal's live countdown and complete the official submission form. Repository publication, deployment, and CI success do **not** prove that an entry was submitted or received.

Submission assets: [portal-ready project copy](docs/SUBMISSION-COPY.md), [portal submission checklist](docs/PORTAL-SUBMISSION-CHECKLIST.md), and [demo recording script](docs/DEMO-VIDEO-SCRIPT.md).

## Ownership

No open-source license is granted unless a separate license file explicitly states otherwise. All rights are reserved by the project owner.
