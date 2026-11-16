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

- `CURRENT`: supported as stated within the reviewed scope
- `SUPERSEDED`: was true, but a documented, dated change has overtaken it
- `CONTRADICTED`: qualified evidence conflicts with it
- `NEEDS_REVIEW`: the evidence cannot settle it, so FreshProof abstains
- `UNVERIFIABLE`: no usable evidence
- `NOT_ASSESSED`: an operational limit or error stopped the run. This is not a statement about the claim.

Each claim also carries a **claim frame**, such as dated past event, current state, state at a past time, scheduled or future, stable fact, attributed finding or opinion. Only current-state claims require recent evidence. A dated historical event can be settled by an older authoritative record, and an authority's own current register can settle a current state.

`NOT_TIME_SENSITIVE` is a temporal classification, not a factual verdict. Evidence relation labels are not final verdicts. Freshness, evidence confidence, source reliability, and verification status are separate dimensions. The prototype does not claim calibrated probabilities of truth.

## Architecture

```text
Browser UI
  -> Cloudflare Worker API
      -> claim extraction: model decomposition of long text into verbatim atomic claims (fact / opinion / prediction)
      -> deterministic claim frame (event / current state / past state / future / stable / opinion)
      -> model-planned multilingual search with candidate official domains, plus value-masked and change queries
      -> direct page acquisition (verbatim passages; publication, update and retrieval dates kept separate)
      -> advisory Workers AI assessment of each source (relation, scope, authority role, change notice)
      -> deterministic adjudication: frame-aware recency, graded independent corroboration
         (STRONG / MODERATE confidence tier), documented change, live issuer records, abstention
      -> per-source trace (why each source counted or not), explanation, evidence-gated correction
```

The semantic model is advisory; it cannot independently establish truth or override evidence adjudication.

## Public prototype

- **Current version:** `0.2.93` (see the release evidence below for the deployment status)
- **Public demo:** https://freshproof-submission-demo.ralhamdan7.workers.dev
- **Health:** https://freshproof-submission-demo.ralhamdan7.workers.dev/api/health
- **Runtime:** Cloudflare Worker with static browser assets
- **Evidence retrieval:** Tavily, server-side credential only
- **Semantic assessment:** Cloudflare Workers AI with an optional free-tier Groq fallback; advisory and fail-closed
- **Result cache:** identical claims reuse a short-lived cached assessment (marked with its assessment time)
- **Storage:** no application database or durable user-submission storage is required
- **Public release scope:** independently configured for public review; provider credentials remain server-side and no private user data is included

The public repository is an independently configured submission build. It includes the general claim extraction, temporal retrieval, evidence adjudication, and explanation improvements. It uses its own Worker name, allowed origin, and deployment configuration.

## v0.2.92 release evidence

- A correction is shown only when every value it introduces appears in verbatim quotes from at least two contradicting, exact-scope sources, one of them a classified publisher. Example from a live staging check: the Arabic claim that humans first landed on the Moon in 1975 was corrected to 1969, citing official sources.
- Questions are checked as the statement they ask about. The page offers example claims and a copy-report button.
- 513 automated tests pass in UTC and in Asia/Riyadh. Targeted staging checks showed no wrong decisive verdict. As before, this is a development diagnostic, not an accuracy study.

## v0.2.91 release evidence

- The release adds model-planned multilingual retrieval with official-domain search, graded independent-evidence verdicts with a confidence tier, value-masked relevance (pages stating a different value can contradict a claim), and evidence-gated corrections that quote two independent publishers. Opinions and open forecasts are labelled without retrieval. Long text is split into atomic claims, and each claim is verified progressively. See [docs/ENGINE-v0.2.91.md](docs/ENGINE-v0.2.91.md).
- 510 automated tests pass in UTC and in Asia/Riyadh.
- Development diagnostic on an isolated staging Worker, using 54 assistant-authored EN/AR cases (labels not human-audited, so this is not an accuracy study): the v0.2.90 engine reached a decisive verdict on 57.5% of 40 cases with no wrong decisive verdict, up from 3–9% for v0.2.84. Targeted v0.2.91 reruns showed no wrong decisive verdict. Remaining non-decisive results were mostly free-tier model quota limits.
- No precision, recall, false-positive rate or cost-per-claim figure is claimed. Confidence tiers are evidence categories, not calibrated probabilities.

## v0.2.84 release evidence

- The release adds the v0.2.84 engine: claim frames, execution status, research planner, per-source trace, live issuer records and validated supersession. Each claim card shows the claim type, its recency policy and the sources that counted for or against it.
- 484 automated tests pass in UTC and in Asia/Riyadh.
- Before release, the same engine ran on an isolated staging Worker (bounded runs, each rolled back afterwards):
  - English and Arabic temporal regression claims returned the expected statuses;
  - browser acceptance passed;
  - the Node.js 20 lifecycle claim returned `SUPERSEDED`.
- These are integration checks, not an accuracy study. No precision, recall, false-positive rate or cost-per-claim figure is claimed; no claim of calibrated confidence is made.

## Earlier release evidence (v0.2.81, 2026-11-15)

- Public CI for v0.2.81 passed 321/321 tests in UTC and in Asia/Riyadh, and deployed-browser acceptance passed against version 0.2.81 for the Node.js 20 lifecycle claim (`OUTDATED`, six evidence links including two official nodejs.org links).

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

This repository is the public source snapshot. The organizer extended the prototype deadline to **21 November 2026** and allows already-submitted teams to keep updating their repositories. Repository publication, deployment and CI success do **not** prove that an entry was submitted or received.

Submission assets: [portal-ready project copy](docs/SUBMISSION-COPY.md), [portal submission checklist](docs/PORTAL-SUBMISSION-CHECKLIST.md), and [demo recording script](docs/DEMO-VIDEO-SCRIPT.md).

## Ownership

No open-source license is granted unless a separate license file explicitly states otherwise. All rights are reserved by the project owner.
