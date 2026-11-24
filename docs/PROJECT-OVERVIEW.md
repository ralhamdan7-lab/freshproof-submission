# FreshProof — Project Overview (v0.3.24)

## Project title

**FreshProof — Evidence-First Temporal Verification Engine**

## Project owner

Raed Alhamdan

## One-line summary

FreshProof verifies factual claims one by one, from a pasted AI-generated answer or typed in by the user: it finds evidence from official and independent sources, marks each claim true, false, outdated or unsettled, and corrects false claims with quotes from the sources.

## The problem

AI assistants answer with confidence, but the world keeps changing: laws take effect, records are broken, offices change hands. The most dangerous error is rarely the obvious one. It is a single wrong date or number inside a sentence that sounds right, or a page that debunks a myth being read as support for it. The same is true of claims people meet every day and want to check. A list of search links does not tell the reader which part is wrong, why, or what the right value is.

## What was built

A working web application and API, deployed on the public demo:

- **Input:** a full AI-generated answer, a single claim or a question, in English or Arabic.
- **Split:** a long answer is decomposed into small, self-contained claims, each naming its subject and its date. Every part is checked against the original text so nothing is invented.
- **Search:** the engine plans its own queries and retrieves evidence through Tavily, aiming at official and primary sources.
- **Read:** a strong language model labels each source as supporting, contradicting or insufficient for the exact claim.
- **Decide:** a deterministic rule engine, not the model, gives the verdict. It requires independent publishers and qualified sources, and guards against a wrong year, a wrong name, and a debunking page misread as support.
- **Correct:** a false claim gets the right value, quoted word for word from independent publishers. If the evidence cannot settle a claim, FreshProof says "needs review" instead of guessing.
- Arabic (RTL) and English (LTR) interface.

## Technologies and tools

- **Runtime:** Cloudflare Workers (API and web app), with a short-lived result cache. No database and no stored user submissions.
- **Evidence search:** Tavily Search API, called server-side only.
- **AI models (free tier):** Groq — `qwen/qwen3.8-27b` and `openai/gpt-oss-120b` judge evidence; Cloudflare Workers AI — `@cf/zai-org/glm-4.7-flash` as the second provider. The smallest model is never used to judge evidence.
- **Quality:** Node.js test suite (565 tests in two time zones), Playwright browser acceptance, live-deployment acceptance on every release, GitHub Actions CI.
- **Cost:** everything runs on free tiers. If a quota runs out, the app shows a temporary service-limit message instead of a verdict.

## How AI is used

**In the product**

1. **Claim decomposition:** a language model splits long answers into atomic claims; deterministic validation rejects any part that is not supported by the original text.
2. **Search planning:** the model proposes targeted queries and likely official domains for each claim.
3. **Evidence reading:** a strong model labels the relation of each source to the claim (supports, contradicts, insufficient), its scope and its authority role.
4. **Correction drafting:** the model proposes a corrected claim, which is shown only if the corrected value is quoted verbatim by independent publishers.

The model is advisory. The final verdict comes from deterministic rules over the evidence, so a model error cannot by itself produce a confident wrong answer.

**During development**

FreshProof was built during the hackathon by Raed Alhamdan with AI coding assistants under his direction: OpenAI ChatGPT in the early phase (architecture review, implementation support, test design) and Anthropic Claude from 15 November (engineering, testing, debugging, documentation). The demo video's voice-over was generated with the open-weight Kokoro text-to-speech model (Apache-2.0).

## Results so far

- 40 advanced claims written by a different AI system (health, climate, economics, law, space), split into 99 parts: no part received a wrong verdict in our checks.
- Real examples from the live engine: "The UK legally withdrew from the EU on 31 December 2020" → false, corrected to 31 January 2020 (ora.ox.ac.uk, iasplus.com); "South Sudan became the 194th UN Member State" → false, the 193rd (un.org, bbc.com); the Paris Agreement's adoption, entry into force and temperature goals → all true with strong confidence (unfccc.int, un.org).
- These are development diagnostics with labels set during development, not an accuracy study. No precision, recall or calibrated-probability figures are claimed.

## Scalability and what comes next

FreshProof is designed to evolve: more official records (registries, gazettes, datasets) as evidence, more languages beyond English and Arabic, and an API for plugging verification into the tools where people read AI answers. Providers are interchangeable, so paid tiers or new models can be added without changing the verdict rules.

## Links

- Live demo: https://freshproof-submission-demo.ralhamdan7.workers.dev
- Demo video (3:26): https://youtu.be/9um3lz068pE
- Source repository: https://github.com/ralhamdan7-lab/freshproof-submission
- Release history: https://github.com/ralhamdan7-lab/freshproof-submission/blob/main/docs/RELEASES.md
