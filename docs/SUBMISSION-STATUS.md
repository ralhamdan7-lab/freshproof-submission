# FreshProof — Submission Status

Updated: 2026-11-12

## Public submission repository

This is the sanitized public submission repository. The original development repository remains private. The public source, tests, and documentation are kept separate from internal development records and deployment workflows.

## Current verified release

- Application version: **v0.2.45**.
- Staging URL: https://freshproof-staging.ralhamdan7.workers.dev
- Staging deploy workflow: [#43105275398 — success](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43105275398).
- Regression workflow: [#43105450053 — success](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43105450053).
- Node test suite: **181 passed, 0 failed**.
- Worker, adjudication, domain adapter, and browser syntax checks: passed.
- 32-case bilingual synthetic temporal diagnostic: 32/32 expected classifications. This is a hand-authored regression set, not a real-world accuracy estimate.
- Staging live acceptance: [#43105449840 — success](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43105449840).
- The live acceptance run includes five bounded cases and one multi-claim request with three independent claims.

## Live acceptance results

| Scenario | Observed outcome | Important boundary |
|---|---|---|
| US office-holder stale claim | CONTRADICTED | Official White House evidence; no generic correction issued |
| Arabic Python 2.7 support | SUPERSEDED | Correction PROVIDED with official Python.org sunset reference |
| Node.js v20 lifecycle | SUPERSEDED | Official Node.js release schedule; no invented correction |
| ChatGPT Plus price | NEEDS_REVIEW | Official Help Center evidence retrieved; no unsupported price verdict |
| Apollo 11 (1969) | NEEDS_REVIEW / NOT_TIME_SENSITIVE | Factual status remains unresolved; correction withheld |
| Three-claim combined answer | 3 claims isolated | Water and Apollo remain NEEDS_REVIEW with corrections withheld; Python 2.7 alone is SUPERSEDED with correction PROVIDED |

### Python.org retrieval limitation

Direct Python.org retrieval returned HTTP 403. The adapter validated a domain-restricted indexed excerpt from the exact official sunset page, matching the official host/path, sunset date, and explicit support-ending wording. The application disclosed that the page itself was not directly fetched. The live test observed one official source, so evidence confidence remains LIMITED; no corroboration claim is made.

## Evidence-confidence guard

The guard prevents retrieval volume or publication-date presence from inflating evidence confidence. Without a completed advisory relation assessment it returns LIMITED; a corroboration-candidate label requires at least two distinct qualified domains with a matching advisory relation. It does not create a calibrated probability or determine the factual verdict.

The guard is included in v0.2.45, passed the 181-test regression suite, and is now deployed and exercised through the bounded Staging live-acceptance workflow.

## Evaluation limits

The 32-case synthetic set is diagnostic only. The bounded live cases do not establish representative real-world precision, recall, false-positive rate, citation correctness, calibrated confidence, latency, or cost per claim. Production readiness has not been established.

## Demonstration

The live demo is available at https://freshproof-staging.ralhamdan7.workers.dev. Use non-confidential sample claims only. The Python 2.7 scenario is the clearest stale-answer demonstration; disclose the direct-fetch limitation if it appears.

## Remaining before final organizer submission

1. Confirm the current organizer portal fields and whether a demo video is mandatory.
2. Attach the public repository URL, project description, technology list, and AI-use disclosure.
3. If the portal requires a demo video, record the live Staging workflow; do not use mocked results.
4. Submit through the organizer's portal and retain the confirmation receipt.

No submission to the organizer is claimed by this status file. Production remains unapproved and unchanged.
