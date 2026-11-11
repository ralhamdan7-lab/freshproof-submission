# Security and privacy

- Keep the Tavily API key in Worker secrets; never place it in browser code, source control, screenshots, or logs.
- Local `.dev.vars` and `.env` files are ignored by Git. Use `.dev.vars.example` only as a template.
- Submitted answer text is processed in memory for the request; this prototype does not implement an application database or durable user-content storage.
- Responses use no-store caching directives and browser-origin checks are exact-match and fail closed when not configured.
- Retrieved pages, snippets, and search results are untrusted data. Render them as text; never interpret them as instructions or executable content.
- Requests are bounded by input length, claim count, result count, upstream query count, timeouts, and direct-fetch limits.
- The optional model-assisted evidence triage and correction review are disabled by default. Enable only after independently verifying provider privacy terms, account eligibility, free quota, and billing controls.
- The included local Wrangler configuration is a development template, not a production deployment profile. Configure rate limiting, secrets, allowed origins, and provider limits before deploying.
- This repository is a hackathon prototype, not a security certification or production-readiness claim.
