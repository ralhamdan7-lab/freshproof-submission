# Pitch Deck — FreshProof v0.2.81

A 10-slide editable PowerPoint has been prepared as a separate submission artifact. This outline is the source record for its claims and slide order.

1. **Title** — FreshProof: Evidence-First Temporal Verification Engine; Global AI Hackathon 2026; stale-answer detector.
2. **Problem** — Fluent AI answers can become stale while still sounding authoritative.
3. **Solution** — Claim-level extraction, temporal triage, evidence retrieval, adjudication, explanation, and guarded correction.
4. **Temporal reasoning** — Event date, publication date, source update date, and retrieval time are distinct.
5. **Architecture** — Browser UI, Cloudflare Worker, Tavily, source normalization, evidence adjudication, abstention.
6. **Live proof** — The deployed v0.2.81 API classified “Node.js 20.x remains actively supported under LTS” as SUPERSEDED using the official Node.js lifecycle table; six evidence records, two Tavily searches, Freshness FRESH, Evidence Confidence LIMITED.
7. **Responsible decisions** — CURRENT, SUPERSEDED, CONTRADICTED, NEEDS_REVIEW, UNVERIFIABLE, and NOT_TIME_SENSITIVE (temporal metadata, not a truth verdict).
8. **Validation** — 321/321 tests in UTC and 321/321 in Asia/Riyadh; one bounded live API scenario; 32-case synthetic diagnostic clearly labeled non-representative. Broader real-world accuracy evaluation is not yet complete; no general accuracy metrics are claimed.
9. **Trust and operating model** — Minimal data retention, server-side secrets, bounded operations, free-tier design, no paid fallback.
10. **Close** — Public demo and source repository; evidence first, temporal context always, uncertainty stated.

## Claim discipline

- Do not claim general precision, recall, false-positive rate, citation correctness, calibrated confidence, or cost per claim without a completed and audited evaluation.
- The Node.js lifecycle result is a single specialist software-release scenario, not general-domain proof.
- Evidence Confidence LIMITED is shown in the live example and must not be omitted.
- The editable deck is supplied as a separate PPTX file for the official portal upload.
