<p align="center">
  <img src="docs/assets/freshproof-logo.svg" alt="FreshProof logo" width="520">
</p>

<p align="center">
  <strong>Project owner: Raed Alhamdan</strong><br>
  Sole owner and author of FreshProof · © 2026 Raed Alhamdan · All rights reserved
</p>

<p align="center">
  <em>Designed to evolve:</em> FreshProof is a working prototype built to be extended with new sources, providers and claim types.
</p>

<p align="center">
  <a href="https://freshproof-submission-demo.ralhamdan7.workers.dev">Live demo</a> ·
  <a href="https://youtu.be/9um3lz068pE">Demo video</a> ·
  <a href="docs/RELEASES.md">Release history</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="docs/README.md">Documentation</a>
</p>

# FreshProof

**Evidence-First Temporal Verification Engine**

**Verify · Explain · Correct — with evidence, dates, and explicit uncertainty.**

FreshProof checks AI-generated answers at the claim level. It extracts independent propositions, identifies potentially time-sensitive claims, retrieves bounded source evidence, compares supporting and conflicting material, and returns explainable outcomes with traceable sources.

A recent publication date is not proof of a recent event. FreshProof distinguishes event date, source publication date, source update date, and retrieval time wherever evidence exposes them.

## Providers and free-tier limits

- **Evidence search: [Tavily](https://tavily.com).** Every claim is checked against sources found through Tavily's search API, called server-side only.
- **AI providers: Cloudflare Workers AI and [Groq](https://groq.com).** Groq was added as a second, independent provider so the app keeps working when one provider is slow or out of capacity. When Groq has budget, its strong models assess the evidence first, and Cloudflare Workers AI is the other path. The smallest model is never used to judge evidence; if no suitable model is available, the engine abstains instead.
- **Free quotas.** Every service runs on free-tier quotas: zero cost, no paid fallback. Under heavy use a quota can run out at any moment. A claim is then shown as **"Could not be assessed right now (free-tier service limit) — please retry"**. That is a temporary capacity limit, not a failure of the engine and not a verdict on the claim. Quotas renew automatically (Workers AI daily; Groq on a rolling 24-hour window).

## Development record

FreshProof grew through 70+ documented releases, from v0.2.0 to v0.3.21. The current version passes 560 automated tests in two time zones, backed by 200+ merged pull requests and 2,900+ automated CI and validation runs. See the **[release history table](docs/RELEASES.md)**.

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

- **Current version:** `0.3.21` (see the release evidence below for the deployment status)
- **Public demo:** https://freshproof-submission-demo.ralhamdan7.workers.dev
- **Health:** https://freshproof-submission-demo.ralhamdan7.workers.dev/api/health
- **Runtime:** Cloudflare Worker with static browser assets
- **Evidence retrieval:** Tavily, server-side credential only
- **Semantic assessment:** Groq (strong models) and Cloudflare Workers AI, both free tier; advisory and fail-closed
- **Result cache:** identical claims reuse a short-lived cached assessment (marked with its assessment time)
- **Storage:** no application database or durable user-submission storage is required
- **Public release scope:** independently configured for public review; provider credentials remain server-side and no private user data is included

The public repository is an independently configured submission build. It includes the general claim extraction, temporal retrieval, evidence adjudication, and explanation improvements. It uses its own Worker name, allowed origin, and deployment configuration.

## Current release evidence (v0.3.21)

- 560 automated tests pass in UTC and in Asia/Riyadh, with browser acceptance and live-deployment acceptance on every release.
- Live diagnostics on the public demo covered 116 claims during development, from simple facts to long multi-part claims in technology, health, climate, economics, law and space. In the latest rounds, no part of any claim received a wrong decisive verdict. Its labels were written during development, so this is a development diagnostic, not an accuracy study.
- No precision, recall, false-positive rate or cost-per-claim figure is claimed. Confidence tiers are evidence categories, not calibrated probabilities.

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
- Semantic triage is advisory. A correction is shown only when it passes the evidence contract (verbatim quotes from independent publishers).
- Do not submit confidential or personal information to the public demo.

## Global AI Hackathon

FreshProof is Raed Alhamdan's entry to the Global AI Hackathon (HackCulture × Geek Room, November 2026). This repository is its public source.

- [Project overview](docs/PROJECT-OVERVIEW.md): the problem, what was built, technologies, and how AI is used
- [Demo video](https://youtu.be/9um3lz068pE) (3:26) and its [script](docs/DEMO-VIDEO-SCRIPT.md) and [pitch deck outline](docs/PITCH-DECK-OUTLINE.md)

## AI tools used to build FreshProof

FreshProof was built during the hackathon by Raed Alhamdan with AI coding assistants under his direction: OpenAI ChatGPT in the early phase and Anthropic Claude from 15 November 2026 (engineering, testing, debugging and documentation). Inside the product, AI is used for claim decomposition, search planning, evidence reading and correction drafting; the verdict itself comes from deterministic rules. See [How AI is used](docs/PROJECT-OVERVIEW.md#how-ai-is-used).

## Ownership

FreshProof is owned and authored by **Raed Alhamdan**. All rights are reserved: this is not open-source software, and no permission is granted to copy, modify, deploy or use it without the owner's written permission. See [LICENSE](LICENSE).
