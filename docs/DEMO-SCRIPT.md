# Demo walkthrough

## Primary scenario: obsolete software-support claim

Input:

```text
Python 2.7 is still officially supported.
```

Expected bounded demonstration outcome:
- Claim status: `SUPERSEDED`.
- Evidence: the official Python.org Python 2 sunset notice.
- Event date: 2020-01-01.
- Correction: Python 2 is no longer supported; its support ended on January 1, 2020.
- The canonical official source link is shown with the correction.

Retrieval limitation: direct retrieval of the Python.org page may return HTTP 403. In that case the adapter accepts only a domain-restricted indexed excerpt for the exact official sunset page containing both the date and explicit no-support wording. The report must disclose that the page itself was not directly fetched. Do not claim otherwise.

## What to demonstrate
1. Submit an answer containing multiple independent claims.
2. Show each claim assessed separately.
3. Show the original claim and its factual status.
4. Open the evidence source and distinguish event date, publication date, and retrieval time.
5. Show a source-grounded correction only when the correction contract returns `PROVIDED`; otherwise show abstention.
6. Explain that `NOT_TIME_SENSITIVE` is temporal metadata, not a factual verdict.

## Demo integrity
- Use the current live deployment and capture the actual response; do not rely on mocked screenshots.
- Do not present the synthetic benchmark as real-world accuracy.
- Do not claim calibrated confidence or general-purpose entailment accuracy.
- Keep optional model inference disabled unless zero-cost eligibility, quota, and privacy have been verified.
