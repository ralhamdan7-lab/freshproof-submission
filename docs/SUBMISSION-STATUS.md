# FreshProof — Submission Status

Updated: 2026-11-12

## Public submission repository
This sanitized submission repository contains the product source, regression tests, benchmark fixtures, and core technical documentation. The development repository remains private.

## Verified implementation snapshot
- Runtime release: FreshProof v0.2.45.
- Automated Node regression suite: 181 passed, 0 failed.
- Worker, adjudication, domain-adapter, and browser syntax checks passed.
- 32-case bilingual synthetic temporal diagnostic passed its expected classifications; this is a regression diagnostic, not a real-world accuracy estimate.
- Evidence-confidence guard: confidence is not inferred from source count or publication dates alone; corroboration candidates require completed relation assessment and distinct qualified domains.
- Staging deployment: successful through the dedicated Staging-only workflow. The live workflow verified v0.2.45 against bounded cases.

## Live Staging acceptance
The latest successful live acceptance run checked:
- Current US office-holder claim: CONTRADICTED with White House evidence.
- Arabic Python 2.7 support claim: SUPERSEDED; correction tied to Python.org sunset page, with direct-fetch HTTP 403 and indexed first-party excerpt fallback explicitly disclosed.
- Node.js v20 lifecycle: SUPERSEDED using official lifecycle evidence; no invented end-of-life date.
- ChatGPT Plus pricing: NEEDS_REVIEW; official article retrieved without overclaiming a factual verdict.
- Apollo 11 historical claim: NOT_TIME_SENSITIVE as a secondary temporal assessment, while factual verdict remains NEEDS_REVIEW and correction is withheld.
- One three-claim request: three independent claim cards; Water and Apollo 11 remained NEEDS_REVIEW, Python 2.7 was SUPERSEDED. Each claim retained its own evidence and correction decision.

These are bounded acceptance cases, not representative accuracy evaluation. No broad precision, recall, false-positive rate, citation correctness, latency, or cost-per-claim claims are made.

## Presentation media prepared
- A 10-slide editable pitch deck and matching 10-page PDF export have been generated.
- A 2-minute-34-second, 1920x1080 narrated product walkthrough has been generated with English subtitles.
- The walkthrough combines validated pitch visuals with five supplied product-interface test captures. It is a narrated walkthrough, not an uninterrupted live browser recording; the supplied UI captures are genuine screenshots, while staging deployment and automated acceptance were verified separately.
- The video narration distinguishes engineering/regression evidence from real-world accuracy and does not claim broad precision or recall.
- The complete media pack is available as a downloadable ZIP outside this repository and must be uploaded/linked in the organizer submission form as its fields require.

## Deployment boundary
Only the isolated Staging Worker was deployed. Production remains unapproved and unchanged. This public repository is not configured for deployment to the private Staging environment.

## Remaining before final submission
1. Confirm current official portal fields and required acknowledgements directly in the organizer portal.
2. Upload the public repository URL, working Staging demo URL, pitch deck, and walkthrough wherever the portal requests them.
3. Submit through the organizer portal and retain its official receipt.

No organizer submission is claimed by this status file.
