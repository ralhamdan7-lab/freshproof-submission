# FreshProof — Submission Description

FreshProof is an evidence-first temporal verification engine for AI-generated answers. It decomposes an answer into claim candidates, identifies potentially time-sensitive statements, retrieves bounded source evidence, distinguishes event dates from publication and retrieval dates, compares evidence relationships, and explains conservative outcomes at claim level.

## Why it matters
AI-generated answers can become stale even when they were correct when written. Search alone does not solve this: the system must determine which claim changed, whether a source speaks to the same event or milestone, and whether the available evidence is sufficient to support a conclusion.

## Technical approach
- Claim-level extraction and temporal triage
- Bounded, claim-specific evidence retrieval
- Preference for primary and official sources where available
- Publisher diversity and source provenance
- Separate freshness, evidence confidence, source reliability, and verification status
- Explicit abstention when evidence is insufficient or conflicting
- Evidence-gated correction with traceable source references
- Bilingual browser experience with Arabic RTL and English LTR support

## Verification discipline
Model classifications are advisory, not truth verdicts. Search relevance is not evidence confidence. Synthetic tests are engineering diagnostics, not general accuracy claims.

## Demo and submission
The public demo is published only after the independent deployment and health/version checks pass. The project owner must complete the official hackathon submission form; repository publication is not proof of submission.
