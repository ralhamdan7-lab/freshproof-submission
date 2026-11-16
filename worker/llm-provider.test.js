import test from "node:test";
import assert from "node:assert/strict";
import { createResilientAi, parseRetryDuration, trimGroqMessages } from "./llm-provider.js";
import { adjudicateEvidenceWithModel } from "./index.js";

const baseEnv = (overrides = {}) => ({
  GROQ_FALLBACK_ENABLED: "true",
  GROQ_API_KEY: "test-secret-never-log",
  GROQ_120B_RPM: "1000",
  GROQ_120B_TPM: "100000",
  GROQ_20B_RPM: "1000",
  GROQ_20B_TPM: "100000",
  GROQ_MODELS: "openai/gpt-oss-120b,openai/gpt-oss-20b",
  ...overrides
});
const messages = [
  { role: "system", content: "Return JSON only." },
  { role: "user", content: JSON.stringify({
    claim: "The service is currently active.",
    sources: [{ title: "Official notice", url: "https://who.int/news/item/123", snippet: "A".repeat(9000) }]
  }) }
];
const okResponse = (model = "openai/gpt-oss-120b") => new Response(JSON.stringify({
  choices: [{ message: { content: JSON.stringify({ assessments: [{ source_index: 0, relation: "SUPPORTS", rationale: "Direct match." }] }) } }]
}), { status: 200, headers: { "content-type": "application/json", "x-ratelimit-remaining-tokens": "4000" } });

test("semantic assessment retains Groq provider, model, fallback, and degraded provenance", async () => {
  const ai = {
    async run() {
      return {
        response: JSON.stringify({ assessments: [{ source_index: 0, relation: "SUPPORTS", rationale: "The excerpt directly states the claimed status." }] }),
        _freshproof_provider: "groq",
        _freshproof_model: "openai/gpt-oss-20b",
        _freshproof_fallback_reason: "cf_daily_quota",
        _freshproof_degraded: true
      };
    }
  };
  const result = await adjudicateEvidenceWithModel("The service is currently active.", [{
    title: "Official service status",
    snippet: "The service is currently active and accepting requests.",
    published_date: "2026-11-13",
    event_date_candidate: null,
    url: "https://agency.gov/status"
  }], ai);
  assert.equal(result.status, "COMPLETED_ADVISORY");
  assert.equal(result.provider, "groq");
  assert.equal(result.model, "openai/gpt-oss-20b");
  assert.equal(result.fallback_reason, "cf_daily_quota");
  assert.equal(result.degraded, true);
});

test("parses Groq retry durations in seconds and compound units", () => {
  assert.equal(parseRetryDuration("2"), 2000);
  assert.equal(parseRetryDuration("2.5s"), 2500);
  assert.equal(parseRetryDuration("1m2.5s"), 62500);
  assert.equal(parseRetryDuration("250ms"), 250);
  assert.equal(parseRetryDuration(null), 0);
});

test("trims only evidence snippets and preserves titles and exact source URLs", () => {
  const bounded = trimGroqMessages(messages);
  const payload = JSON.parse(bounded[1].content);
  assert.equal(payload.sources[0].title, "Official notice");
  assert.equal(payload.sources[0].url, "https://who.int/news/item/123");
  assert.ok(payload.sources[0].snippet.length < 9000);
  assert.ok(bounded[1].content.length <= 6500);
});

test("keeps Cloudflare as primary and does not call Groq on success", async () => {
  let groqCalls = 0;
  const ai = createResilientAi({
    ...baseEnv(),
    AI: { async run() { return { response: '{"assessments":[]}' }; } }
  }, { fetchImpl: async () => { groqCalls++; return okResponse(); } });
  const result = await ai.run("@cf/test/model", { messages, max_tokens: 650, temperature: 0 });
  assert.equal(result._freshproof_provider, "cloudflare");
  assert.equal(result._freshproof_model, "@cf/test/model");
  assert.equal(groqCalls, 0);
});

test("falls back to GPT-OSS 120B only after a Cloudflare daily quota error", async () => {
  let cloudflareCalls = 0;
  let requestBody;
  const ai = createResilientAi({
    ...baseEnv(),
    AI: { async run() { cloudflareCalls++; throw new Error("AiError 4006: daily free allocation of 10,000 neurons exhausted"); } }
  }, {
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return okResponse();
    }
  });
  const result = await ai.run("@cf/test/model", { messages, max_tokens: 650, temperature: 0 });
  assert.equal(cloudflareCalls, 1);
  assert.equal(result._freshproof_provider, "groq");
  assert.equal(result._freshproof_model, "openai/gpt-oss-120b");
  assert.equal(result._freshproof_fallback_reason, "cf_daily_quota");
  assert.equal(requestBody.model, "openai/gpt-oss-120b");
  assert.equal(requestBody.max_completion_tokens, 650);
  assert.equal("max_tokens" in requestBody, false);
  assert.equal(requestBody.response_format.type, "json_schema");
  assert.equal(requestBody.response_format.json_schema.strict, true);
  assert.equal(requestBody.response_format.json_schema.name, "freshproof_semantic_evidence_assessment");
  assert.deepEqual(requestBody.response_format.json_schema.schema.required, ["claim_assessment", "correction_text", "source_assessments", "assessments", "component_assessments"]);
  assert.equal(requestBody.response_format.json_schema.schema.additionalProperties, false);
  assert.equal("temperature" in requestBody, false);
  assert.equal(requestBody.reasoning_effort, "low");
  assert.equal(requestBody.include_reasoning, false);
});

test("forced Groq mode forwards the Workers AI chat messages to the provider", async () => {
  let requestBody;
  const ai = createResilientAi({
    ...baseEnv(),
    LLM_PROVIDER_MODE: "groq",
    AI: { async run() { throw new Error("Cloudflare must not be called in forced Groq mode"); } }
  }, {
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return okResponse();
    }
  });
  const result = await ai.run("@cf/test/model", { messages, max_tokens: 650, temperature: 0 });
  assert.equal(result._freshproof_provider, "groq");
  assert.equal(requestBody.messages.length, 2);
  assert.deepEqual(requestBody.messages.map(message => message.role), ["system", "user"]);
  assert.match(requestBody.messages[1].content, /The service is currently active/);
});

test("Groq strict semantic schema requires every advisory field and disallows extra properties", async () => {
  let responseFormat;
  const ai = createResilientAi({
    ...baseEnv(),
    LLM_PROVIDER_MODE: "groq",
    AI: { async run() { throw new Error("Cloudflare must not be called in forced Groq mode"); } }
  }, {
    fetchImpl: async (_url, init) => {
      responseFormat = JSON.parse(init.body).response_format;
      return okResponse();
    }
  });
  await ai.run("@cf/test/model", { messages, max_tokens: 900, temperature: 0 });
  const schema = responseFormat.json_schema.schema;
  assert.equal(responseFormat.type, "json_schema");
  assert.equal(responseFormat.json_schema.strict, true);
  assert.deepEqual(schema.required, ["claim_assessment", "correction_text", "source_assessments", "assessments", "component_assessments"]);
  for (const objectSchema of [schema, schema.properties.claim_assessment, schema.properties.source_assessments.items, schema.properties.assessments.items, schema.properties.component_assessments.items]) {
    assert.equal(objectSchema.additionalProperties, false);
  }
  assert.deepEqual(schema.properties.assessments.items.required, ["source_index", "relation", "rationale"]);
});

test("skips a Groq model with a long 429 reset and cascades to the second model", async () => {
  const attempted = [];
  const ai = createResilientAi({
    ...baseEnv(),
    AI: { async run() { throw new Error("4006 daily free allocation"); } }
  }, {
    fetchImpl: async (_url, init) => {
      const model = JSON.parse(init.body).model;
      attempted.push(model);
      if (model === "openai/gpt-oss-120b") return new Response("rate limited", { status: 429, headers: { "retry-after": "120" } });
      return okResponse(model);
    }
  });
  const result = await ai.run("@cf/test/model", { messages, max_tokens: 650, temperature: 0 });
  assert.deepEqual(attempted, ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
  assert.equal(result._freshproof_model, "openai/gpt-oss-20b");
  assert.equal(result._freshproof_degraded, true);
});

test("surfaces only the bounded structured Groq error message for HTTP 400", async () => {
  const ai = createResilientAi({
    ...baseEnv(),
    AI: { async run() { throw new Error("4006 daily free allocation exhausted"); } }
  }, {
    fetchImpl: async () => new Response(JSON.stringify({
      error: { message: "Unsupported parameter: response_format" }
    }), { status: 400, headers: { "content-type": "application/json" } })
  });
  await assert.rejects(
    ai.run("@cf/test/model", { messages, max_tokens: 650, temperature: 0 }),
    (error) => error.code === "http_400"
      && /Unsupported provider parameter: response_format\./.test(error.message)
      && !error.message.includes("test-secret-never-log")
  );
});

test("caps Groq completion tokens and prevents provider errors from echoing claim content", async () => {
  let requestBody;
  const ai = createResilientAi({
    ...baseEnv(),
    LLM_PROVIDER_MODE: "groq",
    AI: { async run() { throw new Error("Cloudflare must not be called in forced Groq mode"); } }
  }, {
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return okResponse();
    }
  });
  await ai.run("@cf/test/model", { messages, max_tokens: 2000, temperature: 0 });
  assert.equal(requestBody.max_completion_tokens, 1400);

  const unsafe = createResilientAi({
    ...baseEnv(),
    AI: { async run() { throw new Error("4006 daily free allocation exhausted"); } }
  }, {
    fetchImpl: async () => new Response(JSON.stringify({
      error: { message: "Failed to validate JSON. failed_generation included private claim text: SECRET-CLAIM-DO-NOT-LOG" }
    }), { status: 400, headers: { "content-type": "application/json" } })
  });
  await assert.rejects(
    unsafe.run("@cf/test/model", { messages, max_tokens: 650, temperature: 0 }),
    error => error.code === "http_400"
      && error.message.includes("Provider rejected the generated JSON response.")
      && !error.message.includes("SECRET-CLAIM-DO-NOT-LOG")
  );
});

test("does not hide Groq credential or invalid-model errors behind a second model", async () => {
  const attempted = [];
  const ai = createResilientAi({
    ...baseEnv(),
    AI: { async run() { throw new Error("4006 daily free allocation"); } }
  }, {
    fetchImpl: async (_url, init) => {
      attempted.push(JSON.parse(init.body).model);
      return new Response('{"error":{"message":"invalid api key"}}', { status: 401 });
    }
  });
  await assert.rejects(
    ai.run("@cf/test/model", { messages, max_tokens: 650, temperature: 0 }),
    /HTTP 401/
  );
  assert.deepEqual(attempted, ["openai/gpt-oss-120b"]);
});

test("opens a request-scoped Cloudflare capacity breaker and avoids repeated CF calls", async () => {
  let cloudflareCalls = 0;
  let groqCalls = 0;
  const ai = createResilientAi({
    ...baseEnv(),
    AI: { async run() { cloudflareCalls++; throw new Error("3040 out of capacity"); } }
  }, {
    fetchImpl: async () => { groqCalls++; return okResponse(); },
    now: () => Date.now()
  });
  await ai.run("@cf/test/model", { messages, max_tokens: 650, temperature: 0 });
  await ai.run("@cf/test/model", { messages, max_tokens: 650, temperature: 0 });
  assert.equal(cloudflareCalls, 1);
  assert.equal(groqCalls, 2);
});

test("does not fall back for unrelated Cloudflare errors", async () => {
  let groqCalls = 0;
  const ai = createResilientAi({
    ...baseEnv(),
    AI: { async run() { throw new Error("Model not found or account not allowed"); } }
  }, { fetchImpl: async () => { groqCalls++; return okResponse(); } });
  await assert.rejects(ai.run("@cf/test/model", { messages }), /Model not found/);
  assert.equal(groqCalls, 0);
});

test("preserves the original Cloudflare quota failure when Groq is not configured", async () => {
  const original = new Error("4006 daily free allocation exhausted");
  const ai = createResilientAi({
    AI: { async run() { throw original; } }
  }, { fetchImpl: async () => { throw new Error("must not be called"); } });
  await assert.rejects(ai.run("@cf/test/model", { messages }), (error) => error === original);
});

test("does not use Groq unless its explicit feature flag is enabled", async () => {
  let groqCalls = 0;
  const ai = createResilientAi({
    ...baseEnv({ GROQ_FALLBACK_ENABLED: "false" }),
    AI: { async run() { throw new Error("4006 daily free allocation exhausted"); } }
  }, { fetchImpl: async () => { groqCalls++; return okResponse(); } });
  await assert.rejects(ai.run("@cf/test/model", { messages }), /4006/);
  assert.equal(groqCalls, 0);
});

test("v0.2.97 fast path: Groq first when budget is free, Workers AI without waiting when it is not", async () => {
  let cloudflareCalls = 0;
  let groqCalls = 0;
  let slept = 0;
  const env = { ...baseEnv(), SEMANTIC_PRIMARY: "groq", GROQ_MODELS: "openai/gpt-oss-120b-fastpath", GROQ_120B_TPM: "6000", AI: { async run() { cloudflareCalls++; return { response: "{\"cf\":true}" }; } } };
  const ai = createResilientAi(env, {
    fetchImpl: async () => { groqCalls++; return okResponse(); },
    sleep: async ms => { slept += ms; }
  });
  const first = await ai.run("@cf/test/model", { messages, max_tokens: 650 });
  assert.equal(first._freshproof_provider, "groq");
  assert.equal(first._freshproof_fallback_reason, "groq_fast_path");
  // A second large request in the same minute would have to wait: it goes to Workers AI immediately.
  const big = [{ role: "system", content: "x".repeat(12000) }, { role: "user", content: JSON.stringify({ claim: "c", sources: [] }) }];
  const second = await ai.run("@cf/test/model", { messages: big, max_tokens: 650 });
  assert.equal(cloudflareCalls, 1);
  assert.equal(second._freshproof_provider || "cloudflare", "cloudflare");
  assert.equal(slept, 0, "the fast path never waits");
  // Light tasks are unaffected by the fast path.
  await ai.run("@cf/test/model", { messages, max_tokens: 200, _freshproof_tier: "light" });
  assert.equal(cloudflareCalls, 2);
});
