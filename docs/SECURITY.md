# Security and Privacy Notes

- Tavily key is accessed only from Worker environment secrets.
- `.dev.vars`, `.env`, `node_modules`, and Wrangler state are excluded from Git.
- The browser sends only submitted text to the Worker; the Worker forwards each temporal claim to Tavily.
- No application database or user-content persistence is implemented.
- API responses set `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- CORS fails closed for browser origins unless `ALLOWED_ORIGIN` is set to the exact allowed origin; wildcard reflection is not used.
- Search results and snippets are untrusted data. The UI renders them as text and source links; it does not execute retrieved content.
- Resource controls: 12,000 characters, five claims, five results per claim, sequential queries, and a 10-second Tavily request timeout.
- Native Cloudflare Rate Limiting binding is configured for 10 verification requests per 60 seconds per client IP, per Cloudflare edge location. It is approximate and can be exceeded during propagation; it is an abuse guard, not a strict global quota or billing meter.
- If the rate-limit binding errors, verification fails closed with HTTP 503. Requests over the configured threshold receive HTTP 429.
- Workers AI semantic triage is disabled unless `ENABLE_SEMANTIC_TRIAGE=true`; enable only after checking current Free daily quota and provider privacy terms.
- No authentication or durable global rate limiter is implemented. The native limiter reduces casual abuse but is not a substitute for authentication or strict global quotas.
- Before public deployment: verify provider data handling, free quotas, billing controls, exact CORS origin, secret configuration, and live Tavily integration. No public deployment is claimed.
