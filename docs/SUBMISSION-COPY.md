# FreshProof — Judge-Ready Project Description

## Project
**FreshProof — Evidence-First Temporal Verification Engine**

**Track:** Stale-Answer Detector

## Problem
AI-generated answers can remain fluent and plausible after the facts they describe have changed. A normal web search may find recent pages without determining whether each individual claim is still valid, whether the evidence refers to the relevant event, or whether a source merely republishes older information.

## Solution
FreshProof verifies claims individually rather than treating an entire answer as one block. It extracts bounded claim candidates, retrieves traceable evidence, evaluates the relationship between each claim and its evidence, separates factual verdicts from temporal sensitivity, and explains why it reached a result. It offers a correction only when a source-grounded replacement satisfies conservative validation rules. Otherwise, it abstains.

## Product pillars
- **VERIFY:** identify independent claims and compare each with recent, relevant evidence.
- **EXPLAIN:** expose sources, evidence relationships, event dates, publication dates, retrieval context, and limitations.
- **CORRECT:** provide a replacement only when supported by validated evidence; otherwise withhold it.

## Key distinction
NOT_TIME_SENSITIVE is a secondary temporal assessment, not a factual verdict. FreshProof does not equate a stable claim with a true claim. Evidence confidence, source profile, publication freshness, temporal sensitivity, and factual status are separate dimensions.

## Architecture
Browser UI → Cloudflare Worker → Tavily Search → source normalization and conservative claim-level adjudication → structured report.

The Worker enforces bounded requests and claim extraction. No database or user-account system is required. Optional Workers AI semantic analysis is disabled by default.

## Demonstrated behavior
The live Staging acceptance suite covers:
- A stale US office-holder claim, contradicted by current White House evidence.
- An Arabic Python 2.7 support claim, superseded with a correction tied to the official Python.org sunset page; the direct-fetch restriction and indexed-excerpt fallback are disclosed.
- Node.js v20 lifecycle verification using official lifecycle evidence.
- Pricing and stable historical claims where the engine abstains rather than overstates what the evidence establishes.
- A multi-claim answer in which each claim receives an independent verdict, evidence set, temporal assessment, and correction decision.

## Responsible AI and limitations
FreshProof is evidence-first and abstention-aware. A retrieved page is not automatically proof. Source count and publication recency alone do not establish entailment or confidence. Synthetic benchmark results are regression diagnostics, not estimates of real-world accuracy. The current release does not claim calibrated probability scores or broad real-world precision/recall.

## Privacy and cost controls
The prototype does not require a database, user accounts, or persistent storage of submitted answer text. Evidence search uses a server-side Tavily credential. Provider limits and terms apply; the project is designed to avoid paid overages and does not enable optional model services by default.

## Technology
Cloudflare Workers, browser-native HTML/CSS/JavaScript, Node.js test runner, Tavily Search, GitHub.

## AI-use disclosure
AI tools were used as development assistance for architecture exploration, implementation support, test design, debugging, and documentation. The submitted software, verification rules, evaluation cases, and claims about system behavior are grounded in the repository and recorded test results. Do not describe FreshProof as trained on proprietary data or as autonomously validated beyond the documented tests.

## Links
- Public source and documentation: https://github.com/ralhamdan7-lab/freshproof-submission
- Live Staging demo: https://freshproof-staging.ralhamdan7.workers.dev

The Staging environment is a demonstration deployment, not a production service.
