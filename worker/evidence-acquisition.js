// FreshProof v0.2.82 — generic evidence acquisition.
//
// Topic-agnostic, bounded retrieval helpers used by the core pipeline for every
// claim. Nothing here encodes a topic, entity list, benchmark claim, or verdict.
//
//  1. Source authority: structural government/intergovernmental/academic
//     patterns (any country), first-party entity domains derived from the claim
//     itself, and an explicit user-generated-content downgrade.
//  2. Claim-conditioned authority query built from the claim's own entities,
//     quantities and dates.
//  3. Direct page acquisition with SSRF and redirect guards, a byte cap,
//     HTML-only parsing, and explicit failure reasons.
//  4. Claim-relevant passage extraction with publication / update / retrieval
//     date separation and exact provenance.
//  5. Abstention diagnosis that separates retrieval failure, source quality,
//     semantic uncertainty and genuine evidence conflict.

import { declaredOrganization, assessPublisherIdentity, publisherNameMatchesDomainKey } from "./authority-resolver.js";
import { evidenceRecency } from "./evidence-dates.js";

export const ACQUISITION_LIMITS = Object.freeze({
  maxFetchesPerClaim: 3,
  maxRedirects: 3,
  maxBytes: 1_000_000,
  maxParseChars: 600_000,
  fetchTimeoutMs: 6000,
  maxPassageChars: 900,
  windowChars: 320,
  maxPassages: 3
});

export const PASSAGE_SEPARATOR = " … ";

const DAY = 86400000;
const UNSAFE_HOST = /^(?:localhost|.*\.localhost|.*\.local|.*\.localdomain|.*\.internal|.*\.intranet|.*\.lan|.*\.home\.arpa|.*\.test|.*\.invalid|.*\.example|.*\.onion|metadata\.google\.internal)$/i;
// v0.2.82: public wildcard-DNS services that resolve an IP embedded in the
// hostname (10.0.0.1.nip.io -> 10.0.0.1) and well-known loopback aliases.
// Workers cannot inspect DNS answers before connecting, so these are refused by
// name, and any hostname embedding a dotted/dashed IPv4 literal is refused too.
const WILDCARD_DNS_HOST = /(?:^|\.)(?:nip\.io|sslip\.io|xip\.io|traefik\.me|localtest\.me|lvh\.me|vcap\.me|lacolhost\.com|localhost\.run|fbi\.com)$/i;
const EMBEDDED_IPV4 = /(?:^|[.-])(?:\d{1,3}[.-]){3}\d{1,3}(?:[.-]|$)/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const NON_HTML_PATH = /\.(?:pdf|docx?|xlsx?|pptx?|zip|gz|rar|7z|csv|json|xml|rss|atom|mp3|mp4|mov|avi|png|jpe?g|gif|webp|svg|ico|exe|dmg|apk)(?:$|[?#])/i;

// ---------------------------------------------------------------------------
// URL safety and domain helpers
// ---------------------------------------------------------------------------
export function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

export function isSafeEvidenceUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { return { safe: false, reason: "INVALID_URL" }; }
  if (url.protocol !== "https:") return { safe: false, reason: "NON_HTTPS" };
  if (url.username || url.password) return { safe: false, reason: "CREDENTIALS_IN_URL" };
  if (url.port && url.port !== "443") return { safe: false, reason: "NON_STANDARD_PORT" };
  // Normalize a fully-qualified DNS name before applying suffix and IP
  // guards. A trailing root dot must not turn localhost., *.internal., or
  // wildcard-DNS aliases into apparently public hostnames.
  const host = url.hostname.toLowerCase().replace(/\.+$/, "");
  if (!host || !host.includes(".") || IPV4.test(host) || host.startsWith("[") || host.includes(":")) return { safe: false, reason: "IP_OR_SINGLE_LABEL_HOST" };
  if (UNSAFE_HOST.test(host)) return { safe: false, reason: "PRIVATE_OR_RESERVED_HOST" };
  if (WILDCARD_DNS_HOST.test(host) || EMBEDDED_IPV4.test(host)) return { safe: false, reason: "IP_EMBEDDING_OR_WILDCARD_DNS_HOST" };
  return { safe: true, url };
}

// Bounded multi-part public suffixes. Mirrors evidence-adjudication.js and adds
// common government/academic second levels so country publishers stay distinct.
export const MULTI_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "sch.uk", "nhs.uk", "police.uk",
  "com.au", "net.au", "org.au", "edu.au", "gov.au",
  "co.nz", "org.nz", "govt.nz", "ac.nz",
  "com.br", "gov.br", "com.cn", "gov.cn", "edu.cn", "com.sg", "gov.sg", "edu.sg", "com.hk", "gov.hk", "com.tw", "gov.tw",
  "co.jp", "ne.jp", "or.jp", "ac.jp", "go.jp", "gov.jp",
  "co.in", "net.in", "org.in", "gov.in", "ac.in", "edu.in", "nic.in",
  "com.mx", "gob.mx", "com.tr", "gov.tr", "edu.tr", "co.za", "org.za", "ac.za", "gov.za",
  "com.sa", "gov.sa", "edu.sa", "org.sa", "gov.ae", "ac.ae", "gov.eg", "edu.eg", "gov.qa", "edu.qa", "gov.kw", "gov.bh", "gov.om", "gov.jo",
  "gc.ca", "gouv.fr", "gob.es", "gov.it", "gv.at", "go.kr", "ac.kr", "go.id", "ac.id", "gov.my", "edu.my", "gov.ph", "gov.pk", "edu.pk",
  "gov.ng", "go.ke", "gov.gh", "gov.ar", "gob.ar", "gob.cl", "gov.co", "gob.pe", "gov.il", "ac.il", "gov.ie"
]);
// Generic second levels under any two-letter country code (gov.lk, ac.ke,
// com.ng ...) are public suffixes too; without this, every *.gov.<cc> host in
// an unlisted country collapsed into a single "registrable" domain.
const GENERIC_SECOND_LEVEL_UNDER_CC = /^(?:gov|gob|gouv|govt|go|gv|gub|guv|mil|ac|edu|co|com|org|net|or|ne|nic|sch|nhs|police)\.[a-z]{2}$/;
export function isMultiPartSuffix(lastTwo) {
  return MULTI_PART_SUFFIXES.has(lastTwo) || GENERIC_SECOND_LEVEL_UNDER_CC.test(lastTwo);
}
export function registrableDomainOf(url) {
  const host = hostOf(url);
  if (!host) return "";
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join(".");
  return isMultiPartSuffix(lastTwo) ? labels.slice(-3).join(".") : lastTwo;
}

// ---------------------------------------------------------------------------
// 1. Structural source authority (no topic or publisher allowlist)
// ---------------------------------------------------------------------------
// Government: *.gov, *.mil, *.int, and country second levels such as gov.xx,
// gob.xx, gouv.xx, go.xx, govt.xx, gv.xx, gc.ca, admin.ch, bund.de, europa.eu.
const GOVERNMENT_HOST = /(?:^|\.)(?:gov|mil|int)$|(?:^|\.)(?:gov|gob|gouv|govt|go|gv|gub|guv)\.[a-z]{2}$|(?:^|\.)(?:gc\.ca|admin\.ch|bund\.de|europa\.eu|government\.nl|overheid\.nl|regeringen\.se|valtioneuvosto\.fi|regjeringen\.no)$/i;
// Academic / research institutions: *.edu, edu.xx, ac.xx.
const ACADEMIC_HOST = /(?:^|\.)edu$|(?:^|\.)(?:edu|ac)\.[a-z]{2}$/i;
// User-generated or community content hosted under otherwise official domains.
const UGC_HOST = /^(?:community|communities|forum|forums|discuss|discussion|discussions|answers|support-community|groups|social|users?)\./i;
const UGC_PATH = /\/(?:community|communities|forum|forums|discuss|discussions|answers|questions|thread|threads|t|users?|comments?)\/|\/~[^/]+/i;

export function isUserGeneratedContentUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return UGC_HOST.test(host) || UGC_PATH.test(parsed.pathname + "/");
  } catch { return false; }
}

export function structuralAuthority(url) {
  const host = hostOf(url);
  if (!host) return null;
  if (GOVERNMENT_HOST.test(host)) return { reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", basis: "GOVERNMENT_OR_INTERGOVERNMENTAL_DOMAIN_PATTERN" };
  if (ACADEMIC_HOST.test(host)) return { reliability: "INSTITUTIONAL", basis: "ACADEMIC_DOMAIN_PATTERN" };
  return null;
}

// First-party publisher: the source's registrable label equals an entity named
// in the claim (or its acronym). Derived only from the claim text; there is no
// stored entity list. A first party is authoritative for its own records
// (announcements, releases, filings, leadership), which is why the semantic
// model must still mark the source DIRECT/EXACT for decisive use.
const ENTITY_STOP = new Set(["the", "this", "that", "these", "those", "and", "for", "with", "from", "into", "about", "after", "before", "during", "when", "while", "where", "which", "what", "who", "its", "their", "his", "her", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "first", "last", "new", "old", "official", "national", "international", "global", "world", "current", "since", "until", "today", "year", "years"]);
export function claimEntityKeys(claim) {
  const text = String(claim || "");
  const keys = new Set();
  const re = /\b[A-Z][A-Za-z0-9&'’.-]*(?:\s+(?:of|for|and|de|du|la|the)?\s*[A-Z][A-Za-z0-9&'’.-]*)*/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const phrase = match[0];
    const words = phrase.split(/\s+/).filter(Boolean);
    // v0.2.82: a single capitalised word at the start of a sentence is
    // ambiguous ("Water is ...", "Apple pie ...") and is not an entity key
    // unless it is possessive ("Nvidia's"), an acronym/camel-case token, or
    // also appears capitalised mid-sentence elsewhere in the claim.
    const sentenceInitial = /^\s*$|[.!?:;]\s*$/.test(text.slice(Math.max(0, match.index - 3), match.index));
    const followedByVersion = /^\s+v?\d/.test(text.slice(match.index + phrase.length, match.index + phrase.length + 4));
    if (sentenceInitial && words.length === 1 && !followedByVersion && !/^[A-Z0-9&]{2,}$|[a-z][A-Z]|['’]s$/.test(words[0])) {
      const word = words[0].replace(/['’]s$/i, "");
      const elsewhere = new RegExp(`[^.!?:;\\s]\\s+${word.replace(/[^A-Za-z0-9]/g, "")}\\b`).test(text);
      if (!elsewhere) continue;
    }
    const significant = words.filter(word => !/^(?:of|for|and|de|du|la|the)$/i.test(word));
    for (const word of significant) {
      const key = word.replace(/['’]s$/i, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key.length >= 4 && !ENTITY_STOP.has(key) && !/^\d+$/.test(key)) keys.add(key);
    }
    if (significant.length >= 2) {
      const joined = significant.map(word => word.replace(/['’]s$/i, "")).join("").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (joined.length >= 5 && joined.length <= 30) keys.add(joined);
      const acronym = significant.map(word => word[0]).join("").toLowerCase();
      if (acronym.length >= 3 && /^[a-z]+$/.test(acronym)) keys.add(acronym);
    }
  }
  for (const acronym of text.match(/\b[A-Z]{3,8}\b/g) || []) keys.add(acronym.toLowerCase());
  return keys;
}

export function firstPartyMatch(url, claim) {
  const domain = registrableDomainOf(url);
  if (!domain) return null;
  const label = domain.split(".")[0].replace(/[^a-z0-9]/g, "");
  if (label.length < 3) return null;
  const keys = claimEntityKeys(claim);
  return keys.has(label) ? { entity_key: label, domain } : null;
}

/**
 * Claim-aware authority. Curated reliability (from the caller) is kept unless
 * it is UNASSESSED; structural and first-party evidence can raise it; user-
 * generated content on an official domain is always lowered to UNASSESSED.
 */
// v0.3.5: authority domains named by the model's search plan. The plan names
// the official sites of the organisations most likely to publish the primary
// record before any result is seen. A source on such a domain is raised only
// from UNASSESSED to the lowest qualified tier, so it still needs independent
// corroboration. Open-publishing platforms and any domain written in the claim
// itself are never accepted, so a claim cannot nominate its own authority.
const OPEN_PUBLISHING_HOSTS = new Set([
  "wikipedia.org", "wikimedia.org", "wikidata.org", "fandom.com", "wikihow.com", "quora.com", "reddit.com",
  "medium.com", "substack.com", "blogspot.com", "wordpress.com", "github.io", "tumblr.com", "weebly.com", "wixsite.com",
  "facebook.com", "instagram.com", "linkedin.com", "youtube.com", "youtu.be", "tiktok.com", "x.com", "twitter.com", "threads.net",
  "brainly.com", "chegg.com", "answers.com", "scribd.com", "slideshare.net", "pinterest.com"
]);
const BARE_SUFFIX = /^(?:com|co|org|net|gov|edu|ac|or|ne|go|gob|gouv)\.[a-z]{2}$/;
export function normalizePlannedAuthorityDomains(domains, claim) {
  const claimText = String(claim || "").toLowerCase();
  const out = [];
  for (const raw of Array.isArray(domains) ? domains : []) {
    const domain = String(raw || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
    if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain) || /^\d+(?:\.\d+)+$/.test(domain)) continue;
    if (BARE_SUFFIX.test(domain) || domain.split(".")[0].length < 2) continue;
    if ([...OPEN_PUBLISHING_HOSTS].some(host => domain === host || domain.endsWith("." + host))) continue;
    if (claimText.includes(domain) || claimText.includes(domain.split(".")[0] + ".")) continue;
    if (!out.includes(domain)) out.push(domain);
  }
  return out.slice(0, 3);
}
export function plannedAuthorityMatch(url, plannedDomains = []) {
  const host = hostOf(url);
  if (!host || !plannedDomains.length) return null;
  if ([...OPEN_PUBLISHING_HOSTS].some(open => host === open || host.endsWith("." + open))) return null;
  return plannedDomains.find(domain => host === domain || host.endsWith("." + domain)) || null;
}

export function assessSourceAuthority(url, claim, curatedReliability = "UNASSESSED", options = {}) {
  if (isUserGeneratedContentUrl(url)) {
    return { reliability: "UNASSESSED", basis: "USER_GENERATED_CONTENT_ON_DOMAIN", downgraded_from: curatedReliability !== "UNASSESSED" ? curatedReliability : null };
  }
  const structural = structuralAuthority(url);
  if (curatedReliability && curatedReliability !== "UNASSESSED" && curatedReliability !== "UNKNOWN") {
    return structural && structural.reliability === curatedReliability && !/CURATED/.test(structural.basis)
      ? structural
      : { reliability: curatedReliability, basis: "CURATED_OR_SUFFIX_REGISTRY" };
  }
  if (structural) return structural;
  const firstParty = firstPartyMatch(url, claim);
  if (firstParty) return { reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", basis: "FIRST_PARTY_ENTITY_DOMAIN", entity_key: firstParty.entity_key };
  const planned = plannedAuthorityMatch(url, options.plannedAuthorityDomains || []);
  if (planned) return { reliability: "SECONDARY_REPUTABLE", basis: "MODEL_PLANNED_AUTHORITY_DOMAIN", planned_domain: planned };
  return { reliability: curatedReliability || "UNASSESSED", basis: "UNCLASSIFIED_PUBLISHER" };
}

// ---------------------------------------------------------------------------
// 2. Claim-conditioned authority query
// ---------------------------------------------------------------------------
const ARABIC = /[؀-ۿ]/;
export function buildAuthorityQuery(claim, { temporal = false } = {}) {
  const text = String(claim || "").replace(/\s+/g, " ").trim().replace(/[.!?؟]+$/, "");
  if (!text) return null;
  if (ARABIC.test(text)) {
    return `${text.slice(0, 260)} ${temporal ? "أحدث بيان رسمي" : "مصدر رسمي"}`;
  }
  const phrases = [...new Set((text.match(/\b[A-Z][A-Za-z0-9&'’.-]*(?:\s+(?:of|for|and|de|la|the)\s+[A-Z][A-Za-z0-9&'’.-]*|\s+[A-Z][A-Za-z0-9&'’.-]*)*/g) || [])
    .map(value => value.trim().replace(/^(?:The|A|An)\s+/, "").replace(/['’]s$/, ""))
    .filter(value => value.length >= 3 && !ENTITY_STOP.has(value.toLowerCase())))];
  const quantities = [...new Set((text.match(/\b\d+(?:[,.]\d+)*(?:\s?(?:%|percent|per cent|million|billion|trillion|km|kg|mw|gw))?/gi) || []).map(value => value.trim()))];
  const quantityWords = new Set(quantities.join(" ").toLowerCase().split(/\s+/));
  const entityPart = phrases.slice(0, 3).map(value => value.includes(" ") ? `"${value}"` : value).join(" ");
  const phraseWords = new Set(phrases.join(" ").toLowerCase().split(/\s+/));
  const contentWords = text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
  const predicate = [...new Set(contentWords.filter(word => !ENTITY_STOP.has(word) && !phraseWords.has(word) && !quantityWords.has(word)))].slice(0, 6).join(" ");
  const core = [entityPart, predicate, quantities.slice(0, 3).join(" ")].filter(Boolean).join(" ").trim();
  if (!core) return null;
  return `${core} ${temporal ? "latest official announcement" : "official record"}`.slice(0, 380);
}

// ---------------------------------------------------------------------------
// 3. Direct page acquisition
// ---------------------------------------------------------------------------
async function readBounded(response, maxBytes) {
  if (!response.body || typeof response.body.getReader !== "function") {
    const text = await response.text();
    return text.length > maxBytes ? { text: text.slice(0, maxBytes), truncated: true } : { text, truncated: false };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0, text = "", truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      text += decoder.decode(value.slice(0, Math.max(0, value.byteLength - (received - maxBytes))), { stream: true });
      truncated = true;
      try { await reader.cancel(); } catch {}
      break;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return { text, truncated };
}

/**
 * Fetch one evidence page. Redirects are followed manually, only within the
 * same registrable domain and only over HTTPS. Never throws; returns a typed
 * outcome with an explicit failure reason.
 */
export async function fetchEvidencePage(rawUrl, { fetchImpl, now = Date.now() } = {}) {
  const started = Date.now();
  const initial = isSafeEvidenceUrl(rawUrl);
  if (!initial.safe) return { ok: false, reason: "UNSAFE_URL:" + initial.reason, requested_url: rawUrl };
  if (NON_HTML_PATH.test(initial.url.pathname + initial.url.search)) return { ok: false, reason: "UNSUPPORTED_CONTENT_TYPE", requested_url: rawUrl };
  const originDomain = registrableDomainOf(initial.url.href);
  let current = initial.url.href;
  let response;
  const redirects = [];
  try {
    for (let hop = 0; hop <= ACQUISITION_LIMITS.maxRedirects; hop++) {
      response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        headers: { accept: "text/html,application/xhtml+xml;q=0.9", "accept-language": "en,ar;q=0.8", "user-agent": "FreshProof-EvidenceBot/0.2 (+evidence verification; bounded single-page fetch)" },
        signal: AbortSignal.timeout(ACQUISITION_LIMITS.fetchTimeoutMs)
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers?.get?.("location");
      if (!location) return { ok: false, reason: "REDIRECT_WITHOUT_LOCATION", requested_url: rawUrl, http_status: response.status };
      let next;
      try { next = new URL(location, current).href; } catch { return { ok: false, reason: "REDIRECT_INVALID", requested_url: rawUrl }; }
      const nextCheck = isSafeEvidenceUrl(next);
      if (!nextCheck.safe) return { ok: false, reason: "REDIRECT_UNSAFE:" + nextCheck.reason, requested_url: rawUrl };
      if (registrableDomainOf(next) !== originDomain) return { ok: false, reason: "REDIRECT_CROSS_DOMAIN", requested_url: rawUrl, redirect_target_host: hostOf(next) };
      redirects.push(next);
      current = next;
      if (hop === ACQUISITION_LIMITS.maxRedirects) return { ok: false, reason: "REDIRECT_LIMIT", requested_url: rawUrl };
    }
  } catch (error) {
    const timeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return { ok: false, reason: timeout ? "TIMEOUT" : "NETWORK_ERROR", requested_url: rawUrl, elapsed_ms: Date.now() - started };
  }
  if (!response.ok) return { ok: false, reason: response.status === 403 || response.status === 401 ? "ACCESS_DENIED" : response.status === 404 || response.status === 410 ? "NOT_FOUND" : response.status === 429 ? "PUBLISHER_RATE_LIMITED" : "HTTP_ERROR", http_status: response.status, requested_url: rawUrl };
  const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
  if (!/text\/html|application\/xhtml\+xml/.test(contentType)) {
    try { await response.body?.cancel?.(); } catch {}
    return { ok: false, reason: "UNSUPPORTED_CONTENT_TYPE", http_status: response.status, content_type: contentType.split(";")[0] || null, requested_url: rawUrl };
  }
  let body;
  try { body = await readBounded(response, ACQUISITION_LIMITS.maxBytes); }
  catch { return { ok: false, reason: "BODY_READ_FAILED", requested_url: rawUrl }; }
  if (!body.text || body.text.length < 200) return { ok: false, reason: "EMPTY_OR_STUB_PAGE", requested_url: rawUrl, http_status: response.status };
  return {
    ok: true,
    requested_url: rawUrl,
    final_url: current,
    redirects,
    http_status: response.status,
    content_type: contentType.split(";")[0],
    html: body.text,
    truncated: body.truncated,
    last_modified_header: response.headers?.get?.("last-modified") || null,
    retrieved_at: new Date(now).toISOString(),
    elapsed_ms: Date.now() - started
  };
}

// ---------------------------------------------------------------------------
// 4. Page parsing, dates and claim-relevant passages
// ---------------------------------------------------------------------------
function decodeEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => { const n = Number(code); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " "; })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => { const n = parseInt(code, 16); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " "; })
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—")
    .replace(/&rsquo;/gi, "’").replace(/&lsquo;/gi, "‘").replace(/&rdquo;/gi, "”").replace(/&ldquo;/gi, "“").replace(/&hellip;/gi, "…");
}

export function isoDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const t = Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    const d = new Date(t);
    return d.getUTCFullYear() === Number(ymd[1]) && d.getUTCMonth() === Number(ymd[2]) - 1 && d.getUTCDate() === Number(ymd[3]) ? d.toISOString().slice(0, 10) : null;
  }
  // RFC 1123 (HTTP Last-Modified) carries an explicit zone, so Date.parse is TZ-safe here.
  if (/\b(?:GMT|UTC|[+-]\d{4})\b/.test(trimmed)) {
    const t = Date.parse(trimmed);
    return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
  }
  return null;
}

// v0.2.82 hardening: a single forward, linear-time scanner replaces the
// earlier backreference/lazy regexes, which backtracked catastrophically on
// hostile input (unclosed <script>/<nav> repeated across a 1.5 MB body took
// ~8 s of CPU). Every search below starts at a strictly advancing offset or is
// memoised, so total work is O(n) in the (already byte-capped) body.
const SKIP_CONTENT = new Set(["script", "style", "noscript", "svg", "template", "iframe", "canvas", "form", "select", "button", "nav", "header", "footer", "aside", "object", "math"]);
const RAW_TEXT = new Set(["script", "style", "noscript", "template", "iframe", "svg", "math", "object", "canvas"]);
const BLOCK_CLOSE = new Set(["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "section", "article", "td", "th", "dd", "dt", "blockquote", "main", "table", "ul", "ol"]);
const MAX_TAG_CHARS = 4000;
const MAX_LD_BLOCKS = 6;

function parseAttributes(tag) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match, count = 0;
  while ((match = re.exec(tag)) !== null && count++ < 40) {
    const key = match[1].toLowerCase();
    if (!(key in attrs)) attrs[key] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

export function scanHtml(html, { maxChars = ACQUISITION_LIMITS.maxParseChars } = {}) {
  const raw = String(html || "").slice(0, maxChars);
  const lower = raw.toLowerCase();
  const n = raw.length;
  const parts = [];
  const metas = [];
  const ldBlocks = [];
  let title = "", lang = null, canonical = null;
  let i = 0, cachedGtFrom = -1, cachedGt = -1;
  const missingClose = new Set();
  // Memoised: no '>' exists in [cachedGtFrom, cachedGt), so any later query
  // inside that range has the same answer (O(n) overall).
  const nextGt = from => {
    if (cachedGtFrom >= 0 && from >= cachedGtFrom && from <= (cachedGt < 0 ? n : cachedGt)) return cachedGt;
    const gt = raw.indexOf(">", from);
    cachedGtFrom = from; cachedGt = gt;
    return gt;
  };
  const findClose = (name, from) => {
    if (missingClose.has(name)) return -1;
    let at = lower.indexOf("</" + name, from);
    while (at >= 0 && /[a-z0-9-]/.test(lower[at + 2 + name.length] || "")) at = lower.indexOf("</" + name, at + 1);
    if (at < 0) missingClose.add(name);
    return at;
  };
  while (i < n) {
    const lt = raw.indexOf("<", i);
    if (lt < 0) { parts.push(raw.slice(i)); break; }
    if (lt > i) parts.push(raw.slice(i, lt));
    if (raw.startsWith("<!--", lt)) {
      const end = raw.indexOf("-->", lt + 4);
      parts.push(" ");
      i = end < 0 ? n : end + 3;
      continue;
    }
    const gt = nextGt(lt + 1);
    if (gt < 0) break;                        // trailing unterminated tag: drop
    if (gt - lt > MAX_TAG_CHARS) {            // implausibly long tag: treat '<' as text
      parts.push(" ");
      i = lt + 1;
      continue;
    }
    const tag = raw.slice(lt + 1, gt);
    const nameMatch = /^(\/?)\s*([a-zA-Z][a-zA-Z0-9-]{0,30})/.exec(tag);
    i = gt + 1;
    if (!nameMatch) { parts.push(" "); continue; }
    const closing = nameMatch[1] === "/";
    const name = nameMatch[2].toLowerCase();
    if (closing) { parts.push(BLOCK_CLOSE.has(name) ? ". " : " "); continue; }
    if (name === "br") { parts.push(". "); continue; }
    if (name === "meta" && metas.length < 200) { metas.push(parseAttributes(tag)); continue; }
    if (name === "link" && !canonical) {
      const attrs = parseAttributes(tag);
      if (String(attrs.rel || "").toLowerCase().split(/\s+/).includes("canonical") && attrs.href) canonical = attrs.href.slice(0, 2000);
      continue;
    }
    if (name === "html" && !lang) {
      const value = parseAttributes(tag).lang;
      if (value && /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?$/.test(value)) lang = value.toLowerCase();
      parts.push(" ");
      continue;
    }
    if (name === "title" && !title) {
      const close = findClose("title", i);
      if (close >= 0 && close - i <= 2000) {
        title = raw.slice(i, close);
        const closeGt = raw.indexOf(">", close);
        i = closeGt < 0 ? n : closeGt + 1;
      }
      parts.push(" ");
      continue;
    }
    if (SKIP_CONTENT.has(name) && !/\/\s*$/.test(tag)) {
      const close = findClose(name, i);
      if (close < 0) {
        // Unclosed raw-text element: the rest of the document is not readable
        // text. Unclosed layout element: drop only the tag itself.
        if (RAW_TEXT.has(name)) { i = n; }
        parts.push(" ");
        continue;
      }
      if (name === "script" && ldBlocks.length < MAX_LD_BLOCKS && /application\/ld\+json/i.test(tag)) ldBlocks.push(raw.slice(i, Math.min(close, i + 20000)));
      const closeGt = raw.indexOf(">", close);
      i = closeGt < 0 ? n : closeGt + 1;
      parts.push(" ");
      continue;
    }
    parts.push(" ");
  }
  return { text: parts.join(""), title, lang, canonical, metas, ldBlocks, scanned_chars: n, input_truncated: String(html || "").length > n };
}

function metaValue(metas, names) {
  const wanted = names.map(name => name.toLowerCase());
  for (const name of wanted) {
    for (const attrs of metas) {
      const key = String(attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
      if (key === name && attrs.content) return attrs.content.slice(0, 120);
    }
  }
  return null;
}

function jsonLdDates(blocks) {
  const out = { published: null, modified: null };
  for (const block of blocks) {
    out.published ||= block.match(/"datePublished"\s*:\s*"([^"]{4,60})"/)?.[1] || null;
    out.modified ||= block.match(/"dateModified"\s*:\s*"([^"]{4,60})"/)?.[1] || null;
    if (out.published && out.modified) break;
  }
  return out;
}

export function extractPageDocument(html) {
  const scan = scanHtml(html);
  const title = decodeEntities(scan.title).replace(/<[^>]{0,200}>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
  const ld = jsonLdDates(scan.ldBlocks);
  const publishedRaw = metaValue(scan.metas, ["article:published_time", "datePublished", "DC.date.issued", "dcterms.issued", "citation_publication_date", "publish-date", "pubdate"]) || ld.published;
  const modifiedRaw = metaValue(scan.metas, ["article:modified_time", "dateModified", "og:updated_time", "DC.date.modified", "dcterms.modified", "last-modified"]) || ld.modified;
  // Whitespace is collapsed first so the dot-run pattern below is linear
  // (the earlier /\s*\.\s*(?:\.\s*)+/ form was quadratic on long space runs).
  const text = decodeEntities(scan.text.slice(0, 400000)).replace(/\s+/g, " ").replace(/ ?\.(?: ?\.)+/g, ".").trim().slice(0, 60000);
  const siteName = decodeEntities(metaValue(scan.metas, ["og:site_name", "application-name", "publisher"]) || "").replace(/\s+/g, " ").trim().slice(0, 120) || null;
  // v0.2.82: metadata dates on Arabic/Persian/Urdu pages may be Hijri
  // (e.g. "1447-06-13"); they are not converted or reinterpreted, only
  // rejected, and any pre-1800 publication metadata is treated as implausible.
  const organization = declaredOrganization(scan.ldBlocks);
  const calendarCheck = iso => {
    if (!iso) return { date: null, rejected: null };
    const year = Number(iso.slice(0, 4));
    if (/^(?:ar|fa|ur|ps|ckb)\b/.test(scan.lang || "") && year >= 1300 && year <= 1500) return { date: null, rejected: "PROBABLE_HIJRI_CALENDAR_DATE" };
    if (year < 1800) return { date: null, rejected: "IMPLAUSIBLE_PUBLICATION_YEAR" };
    return { date: iso, rejected: null };
  };
  const published = calendarCheck(isoDateOnly(publishedRaw));
  const modified = calendarCheck(isoDateOnly(modifiedRaw));
  return {
    title,
    site_name: siteName,
    organization,
    lang: scan.lang,
    canonical_url: scan.canonical,
    text,
    published_date: published.date,
    published_date_basis: published.date ? "PAGE_METADATA" : null,
    modified_date: modified.date,
    modified_date_basis: modified.date ? "PAGE_METADATA" : null,
    metadata_date_rejections: [published.rejected && `published:${published.rejected}`, modified.rejected && `modified:${modified.rejected}`].filter(Boolean),
    parse_input_truncated: scan.input_truncated
  };
}

function normalizedTokensFor(value) {
  return (String(value || "").toLowerCase()
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .match(/[a-z0-9ء-ي]{3,}/g) || []);
}
const PASSAGE_STOP = new Set(("the and for with from that this these those was were are is has have had its their they them into about after before during while also which what when where who whom been being will would could should may might must than then there here such only other some more most very over under between against within without upon per via current currently latest على في من إلى الى عن أن ان هو هي هذا هذه ذلك تلك كان كانت يكون تكون تم قد مع بين بعد قبل خلال حيث كما أو او ثم لدى عند الذي التي الذين ما لا لم لن إن إذا اذا").split(/\s+/));

const QUALIFIER = /\b(?:not|no longer|never|except|unless|until|however|but|although|replaced|superseded|formerly|previously|repealed|revoked|suspended|withdrawn|postponed|only if|subject to|pending|proposed|expected|estimated|approximately|about|up to|at least|as of)\b|لا|لم|لن|ليس|باستثناء|إلا|حتى|لكن|سابقا|سابقاً|ألغي|أُلغي|استبدل|مقترح|متوقع|تقريبا|تقريباً/i;
const QUALIFIER_LEAD = /^(?:However|But|Except|Unless|Until|Although|That said|Nevertheless|This (?:was|has been) (?:replaced|superseded|repealed|revoked)|It (?:was|has been) (?:replaced|superseded|repealed|revoked|suspended)|As of|لكن|غير أن|إلا أن|باستثناء|حتى)\b/;
const DATE_TOKEN = /\b(?:1[5-9]\d{2}|20\d{2})\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i;
function sentenceSpans(text) {
  const spans = [];
  const re = /[^.!?؟\n]+[.!?؟]?/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const value = match[0].trim();
    if (value.length >= 20) spans.push({ start: match.index, end: match.index + match[0].length, value });
    if (spans.length > 4000) break;
  }
  return spans;
}

/**
 * Select verbatim, claim-relevant windows from page text. Every returned
 * passage is an exact substring of the page text, so quotes taken from a
 * passage remain verifiable against the fetched page.
 */
export function selectClaimPassages(text, claim, { maxChars = ACQUISITION_LIMITS.maxPassageChars, maxPassages = ACQUISITION_LIMITS.maxPassages } = {}) {
  const page = String(text || "");
  const claimTerms = [...new Set(normalizedTokensFor(claim).filter(term => !PASSAGE_STOP.has(term)))];
  if (!page || claimTerms.length === 0) return { passages: [], best_term_coverage: 0 };
  const numbers = new Set((String(claim).match(/\d[\d,.]*/g) || []).map(value => value.replace(/,/g, "").replace(/\.$/, "")).filter(value => value.length >= 2));
  const spans = sentenceSpans(page);
  const scored = [];
  for (let i = 0; i < spans.length; i++) {
    let start = spans[i].start, end = spans[i].end;
    for (let j = i + 1; j < spans.length && spans[j].end - start <= ACQUISITION_LIMITS.windowChars; j++) end = spans[j].end;
    const windowText = page.slice(start, end).trim();
    const terms = new Set(normalizedTokensFor(windowText));
    const matched = claimTerms.filter(term => terms.has(term));
    const windowNumbers = new Set((windowText.match(/\d[\d,.]*/g) || []).map(value => value.replace(/,/g, "").replace(/\.$/, "")));
    const numberHits = [...numbers].filter(value => windowNumbers.has(value)).length;
    const coverage = matched.length / claimTerms.length;
    // v0.2.82: windows that carry dates or qualifiers (negation, exceptions,
    // conditions, change markers) are preferred, and a following sentence that
    // opens with a qualifier is kept with its window so the passage cannot
    // silently drop "however/except/until/no longer" context.
    const qualifierHits = QUALIFIER.test(windowText) ? 1 : 0;
    const dateHits = DATE_TOKEN.test(windowText) ? 1 : 0;
    const score = matched.length + 1.5 * numberHits + 0.75 * qualifierHits + 0.5 * dateHits;
    let lastSpan = i;
    while (lastSpan + 1 < spans.length && spans[lastSpan + 1].start < end) lastSpan++;
    const follow = spans[lastSpan + 1];
    if (follow && QUALIFIER_LEAD.test(follow.value) && follow.end - start <= ACQUISITION_LIMITS.windowChars + 220) end = follow.end;
    const finalText = page.slice(start, end).trim();
    if (matched.length >= Math.min(2, claimTerms.length)) scored.push({ start, end, text: finalText.slice(0, ACQUISITION_LIMITS.windowChars + 240), score, coverage, qualifier: Boolean(qualifierHits) });
  }
  scored.sort((a, b) => b.score - a.score || a.start - b.start);
  const chosen = [];
  let total = 0;
  for (const candidate of scored) {
    if (chosen.some(item => candidate.start < item.end && candidate.end > item.start)) continue;
    const cost = candidate.text.length + (chosen.length ? PASSAGE_SEPARATOR.length : 0);
    if (total + cost > maxChars) continue;
    chosen.push(candidate);
    total += cost;
    if (chosen.length >= maxPassages) break;
  }
  chosen.sort((a, b) => a.start - b.start);
  return { passages: chosen.map(item => item.text), best_term_coverage: Math.round((scored[0]?.coverage || 0) * 100) / 100 };
}

/**
 * Merge a fetched page into a normalized search source. The search snippet is
 * retained separately; the evidence text becomes verbatim page passages.
 * Dates keep their provenance: search-provider publication date, page metadata
 * publication date, page modified date, and retrieval time are distinct fields.
 */
export function enrichSourceWithPage(source, page, claim, { now = Date.now(), anchors = [] } = {}) {
  const document = extractPageDocument(page.html);
  // v0.2.90: passages are selected for the claim and for each validated
  // planned query (cross-lingual bridge); the best-covering selection wins.
  let { passages, best_term_coverage } = selectClaimPassages(document.text, claim);
  for (const anchor of Array.isArray(anchors) ? anchors : []) {
    const candidate = selectClaimPassages(document.text, anchor);
    if (candidate.passages.length && candidate.best_term_coverage > best_term_coverage) ({ passages, best_term_coverage } = candidate);
  }
  const retrieval = {
    method: "DIRECT_PAGE_FETCH",
    requested_url: page.requested_url,
    final_url: page.final_url,
    redirect_count: page.redirects?.length || 0,
    http_status: page.http_status,
    content_type: page.content_type,
    retrieved_at: page.retrieved_at,
    truncated: Boolean(page.truncated),
    page_title: document.title || null,
    page_site_name: document.site_name,
    metadata_date_rejections: document.metadata_date_rejections,
    page_language: document.lang,
    passage_count: passages.length,
    best_passage_term_coverage: best_term_coverage
  };
  const searchPublished = source.published_date || null;
  const pagePublished = document.published_date && Date.parse(document.published_date) <= now + DAY ? document.published_date : null;
  const lastModifiedHeader = isoDateOnly(page.last_modified_header || "");
  const retrievedDay = String(page.retrieved_at || "").slice(0, 10);
  const publishedForCheck = searchPublished || pagePublished;
  // v0.2.82 date semantics: only a page-declared modified date can become an
  // editorial update candidate. HTTP Last-Modified is commonly a cache/render
  // stamp and is recorded but never trusted. A candidate equal to the
  // retrieval day, in the future, or earlier than publication is rejected.
  // Final acceptance as recency evidence happens in evidenceRecency(), which
  // additionally requires claim-relevant passages from the same page.
  let updateRejection = null;
  const pageModified = document.modified_date;
  if (pageModified) {
    if (pageModified === retrievedDay) updateRejection = "UPDATE_DATE_EQUALS_RETRIEVAL_DAY";
    else if (Date.parse(pageModified) > now + DAY) updateRejection = "UPDATE_DATE_IN_FUTURE";
    else if (publishedForCheck && pageModified < publishedForCheck) updateRejection = "UPDATE_DATE_BEFORE_PUBLICATION";
  }
  const updatedDate = pageModified && !updateRejection ? pageModified : null;
  const enriched = {
    ...source,
    title: source.title || document.title || "Source",
    search_snippet: source.search_snippet ?? source.snippet ?? "",
    published_date: searchPublished || pagePublished,
    published_date_basis: searchPublished ? (source.published_date_basis || "SEARCH_PROVIDER") : (pagePublished ? "PAGE_METADATA" : null),
    updated_date: updatedDate,
    updated_date_basis: updatedDate ? "PAGE_METADATA" : null,
    unverified_modified_date: (pageModified && updateRejection) ? pageModified : (!pageModified && lastModifiedHeader ? lastModifiedHeader : null),
    unverified_modified_date_reason: (pageModified && updateRejection) ? updateRejection : (!pageModified && lastModifiedHeader ? "HTTP_LAST_MODIFIED_NOT_TRUSTED" : null),
    retrieved_at: page.retrieved_at,
    retrieval
  };
  // Canonical URL provenance: recorded only when it is a safe HTTPS URL on the
  // same registrable domain as the final URL; otherwise the rejection is noted.
  if (document.canonical_url) {
    let canonical = null;
    try { canonical = new URL(document.canonical_url, page.final_url || page.requested_url).href; } catch {}
    const check = canonical ? isSafeEvidenceUrl(canonical) : { safe: false };
    if (check.safe && registrableDomainOf(canonical) === registrableDomainOf(page.final_url || page.requested_url)) enriched.retrieval.canonical_url = canonical;
    else enriched.retrieval.canonical_status = "CANONICAL_REJECTED_UNSAFE_OR_CROSS_DOMAIN";
  }
  // First-party authority must be confirmed by the fetched page itself: the
  // page title or declared site name must name the claim entity that matched
  // the domain. Otherwise the source is not treated as primary.
  if (enriched.reliability_basis === "FIRST_PARTY_ENTITY_DOMAIN" && enriched.first_party_entity) {
    const pageIdentity = (String(document.title || "") + " " + String(document.site_name || "") + " " + String(document.organization?.name || "")).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (pageIdentity.includes(enriched.first_party_entity)) enriched.first_party_confirmation = "PAGE_IDENTITY_NAMES_ENTITY";
    else if (publisherNameMatchesDomainKey(document, claim, enriched.first_party_entity)) enriched.first_party_confirmation = "PAGE_IDENTITY_NAMES_ENTITY_BY_ACRONYM";
    else {
      enriched.first_party_confirmation = "NOT_CONFIRMED_BY_PAGE_IDENTITY";
      enriched.source_reliability = "UNASSESSED";
      enriched.reliability_basis = "FIRST_PARTY_UNCONFIRMED_BY_PAGE";
    }
  }
  // v0.2.84 publisher identity telemetry: what the page says about who
  // publishes it, and whether the claim names that organisation. Recorded for
  // the trace only; it never changes reliability (authority still comes only
  // from the confirmed first-party path above or a curated classification).
  const identity = assessPublisherIdentity({ siteName: document.site_name, title: document.title, organization: document.organization }, claim);
  if (identity.publisher_name) enriched.publisher_identity = identity;
  if (passages.length) {
    enriched.snippet = passages.join(PASSAGE_SEPARATOR).slice(0, ACQUISITION_LIMITS.maxPassageChars);
    enriched.evidence_origin = "DIRECT_PAGE_PASSAGES";
  } else {
    enriched.evidence_origin = "SEARCH_SNIPPET";
    enriched.retrieval.passage_status = "NO_CLAIM_RELEVANT_PASSAGE";
  }
  return enriched;
}

/** Choose which search results to fetch: authority first, then relevance, one per publisher. */
export function planDirectFetches(sources, limit, { isLowSignal = () => false, alreadyFetched = new Set() } = {}) {
  const authorityRank = { PRIMARY_OR_OFFICIAL_DOMAIN: 4, INSTITUTIONAL: 3, SECONDARY_REPUTABLE: 2, UNASSESSED: 1, UNKNOWN: 0 };
  const relevanceRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const candidates = (Array.isArray(sources) ? sources : [])
    .filter(source => source?.url && !alreadyFetched.has(source.url) && !source.retrieval && isSafeEvidenceUrl(source.url).safe
      && !NON_HTML_PATH.test(source.url) && !isLowSignal(source.url) && !isUserGeneratedContentUrl(source.url))
    .map((source, order) => ({ source, order }))
    .sort((a, b) =>
      (authorityRank[b.source.source_reliability] ?? 0) - (authorityRank[a.source.source_reliability] ?? 0)
      || (relevanceRank[b.source.prefetch_relevance] ?? 0) - (relevanceRank[a.source.prefetch_relevance] ?? 0)
      || Number(b.source.search_relevance || 0) - Number(a.source.search_relevance || 0)
      || a.order - b.order);
  const chosen = [];
  const domains = new Set();
  for (const { source } of candidates) {
    const domain = registrableDomainOf(source.url);
    if (!domain || domains.has(domain)) continue;
    domains.add(domain);
    chosen.push(source);
    if (chosen.length >= limit) break;
  }
  return chosen;
}

// ---------------------------------------------------------------------------
// 4b. Independence: publisher lineage, not just distinct hostnames
// ---------------------------------------------------------------------------
function shingles(text, size = 5) {
  const words = normalizedTokensFor(text);
  const out = new Set();
  for (let i = 0; i + size <= words.length && out.size < 400; i++) out.add(words.slice(i, i + size).join(" "));
  return { set: out, words: words.length };
}
export function nearDuplicateEvidence(a, b, threshold = 0.8) {
  const x = shingles(a), y = shingles(b);
  // v0.2.90: short passages copied verbatim (8+ words) are one lineage too.
  const norm = value => String(value || "").toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (x.words >= 8 && y.words >= 8 && norm(a) === norm(b)) return true;
  if (x.words < 20 || y.words < 20 || !x.set.size || !y.set.size) return false;
  let inter = 0;
  for (const value of x.set) if (y.set.has(value)) inter++;
  return inter / (x.set.size + y.set.size - inter) >= threshold;
}
function organizationKey(url) {
  const domain = registrableDomainOf(url);
  const label = domain ? domain.split(".")[0] : null;
  return label && label.length >= 3 ? label : domain;
}
/**
 * Group sources into independent lineages. Two sources share a lineage when
 * they share a registrable domain, share an organisation label across
 * suffixes (who.int / who.org style), or carry near-duplicate evidence text
 * (syndicated or copied wire content). Conservative by design: it can
 * under-count independence, never over-count it.
 */
export function independentLineages(sources) {
  const list = (Array.isArray(sources) ? sources : []).filter(source => source?.url && registrableDomainOf(source.url));
  const parent = list.map((_, index) => index);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; };
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (organizationKey(list[i].url) === organizationKey(list[j].url)) union(i, j);
      else if (nearDuplicateEvidence(list[i].snippet, list[j].snippet)) union(i, j);
    }
  }
  const groups = new Map();
  list.forEach((source, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(registrableDomainOf(source.url));
  });
  return [...groups.values()].map(domains => [...new Set(domains)].sort().join("+"));
}

// ---------------------------------------------------------------------------
// 5. Abstention diagnosis
// ---------------------------------------------------------------------------
export const ABSTENTION_REASONS = Object.freeze([
  "PIPELINE_EXCEPTION",
  "RETRIEVAL_PROVIDER_FAILURE",
  "RETRIEVAL_NO_RESULTS",
  "NO_RELEVANT_EVIDENCE",
  "INSUFFICIENT_SOURCE_QUALITY",
  "INSUFFICIENT_INDEPENDENT_CORROBORATION",
  "STALE_OR_UNDATED_EVIDENCE",
  "SEMANTIC_PROVIDER_UNAVAILABLE",
  "SEMANTIC_UNCERTAINTY",
  "GENUINE_EVIDENCE_CONFLICT",
  "COMPONENT_COVERAGE_GAP",
  "SPECIALIST_EVIDENCE_GATE",
  "HIGH_IMPACT_SINGLE_SOURCE_BLOCK"
]);

/**
 * Explain an abstention with one primary reason plus contributing factors.
 * Purely descriptive; it never changes the verdict.
 */
export function diagnoseAbstention({ status, adjudication = {}, retrievalDiagnostics = [], sources = [], excludedSources = [], semanticAssessment = null, temporalSensitive = false, claimFrame = null, now = Date.now(), maxEvidenceAgeDays = 180 } = {}) {
  if (!["NEEDS_REVIEW", "UNVERIFIABLE", "NOT_ASSESSED"].includes(status)) return null;
  // v0.2.91: opinions and open forecasts are classified from their wording;
  // no retrieval was attempted, so no retrieval reason applies.
  if (status === "UNVERIFIABLE" && ["NOT_A_FACTUAL_CLAIM", "FUTURE_OUTCOME_NOT_VERIFIABLE"].includes(adjudication?.method)) {
    const reason = adjudication.method === "NOT_A_FACTUAL_CLAIM" ? "NOT_A_FACTUAL_CLAIM" : "OPEN_FORECAST";
    return { primary_reason: reason, category: "NOT_CHECKABLE_CLAIM_TYPE", contributing_factors: [reason], counts: { sources_considered: 0 }, evidence_dates: [], note: reason === "NOT_A_FACTUAL_CLAIM" ? "The statement is a judgement or recommendation, not a checkable fact; evidence retrieval was not performed." : "The statement predicts an uncertain future outcome; no present evidence can establish it, so evidence retrieval was not performed." };
  }
  const recencyApplies = claimFrame?.frame ? claimFrame.frame === "CURRENT_STATE" : !!temporalSensitive;
  const factors = new Set();
  const searchEvents = retrievalDiagnostics.filter(item => item.stage === "SEARCH");
  const providerFailure = searchEvents.some(item => ["RATE_LIMITED", "UPSTREAM_REJECTED", "UPSTREAM_FAILED", "CIRCUIT_OPEN"].includes(item.status));
  const anyResults = searchEvents.some(item => item.status === "RESULTS_FOUND");
  const budgetLimited = searchEvents.some(item => item.status === "REQUEST_SEARCH_LIMIT_REACHED");
  const all = [...sources, ...excludedSources];
  const relevant = sources.filter(source => ["HIGH", "MEDIUM"].includes(source?.relevance_assessment?.relevance));
  const high = sources.filter(source => source?.relevance_assessment?.relevance === "HIGH");
  const authoritative = high.filter(source => ["PRIMARY_OR_OFFICIAL_DOMAIN", "INSTITUTIONAL", "SECONDARY_REPUTABLE"].includes(source?.source_reliability));
  // v0.2.82: the same recency function as adjudication. Retrieval time is
  // never used; an update date counts only when validated (see evidence-dates).
  const recency = authoritative.map(source => ({ source, assessment: evidenceRecency(source, { now, maxAgeDays: maxEvidenceAgeDays }) }));
  const dated = recency.filter(item => item.assessment.is_recent).map(item => item.source);
  const domains = new Set(independentLineages(authoritative));
  const semanticOk = semanticAssessment?.status === "COMPLETED_ADVISORY";
  const relations = semanticOk ? (semanticAssessment.assessments || []).map(item => item.relation) : [];
  const decisiveRelations = relations.filter(relation => relation === "SUPPORTS" || relation === "CONTRADICTS");
  const signals = adjudication?.adjudication_signals || {};
  const method = adjudication?.method || "";
  if (providerFailure) factors.add("RETRIEVAL_PROVIDER_FAILURE");
  if (budgetLimited) factors.add("SEARCH_BUDGET_LIMITED");
  if (!anyResults && !all.length) factors.add("RETRIEVAL_NO_RESULTS");
  if (all.length && !relevant.length) factors.add("NO_RELEVANT_EVIDENCE");
  if (high.length && !authoritative.length) factors.add("INSUFFICIENT_SOURCE_QUALITY");
  if (authoritative.length && domains.size < 2) factors.add("INSUFFICIENT_INDEPENDENT_CORROBORATION");
  if (recencyApplies && authoritative.length && dated.length < authoritative.length) factors.add("STALE_OR_UNDATED_EVIDENCE");
  if (!semanticOk && sources.length) factors.add("SEMANTIC_PROVIDER_UNAVAILABLE");
  if (semanticOk && relations.length && !decisiveRelations.length) factors.add("SEMANTIC_UNCERTAINTY");
  if (signals.semantic_mixed_evidence || signals.component_polarity_conflict || (decisiveRelations.includes("SUPPORTS") && decisiveRelations.includes("CONTRADICTS"))) factors.add("GENUINE_EVIDENCE_CONFLICT");
  if (/COMPONENT|DECOMPOSITION/.test(method)) factors.add("COMPONENT_COVERAGE_GAP");
  if (/DOMAIN_ADAPTER/.test(method)) factors.add("SPECIALIST_EVIDENCE_GATE");
  if (signals.single_source_lexical_guard?.high_impact && domains.size === 1) factors.add("HIGH_IMPACT_SINGLE_SOURCE_BLOCK");
  const priority = ["RETRIEVAL_PROVIDER_FAILURE", "RETRIEVAL_NO_RESULTS", "SEMANTIC_PROVIDER_UNAVAILABLE", "COMPONENT_COVERAGE_GAP", "GENUINE_EVIDENCE_CONFLICT", "SPECIALIST_EVIDENCE_GATE", "NO_RELEVANT_EVIDENCE", "INSUFFICIENT_SOURCE_QUALITY", "STALE_OR_UNDATED_EVIDENCE", "HIGH_IMPACT_SINGLE_SOURCE_BLOCK", "INSUFFICIENT_INDEPENDENT_CORROBORATION", "SEMANTIC_UNCERTAINTY"];
  const primary = priority.find(reason => factors.has(reason)) || "SEMANTIC_UNCERTAINTY";
  const category = ["RETRIEVAL_PROVIDER_FAILURE", "RETRIEVAL_NO_RESULTS", "NO_RELEVANT_EVIDENCE"].includes(primary) ? "RETRIEVAL_FAILURE"
    : ["INSUFFICIENT_SOURCE_QUALITY", "INSUFFICIENT_INDEPENDENT_CORROBORATION", "STALE_OR_UNDATED_EVIDENCE", "HIGH_IMPACT_SINGLE_SOURCE_BLOCK", "SPECIALIST_EVIDENCE_GATE"].includes(primary) ? "INSUFFICIENT_SOURCE_QUALITY"
      : primary === "GENUINE_EVIDENCE_CONFLICT" ? "EVIDENCE_CONFLICT"
        : primary === "COMPONENT_COVERAGE_GAP" ? "COMPOUND_COVERAGE"
          : "SEMANTIC_UNCERTAINTY";
  return {
    primary_reason: primary,
    category,
    contributing_factors: [...factors],
    counts: {
      sources_considered: all.length,
      relevant_sources: relevant.length,
      high_relevance_sources: high.length,
      authoritative_high_relevance_sources: authoritative.length,
      independent_authoritative_domains: domains.size,
      recently_dated_authoritative_sources: dated.length,
      direct_page_evidence_sources: sources.filter(source => source?.evidence_origin === "DIRECT_PAGE_PASSAGES").length
    },
    evidence_dates: recency.slice(0, 6).map(({ source, assessment }) => ({
      domain: registrableDomainOf(source.url),
      recency_date: assessment.recency_date,
      recency_basis: assessment.recency_basis,
      within_window: assessment.is_recent,
      explanation: assessment.explanation
    })),
    claim_frame: claimFrame?.frame || null,
    recency_applies: recencyApplies,
    recency_window_days: recencyApplies ? maxEvidenceAgeDays : null,
    note: "Diagnostic only; it explains why no decisive verdict was issued and never changes the verdict."
  };
}
