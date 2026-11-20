# FreshProof release history

Project owner: **Raed Alhamdan**. FreshProof is designed to evolve: this log shows how the engine grew release by release, from the first prototype to the current version.

## At a glance

| Item | Count |
|---|---|
| Documented releases (v0.2.0 → v0.3.21) | 70+ |
| Automated tests in the current version (run in UTC and in Asia/Riyadh) | 560 |
| Merged pull requests (private development + public submission repositories) | 200+ |
| Automated CI and validation workflow runs (both repositories) | 2,900+ |
| Live diagnostic claims used during development (English and Arabic, simple to multi-part) | 116 |
| Free AI providers used | 2 (Cloudflare Workers AI and Groq) |
| Evidence search provider | Tavily |

These are effort and engineering figures, not accuracy figures. The diagnostic claims carry labels written during development, so FreshProof does not claim a measured accuracy rate.

## Releases

| Version | Date | What changed |
|---|---|---|
| v0.2.0–v0.2.3 | 8–9 Nov 2026 | First prototype: claim extraction, Tavily evidence search, Arabic support, freshness dates, safe abstention |
| v0.2.4–v0.2.8 | 9 Nov | Better time-sensitivity detection, bilingual benchmark, clause splitting, source-claim alignment, conflict screening |
| v0.2.9–v0.2.11 | 9 Nov | Cloudflare Workers AI semantic assessment (advisory only), safer CORS and timeouts |
| v0.2.12–v0.2.18 | 9 Nov | Office-holder checks against official sources, name and abbreviation handling, fallback searches |
| v0.2.19–v0.2.23 | 9 Nov | Continuity and renaming claims, one-year recency window, pronoun resolution, concept aliases |
| v0.2.26 | 10 Nov | Software lifecycle check from official release listings |
| v0.2.32–v0.2.35 | 11 Nov | Official-source fallback, structured explanations, correction states, Arabic localisation |
| v0.2.36–v0.2.41 | 11 Nov | Evidence-grounded correction contract with verbatim quotes, full offline integration tests |
| v0.2.42–v0.2.43 | 11–12 Nov | Factual verification first for every claim; "what is wrong / what is correct" view |
| v0.2.44–v0.2.47 | 11–12 Nov | Randomised test coverage, semantic relation assessment, independent-source counting by publisher |
| v0.2.58–v0.2.61 | 13 Nov | Claim polarity, primary-source routing across domains, Groq added as a second free provider |
| v0.2.62–v0.2.65 | 14 Nov | Universal retrieval baseline, publisher diversity, specialist evidence gate |
| v0.2.66–v0.2.72 | 14 Nov | Evidence sufficiency tiers, historical sources, strict structured outputs, multi-part claim coverage |
| v0.2.75–v0.2.81 | 14–15 Nov | First-party provenance, claim dependency preservation, publisher-agnostic retrieval |
| v0.2.82–v0.2.84 | 15–16 Nov | Direct page reading, strict date provenance, claim types, execution status, per-source trace |
| v0.2.91 | 16 Nov | Model-planned search, graded verdicts with confidence tiers, evidence-gated corrections, progressive checks |
| v0.2.92–v0.2.95 | 16 Nov | Corrections in the same pass, questions as claims, judge-ready interface, timing telemetry |
| v0.2.96–v0.2.99 | 16 Nov | Verdict-first result box, faster assessment on Groq, present-state evidence, clearer key quotes |
| v0.3.0 | 16 Nov | STRONG confidence when many independent sources agree |
| v0.3.1–v0.3.2 | 16 Nov | Complex scientific claims, neutral model instructions |
| v0.3.3–v0.3.6 | 17 Nov | Safety guards: claimed year, proper names, debunking language; wider official-source coverage |
| v0.3.7–v0.3.8 | 19 Nov | Provider resilience: bounded waits and two strong models |
| v0.3.9–v0.3.11 | 19 Nov | Advanced multi-part claims split into self-contained parts, "completed vs. planned" rule, event-date searches |
| v0.3.12 | 19 Nov | Corrections shown with their evidence basis |
| v0.3.13 | 19 Nov | Evidence assessed by strong models only |
| v0.3.14–v0.3.15 | 19 Nov | Claim splitting that holds up under load, subject check for every part |
| v0.3.16 | 20 Nov | Evidence waits for a strong model; no claim part is dropped |
| v0.3.17 | 20 Nov | A wrong value is refuted by the correct value stated in official sources (staged) |
| v0.3.18 | 20 Nov | Abbreviations such as "v." and "e.g." no longer split a claim |
| v0.3.19 | 20 Nov | Faster answers when the free quota is spent |
| v0.3.20 | 20 Nov | The official text of a published standard (such as an RFC) settles claims about it (staged) |
| v0.3.21 | 20 Nov | In any field, the body that issued a fact can settle it on its own official source (staged) |

Full technical notes for each version are in [CHANGELOG.md](../CHANGELOG.md).
