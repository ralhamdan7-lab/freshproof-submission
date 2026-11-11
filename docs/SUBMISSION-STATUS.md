# FreshProof — Submission Status

Updated: 2026-11-12

## Public submission repository

The sanitized source, tests, and core product documentation are published in this repository. The original development repository remains private.

## Verified implementation snapshot

- Source baseline: FreshProof v0.2.44.
- Automated regression run: GitHub Actions run [#43098923491](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43098923491), completed successfully.
- Node test suite: 181 passed, 0 failed.
- Worker, adjudication, domain-adapter, and browser syntax checks passed.
- 32-case bilingual synthetic temporal diagnostic: 32/32 expected classifications. This is a hand-authored regression set, not a real-world accuracy estimate.
- The tested commit includes the evidence-confidence guard that prevents retrieval count and publication dates alone from inflating evidence confidence.

## Live deployment boundary

The latest previously verified Staging deployment is v0.2.44. The evidence-confidence guard passed automated CI after that deployment, but a subsequent Staging deployment and live re-acceptance of that guard are not claimed here.

Production remains unapproved and unchanged. Do not deploy this repository's Worker without first configuring a separate environment, secret, exact allowed origin, rate limiting, provider quota controls, and privacy terms.

## Demonstration evidence

The bounded Staging acceptance record includes:
- Python 2.7 support claim: SUPERSEDED, with an official Python.org sunset reference and a disclosed indexed-excerpt fallback limitation when direct retrieval returned HTTP 403.
- Node.js v20 lifecycle: SUPERSEDED without inventing an exact end-of-life date.
- Current US office-holder claim: CONTRADICTED under a narrow official-source rule.
- Pricing retrieval and historical Apollo 11 claim: NEEDS_REVIEW where the evidence did not justify a factual verdict.
- Owner-assisted multi-claim UI review: three independent claim cards; correction provided only for the Python 2.7 claim.

These are bounded cases, not representative accuracy evaluation.

## Remaining before final submission

1. Re-run the current Staging demo and capture a fresh, unmocked screen recording.
2. Confirm the official portal's current required fields and whether video is mandatory.
3. Enter the final project description, technology list, AI-use disclosure, repository URL, and demo link.
4. Submit through the organizer's portal and retain the confirmation receipt.

No submission to the organizer is claimed by this status file.
