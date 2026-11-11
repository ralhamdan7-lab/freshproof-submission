# Submission Copy — FreshProof

## Project title
FreshProof — Evidence-First Temporal Verification Engine

## Track
Stale-Answer Detector

## Short description
FreshProof is an evidence-first verification engine that checks claims in AI-generated answers individually. It retrieves bounded source evidence, distinguishes event dates from source publication and retrieval dates, explains what the evidence supports or contradicts, and offers a correction only when a source-grounded replacement is justified. When evidence is insufficient or conflicting, FreshProof abstains rather than inventing certainty.

## Problem
AI-generated answers can remain fluent and plausible after the facts they describe have changed. Existing search-based approaches often return recent links without establishing whether those sources actually support or contradict each individual claim. Answer-level freshness labels also hide the fact that a single response can contain stable, outdated, and unresolved statements.

## Solution
FreshProof extracts bounded claim candidates and evaluates each separately through a controlled evidence pipeline. It preserves source URLs and date provenance, separates factual verification from temporal sensitivity, uses conservative evidence rules, and returns an explicit review state when the evidence does not justify a conclusion. Corrections are gated by source and quote validation.

## Key differentiators
- Claim-level rather than whole-answer verification.
- Separate factual status, temporal assessment, source profile, evidence confidence, and publication freshness.
- Distinguishes event date, publication date, and retrieval time.
- Primary-source preference and traceable evidence links.
- Explicit abstention for missing, conflicting, or weak evidence.
- Source-grounded correction only when the correction contract is satisfied.
- Arabic and English claim presentation with per-claim text direction.

## Technologies
- Cloudflare Workers and static browser assets.
- JavaScript / Node.js.
- Tavily Basic Search for bounded evidence retrieval.
- Cloudflare native rate limiting.
- Node.js built-in test runner.
- Optional Cloudflare Workers AI relation triage is disabled by default and is not required for the core workflow.

## How AI is used
The project is an AI-oriented verification layer designed for AI-generated text. Tavily is used to retrieve evidence. Optional Workers AI semantic relation triage is implemented as an advisory capability but remains disabled by default until the account's free quota, eligibility, and privacy conditions are verified. Model output is not allowed to independently determine the final factual verdict. AI-assisted development tools were used during implementation; this is disclosed rather than represented as autonomous model reasoning by the deployed product.

## Validation and limitations
The current automated regression suite passed 181/181 tests on the recorded CI run. A 32-case bilingual synthetic temporal set passed its expected classifications; this is a regression diagnostic only, not a real-world accuracy estimate. Bounded live Staging acceptance covered selected lifecycle, office-holder, pricing-retrieval, historical, and multi-claim cases. Representative real-world precision/recall, citation correctness, calibrated confidence, latency, and cost-per-claim evaluations remain outstanding. The latest evidence-confidence guard passed CI but has not yet been re-deployed and re-accepted on Staging.

## Demo scenario
The demo submits: "Python 2.7 is still officially supported." FreshProof identifies the claim as SUPERSEDED and presents the official Python.org sunset notice with the event date 2020-01-01 and a source-linked correction. Direct retrieval of the Python.org page may return HTTP 403; when that occurs, the adapter uses a validated, domain-restricted indexed excerpt and discloses that the page itself was not directly fetched.

## Project stage
Hackathon prototype / Staging demonstration. Not approved for production use.
