# Test Strategy — FreshProof v0.2.76

## Automated validation
The public release candidate uses GitHub Actions to run:
- Node.js unit, integration, and regression tests
- Worker entrypoint syntax validation
- Evidence adjudication module syntax validation
- Domain adapter syntax validation
- Browser application syntax validation
- Synthetic temporal smoke benchmark
- Playwright browser acceptance against an isolated local Worker and deterministic API fixture

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

## Interpretation
A passing test suite demonstrates that defined software contracts pass on the tested commit. Synthetic benchmark results are not a representative real-world accuracy study. Do not claim general precision, recall, false-positive rate, citation correctness, latency, or cost without a separately audited evaluation.

## Current public CI
Use the repository's GitHub Actions page to inspect the exact commit, run, job, and step results. Historical private development run links are intentionally not mirrored here.
