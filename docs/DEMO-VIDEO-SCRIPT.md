# Demo Video Script — FreshProof v0.2.81

Target duration: 2:30–3:00. Record the actual deployed public application. Use a clean browser session and do not include credentials, private tabs, or personal information.

## 0:00–0:20 — Problem
**Screen:** Title slide or public FreshProof landing page.

**Narration:** “AI answers can become outdated while still sounding authoritative. A search result alone does not tell us whether the source supports the exact claim, whether the event itself is recent, or when the system should abstain.”

## 0:20–0:45 — Product workflow
**Screen:** Show the input area and paste the test claim.

**Narration:** “FreshProof breaks an answer into individual claims, assesses temporal sensitivity separately from factual status, retrieves evidence for each proposition, and explains the result with source provenance.”

## 0:45–1:35 — Live stale-claim demonstration
**Input:** Node.js 20.x remains actively supported under LTS.

**Screen:** Submit the claim on the deployed public demo. Wait for the actual response. Open the official Node.js lifecycle source.

**Narration:** “This claim sounds plausible, but the deployed v0.2.81 API classified it as SUPERSEDED. The official Node.js lifecycle table reports version 20 as end-of-life. The live API request returned HTTP 200, processed one claim, and returned six evidence records using two Tavily searches.”

**On-screen disclosure:** “One bounded software-lifecycle scenario; not a general accuracy benchmark. Evidence Confidence: LIMITED.”

## 1:35–2:10 — Explain uncertainty
**Screen:** Show the status and evidence details. If the UI displays freshness, evidence confidence, or source reliability separately, point to each without combining them.

**Narration:** “Freshness and evidence confidence are not the same. FreshProof keeps the retrieval date separate from source dates, and it does not turn a recent page or a search ranking into a truth score. When evidence is insufficient or conflicting, it can return NEEDS_REVIEW or UNVERIFIABLE.”

## 2:10–2:35 — Technical evidence
**Screen:** Briefly show the public README or CI summary, not private repositories.

**Narration:** “The public release is version 0.2.81. Its release checks passed 321 tests in UTC and 321 in Asia/Riyadh. These are engineering checks; we do not present them as real-world accuracy metrics.”

## 2:35–2:50 — Close
**Screen:** Public demo URL and public repository.

**Narration:** “FreshProof makes AI answers accountable to time — claim by claim, with evidence and explicit uncertainty.”

## Recording checklist

- Capture the actual public UI and current live result; never substitute a mock for a live claim.
- Confirm the live Worker health version is 0.2.81 immediately before recording.
- Keep the official Node.js source URL visible and clickable.
- Do not show non-public infrastructure, credentials, or personal information.
- If editing out waiting time, disclose that the footage was edited.
- Keep the final video within 2–4 minutes and test playback in a logged-out browser if hosted.
