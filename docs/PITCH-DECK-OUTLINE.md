# FreshProof — Pitch Deck

The editable presentation file is prepared separately as `FreshProof_Hackathon_Pitch_Deck.pptx`.

## Slide structure

1. FreshProof — Evidence-First Verification for AI Answers
2. The problem — AI answers age unevenly; search is not verification
3. The solution — claim extraction, bounded retrieval, evidence assessment, conservative verdict, gated correction
4. Trust model — factual status separated from temporal assessment and evidence dimensions
5. Live demonstration — Python 2.7 support claim superseded by official sunset evidence
6. Multi-claim behavior — stable claims remain unresolved while the stale Python claim receives the correction
7. Technical architecture — browser UI, Cloudflare Worker, Tavily Search, primary sources
8. Validation — 181/181 automated tests, 32-case synthetic diagnostic, bounded live acceptance and explicit limitations
9. Differentiation — claim-level temporal provenance and safe abstention
10. Next steps — held-out evaluation, Staging re-acceptance, accessibility/security review

## Presentation integrity

The deck does not claim production readiness, broad factual accuracy, calibrated confidence, or a statistically representative benchmark. The Python.org direct-fetch HTTP 403 fallback limitation is disclosed. The latest evidence-confidence guard is automated-CI tested but not yet re-deployed to Staging.
