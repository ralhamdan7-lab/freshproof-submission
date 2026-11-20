# Demo Video Script — FreshProof v0.3.19 (final, 3:26)

Watch: https://youtu.be/9um3lz068pE

Voice-over: Kokoro text-to-speech (open-weight, Apache-2.0), voice `am_michael`. Every result shown is a real output of the live engine. On-screen text in every scene: "FreshProof · Project owner: Raed Alhamdan" and the HackCulture and Geek Room logos.

| # | Scene | Narration |
|---|---|---|
| 1 | Title | This is FreshProof: an evidence-first verification engine for AI-generated answers, created by Raed Alhamdan for the Global AI Hackathon. |
| 2 | The problem | AI assistants answer with confidence, but the world keeps changing. Laws take effect, records are broken, and offices change hands. The most dangerous error is not the obvious one. It is a single wrong date, or a wrong number, hidden inside a sentence that sounds right. |
| 3 | The answer | FreshProof checks AI answers claim by claim. It does three things. It verifies, it explains, and it corrects. Always with evidence, dates, and honest uncertainty. |
| 4 | How it works | Here is how it works. First, a long answer is split into small, self-contained claims, each naming its subject and its date. Next, the engine plans its own searches and retrieves evidence through Tavily, reaching for official and primary sources. A strong language model then reads every source, and labels it: supports, contradicts, or insufficient. Finally, a deterministic rule engine, not the model, decides the verdict. It requires independent publishers and qualified sources, and it guards against common traps: a wrong year, a wrong name, or a debunking page that is misread as support. |
| 5 | Real result: Brexit date | These are real results from the live engine. Take this claim: the United Kingdom legally withdrew from the European Union on the thirty-first of December, twenty twenty. FreshProof marks it false, and shows the correction: the withdrawal took effect on the thirty-first of January, twenty twenty, quoted word for word from independent sources. |
| 6 | Real result: UN membership | Another claim: South Sudan became the one hundred and ninety-fourth member of the United Nations. False. It was the one hundred and ninety-third, confirmed on the United Nations' own website. |
| 7 | Real result: a true claim | And when a claim is true, like the adoption, the entry into force, and the temperature goals of the Paris Agreement, every part is confirmed with strong confidence, from the UNFCCC and the United Nations. |
| 8 | Testing | We tested FreshProof against forty advanced claims, written by a different AI system, across health, climate, economics, law, and space. They were split into ninety-nine parts. In our checks, not one part received a wrong verdict. And when the evidence cannot settle a claim, FreshProof says so, instead of guessing. |
| 9 | Free tiers | It runs entirely on free tiers: Cloudflare Workers, Tavily search, and two AI providers, Cloudflare Workers AI and Groq, so it keeps working when one is busy. More than five hundred automated tests guard every release. |
| 10 | Designed to evolve | FreshProof is designed to evolve: more official sources, more languages, with Arabic already supported, and new ways to plug into the tools people use every day. FreshProof. Verify. Explain. Correct. |
