# Security and Privacy Notes

- Tavily key is accessed only from Worker environment secrets.
- `.dev.vars`, `.env`, `node_modules`, and Wrangler state are excluded from Git.
- The browser sends only submitted text to the Worker; the Worker forwards each temporal claim to Tavily.
- No application database or user-content persistence is implemented.
- API responses set `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- CORS fails closed for browser origins unless `ALLOWED_ORIGIN` is set to the exact allowed origin; wildcard reflection is not used. CORS is not authentication and does not block non-browser clients.
- Search results and snippets are untrusted data. The UI renders them as text and source links; it does not execute retrieved content.
- Resource controls: 12,000 characters, five claims, five results per claim, sequential queries, and a 10-second Tavily request timeout.
- Native Cloudflare Rate Limiting binding `API_RATE_LIMITER` is configured for 10 verification requests per 60 seconds per client IP, per Cloudflare edge location. It is approximate and can be exceeded during propagation; it is an abuse guard, not a strict global quota or billing meter.
- If the rate-limit binding errors, verification fails closed with HTTP 503. Requests over the configured threshold receive HTTP 429.
- Workers AI semantic triage is enabled in the public deployment configuration and is advisory; it cannot independently establish a claim or override evidence adjudication. Monitor the free allocation and do not enable paid overages.
- Model-assisted correction candidate review is disabled in the public configuration to reduce optional inference use. Deterministic, validated domain-adapter corrections remain separate.
- No authentication or durable global rate limiter is implemented. The native limiter reduces casual abuse but is not a substitute for authentication or strict global quotas.
- Before any configuration change or redeployment: verify provider data handling, free quotas, billing controls, exact CORS origin, secret configuration, and live Tavily integration. The public demo health endpoint has been checked, but the public `POST /api/verify` evidence-search path has not yet passed a live end-to-end test.
