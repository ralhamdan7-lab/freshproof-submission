# FreshProof

**Evidence-First Temporal Verification Engine**

**Verify · Explain · Correct — with evidence, dates, and explicit uncertainty.**

FreshProof evaluates claims in AI-generated answers individually. It extracts claim candidates, identifies potentially time-sensitive propositions, retrieves bounded source evidence, compares supporting and conflicting material, and returns conservative outcomes with traceable explanations.

A central design principle is that a recently published page is not necessarily evidence of a recent event. FreshProof keeps **event date, source publication date, source update date, and retrieval time** distinct wherever the source makes those distinctions available.

## What it does

- **Claim-level analysis:** splits a submitted answer into bounded claim candidates while preserving the original wording.
- **Temporal assessment:** identifies claims that may change over time without treating stable facts as exempt from factual verification.
- **Evidence retrieval:** searches for relevant sources and records provenance, dates, and domain information.
- **Evidence comparison:** distinguishes supporting, contradicting, mixed, irrelevant, and insufficient evidence.
- **Conservative adjudication:** abstains when evidence is weak, conflicting, inaccessible, or insufficient.
- **Explainable outcomes:** presents the claim, status, evidence, source context, and limitations.
- **Evidence-gated correction:** offers a replacement only when the evidence supports it; otherwise it withholds correction.
- **Arabic and English UI:** supports right-to-left and left-to-right presentation.

## Claim outcomes

- `CURRENT`
- `SUPERSEDED`
- `CONTRADICTED`
- `NEEDS_REVIEW`
- `UNVERIFIABLE`

Temporal classification is a separate dimension. `NOT_TIME_SENSITIVE` does not mean factually verified and does not bypass evidence assessment.

Evidence relation labels (`SUPPORTS`, `CONTRADICTS`, `MIXED`, `IRRELEVANT`, `INSUFFICIENT`) are not final verdicts. Freshness, evidence confidence, source reliability, and verification status are kept conceptually distinct; the prototype does not present an uncalibrated probability of truth.

## Architecture

```text
Browser UI
   |
   v
Cloudflare Worker API
   |- Input validation and bounded claim extraction
   |- Temporal triage and query planning
   |- Evidence retrieval (Tavily)
   |- Source normalization and provenance
   |- Optional advisory semantic assessment (Cloudflare Workers AI)
   |- Evidence adjudication and abstention
   '- Explanation and evidence-gated correction
```

The semantic model is advisory. It cannot independently establish a claim or override the evidence adjudication policy.

## Public prototype

- **Current deployed release:** `0.2.81` (Groq provider integration and non-public configuration are excluded).
- **Runtime:** Cloudflare Worker and static browser application.
- **Evidence search:** Tavily; its credential is configured as a server-side Worker secret.
- **Optional semantic analysis:** Cloudflare Workers AI binding.
- **No application database or user account system is required** for this prototype.

The public repository is an independently configured release candidate. It contains the general-purpose claim extraction, temporal retrieval, evidence adjudication, and explanation improvements reviewed from the private development line. It intentionally excludes Groq integration, private configuration, internal evaluation corpora, and audit records. The public build uses its own Worker name, allowed origin, and deployment configuration.

## Public demo deployment

- **Demo:** https://freshproof-submission-demo.ralhamdan7.workers.dev
- **Health endpoint:** https://freshproof-submission-demo.ralhamdan7.workers.dev/api/health
- **Deployment:** isolated Cloudflare Worker `freshproof-submission-demo`; the latest Workers Build from public `main` completed successfully and deployed 100% traffic.
- **Health check:** the live endpoint returned `ok: true`, service `FreshProof`, version `0.2.76`, mode `evidence-triage`.

The public `POST /api/verify` path passed one bounded live end-to-end acceptance request on 2026-11-15: the stale Node.js 20 LTS-support claim returned `SUPERSEDED` with official Node.js release-table evidence. Deterministic local browser acceptance also passed. A deployed-browser run specifically on v0.2.81 has not yet been recorded. This one specialist case does not establish general-domain accuracy. Do not submit confidential or personal information.

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

The optional Workers AI binding is configured by Wrangler. Do not add provider keys to browser code, source files, screenshots, or logs.

## Limits and evaluation

The Worker applies bounded input, claim, search, result, and source-fetch limits. The current prototype is intended for demonstration and review, not as a guarantee that every claim can be conclusively verified.

Automated tests and the synthetic temporal regression benchmark are engineering diagnostics. They are **not** a representative real-world accuracy study. No general precision, recall, false-positive rate, citation correctness, latency distribution, or cost-per-claim figure is claimed here. A live integration test is likewise not a substitute for a held-out evaluation with audited labels.

A `NEEDS_REVIEW` or `UNVERIFIABLE` result is an intentional safe outcome when the evidence does not justify a stronger conclusion.

## Security and privacy

- Provider credentials belong in server-side Worker secrets only.
- Submitted text is processed in the request flow; the prototype does not require durable storage of user submissions.
- Retrieved content is untrusted evidence, never executable instructions.
- Input and provider operations are bounded.
- Configure an exact allowed browser origin; CORS is not authentication.
- Native Cloudflare rate limiting is an approximate per-edge abuse guard, not a strict global quota.
- Optional model-assisted correction review is disabled in the public configuration; semantic triage remains advisory.
- Do not deploy a fork with real credentials until its configuration and secret handling have been reviewed.

## Hackathon submission

This repository contains the public source snapshot for review. The official submission form must be completed by the project owner. A repository publication or passing CI run is not proof that a hackathon submission has been received.

## License and ownership

No open-source license is granted by this repository unless a separate license file explicitly states otherwise. All rights are reserved by the project owner. Ownership and provenance information is not included as a separate file in this public snapshot.
