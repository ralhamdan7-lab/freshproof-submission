# FreshProof — Evidence-First Verification for AI Answers

FreshProof checks claims in AI-generated answers individually, retrieves traceable evidence, explains what the evidence supports or contradicts, and offers a correction only when a source-grounded replacement is justified.

**Product pillars:** VERIFY · EXPLAIN · CORRECT

**Live Staging prototype:** [freshproof-staging.ralhamdan7.workers.dev](https://freshproof-staging.ralhamdan7.workers.dev) · **v0.2.46**

## What it does

- Extracts bounded independent claim candidates (up to five per request).
- Retrieves evidence through Tavily Search using a server-side credential.
- Assesses source-to-claim relations; semantic model output is advisory, not a standalone verdict.
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

`NOT_TIME_SENSITIVE` is a secondary temporal assessment, not a factual verdict. Stable claims still pass through factual evidence verification.

## Architecture

`Browser UI → Cloudflare Worker → Tavily Search → source normalization → advisory relation assessment → conservative evidence adjudication → structured report`

The Worker validates input, extracts claim candidates, performs bounded retrieval, normalizes source metadata, assesses evidence, and returns claim-level explanations and corrections.

## Staging acceptance — 2026-11-12

The latest bounded live Staging workflow [#43241870828](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43241870828) completed **SUCCESS** on commit `890dc81362ca05828c843e1d36825d39c0ed94f4`.

It exercised:
- A current office-holder claim contradicted by White House evidence.
- An Arabic Python 2 support claim superseded with a first-party Python.org correction.
- Node lifecycle verification, with correction withheld where the generic correction contract was not met.
- Official pricing and historical/stable claims where the engine abstained.
- A three-claim answer with independent outcomes, temporal assessments, and correction isolation.

The workflow passed its bounded assertions. Some claims correctly remained `NEEDS_REVIEW`; this is intended abstention, not a failure to force a verdict. These cases are not a representative accuracy evaluation.

## Tests and evaluation

The private development repository's latest recorded regression suite passed 181/181 tests before the v0.2.46 live acceptance changes. The 32-case bilingual synthetic temporal benchmark is a hand-authored regression diagnostic only, not a real-world accuracy estimate. The latest live Staging workflow is linked above.

**Source snapshot note:** this public submission repository currently contains the v0.2.45 sanitized source snapshot. The live Staging Worker is v0.2.46. The source synchronization and final security review must be completed before treating this repository as an exact v0.2.46 source mirror. Do not infer that this documentation update synchronizes the implementation files.

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
- Tavily Search is the evidence provider; provider terms and current plan limits apply.
- Staging explicitly enables advisory Workers AI semantic triage and correction-candidate review. Missing or malformed model responses fail closed; the model cannot independently set final verdicts.
- Do not configure paid services or automatic overages for this project.

## Submission materials

- [Judge-ready project description and AI-use disclosure](docs/SUBMISSION-COPY.md)
- [Submission status and verification snapshot](docs/SUBMISSION-STATUS.md)
- [Pitch deck outline](docs/PITCH-DECK-OUTLINE.md)
- [Demo walkthrough](docs/DEMO-SCRIPT.md)

## Limitations

Claim extraction is heuristic, not full natural-language atomic fact decomposition. Search relevance is not proof of entailment. Domain profiles are coarse provenance signals, not a complete source-reliability model. Some domain-specific lifecycle rules are intentionally narrow. The system abstains rather than generalizing beyond implemented evidence rules.

No calibrated numeric confidence or broad real-world precision/recall claim is made.

## Deployment boundary

Only the isolated Staging Worker is used for the current demonstration. Production remains unapproved and unchanged. This repository is not configured to deploy to the private Staging environment.

The owner must personally complete and submit the official hackathon form. No organizer submission is claimed.
