# FreshProof — Evidence-First Verification for AI Answers

*Designed to Evolve*

FreshProof checks claims in AI-generated answers individually, retrieves traceable evidence, explains what the evidence supports or contradicts, and offers a correction only when a source-grounded replacement is justified.

**Product pillars:** VERIFY · EXPLAIN · CORRECT

**Live Staging prototype:** [freshproof-staging.ralhamdan7.workers.dev](https://freshproof-staging.ralhamdan7.workers.dev) · **v0.2.47**

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

The Worker validates input, extracts claim candidates, performs bounded retrieval, normalizes source metadata, assesses evidence, and returns claim-level explanations and corrections. Independent corroboration is counted by registrable domain, not by subdomain, so multiple pages from one publisher cannot masquerade as independent sources. Legal entry-into-force dates are distinguished from later application and enforcement milestones, and exact milestone matching is guarded against negation and entity mismatch.

## Staging acceptance — 2026-11-12

The current Staging Worker is **v0.2.47** (Cloudflare Version ID `a81e386c-221f-4a06-95a2-4713a998db6b`). Deployment [#43265374345](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43265374345) and randomized live acceptance [#43265496909](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43265496909) both completed **SUCCESS** on commit `2c76535cadaa074cdd5e0bf3b2c7d504bdfa3536`.

The live suite exercised 16 cases across 12+ areas, including science, public health, software lifecycle, cybersecurity, economics/pricing, law, government, geopolitics, business, space, transport, sports, and mixed-domain answers containing four and five independent claims. The 210-test automated suite passed with zero failures.

Verified examples include Python 2.7 `SUPERSEDED` with a first-party correction, an obsolete US-president claim `CONTRADICTED`, and TLS 1.0/1.1 deprecation `CURRENT` using two independent first-party technical sources. Independent corroboration is grouped by registrable publisher domain; correction review applies the same independence rule. Legal entry-into-force dates are distinguished from later application/enforcement dates, with safeguards against negation and entity mismatch.

Some claims correctly remain `NEEDS_REVIEW`, including the WHO PHEIC history and current UK/EU membership cases where retrieval or fresh independent official evidence was insufficient. These are documented capability gaps, not evidence of a verified verdict. This bounded suite is not a representative accuracy evaluation and does not justify publishing Precision/Recall claims.

## Tests and evaluation

- Private development repository: [210/210 tests passed](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43265374305).
- Public submission repository: source, package version, regression tests, and QA documentation synchronized to v0.2.47.
- The 32-case bilingual synthetic temporal benchmark remains a hand-authored regression diagnostic, not a real-world accuracy estimate.
- UI browser acceptance previously passed; the v0.2.47 changes after that run were Worker-side only.

**Source parity:** the submission repository mirrors the tested v0.2.47 Worker logic, registrable-domain adjudication, correction and milestone safeguards, package version, acceptance scripts, regression tests, and QA records. Environment-specific deployment secrets are excluded. Production has not been deployed.

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


## Latest QA evidence — 2026-11-12

- 200/200 automated tests passed, including 1,950 seeded randomized property iterations.
- [Live randomized Staging acceptance #43248554981](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43248554981) passed Arabic/English Python lifecycle, alternate office-holder phrasing, Node.js lifecycle, official pricing abstention, stable facts, and three-claim isolation.
- [Browser acceptance #43247308055](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43247308055) passed bilingual RTL/LTR, validated correction display, safe links, inert HTML-like input, mobile layout, keyboard interaction, and live API integration.
- Conservative `NEEDS_REVIEW` outcomes are retained when evidence is insufficient. These checks do not establish broad real-world accuracy.



## Public repository verification — 2026-11-12
- Public CI [#43250280181](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43250280181): **200/200 tests passed**.
- Public browser acceptance [#43250280219](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43250280219): **SUCCESS**.
- Public live Staging acceptance [#43250280631](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43250280631): **SUCCESS**.
- The public v0.2.46 Worker source, domain adapters, regression tests, randomized test script, and acceptance workflows were compared byte-for-byte with the private development repository after synchronization.
