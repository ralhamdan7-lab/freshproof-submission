# Staging Acceptance — v0.2.45 — 2026-11-12

## CI and deployment

- Staging deploy: [workflow #43105275398](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43105275398) — SUCCESS.
- Automated regression: [workflow #43105450053](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43105450053) — SUCCESS; 181 tests passed, 0 failed.
- Live Staging acceptance: [workflow #43105449840](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43105449840) — SUCCESS.
- Worker syntax, adjudication syntax, domain-adapter syntax, browser application syntax, and 32-case synthetic temporal smoke test passed.
- Runtime version returned by the live API: v0.2.45.

## Five bounded live cases

| Case | Factual status | Temporal assessment | Correction |
|---|---|---|---|
| US office-holder claim naming Joe Biden as current president | CONTRADICTED | TEMPORAL_REVIEW_REQUIRED | WITHHELD |
| Arabic Python 2.7 still-supported claim | SUPERSEDED | TEMPORAL_REVIEW_REQUIRED | PROVIDED |
| Node.js v20 remains actively supported under LTS | SUPERSEDED | TEMPORAL_REVIEW_REQUIRED | WITHHELD |
| ChatGPT Plus current US price | NEEDS_REVIEW | TEMPORAL_REVIEW_REQUIRED | WITHHELD |
| Apollo 11 landed in 1969 | NEEDS_REVIEW | NOT_TIME_SENSITIVE | WITHHELD |

## Multi-claim live acceptance

One request returned exactly three independent claims:
- Water composition: NEEDS_REVIEW / NOT_TIME_SENSITIVE / correction WITHHELD.
- Apollo 11 landing: NEEDS_REVIEW / NOT_TIME_SENSITIVE / correction WITHHELD.
- Python 2.7 support: SUPERSEDED / TEMPORAL_REVIEW_REQUIRED / correction PROVIDED with the official Python.org sunset URL.

The request used 4 of the configured maximum 5 searches and completed in 228 ms in this specific run. This is a single-run observation, not a latency benchmark.

## Source limitation

Python.org direct retrieval returned HTTP 403. The application used a domain-restricted indexed excerpt validated against the exact official page, sunset date, and support-ending wording. The UI and API disclose that the page itself was not fetched. Only one official source was present; confidence remains LIMITED. No multi-source corroboration is claimed.

## Interpretation

These results demonstrate the selected bounded behaviors and the three-pillar flow. They do not establish representative real-world accuracy, calibrated confidence, broad citation correctness, or production readiness. The 32-case synthetic temporal dataset remains a regression diagnostic only.
