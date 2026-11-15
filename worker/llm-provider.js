// Optional, quota-aware semantic-provider fallback for FreshProof.
// Cloudflare Workers AI remains primary. Groq is used only after explicit
// Cloudflare quota/capacity failures and only when the owner enables it.
const DEFAULT_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_EVIDENCE_CHARS = 4500;
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
          required: ["claim_type", "claim_risk"],
          properties: {
            claim_type: { type: "string", enum: ["INSTITUTIONAL_RECORD", "HISTORICAL_EVENT", "ATTRIBUTED_RESEARCH_RESULT", "CURRENT_STATE", "SCIENTIFIC_CONSENSUS", "CONTESTED", "COMPOUND", "OTHER"] },
            claim_risk: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] }
          }
        },
        source_assessments: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["source_index", "directness", "scope_match", "authority_role"],
            properties: {
              source_index: { type: "integer" },
              directness: { type: "string", enum: ["DIRECT", "INDIRECT", "UNCLEAR"] },
              scope_match: { type: "string", enum: ["EXACT", "PARTIAL", "NO_MATCH"] },
              authority_role: { type: "string", enum: ["ORIGINATING_AUTHORITY", "PRIMARY_RESEARCH", "SECONDARY", "UNKNOWN"] }
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
  const chars = messages.reduce((total, item) => total + String(item.content || "").length, 0);
  return Math.ceil(chars / 2) + maxOutput;
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

function waitForSlot(model, estimate, rpm, tpm, now, sleep) {
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
        state.window.push({ at: current, tokens: estimate });
        return;
      }
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
  const body = {
    model,
    messages: boundedMessages,
    max_completion_tokens: maxOutput,
    reasoning_effort: "low",
    include_reasoning: false,
    response_format: GROQ_SEMANTIC_RESPONSE_FORMAT
    // GPT-OSS on Groq uses model-managed reasoning defaults. Do not forward
    // Workers AI's temperature=0: GPT-OSS rejects unsupported sampling values.
  };

  await waitForSlot(model, estimate, rpm, tpm, now, sleep);
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
    for (const [index, model] of models.entries()) {
      if ((blockedModels.get(model) || 0) > now()) continue;
      const suffix = model.includes("120b") ? "120B" : model.includes("20b") ? "20B" : "";
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
          if (index < models.length - 1) continue;
        }
        throw error;
      }
    }
    throw lastError || new LlmProviderError("groq", "models_exhausted", "All configured Groq models are currently rate-limited.");
  }

  return {
    async run(model, input = {}) {
      const forcedGroq = env.LLM_PROVIDER_MODE === "groq";
      if (forcedGroq) return groqCascade(model, input, "forced_groq");
      if (env.LLM_PROVIDER_MODE === "cloudflare") return env.AI.run(model, input);

      if (cloudflareBlockedUntil > now()) {
        return groqCascade(model, input, cloudflareFallbackReason || "cloudflare_breaker_open");
      }
      try {
        const result = await env.AI.run(model, input);
        if (result && typeof result === "object") {
          return { ...result, _freshproof_provider: "cloudflare", _freshproof_model: model };
        }
        return { response: String(result ?? ""), _freshproof_provider: "cloudflare", _freshproof_model: model };
      } catch (error) {
        const reason = cloudflareFailure(error);
        if (!reason) throw error;
        cloudflareFallbackReason = reason.toLowerCase();
        cloudflareBlockedUntil = reason === "CF_DAILY_QUOTA" ? nextUtcMidnight(now()) : now() + 60000;
        return groqCascade(model, input, reason.toLowerCase(), error);
      }
    }
  };
}
