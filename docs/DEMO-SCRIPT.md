# Demo walkthrough — FreshProof v0.2.81

## Primary live scenario: outdated software lifecycle claim

Use the deployed public demo:

https://freshproof-submission-demo.ralhamdan7.workers.dev

Input:

```text
Node.js 20.x remains actively supported under LTS.
```

Verified API outcome on 2026-11-15:

- API status: `SUPERSEDED`.
- UI presentation: the browser flow is expected to render the corresponding outdated status; confirm this with the deployed-browser acceptance workflow before recording.
- Specialist adapter: `software_release`.
- Primary evidence: official Node.js previous-releases and lifecycle table:
  https://nodejs.org/en/about/previous-releases
- Official release table reported Node.js 20 as `EOL`; its row update date was 2026-03-24. That row update date is not itself the EOL event date.
- Retrieval time recorded separately: 2026-11-15.
- Evidence records: 6; Tavily searches: 2.
- Freshness: `FRESH`; Evidence Confidence: `LIMITED`.

This is a verified specialist software-lifecycle scenario only. Do not generalize it to all domains or present it as a calibrated accuracy result.

## Demo sequence

1. Open the actual public demo and show the product title and bilingual interface.
2. Paste the tested Node.js 20 claim and submit it.
3. Show the claim-level result and open the official Node.js source.
4. Explain the difference between the lifecycle status, the row's last-updated date, and retrieval time.
5. Point out that evidence confidence remains LIMITED even though the status is SUPERSEDED.
6. Explain the abstention states: `NEEDS_REVIEW` and `UNVERIFIABLE` are deliberate when evidence does not justify a stronger conclusion.
7. If demonstrating multiple claims, show that claims are evaluated independently and that temporal sensitivity is not the same as truth.

## Demo integrity

- Capture the current live UI and actual response; do not use mocked screenshots as live evidence.
- Do not claim a live UI result until the deployed-browser test passes against version 0.2.81.
- Do not present synthetic benchmark output as real-world accuracy.
- Do not claim calibrated confidence or general-purpose entailment accuracy.
- Do not show API keys, private repositories, internal Staging endpoints, or personal information.
- State any waiting-time edits or accelerated footage in the video.
