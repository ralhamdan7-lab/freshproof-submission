# FreshProof — Portal-Ready Submission Copy

## Project title

**FreshProof — Evidence-First Temporal Verification Engine**

## One-line summary

FreshProof checks AI-generated answers claim by claim, retrieves current source evidence, distinguishes event dates from source dates, and explains when a claim is current, outdated, contradicted, or not sufficiently verifiable.

## Problem and intended users

AI-generated answers can remain fluent and convincing after the facts they describe have changed. This creates risk for researchers, analysts, journalists, students, professionals, and anyone relying on AI-generated summaries of changing information such as software support, public policy, leadership, regulations, prices, and institutional decisions.

A conventional search result is not enough. The user needs to know which proposition is being checked, whether the evidence refers to the same event, whether the source is authoritative, when the event happened versus when the page was published or updated, and whether the evidence justifies a conclusion.

## What was built

FreshProof is a working web prototype with:

- Claim-level extraction that preserves original wording and dependent clauses.
- Temporal triage that remains separate from factual verification.
- Bounded, claim-specific evidence retrieval using Tavily.
- Preference for primary and official sources where available.
- Source provenance and separate event, publication/update, and retrieval dates where the source exposes them.
- Evidence comparison and conservative adjudication.
- Explicit abstention when evidence is insufficient, conflicting, inaccessible, or weak.
- Evidence-gated correction rather than unsupported rewriting.
- Arabic RTL and English LTR browser interface.
- A public Cloudflare Worker API and live browser application.

## What makes it different

FreshProof is not just a search wrapper or a link summarizer. Its core output is a claim-level verification record. It separates:

- Verification status
- Temporal classification
- Freshness
- Evidence confidence
- Source reliability

A recent source is not automatically reliable evidence, and a recently updated page is not proof that the described event is recent. The semantic model is advisory; it does not independently establish truth or override evidence adjudication. Abstention is an intentional product outcome.

## How AI is used

**In the product:** Tavily provides bounded evidence retrieval. Cloudflare Workers AI can provide optional semantic relation assessment when enabled and available; this assessment is advisory and fail-closed. The final status remains governed by the evidence policy, not by an unconstrained model answer.

**During development:** ChatGPT was used as an engineering copilot for architecture review, implementation support, test design, debugging, and documentation. The project owner directed the work, reviewed changes, and authorized merges and deployments.

## Live demonstration

Public demo: https://freshproof-submission-demo.ralhamdan7.workers.dev

Public source: https://github.com/ralhamdan7-lab/freshproof-submission

A bounded live acceptance test on deployed version 0.2.81 submitted the claim:

> “Node.js 20.x remains actively supported under LTS.”

The live API returned HTTP 200 and classified the claim as **SUPERSEDED**, using the official Node.js lifecycle table. The request returned six evidence records and used two Tavily searches. The browser acceptance test on the same deployed version rendered the corresponding **OUTDATED** result, showed six evidence links including two official nodejs.org links, and recorded zero browser runtime errors.

This is one specialist software-lifecycle scenario. It is not evidence of general-domain accuracy.

## Validation and limitations

- Release CI: 321/321 tests passed in UTC and 321/321 in Asia/Riyadh.
- Deterministic local browser acceptance: passed.
- Deployed public browser acceptance against exact version 0.2.81: passed.
- One bounded live API scenario: passed.
- A 32-case synthetic temporal diagnostic matched its synthetic labels; it is an engineering diagnostic, not a real-world accuracy estimate.
- A broader held-out evaluation is being run separately and is not represented here as completed.
- No general precision, recall, false-positive rate, citation correctness, calibrated confidence, or cost-per-claim is claimed.

The prototype is designed for bounded verification and review, not as a guarantee that every proposition can be conclusively adjudicated. Users should inspect cited sources and respect NEEDS_REVIEW and UNVERIFIABLE outcomes.

## Technology

- Cloudflare Workers and static browser assets
- Tavily evidence search
- Optional Cloudflare Workers AI semantic assessment
- Node.js test suite and Playwright browser acceptance
- No application database or durable user-submission storage is required

## Public links

- Live demo: https://freshproof-submission-demo.ralhamdan7.workers.dev
- Source repository: https://github.com/ralhamdan7-lab/freshproof-submission
- Official Node.js lifecycle source used in the live example: https://nodejs.org/en/about/previous-releases

## Submission integrity

The public repository and deployed demo are available for review. The editable 10-slide pitch deck is supplied as a separate PowerPoint artifact for portal upload. The official HackCulture submission must be completed through the event portal; repository publication and CI success do not constitute a submission receipt.
