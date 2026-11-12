# FreshProof

**FreshProof — Evidence-First Temporal Verification Engine**

*Designed to Evolve*

FreshProof is an evidence-first verification engine for AI-generated answers. It extracts claim candidates, retrieves bounded source evidence, assesses source-to-claim relationships, distinguishes publication dates from event dates, and returns conservative claim-level outcomes with traceable explanations. Temporal sensitivity is a secondary dimension: stable claims still pass through factual evidence verification.

## Product contract: VERIFY · EXPLAIN · CORRECT

- **VERIFY:** assess each claim independently and return a conservative status, or abstain.
- **EXPLAIN:** show the evidence, source relationship, publication/event/retrieval date distinctions, and limitations.
- **CORRECT:** provide a replacement only when it is supported by sufficiently strong, scope-matched evidence. Otherwise explicitly withhold correction.

### Claim-level outcomes

`CURRENT`, `SUPERSEDED`, `CONTRADICTED`, `NEEDS_REVIEW`, and `UNVERIFIABLE`.

Temporal assessment is separate: `TIME_SENSITIVE`, `NOT_TIME_SENSITIVE`, or `TEMPORAL_REVIEW_REQUIRED`. `NOT_TIME_SENSITIVE` is not a factual verdict and does not bypass verification.

Evidence relations are assessed separately from final status: `SUPPORTS`, `CONTRADICTS`, `MIXED`, `IRRELEVANT`, and `INSUFFICIENT`. Freshness, evidence confidence, source reliability, and verification status are distinct dimensions; independent corroboration is counted by registrable domain (not subdomain), and no uncalibrated truth probability is presented.

## Current implementation

- Version: **0.2.47**.
- Runtime: Cloudflare Worker with static browser UI.
- Evidence provider: Tavily Basic Search; API key is held as a Worker secret and is never exposed to the browser.
- Optional semantic relation analysis: Cloudflare Workers AI, enabled explicitly in the dedicated Staging configuration. Its output is advisory; it cannot independently set the final verdict.
- Correction-candidate review: explicitly enabled in Staging; candidate review is separate from final adjudication and remains evidence-gated.
- Bounded request handling: 12,000-character input, up to five claim candidates, five search queries, five results per claim, eight direct fetches, and bounded semantic/correction review.
- Arabic and English claim processing, including Arabic sentence punctuation and common temporal indicators.
- Source records retain URL, snippet, publication date, possible event-date candidate, retrieval timestamp, and source-domain profile as distinct fields.
- Source relevance screening separates low-relevance results from adjudication. Lexical alignment is triage, not proof of entailment.
- Primary/official and institutional evidence is preferred. Independent-host corroboration is required for generic high-confidence verdicts; conflicting or insufficient evidence triggers abstention.
- Exact-origin CORS, request timeout, native rate limiting, bounded provider calls, safe external links, and text-only rendering of untrusted source content.
- No database, user accounts, or analytics are required for the prototype.

## Staging and deployment state (2026-11-12)

- Staging URL: https://freshproof-staging.ralhamdan7.workers.dev
- Staging version: `0.2.46`.
- Dedicated staging Worker: `freshproof-staging` in the FreshProof-only Cloudflare account.
- Staging configuration has `ENABLE_SEMANTIC_TRIAGE=true` and `ENABLE_CORRECTION_CANDIDATE_REVIEW=true`; the AI binding is present. The semantic result remains advisory and fails closed when unavailable or malformed.
- Live acceptance workflow run **#26** completed with **SUCCESS** on 2026-11-12 at 14:56:55 UTC, commit `890dc81362ca05828c843e1d36825d39c0ed94f4`. [Open the verified run](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43241870828).
- The bounded live matrix exercised a stable control, a current office-holder contradiction, Arabic Python 2 lifecycle supersession with a first-party correction, Node lifecycle, official pricing retrieval/abstention, a historical fact, and a three-claim input. The run passed its assertions, including claim-specific temporal classification and correction isolation.
- Some live cases correctly abstained (`NEEDS_REVIEW`) where evidence was mixed, weak, or insufficient. This is intended fail-safe behavior, not a forced-success verdict.
- Production Worker was not modified by this staging acceptance work. No production release or hackathon submission is claimed.

## Architecture

`Browser UI → Worker API/Core → Evidence Provider Adapter (Tavily) → Source normalization → Semantic relation assessment (advisory) → Evidence adjudication → Explanation/correction contract`

The core owns validation, claim segmentation, temporal triage, bounded retrieval, source normalization, adjudication, abstention, and output safety. Domain-specific adapters are constrained helpers; they cannot bypass request-wide limits or independently override generic verdict policy.

## Local development

Requires Node.js 20+ and npm.

```bash
npm install
npm test
npm run benchmark:temporal
npm run dev
```

Create `.dev.vars` locally and never commit it:

```env
TAVILY_API_KEY=your_key
ALLOWED_ORIGIN=http://localhost:8787
# Optional local AI binding/configuration depends on the Wrangler environment.
```

## Verification and evaluation

- Automated regression tests cover claim segmentation, evidence adjudication, source relevance, date handling, abstention, correction eligibility, API contracts, and UI safety.
- The 32-case bilingual temporal benchmark is hand-authored and synthetic. Its expected-label result is a regression diagnostic only; it is not a held-out evaluation and must not be presented as real-world precision, recall, or accuracy.
- Live Staging acceptance is a bounded integration test, not a representative accuracy study.
- No real-world precision/recall, false-positive rate, citation correctness, latency distribution, or cost-per-claim claim is made without a documented held-out dataset and reproducible measurement.
- Conservative abstention is deliberate. Evidence thresholds must not be lowered merely to increase the number of definitive outputs.

## Security and privacy

- Provider credentials are Worker secrets, not client-side values.
- User text is processed in the request flow; the prototype does not require a persistent user-content database.
- Input, claim, query, source, and direct-fetch limits are enforced.
- Retrieved pages/snippets are untrusted data, never instructions.
- CORS is restricted to the configured exact origin; rate limiting is applied at the edge.
- Do not deploy publicly or expose secrets until the release security/privacy review is complete.

## Hackathon materials

- [Public submission repository](https://github.com/ralhamdan7-lab/freshproof-submission)
- Demo walkthrough and pitch materials are maintained as a separate media pack; only use a demo URL after confirming that it is playable from a clean, logged-out browser on both mobile and desktop.
- The owner must personally complete and submit the official hackathon form. This repository update does not submit the project.

## Ownership and provenance

See [OWNERSHIP.md](OWNERSHIP.md) and [docs/PROVENANCE.md](docs/PROVENANCE.md). These are project records and an owner declaration, not a formal government IP registration or legal determination.

## Key documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Security](docs/SECURITY.md)
- [Test record](docs/TESTS.md)
- [Verification log](docs/VERIFICATION-LOG.md)
- [Release readiness](docs/RELEASE-READINESS.md)
- [Hackathon rules and checklist](docs/HACKATHON-RULES.md)
- [Demo script](docs/DEMO-SCRIPT.md)

## License and status

This repository is the private development source. Do not redistribute project source or deployment secrets. Public-facing submission material is maintained in the separate submission repository.


## Randomized QA and browser acceptance (2026-11-12)

- **200/200** automated Node tests passed; five seeded property tests cover 1,950 generated iterations across claim segmentation, temporal classification, evidence adjudication, malformed semantic assessments, and abstention invariants.
- [Randomized live Staging acceptance #43248554981](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43248554981) passed seven randomized-order live cases plus two smoke controls: Arabic/English Python 2 lifecycle, person-first US office-holder, Node.js v20 lifecycle, official pricing, stable facts, and a three-claim mixed-timeframe answer.
- [Browser acceptance #43247308055](https://github.com/ralhamdan7-lab/freshproof/actions/runs/43247308055) passed RTL/LTR rendering, validated correction and quote display, safe source links, inert HTML-like input, mobile layout, keyboard submission, and live Worker integration.
- Conservative `NEEDS_REVIEW` results remain where evidence is insufficient; these live cases do not establish general accuracy or performance metrics.
