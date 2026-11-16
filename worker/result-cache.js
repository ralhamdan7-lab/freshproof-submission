// FreshProof v0.2.91 — short-lived per-claim result cache.
//
// Free-tier model and search quotas are the binding constraint on how many
// claims the engine can assess per day. Re-checking the same claim within a
// few hours repeats identical retrieval and model calls, so completed results
// are kept in the Workers Cache API (per data centre, no billing) and served
// with an explicit cache marker and their original assessment time.
//
// Only fully assessed results are cached: NOT_ASSESSED results (provider
// limits, failures) are never stored, so a later request retries the claim.
// Claims about the present use a shorter lifetime than stable facts.
const CACHE_HOST = "https://freshproof-result-cache.invalid";
const SHORT_TTL_SECONDS = 3 * 3600;
const LONG_TTL_SECONDS = 24 * 3600;
const SHORT_FRAMES = new Set(["CURRENT_STATE", "SCHEDULED_FUTURE", "MIXED_OR_AMBIGUOUS", "UNRESOLVED"]);

export function normalizeClaimKey(text) {
  return String(text || "").normalize("NFKC").toLowerCase().replace(/[ً-ْـ]/g, "").replace(/\s+/g, " ").replace(/[.!?؟。]+$/u, "").trim();
}

async function keyFor(version, text) {
  const bytes = new TextEncoder().encode(version + "\u0000" + normalizeClaimKey(text));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `${CACHE_HOST}/claim/${encodeURIComponent(version)}/${hex}`;
}

export function cacheableResult(claimResult) {
  if (!claimResult || claimResult.status === "NOT_ASSESSED") return false;
  // A claim whose meaning was resolved from surrounding text (for example a
  // pronoun) depends on that context and is not cached by its wording alone.
  const resolution = claimResult.resolved_context?.resolution;
  if (resolution && resolution !== "UNRESOLVED_OR_NOT_NEEDED") return false;
  return ["COMPLETED", "PARTIAL"].includes(claimResult.execution?.status);
}

export function ttlFor(claimResult) {
  return SHORT_FRAMES.has(claimResult?.claim_frame?.frame) ? SHORT_TTL_SECONDS : LONG_TTL_SECONDS;
}

export function createResultCache(env, cacheImpl = globalThis.caches?.default) {
  const enabled = env?.ENABLE_RESULT_CACHE !== "false" && cacheImpl && typeof cacheImpl.match === "function";
  return {
    enabled: Boolean(enabled),
    async get(version, text) {
      if (!enabled) return null;
      try {
        const hit = await cacheImpl.match(await keyFor(version, text));
        if (!hit) return null;
        const stored = await hit.json();
        if (!stored?.result || stored.version !== version) return null;
        return { ...stored.result, result_cache: { status: "HIT", assessed_at: stored.assessed_at, ttl_seconds: stored.ttl_seconds, note: "Served from a short-lived cache of an identical claim assessed earlier; evidence and verdict are as of assessed_at." } };
      } catch { return null; }
    },
    async put(version, text, claimResult) {
      if (!enabled || !cacheableResult(claimResult)) return false;
      try {
        const ttl = ttlFor(claimResult);
        const body = JSON.stringify({ version, assessed_at: new Date().toISOString(), ttl_seconds: ttl, result: claimResult });
        await cacheImpl.put(await keyFor(version, text), new Response(body, { headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttl}` } }));
        return true;
      } catch { return false; }
    }
  };
}
