# Test Strategy — FreshProof v0.2.81

> **Historical record.** This document describes FreshProof as of v0.2.81. The current release is **v0.3.22** (562 tests). For the current state see the [README](../README.md) and the [release history](RELEASES.md).

## Current public CI (2026-11-15)
- Main verification workflow [#43711250834](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250834): **321/321 PASS in UTC and 321/321 PASS in Asia/Riyadh**, zero failures/skips.
- Worker, adjudication, domain adapter, and browser application syntax checks passed.
- Synthetic temporal smoke benchmark passed; it is a diagnostic fixture, not a real-world accuracy estimate.
- Deterministic browser acceptance [#43711250836](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250836): PASS using local deterministic fixtures.
- Public live deployment/API acceptance [#43711250878](https://github.com/ralhamdan7-lab/freshproof-submission/actions/runs/43711250878): exact Worker 0.2.81 health verified; one live Node.js lifecycle claim returned SUPERSEDED with official Node.js evidence. This is a single specialist integration case.

## Coverage areas
- Current and superseded claims
- Stable facts and temporal classification separation
- Compound and multi-claim isolation
- Event date vs publication date vs retrieval time
- Primary-source eligibility and publisher diversity
- Contradictory, mixed, insufficient, and irrelevant evidence
- Correction withholding and source-bound correction references
- Arabic/English and RTL/LTR presentation
- Unsafe source URL handling and HTML-like user input rendering
- Bounded search and direct-fetch budgets
- Semicolon-dependent clauses, source-span integrity, and publisher-agnostic generic retrieval

## Interpretation
A passing test suite demonstrates that defined software contracts pass on the tested commit. Synthetic benchmark results are not a representative real-world accuracy study. The one live Node.js lifecycle result is not generalization evidence. Do not claim general precision, recall, false-positive rate, citation correctness, latency, or cost without a separately audited evaluation.
