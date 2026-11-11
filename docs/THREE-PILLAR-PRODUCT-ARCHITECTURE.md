## v0.2.43 — explicit wrong/right presentation
- Each claim card must visibly preserve the submitted wording and state in plain language what is wrong or outdated.
- A second, equally explicit “what is correct?” section displays a replacement only when the correction contract returns `PROVIDED` with validated source references.
- If the verdict is negative but no replacement passed evidence/scope/timeframe checks, the UI must say that no safe alternative has been established and must not invent one.
- Supported claims are described as supported only within the reviewed scope; `NEEDS_REVIEW` and `UNVERIFIABLE` explicitly state that the correct alternative cannot yet be established.
- The report summary follows the first claim’s language and counts only validated corrections.
- This is a presentation/clarity enhancement; it does not relax adjudication or correction eligibility.

---
## 0.2.42 product decision — factual verification is primary; temporal assessment is secondary

**Owner-approved product contract (2026-11-11):** FreshProof must attempt evidence-based factual verification for every extracted claim, regardless of whether temporal heuristics detect time sensitivity. Temporal sensitivity is a secondary attribute that informs evidence recency and interpretation; it is never a bypass around factual verification.

- A claim classified `NOT_TIME_SENSITIVE` still proceeds through bounded evidence retrieval and claim-level adjudication.
- `NOT_TIME_SENSITIVE` is emitted as `temporal_assessment.status`, not as the factual verification verdict.
- The factual verdict remains one of `CURRENT`, `CONTRADICTED`, `SUPERSEDED`, `NEEDS_REVIEW`, or `UNVERIFIABLE`.
- `CURRENT` requires at least two independent eligible sources with source-level semantic relation assessments supporting the exact proposition. For stable claims, primary or institutional sources may qualify without an arbitrary publication-age cutoff. For time-sensitive claims, recent primary/official evidence is required.
- `CONTRADICTED` requires independent eligible sources whose assessed relation contradicts the exact proposition. `SUPERSEDED` remains available to narrowly scoped temporal/domain rules with traceable event evidence.
- Search relevance, lexical overlap, source ranking, a domain label, and model availability never establish truth.
- If semantic relation assessment is disabled or unavailable, generic factual adjudication must abstain as `NEEDS_REVIEW` when evidence exists, or `UNVERIFIABLE` when no usable evidence exists. It must not infer a green or orange verdict.
- The UI uses green for evidence-supported findings, orange for contradicted/outdated findings, amber for review, and neutral styling for unverifiable outcomes. Temporal assessment appears separately as supporting metadata.
- Every positive or negative verdict must expose the source name and direct URL. Any replacement proposition must have its own evidence references and validated provenance.

**Operational constraint:** This implementation does not enable Workers AI or change billing/quota settings. The generic semantic relation path remains subject to the existing opt-in/free-quota gate. Offline fixtures can validate orchestration, but they do not prove live model quality or real-world accuracy.

---

# FreshProof — Three-Pillar Product Architecture

**Decision:** ADOPTED as the product-level acceptance standard on 2026-11-11.  
**Product:** FreshProof — Evidence-First Temporal Verification Engine.  
**Scope:** Entire application and verification pipeline; not a Python-, White House-, language-, or domain-specific feature.

## 1. Product promise

FreshProof must perform three connected but independently auditable functions for each extracted claim:

1. **VERIFY** — determine what the available evidence justifies about the exact claim and its timeframe.
2. **EXPLAIN** — show why the finding was reached, which evidence matters, what dates mean, and what remains uncertain.
3. **CORRECT** — when evidence safely supports a change, provide a concise replacement statement that the user can use, with direct provenance.

These are three mandatory product outcomes, not three optional modes. A claim can complete verification and explanation while correction is withheld. The product must never invent a correction to make the workflow appear complete.

The input is an answer or passage. The output is a claim-by-claim report plus a concise answer-level summary. The system preserves the original wording and never silently rewrites the user's input.

## 2. Pillar A — VERIFY

### Responsibilities
- Extract independent claim candidates while preserving their original text and source position.
- Resolve entities, references, scope, units, and timeframes only when the context supports that resolution.
- Classify temporal sensitivity; a NOT_TIME_SENSITIVE result means temporal review was not triggered, not that the claim has been proven.
- Retrieve current evidence, preferring primary/official sources and independently corroborating sources where appropriate.
- Keep event date, publication date, update date, and retrieval timestamp distinct.
- Evaluate evidence supporting and challenging the exact proposition; identify conflicts and missing context.
- Abstain when source quality, recency, independence, or semantic relation is insufficient.

### Canonical verification statuses
- `CURRENT` — evidence supports the claim within the stated scope and timeframe.
- `SUPERSEDED` — a time-dependent claim has been overtaken by a documented change or lifecycle event.
- `CONTRADICTED` — adequate evidence conflicts with the exact claim.
- `UNVERIFIABLE` — no usable evidence was obtained.
- `NEEDS_REVIEW` — evidence exists but is insufficient, stale, ambiguous, or conflicting.
- `NOT_TIME_SENSITIVE` — temporal heuristics did not trigger; no truth verdict is implied.

Status is separate from evidence confidence, freshness, source reliability, semantic relation, and retrieval diagnostics. None of those signals may be substituted for another or collapsed into a misleading score.

## 3. Pillar B — EXPLAIN

Every reviewed claim must have a human-readable explanation that answers:
- **Finding:** What did FreshProof conclude, and within what scope?
- **Reason:** Which specific fact, date, rule, or conflict caused that conclusion?
- **Evidence:** Which sources support, challenge, or fail to establish the claim?
- **Time interpretation:** Is a date an event date, publication date, page-update date, or retrieval time?
- **Limitations:** What could not be established, and why did the engine abstain or limit confidence?

The explanation is evidence-linked, not a generic status paraphrase. It must not call lexical overlap, search ranking, a domain label, or a model relation suggestion proof. Model-produced relation labels remain advisory unless a separately tested adjudication policy authorizes their use.

### Target structured explanation
```json
{
  "summary": "The claim is no longer accurate.",
  "reason": "The official lifecycle notice records the end of Python 2 support.",
  "evidence_basis": [
    {
      "source_url": "https://www.python.org/doc/sunset-python-2/",
      "relation": "CONTRADICTS",
      "why": "The official excerpt states Python 2 is no longer supported."
    }
  ],
  "date_interpretation": {
    "event_date": "2020-01-01",
    "publication_date": null,
    "retrieved_at": "2026-11-11T04:35:30Z"
  },
  "limitations": [
    "The official page could not be fetched directly; a domain-restricted indexed excerpt was used."
  ]
}
```

This is a target contract, not a claim that the current API already emits this exact object.

## 4. Pillar C — CORRECT

Correction is a grounded transformation of the original claim, not a free-form answer-generation feature.

### Eligibility policy
| Verification result | Correction behavior |
|---|---|
| `SUPERSEDED` | Provide a replacement only when the new state or valid alternative is explicitly supported by adequate evidence. |
| `CONTRADICTED` | Provide an evidence-grounded replacement only when the supported proposition is clear and scope-matched. |
| `CURRENT` | No correction required; state the verified scope and timeframe rather than inventing a different answer. |
| `NEEDS_REVIEW` | Withhold correction; explain what evidence is missing or conflicting. |
| `UNVERIFIABLE` | Withhold correction; do not guess. |
| `NOT_TIME_SENSITIVE` | No temporal correction; do not imply a truth assessment was performed. |

A replacement must:
- preserve entity, units, scope, conditions, and timeframe;
- be traceable to one or more evidence sources actually used in adjudication;
- distinguish a verified replacement from a cautious suggested wording;
- disclose limitations inherited from indexed excerpts, missing publication dates, or incomplete direct access;
- never cite retrieval diagnostics as evidence;
- never use model-generated world knowledge as the sole basis for a correction.

### Target correction object
```json
{
  "status": "PROVIDED",
  "text": "Python 2 is no longer supported; use a currently supported Python 3 release.",
  "basis": [
    {
      "source_url": "https://www.python.org/doc/sunset-python-2/",
      "event_date": "2020-01-01"
    }
  ],
  "limitations": [
    "The official page itself was not fetched; a validated first-party indexed excerpt was used."
  ]
}
```

Allowed correction states: `PROVIDED`, `NOT_NEEDED`, `WITHHELD`, `NOT_APPLICABLE`. A `PROVIDED` correction must have at least one eligible evidence reference. For the Python example, the wording above is illustrative; the UI must preserve the indexed-excerpt limitation.

## 5. End-to-end architecture

```text
User answer
   |
Input validation, privacy bounds, language/direction detection
   |
Claim extraction and original-text preservation
   |
Entity / scope / timeframe resolution
   |
Temporal sensitivity triage
   |
Bounded evidence retrieval
(primary sources -> independent corroboration -> controlled fallback)
   |
Evidence normalization and provenance
(event / publication / update / retrieval dates)
   |
Per-source relation assessment + conflict analysis
   |
Claim-level verification adjudication
   |--------------------|----------------------|
   VERIFY               EXPLAIN                CORRECT
   status + signals     reason + evidence      safe replacement or abstain
   |--------------------|----------------------|
   |
Claim report + answer-level summary + auditable source links
```

### Separation of responsibilities
- **Core pipeline:** owns limits, extraction, source validation, evidence normalization, adjudication, abstention, response contract, and safety.
- **Domain adapters:** may add bounded retrieval and narrow, explicitly scoped rules; they cannot bypass budgets or silently promote a generic verdict.
- **Evidence relation model:** optional/advisory; it does not set source reliability, dates, calibrated confidence, or a final status on its own.
- **Correction builder:** a separate post-adjudication component. It consumes only the final status, structured adjudication facts, and eligible evidence references. It cannot perform unbounded independent research or bypass evidence policy.
- **UI:** presents the three outcomes for each claim, while keeping provenance, limitations, and original text visible.

## 6. User experience acceptance standard

Each claim card must make the following sequence immediately understandable:

1. **Verification:** status and a one-sentence finding.
2. **Explanation:** why, evidence for/against, dates, and limitations.
3. **Correction:** replacement statement with source links, or a clear reason why no correction is offered.

The interface should provide a compact top-level summary and allow evidence details to expand. English claims remain LTR and Arabic claims RTL independently; report-level controls and summary retain their own language direction. A correction must be clearly distinguished from the original claim.

## 7. Quality, safety, and measurement

Release acceptance must test:
- supported, superseded, contradicted, ambiguous, and unverifiable claims;
- conflicting primary and secondary evidence;
- direct retrieval versus indexed excerpts;
- old event dates on newly published pages;
- missing publication dates and separate retrieval timestamps;
- short Arabic and English claims, mixed-language answers, and RTL/LTR isolation;
- correction eligibility and abstention for every status;
- prompt-injection text inside retrieved pages and snippets.

Measure on a labelled corpus before making performance claims:
- claim extraction precision/recall;
- status precision/recall and false-positive rate;
- source/citation correctness;
- explanation faithfulness;
- correction factuality and evidence traceability;
- abstention rate;
- latency and zero-cost compliance / cost per claim.

No probability or accuracy percentage is displayed until empirically calibrated. Search freshness, source reliability, evidence confidence, and verification status remain distinct.

## 8. Delivery sequence

1. **ADOPTED — product contract:** this document establishes VERIFY + EXPLAIN + CORRECT as mandatory product outcomes.
2. **NEXT — response contract:** add structured explanation and correction objects with backward-compatible API tests.
3. **NEXT — deterministic correction builder:** implement status-gated, source-grounded corrections; default to WITHHELD.
4. **NEXT — UI:** add visible correction and evidence-linked explanation sections for every claim, with bilingual direction handling.
5. **NEXT — evaluation:** add a labelled benchmark for correction quality, citation correctness, false corrections, and abstention.
6. **RELEASE GATE:** only mark the three-pillar product complete after end-to-end browser acceptance and regression tests pass.

## 9. Current implementation boundary (2026-11-11)

- **VERIFY:** implemented as a conservative prototype with claim extraction, temporal triage, bounded retrieval, evidence metadata, domain adapters, and abstention. Generic claim verification remains deliberately limited.
- **EXPLAIN:** v0.2.33 now emits a structured explanation object with rationale, evidence links, separate date semantics, and limitations; CI passed and Staging health verified. Browser POST acceptance pending.
- **CORRECT:** v0.2.33 emits explicit correction states and one deterministic Python 2 sunset correction rule; v0.2.34 adds URL/evidence matching hardening pending CI. Generic correction coverage remains intentionally withheld pending additional validated domain rules and evaluation. CI passed and Staging is deployed; browser acceptance pending.
- Therefore the three-pillar direction is ADOPTED. v0.2.33 runtime implementation is merged and deployed to Staging; v0.2.34 correction-gate hardening is pending CI and Staging retest. CI is verified; browser acceptance and broader correction evaluation remain pending.

## 10. Governing principle

**FreshProof does not merely label claims. It verifies what evidence justifies, explains why, and corrects only when the evidence makes correction safe. When evidence is insufficient, it says so.**


## 9. Verified browser acceptance — Python 2 (2026-11-11)

Owner-provided Staging screenshot confirms all three pillars for the Python 2 support claim:
- VERIFY: `SUPERSEDED`.
- EXPLAIN: documented support sunset date, 2020-01-01, and source limitation.
- CORRECT: `PROVIDED`, with replacement wording that Python 2 is no longer supported and support ended on January 1, 2020.

The official Python.org page itself was not fetched: direct retrieval returned HTTP 403. The domain-restricted first-party search-index excerpt was used, and the limitation is visible beside the evidence and correction. This is accepted as evidence-grounded within that limitation.

**Scope boundary:** This acceptance proves the Python 2 adapter path only. The generic correction builder still withholds replacements for other changed/contradicted claim types until a claim-neutral, evidence-bound correction contract is implemented and tested. No broad correction capability is claimed.


## 10. Generic evidence-grounded correction contract — v0.2.36

The core correction builder now accepts an optional internal `correctionCandidate` contract. This is a validator and integration seam, not an LLM free-generation endpoint.

Required candidate shape:
```json
{
  "text": "A concise replacement proposition",
  "assessment": {
    "status": "SUPPORTED",
    "method": "SEPARATE_MODEL_CANDIDATE_REVIEW",
    "scope_match": "MATCHED",
    "timeframe_match": "MATCHED",
    "conflict_status": "NONE"
  },
  "evidence": [
    { "source_index": 0, "relation": "SUPPORTS_CANDIDATE" },
    { "source_index": 1, "relation": "SUPPORTS_CANDIDATE" }
  ],
  "limitation": "Optional scope or acquisition limitation"
}
```

Core validation requires a `SUPERSEDED` or `CONTRADICTED` original finding, a non-empty bounded replacement distinct from the original claim, the exact assessment contract above, at least two independent HTTPS source hosts, at least one primary/official source, all corroborating sources primary/official or institutional, non-empty excerpts, no LOW-relevance sources, unique valid source indices, and candidate-specific support relations. References are rebuilt from the actual source objects; candidate-provided URLs are not trusted.

The existing Python 2 rule remains isolated and unchanged. If a generic candidate is missing or fails any check, correction remains `WITHHELD`. No candidate producer is enabled by v0.2.36; domain adapters or a separately tested candidate-assessment stage must supply the contract. This prevents the model from inventing replacement facts and keeps candidate support distinct from evidence that merely contradicts the original claim.


## 11. Optional model-assisted candidate review — v0.2.37

A separate Workers AI review pass can propose a candidate correction from supplied evidence excerpts. It is not a separate evidence source, not an independent model, and not a calibrated truth verdict. It must return a replacement proposition, matched scope and timeframe, no conflict, and at least two source indices explicitly assessed as supporting that replacement. The generic core validator then independently enforces source identity, HTTPS, host independence, primary-source presence, institutional/primary reliability, excerpt presence, relevance, and citation reconstruction.

The pass is disabled by default. Invocation requires BOTH environment flags:
- `ENABLE_CORRECTION_CANDIDATE_REVIEW=true`
- `FREE_WORKERS_AI_QUOTA_VERIFIED=true`

The second flag is an operator assertion, not an automatic quota check; do not set it until current Cloudflare Workers AI free-tier quota and overage behavior have been verified. Maximum two calls per verification request. Failure or uncertainty withholds correction. The existing Python 2 deterministic path does not invoke this model pass.


## 12. Verbatim quote-to-source provenance for generic correction — v0.2.39

Every supporting evidence item in a generic correction candidate must carry a verbatim contiguous excerpt (20–500 characters) from the exact source snippet identified by its source index. Both the model-review boundary and final correction builder independently check the mapping after conservative Unicode/whitespace normalization. The output includes the checked quote beside the citation. Any missing or mismatched quote causes `WITHHELD`.

This prevents invented quotations and citation-index drift. It does not prove semantic entailment: the quoted text may be genuine but insufficient to establish the replacement proposition. The model review is still advisory, not an independent source or independent model. The feature remains disabled by default pending verified free quota.


## 13. Visible supporting quote presentation — v0.2.40

Validated generic correction evidence quotes are rendered directly beneath their source links in the claim-level correction card. Each excerpt is labelled in Arabic or English, uses the claim's detected text direction, and is inserted as text content rather than HTML. This exposes the exact quote used for provenance review and helps human reviewers inspect source-to-correction traceability. It does not upgrade the model's semantic assessment into independent entailment verification.


## 11. v0.2.41 product-integration acceptance work (2026-11-11)

- Scope: validate the full API orchestration path with controlled synthetic evidence, not only isolated helper functions.
- The integration fixture invokes the Worker API and checks the returned claim status, structured explanation, evidence references, correction state, replacement text, and source excerpts as one contract.
- Negative controls deliberately inject conflicting relations, insufficient independent sources, duplicate-host sources, invalid supporting quotes, and low-relevance evidence. The expected behavior is abstention or correction withholding.
- Model and search providers are replaced with deterministic local fixtures in tests. These fixtures test orchestration and validation boundaries; they do not establish model semantic accuracy.
- Frontend contract regression checks that source excerpts are rendered as text, not HTML. Actual browser visual/interaction acceptance remains a separate gate.
- Generic correction review remains disabled by default in Staging configuration. Test-only opt-in flags are not runtime deployment changes.
