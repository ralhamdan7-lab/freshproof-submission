# Security and Privacy Notes (v0.3.23)

- **Credentials.** Tavily and Groq keys are Worker secrets, read only on the server. They never reach the browser, the repository or the logs. `.dev.vars`, `.env`, `node_modules` and Wrangler state are excluded from Git.
- **Data flow.** The browser sends only the submitted text to the Worker. The Worker sends search queries derived from each claim to Tavily, and the claim with retrieved source excerpts to the AI providers (Groq and Cloudflare Workers AI).
- **No user database.** Submitted text is not stored. Completed results for a claim are kept for a few hours (up to 24 hours for stable facts) in the Workers Cache API, keyed by a hash of the normalized claim and the engine version, so an identical claim is not re-checked; results stopped by a provider limit are never cached.
- **Response headers.** API responses set `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- **CORS.** Browser access is allowed only from the exact origin in `ALLOWED_ORIGIN`; wildcard reflection is not used. CORS is not authentication and does not block non-browser clients.
- **Untrusted content.** Search results and page passages are treated as data. The interface renders them as text and source links and never executes retrieved content; instructions found in a page are not followed by the models.
- **Bounded work.** Up to 12,000 characters of input and up to 3 claims per verification request (the interface sends a long answer in batches); up to 7 searches and 8 direct page fetches per request, 5 results per search and 5 model-assessed sources per claim; a 10-second Tavily timeout and bounded model timeouts.
- **Rate limiting.** The native Cloudflare rate-limit binding `API_RATE_LIMITER` allows 15 verification requests per 60 seconds per client IP and Cloudflare location. It is an approximate abuse guard, not a strict global quota. Requests over the limit receive HTTP 429; if the limiter itself fails, the request is rejected with HTTP 503.
- **Fail-closed models.** Model output is advisory and cannot by itself establish a verdict. If no strong model is available, the claim is reported as not assessed rather than judged by a weaker model.
- **Corrections.** A correction is shown only when it passes the evidence contract: the corrected value is quoted verbatim by independent publishers.
- **Zero cost.** All providers run on free tiers with no paid overage. When a quota is spent, affected claims are reported as a temporary service limit.
- **Not in scope.** There is no user authentication and no durable global rate limiter; the public demo is a prototype for review, not a production service.
