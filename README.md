# FreshProof — Evidence-First Verification for AI Answers

FreshProof checks claims in AI-generated answers one by one, retrieves traceable evidence, explains what the evidence supports or contradicts, and offers a correction only when a source-grounded replacement is justified.

**Product pillars:** VERIFY · EXPLAIN · CORRECT

**Current Staging prototype:** [freshproof-staging.ralhamdan7.workers.dev](https://freshproof-staging.ralhamdan7.workers.dev) · v0.2.45

## What it does

- Splits an answer into bounded claim candidates (up to five per request).
- Retrieves evidence through Tavily Search using a server-side API key.
- Keeps event dates, source publication dates, and retrieval timestamps distinct.
- Separates factual status from temporal sensitivity, evidence confidence, source profile, and publication freshness.
- Displays the original claim, the verification outcome, supporting or conflicting sources, and a correction only when the correction contract is satisfied.
- Abstains when evidence is missing, ambiguous, conflicting, or insufficient.

## Verification outcomes

- `CURRENT`
- `SUPERSEDED`
- `CONTRADICTED`
- `NEEDS_REVIEW`
- `UNVERIFIABLE`

`NOT_TIME_SENSITIVE` is a secondary temporal assessment, not a factual verdict.

## Architecture

`Browser UI → Cloudflare Worker → Tavily Search`

The Worker validates input, extracts claim candidates, performs bounded retrieval, normalizes source metadata, applies conservative evidence rules, and returns structured claim-level explanations and corrections.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .dev.vars.example .dev.vars
# Add your own Tavily key to .dev.vars; never commit this file.
npm test
npm run benchmark:temporal
npm run dev
```

Set `ALLOWED_ORIGIN` in `.dev.vars` to the local origin printed by Wrangler. The Tavily key is read only by the Worker.

## Configuration and cost

- No database, user accounts, or persistent storage are required.
- Tavily Search is the evidence provider; usage is subject to the provider's current plan and limits.
- Workers AI semantic triage and correction-candidate review are disabled by default. Do not enable them without verifying account eligibility, free quota, privacy terms, and billing controls.
- Do not configure paid services or automatic overages for this project.

## Tests and evaluation

Run `npm test` for deterministic regression tests and `npm run benchmark:temporal` for the 32-case bilingual synthetic temporal smoke benchmark.

The synthetic benchmark is a regression diagnostic only. It is not a real-world accuracy estimate and does not measure claim-to-evidence entailment, citation correctness, latency, or cost. See [Benchmark limitations](docs/BENCHMARK.md).

## Submission materials
- [Judge-ready project description and AI-use disclosure](docs/SUBMISSION-COPY.md)
- [Submission status and verification snapshot](docs/SUBMISSION-STATUS.md)
- [Detailed v0.2.45 Staging acceptance results](docs/ACCEPTANCE-RESULTS-v0.2.45.md)
- [Pitch deck outline](docs/PITCH-DECK-OUTLINE.md)

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Security and privacy](docs/SECURITY.md)
- [Test strategy](docs/TESTS.md)
- [Product principles](docs/PRODUCT-PRINCIPLES.md)
- [Three-pillar product contract](docs/THREE-PILLAR-PRODUCT-ARCHITECTURE.md)
- [Demo walkthrough](docs/DEMO-SCRIPT.md)

## Limitations

Claim extraction is heuristic, not full natural-language atomic fact decomposition. Search relevance is not proof of entailment. Domain profiles are coarse provenance signals, not a complete source-reliability model. Some domain-specific lifecycle rules are intentionally narrow. The system abstains rather than generalizing beyond implemented evidence rules.

No calibrated numeric confidence or broad real-world precision/recall claim is made.

## Project status

Current validated Staging release: **v0.2.45**. The automated suite passed 181/181 tests, and bounded live acceptance passed five individual cases plus a three-claim combined-answer scenario. See [Submission status](docs/SUBMISSION-STATUS.md) for exact evidence and limitations.

This is a hackathon prototype. Its automated tests and bounded live acceptance cases do not establish production readiness. Review the security notes and verify provider configuration before deploying your own instance.
