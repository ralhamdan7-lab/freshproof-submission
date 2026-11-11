# Submission Copy — FreshProof

## Project title
FreshProof — Evidence-First Temporal Verification Engine

## Track
Stale-Answer Detector

## Short description
FreshProof is an evidence-first verification engine that checks claims in AI-generated answers individually. It retrieves bounded source evidence, distinguishes event dates from source publication and retrieval dates, explains what the evidence supports or contradicts, and offers a correction only when a source-grounded replacement is justified. When evidence is insufficient or conflicting, FreshProof abstains rather than inventing certainty.

## Problem
AI-generated answers can remain fluent and plausible after the facts they describe have changed. Search-based approaches can return recent links without establishing whether those sources actually support or contradict each individual claim. Answer-level freshness labels also hide the fact that a single response can contain stable, outdated, and unresolved statements.

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
- Cloudflare native rate limiting where configured.
- Node.js built-in test runner.
- Optional Cloudflare Workers AI relation triage is disabled by default and is not required for the core workflow.

## How AI is used
Tavily is used to retrieve evidence for the claims under review. Optional Workers AI semantic relation triage is implemented as an advisory capability but remains disabled by default; it is not allowed to independently determine the final factual verdict. AI-assisted development tools, including ChatGPT, were used during implementation. The deployed Staging prototype does not rely on an LLM to generate final factual verdicts.

## Validation
- Automated regression: 181/181 tests passed.
- Staging v0.2.45 deployment: successful.
- Bounded live Staging acceptance: five individual cases passed, plus a three-claim combined-answer acceptance.
- Synthetic temporal smoke set: 32/32 expected classifications; this is a regression diagnostic only, not a real-world accuracy estimate.

## Demo scenario
Input: “Python 2.7 is still officially supported.”

FreshProof identifies the claim as SUPERSEDED and presents the official Python.org sunset notice with event date 2020-01-01 and a source-linked correction. Direct retrieval of Python.org returned HTTP 403 in the live acceptance. The adapter validated a domain-restricted indexed excerpt from the exact official page and disclosed that the page itself was not directly fetched. Only one official source was available, so evidence confidence remained LIMITED.

## Demonstrated multi-claim behavior
A single answer containing water composition, the Apollo 11 landing, and Python 2.7 support was split into three independent claims. The first two remained NEEDS_REVIEW with corrections withheld; only Python 2.7 received SUPERSEDED and a source-grounded correction.

## Project stage
Hackathon prototype with a working Staging deployment. Not approved for production use. Representative real-world accuracy, citation correctness, calibrated confidence, latency, and cost-per-claim evaluations remain future work.
