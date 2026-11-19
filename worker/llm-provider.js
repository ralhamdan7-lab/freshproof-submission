// Optional, quota-aware semantic-provider fallback for FreshProof.
// Cloudflare Workers AI remains primary. Groq is used only after explicit
// Cloudflare quota/capacity failures and only when the owner enables it.
const DEFAULT_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_EVIDENCE_CHARS = 6500; // v0.2.92: keeps about 900 characters of evidence per source within an 8K-token minute budget
const DEFAULT_OUTPUT_TOKENS = 1400;
const GROQ_SEMANTIC_RESPONSE_FORMAT = Object.freeze({
  type: "json_schema",
  json_schema: {
    name: "freshproof_semantic_evidence_assessment",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["claim_assessment", "source_assessments", "assessments", "component_assessments"],
      properties: {
        claim_assessment: {
          type: "object",
          additionalProperties: false,
          required: ["claim_type", "claim_risk", "temporal_claim_kind"],
          properties: {
            claim_type: { type: "string", enum: ["INSTITUTIONAL_RECORD", "HISTORICAL_EVENT", "ATTRIBUTED_RESEARCH_RESULT", "CURRENT_STATE", "SCIENTIFIC_CONSENSUS", "CONTESTED", "COMPOUND", "OTHER"] },
            claim_risk: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            temporal_claim_kind: { type: "string", enum: ["CURRENT_STATE", "LIFECYCLE", "PRICE_POLICY", "REGULATORY_STATE", "SCHEDULED_EVENT", "HISTORICAL_EVENT", "STABLE", "UNKNOWN"] }
          }
        },
        source_assessments: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            // v0.2.90: temporal fields are part of the strict schema; without them
            // Groq-served assessments could never carry change notices or
            // current-state records, silently disabling those adjudication rules.
            required: ["source_index", "directness", "scope_match", "authority_role", "temporal_role", "change_type", "event_date_mention_index", "change_statement_quote", "old_state_quote", "new_state_quote"],
            properties: {
              source_index: { type: "integer" },
              directness: { type: "string", enum: ["DIRECT", "INDIRECT", "UNCLEAR"] },
              scope_match: { type: "string", enum: ["EXACT", "PARTIAL", "NO_MATCH"] },
              authority_role: { type: "string", enum: ["ORIGINATING_AUTHORITY", "PRIMARY_RESEARCH", "SECONDARY", "UNKNOWN"] },
              temporal_role: { type: "string", enum: ["CHANGE_NOTICE", "CURRENT_STATE_RECORD", "HISTORICAL_RECORD", "EVENT_REPORT", "BACKGROUND", "UNKNOWN"] },
              change_type: { type: "string", enum: ["REPLACED", "ENDED", "INTRODUCED", "RENAMED", "REVISED", "REVOKED", "EXPIRED", "SUSPENDED", "DISCONTINUED", "POSTPONED", "RESCHEDULED", "CANCELLED", "WITHDRAWN", "NONE", "UNKNOWN"] },
              event_date_mention_index: { type: ["integer", "null"] },
              change_statement_quote: { type: ["string", "null"] },
              old_state_quote: { type: ["string", "null"] },
              new_state_quote: { type: ["string", "null"] }
            }
          }
        },
        assessments: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["source_index", "relation", "rationale"],
            properties: {
              source_index: { type: "integer" },
              relation: { type: "string", enum: ["SUPPORTS", "CONTRADICTS", "MIXED", "IRRELEVANT", "INSUFFICIENT"] },
              rationale: { type: "string" }
            }
          }
        },
        component_assessments: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["component_id", "source_index", "relation"],
            properties: {
              component_id: { type: "integer" },
              source_index: { type: "integer" },
              relation: { type: "string", enum: ["SUPPORTS", "CONTRADICTS", "MIXED", "IRRELEVANT", "INSUFFICIENT"] }
            }
          }
        }
      }
    }
  }
});
const sleepDefault = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class LlmProviderError extends Error {
  constructor(provider, code, message, retryAfterMs = 0) {
    super(message);
    this.name = "LlmProviderError";
    this.provider = provider;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export function parseRetryDuration(value) {
  if (!value) return 0;
  const raw = String(value).trim();
  if (/^\d+(?:\.\d+)?$/.test(raw)) return Number(raw) * 1000;
  let total = 0;
  for (const [, amount, unit] of raw.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    const n = Number(amount);
    total += unit === "h" ? n * 3600000 : unit === "m" ? n * 60000 : unit === "s" ? n * 1000 : n;
  }
  return total;
}

export function trimGroqMessages(messages, maxChars = MAX_EVIDENCE_CHARS) {
  if (!Array.isArray(messages)) return messages;
  return messages.map((message) => {
    if (message?.role !== "user" || typeof message.content !== "string") return message;
    let payload;
    try { payload = JSON.parse(message.content); } catch { return message; }
    if (!Array.isArray(payload.sources)) return message;
    const sources = payload.sources;
    const fixedChars = JSON.stringify({ ...payload, sources: sources.map(({ snippet, ...rest }) => ({ ...rest, snippet: "" })) }).length;
    const snippetBudget = Math.max(0, maxChars - fixedChars);
    const perSource = Math.floor(snippetBudget / Math.max(1, sources.length));
    payload.sources = sources.map((source) => ({
      ...source,
      // Preserve source title and exact URL; only the excerpt is shortened.
      snippet: String(source.snippet || "").slice(0, perSource)
    }));
    return { ...message, content: JSON.stringify(payload) };
  });
}

function cloudflareFailure(error) {
  const message = [
    error?.message, error?.cause?.message, error?.code, error?.cause?.code,
    error?.errors?.[0]?.message, error?.errors?.[0]?.code, String(error || "")
  ].filter(Boolean).join(" ");
  if (/\b(4006|3036)\b|daily free allocation|neurons.*used up/i.test(message)) return "CF_DAILY_QUOTA";
  if (/\b3040\b|out of capacity|capacity temporarily exceeded/i.test(message)) return "CF_CAPACITY";
  if (/\bCF_TIMEOUT\b|Workers AI response timed out/i.test(message)) return "CF_TIMEOUT";
  return null;
}

function nextUtcMidnight(now) {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

function safeGroqErrorDetail(rawMessage) {
  const value = String(rawMessage || "").slice(0, 1200);
  if (/failed to validate json|failed_generation|invalid json/i.test(value)) return "Provider rejected the generated JSON response";
  if (/max_completion_tokens reached|output was truncated|missing required/i.test(value)) return "Provider output token limit reached before the required schema was complete";
  const unsupported = value.match(/unsupported parameter:\s*([a-z][a-z0-9_]*)/i);
  if (unsupported) {
    const parameter = unsupported[1].toLowerCase();
    if (["temperature", "response_format", "max_tokens", "max_completion_tokens", "messages", "model", "reasoning_effort", "include_reasoning"].includes(parameter)) {
      return "Unsupported provider parameter: " + parameter;
    }
    return "Provider rejected an unsupported request parameter";
  }
  if (/rate.?limit|too many requests/i.test(value)) return "Provider rate limit reached";
  if (/context length|maximum context/i.test(value)) return "Provider context limit exceeded";
  if (/invalid api key|authentication|unauthorized/i.test(value)) return "Provider authentication rejected";
  if (/model.*(?:not found|does not exist|unavailable)/i.test(value)) return "Configured provider model unavailable";
  return "";
}

function extractRetryAfter(response) {
  const direct = parseRetryDuration(response.headers.get("retry-after"));
  if (direct) return direct;
  return Math.max(
    parseRetryDuration(response.headers.get("x-ratelimit-reset-requests")),
    parseRetryDuration(response.headers.get("x-ratelimit-reset-tokens"))
  );
}

function estimateTokens(messages, maxOutput) {
  // Conservative for mixed English/Arabic; response headers refine the next request.
  // v0.2.91: Latin-script text averages well over three characters per token;
  // Arabic and other scripts are counted far more conservatively. The window
  // entry is replaced by the provider's reported usage after each response.
  let latin = 0;
  let other = 0;
  for (const item of messages) {
    for (const ch of String(item.content || "")) {
      if (ch.charCodeAt(0) < 0x0250) latin++; else other++;
    }
  }
  return Math.ceil(latin / 3.2 + other / 1.5) + maxOutput;
}

// Isolate-local pacing is a guard, not a globally atomic quota ledger.
// Exact per-account Groq limits must be configured from the owner's Limits page;
// response headers remain authoritative.
const throttleStates = new Map();
let serialQueue = Promise.resolve();

function serialize(task) {
  const next = serialQueue.then(task, task);
  serialQueue = next.catch(() => undefined);
  return next;
}

function waitForSlot(model, estimate, rpm, tpm, now, sleep, noWait = false) {
  return (async () => {
    let state = throttleStates.get(model);
    if (!state) {
      state = { nextAt: 0, pauseUntil: 0, window: [] };
      throttleStates.set(model, state);
    }
    for (;;) {
      const current = now();
      state.window = state.window.filter((entry) => current - entry.at < 60000);
      const used = state.window.reduce((sum, entry) => sum + entry.tokens, 0);
      if (estimate > tpm) throw new LlmProviderError("groq", "request_exceeds_tpm", "Groq request estimate exceeds the configured per-minute token budget.");
      const rpmWait = Math.max(0, state.nextAt - current);
      const headerWait = Math.max(0, state.pauseUntil - current);
      const tokenWait = used + estimate > tpm && state.window.length
        ? Math.max(0, state.window[0].at + 60000 - current) : 0;
      const delay = Math.max(rpmWait, headerWait, tokenWait);
      if (delay <= 0) {
        state.nextAt = current + 60000 / rpm;
        const entry = { at: current, tokens: estimate };
        state.window.push(entry);
        return entry;
      }
      if (noWait) throw new LlmProviderError("groq", "slot_busy", "The Groq per-minute budget is in use; another provider is tried instead of waiting.");
      await sleep(delay + Math.min(250, Math.floor(Math.random() * 250)));
    }
  })();
}

async function groqRequest({ env, model, messages, input, fetchImpl, now, sleep, rpm, tpm }) {
  const maxOutput = Math.min(Number(input.max_tokens || DEFAULT_OUTPUT_TOKENS), DEFAULT_OUTPUT_TOKENS);
  const boundedMessages = trimGroqMessages(messages);
  const estimate = estimateTokens(boundedMessages, maxOutput);
  const headersFor = () => ({
    Authorization: `Bearer ${env.GROQ_API_KEY}`,
    "Content-Type": "application/json"
  });
  // v0.2.90: tasks other than semantic assessment (claim decomposition, search
  // planning) pass their own strict schema. GPT-OSS models support strict
  // json_schema and reasoning controls; other models get JSON mode only.
  const gptOss = /^openai\/gpt-oss/.test(model);
  const responseFormat = input.response_format || GROQ_SEMANTIC_RESPONSE_FORMAT;
  const body = gptOss
    ? {
      model,
      messages: boundedMessages,
      max_completion_tokens: maxOutput,
      reasoning_effort: "low",
      include_reasoning: false,
      response_format: responseFormat
      // GPT-OSS on Groq uses model-managed reasoning defaults. Do not forward
      // Workers AI's temperature=0: GPT-OSS rejects unsupported sampling values.
    }
    : {
      model,
      messages: boundedMessages,
      max_completion_tokens: maxOutput,
      temperature: 0,
      response_format: { type: "json_object" },
      ...(/qwen/i.test(model) ? { reasoning_format: "hidden" } : {})
    };

  const slot = await waitForSlot(model, estimate, rpm, tpm, now, sleep, Boolean(input._freshproof_no_wait));
  const response = await fetchImpl(API_URL, {
    method: "POST",
    headers: headersFor(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });

  const remaining = Number(response.headers.get("x-ratelimit-remaining-tokens"));
  if (Number.isFinite(remaining) && response.headers.has("x-ratelimit-reset-tokens") && remaining < estimate) {
    const resetMs = parseRetryDuration(response.headers.get("x-ratelimit-reset-tokens"));
    const state = throttleStates.get(model);
    if (state && resetMs > 0) state.pauseUntil = Math.max(state.pauseUntil || 0, now() + resetMs);
  }

  if (response.status === 429) {
    const retryAfterMs = extractRetryAfter(response);
    throw new LlmProviderError("groq", "rate_limited", `Groq model ${model} returned HTTP 429.`, retryAfterMs);
  }
  if (response.status >= 500) {
    const retryAfterMs = extractRetryAfter(response);
    throw new LlmProviderError("groq", "upstream_unavailable", `Groq model ${model} returned HTTP ${response.status}.`, retryAfterMs);
  }
  if (!response.ok) {
    // Read only the provider's structured error message. Never log the raw
    // body, request, authorization header, or evidence payload.
    let detail = "";
    try {
      const errorBody = await response.json();
      detail = safeGroqErrorDetail(errorBody?.error?.message || errorBody?.message || "");
    } catch {
      detail = "";
    }
    const safeDetail = detail ? `: ${detail}` : "";
    // Do not hide bad credentials, invalid model IDs, or malformed requests
    // by silently switching models.
    throw new LlmProviderError("groq", `http_${response.status}`, `Groq request rejected with HTTP ${response.status}${safeDetail}.`);
  }

  const data = await response.json();
  const usedTokens = Number(data?.usage?.total_tokens);
  if (slot && Number.isFinite(usedTokens) && usedTokens > 0) slot.tokens = usedTokens;
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new LlmProviderError("groq", "empty_response", "Groq returned an empty or non-text completion.");
  }
  return {
    response: text,
    _freshproof_provider: "groq",
    _freshproof_model: model
  };
}

export function createResilientAi(env, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  const now = dependencies.now || Date.now;
  const sleep = dependencies.sleep || sleepDefault;
  const models = String(env.GROQ_MODELS || DEFAULT_MODELS.join(",")).split(",").map((item) => item.trim()).filter(Boolean);
  const blockedModels = new Map();
  let cloudflareBlockedUntil = 0;
  let cloudflareFallbackReason = null;

  async function groqCascade(modelInput, input, reason, cloudflareError = null) {
    if (env.GROQ_FALLBACK_ENABLED !== "true" || !env.GROQ_API_KEY) {
      if (cloudflareError) throw cloudflareError;
      throw new LlmProviderError("groq", "fallback_not_configured", "The optional Groq fallback is not configured.");
    }
    let lastError = null;
    // Light tasks (decomposition, search planning) try the smaller models first
    // so the largest model's daily token budget is kept for evidence assessment.
    // v0.2.91: light tasks prefer the smallest model, keeping the stronger
    // models' per-minute token budgets free for evidence assessment.
    const lightRank = model => /20b/i.test(model) && !/120b/i.test(model) ? 0 : /120b/i.test(model) ? 2 : 1;
    const ordered = input._freshproof_tier === "light"
      ? [...models].sort((a, b) => lightRank(a) - lightRank(b))
      : models;
    // Fast path models: GROQ_FAST_MODELS, else the first configured model
    // (the one that follows the evidence contract best in live diagnostics).
    const fastModels = String(env.GROQ_FAST_MODELS || models[0] || "").split(",").map(item => item.trim()).filter(Boolean);
    for (const [index, model] of ordered.entries()) {
      if ((blockedModels.get(model) || 0) > now()) continue;
      // The fast path uses only the strongest model; the others stay paced
      // fallbacks where waiting is acceptable.
      if (input._freshproof_no_wait && !input._freshproof_any_model && !fastModels.includes(model)) continue;
      if (input._freshproof_fast_only && !fastModels.includes(model)) continue;
      const suffix = model.includes("120b") ? "120B" : model.includes("20b") ? "20B" : /qwen/i.test(model) ? "QWEN" : "";
      const rpm = Number((suffix && env[`GROQ_${suffix}_RPM`]) || env.GROQ_RPM);
      const tpm = Number((suffix && env[`GROQ_${suffix}_TPM`]) || env.GROQ_TPM);
      if (!Number.isFinite(rpm) || rpm <= 0 || !Number.isFinite(tpm) || tpm <= 0) {
        throw new LlmProviderError("groq", "limits_not_configured", `Set account-verified RPM/TPM values for ${model} before enabling Groq fallback.`);
      }
      try {
        const result = await serialize(() => groqRequest({
          env, model, messages: input.messages || [], input, fetchImpl, now, sleep, rpm, tpm
        }));
        return {
          ...result,
          _freshproof_fallback_reason: reason,
          _freshproof_degraded: index > 0
        };
      } catch (error) {
        lastError = error;
        if (!(error instanceof LlmProviderError)) throw error;
        if (error.code === "slot_busy") continue;
        if (error.code === "rate_limited") {
          const wait = error.retryAfterMs || 0;
          // Wait once only for a short reset. Longer resets skip this model;
          // the second model has an independent model-specific quota.
          if (wait > 0 && wait <= 5000) {
            await sleep(wait);
            try {
              const result = await serialize(() => groqRequest({
                env, model, messages: input.messages || [], input, fetchImpl, now, sleep, rpm, tpm
              }));
              return { ...result, _freshproof_fallback_reason: reason, _freshproof_degraded: index > 0 };
            } catch (retryError) {
              lastError = retryError;
              if (!(retryError instanceof LlmProviderError) || retryError.code !== "rate_limited") throw retryError;
            }
          }
          blockedModels.set(model, now() + Math.max(wait, 60000));
          continue;
        }
        if (error.code === "upstream_unavailable") {
          if (index < ordered.length - 1) continue;
        }
        // A model that rejects the request shape (unsupported parameter or
        // schema) is skipped for this isolate; credentials errors still surface.
        if (/^http_4\d\d$/.test(error.code) && error.code !== "http_401" && error.code !== "http_403" && index < ordered.length - 1) {
          blockedModels.set(model, now() + 10 * 60000);
          continue;
        }
        throw error;
      }
    }
    throw lastError || new LlmProviderError("groq", "models_exhausted", "All configured Groq models are currently rate-limited.");
  }

  return {
    async run(model, input = {}) {
      // v0.3.13: evidence assessment runs only on the strong (fast) Groq
      // models or Workers AI. The smallest model misread relations in live
      // diagnostics (debunking pages and "emergency ended" read as support),
      // so it is kept for light tasks and the quote-checked correction review.
      // Decomposition output is checked deterministically (verbatim spans, no
      // new numbers, named subjects), so it may fall back to any Groq model.
      const assessmentInput = value => value._freshproof_tier === "light" || /^(?:correction|decomposition)/.test(String(value._freshproof_task || ""))
        ? value : { ...value, _freshproof_fast_only: true };
      const forcedGroq = env.LLM_PROVIDER_MODE === "groq";
      if (forcedGroq) return groqCascade(model, input, "forced_groq");
      // Task-routing hints are for the Groq fallback only; Workers AI receives
      // the plain chat input.
      const { _freshproof_tier: _tier, _freshproof_task: _task, response_format: _format, ...cloudflareInput } = input;
      if (env.LLM_PROVIDER_MODE === "cloudflare") return env.AI.run(model, cloudflareInput);

      if (cloudflareBlockedUntil > now()) {
        return groqCascade(model, assessmentInput(input), cloudflareFallbackReason || "cloudflare_breaker_open");
      }
      // Opt-in (LIGHT_TASKS_PREFER_GROQ=true): light tasks go to the smallest
      // Groq model first. Off by default since v0.2.93: Groq calls are paced and
      // serialized per isolate, so a rate-limited light call could delay the
      // evidence assessment queued behind it.
      // v0.2.97 fast path (SEMANTIC_PRIMARY=groq): evidence assessment tries
      // Groq first, but only when a model has per-minute budget free right
      // now; it never waits. Otherwise Workers AI runs as before, and a paced
      // Groq call remains the fallback if Workers AI is unavailable.
      if (input._freshproof_tier !== "light" && env.SEMANTIC_PRIMARY === "groq" && env.GROQ_FALLBACK_ENABLED === "true" && env.GROQ_API_KEY) {
        try { return await groqCascade(model, { ...input, _freshproof_no_wait: true }, "groq_fast_path"); } catch {}
        // v0.3.1: correction review follows its output contract more reliably
        // on the Groq models, so any of them with free budget is tried first.
        // v0.3.9: a correction retry waits for a fast model's slot instead
        // of falling to a weaker model.
        if (input._freshproof_task === "correction_retry") {
          try { return await groqCascade(model, { ...input, _freshproof_fast_only: true }, "groq_correction_retry"); } catch {}
        }
        if (input._freshproof_task === "correction") {
          try { return await groqCascade(model, { ...input, _freshproof_no_wait: true, _freshproof_any_model: true }, "groq_correction_path"); } catch {}
        }
      }
      if (input._freshproof_tier === "light" && env.GROQ_FALLBACK_ENABLED === "true" && env.GROQ_API_KEY && env.LIGHT_TASKS_PREFER_GROQ === "true") {
        try { return await groqCascade(model, input, "light_task_routing"); } catch {}
      }
      // v0.3.7: with the Groq fast path on, light tasks (decomposition, search
      // planning) also try any Groq model that has budget free right now,
      // smallest first, without waiting. A slow Workers AI response then no
      // longer makes the search plan time out.
      if (input._freshproof_tier === "light" && env.SEMANTIC_PRIMARY === "groq" && env.GROQ_FALLBACK_ENABLED === "true" && env.GROQ_API_KEY) {
        try { return await groqCascade(model, { ...input, _freshproof_no_wait: true, _freshproof_any_model: true }, "groq_light_fast_path"); } catch {}
      }
      try {
        // v0.3.7: Workers AI is given a bounded time. A slow response is
        // treated like a capacity failure: the breaker opens for a minute and
        // the paced Groq cascade answers instead.
        // v0.3.14: decomposition gets a shorter Workers AI bound, so a Groq
        // fallback still fits inside its own time limit.
        const timeoutMs = Math.max(5000, Number(env.CF_AI_TIMEOUT_MS) || (input._freshproof_tier === "light" || input._freshproof_task === "decomposition" ? 15000 : 30000));
        let timer;
        const result = await Promise.race([
          Promise.resolve(env.AI.run(model, cloudflareInput)).finally(() => clearTimeout(timer)),
          new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("Workers AI response timed out"), { code: "CF_TIMEOUT" })), timeoutMs); })
        ]);
        if (result && typeof result === "object") {
          return { ...result, _freshproof_provider: "cloudflare", _freshproof_model: model };
        }
        return { response: String(result ?? ""), _freshproof_provider: "cloudflare", _freshproof_model: model };
      } catch (error) {
        const reason = cloudflareFailure(error);
        if (!reason) throw error;
        cloudflareFallbackReason = reason.toLowerCase();
        cloudflareBlockedUntil = reason === "CF_DAILY_QUOTA" ? nextUtcMidnight(now()) : now() + 60000;
        return groqCascade(model, assessmentInput(input), reason.toLowerCase(), error);
      }
    }
  };
}
