// Pluggable domain adapters. Core owns generic verification; adapters contribute bounded retrieval context, relevance hints and optional adjudication.
// Office-holder patterns intentionally support both role-first and person-first claim phrasing.
// Current office-holder evidence is fetched from the official live directory; publication and retrieval dates remain distinct.

const MAX_RESULTS_PER_CLAIM = 5;

function safeHost(rawUrl) { try { const host = new URL(rawUrl).hostname.toLowerCase(); return host.startsWith("www.") ? host.slice(4) : host; } catch { return ""; } }
function responseMatchesExpectedSource(response, requestedUrl, expectedHost, pathPrefix) {
  try {
    const finalUrl = response?.url || requestedUrl;
    const parsed = new URL(finalUrl);
    return safeHost(finalUrl) === expectedHost && parsed.pathname.startsWith(pathPrefix);
  } catch { return false; }
}

async function fetchOfficialHtml(fetchImpl, url, expectedHost, maxChars = 500000) {
  try {
    const response = await fetchImpl(url, {
      headers: { accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000)
    });
    if (!response?.ok) return { ok: false, diagnostic: { status: "HTTP_ERROR", http_status: Number(response?.status) || null } };
    if (!/text\/html/i.test(response.headers?.get?.("content-type") || "")) return { ok: false, diagnostic: { status: "UNEXPECTED_CONTENT_TYPE" } };
    const finalUrl = response.url || url;
    if (safeHost(finalUrl) !== expectedHost) return { ok: false, diagnostic: { status: "REDIRECT_HOST_REJECTED" } };
    const declaredLength = Number(response.headers?.get?.("content-length") || 0);
    if (declaredLength > maxChars) return { ok: false, diagnostic: { status: "RESPONSE_TOO_LARGE" } };
    const html = await response.text();
    if (!html || html.length > maxChars) return { ok: false, diagnostic: { status: html ? "RESPONSE_TOO_LARGE" : "EMPTY_RESPONSE" } };
    return { ok: true, html, finalUrl };
  } catch (error) {
    const timeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return { ok: false, diagnostic: { status: timeout ? "TIMEOUT" : "FETCH_FAILED" } };
  }
}

const OFFICE_PATTERNS = [
  // Role-first wording: "The President of the United States is Joe Biden."
  { office: "president_of_the_united_states", claim: /\b(?:the )?(?:current )?President of the United States\s+(?:is|remains)\s+([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,3})/i, query: "current President of the United States official White House administration" },
  { office: "president_of_the_united_states", claim: /\b(?:the )?(?:current )?(?:U\.?S\.? President|US President)\s+(?:is|remains)\s+([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,3})/i, query: "current President of the United States official White House administration" },
  // Person-first wording: "Joe Biden is currently the President of the United States."
  { office: "president_of_the_united_states", claim: /\b([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,3})\s+(?:is|remains)\s+(?:(?:currently|now|presently)\s+)?(?:the\s+)?President of the United States\b/i, query: "current President of the United States official White House administration" },
  { office: "president_of_the_united_states", claim: /\b([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,3})\s+(?:is|remains)\s+(?:(?:currently|now|presently)\s+)?(?:the\s+)?(?:U\.?S\.? President|US President)\b/i, query: "current President of the United States official White House administration" }
];

const WHITE_HOUSE_ADMIN_URL = "https://www.whitehouse.gov/administration/";
function decodeHtmlText(value) {
  return String(value || "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, " ").replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
export function parseWhiteHouseAdministrationHtml(html, retrievedAt = new Date().toISOString()) {
  const raw = String(html || "");
  const title = decodeHtmlText(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "The Trump Administration | The White House").replace(/<[^>]+>/g, " ").trim();
  const text = decodeHtmlText(raw.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  const published = raw.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|datepublished)["'][^>]+content=["']([^"']+)/i)
    || raw.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|datePublished|datepublished)["']/i);
  return { title, url: WHITE_HOUSE_ADMIN_URL, snippet: text.slice(0, 12000), published_date: published?.[1] ? published[1].slice(0, 10) : null, retrieved_at: retrievedAt, source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", evidence_kind: "OFFICIAL_LIVE_ADMINISTRATION_DIRECTORY", publication_date_semantics: published?.[1] ? "SOURCE_PUBLICATION_DATE" : "NOT_PROVIDED" };
}
export async function fetchWhiteHouseAdministrationEvidenceDetailed(fetchImpl = fetch, now = Date.now()) {
  const fetched = await fetchOfficialHtml(fetchImpl, WHITE_HOUSE_ADMIN_URL, "whitehouse.gov", 1000000);
  if (!fetched.ok) return { sources: [], diagnostics: [{ provider: "WHITE_HOUSE", ...fetched.diagnostic }] };
  if (!new URL(fetched.finalUrl).pathname.toLowerCase().startsWith("/administration")) {
    return { sources: [], diagnostics: [{ provider: "WHITE_HOUSE", status: "PATH_REJECTED" }] };
  }
  const source = parseWhiteHouseAdministrationHtml(fetched.html, new Date(now).toISOString());
  source.url = fetched.finalUrl;
  const eligible = extractCurrentOfficeHolder(source) ? [source] : [];
  return { sources: eligible, diagnostics: [{ provider: "WHITE_HOUSE", status: eligible.length ? "VALIDATED" : "CONTENT_NOT_VALIDATED", evidence_count: eligible.length }] };
}
export async function fetchWhiteHouseAdministrationEvidence(fetchImpl = fetch, now = Date.now()) {
  return (await fetchWhiteHouseAdministrationEvidenceDetailed(fetchImpl, now)).sources;
}

function hasFreshLiveAdministrationDirectory(source, now) {
  const retrieved = Date.parse(source.retrieved_at || "");
  return source.evidence_kind === "OFFICIAL_LIVE_ADMINISTRATION_DIRECTORY"
    && source.source_reliability === "PRIMARY_OR_OFFICIAL_DOMAIN"
    && safeHost(source.url) === "whitehouse.gov"
    && Number.isFinite(retrieved) && retrieved <= now + 60000 && now - retrieved <= 15 * 60000
    && Boolean(extractCurrentOfficeHolder(source));
}

function cleanPersonName(value) {
  return String(value || "").replace(/[.,;:!?]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g, "").replace(/\s+/g, " ");
}
export function detectOfficeHolderClaim(claim) {
  for (const pattern of OFFICE_PATTERNS) {
    const match = String(claim).match(pattern.claim);
    if (match) return { office: pattern.office, claimed_holder: match[1].replace(/[.,;:!?]+$/g, "").trim(), query: pattern.query };
  }
  return null;
}
function extractCurrentOfficeHolder(source) {
  // A first-party domain is not sufficient: ordinary White House articles can
  // contain navigation labels such as "About President Trump". Only the
  // dedicated administration directory/profile is eligible for this rule.
  let pathname = "";
  try { pathname = new URL(source.url).pathname.toLowerCase(); } catch { return null; }
  if (safeHost(source.url) !== "whitehouse.gov") return null;
  if (!(pathname === "/administration" || pathname.startsWith("/administration/"))) return null;
  const text = String(source.title || "") + " " + String(source.domain_context || source.officeholder_context || "") + " " + String(source.snippet || "");
  // White House administration directory snippets flatten headings into:
  // "Administration President Donald J. Trump First Lady ... Vice President ...".
  const patterns = [
    /\bAdministration\s+President\s+([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,3}?)(?=\s+(?:First Lady|Vice President|Second Lady|The Cabinet|Executive Office|Office of)\b|[.;]|$)/i,
    /\bPresident\s+([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,3}?)(?=\s+(?:is the|is|serves as|45th|46th|47th|First Lady|Vice President)\b|[.;]|$)/i,
    /\bPresident\s+(?:of the United States\s+)?(?:is\s+)?([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,3}?)\s+(?:is|currently serves as)/i,
    /\b([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,3})\s+is the President of the United States\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].replace(/[.,;:!?]+$/g, "").trim();
      if (name.split(/\s+/).length >= 2) return name;
    }
  }
  return null;
}
export function shouldRunOfficeHolderFallback(sources, now = Date.now()) {
  return !sources.some(source => {
    const published = source.published_date ? Date.parse(source.published_date) : NaN;
    const recent = Number.isFinite(published) && published <= now + 86400000 && now - published <= 365 * 86400000;
    return hasFreshLiveAdministrationDirectory(source, now) || (source.source_reliability === "PRIMARY_OR_OFFICIAL_DOMAIN" && recent && extractCurrentOfficeHolder(source));
  });
}
export function mergeUniqueSources(primary, fallback) {
  const seen = new Set();
  return [...primary, ...fallback].filter(source => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  }).slice(0, MAX_RESULTS_PER_CLAIM * 2);
}
export const mergeOfficeHolderSearchResults = mergeUniqueSources;
export function adjudicateOfficeHolderClaim(claim, sources, now = Date.now()) {
  const detected = detectOfficeHolderClaim(claim);
  if (!detected) return { status: null, evidence: null };
  const eligible = sources.filter(source => {
    const published = source.published_date ? Date.parse(source.published_date) : NaN;
    const recent = Number.isFinite(published) && published <= now + 86400000 && now - published <= 365 * 86400000;
    return source.source_reliability === "PRIMARY_OR_OFFICIAL_DOMAIN" && (recent || hasFreshLiveAdministrationDirectory(source, now));
  });
  const conflicting = eligible.map(source => ({ source, holder: extractCurrentOfficeHolder(source) }))
    .filter(item => item.holder && cleanPersonName(item.holder) !== cleanPersonName(detected.claimed_holder));
  if (!conflicting.length) return { status: null, evidence: null, detected, eligible_official_sources: eligible.length };
  const distinct = [...new Set(conflicting.map(item => cleanPersonName(item.holder)))];
  if (distinct.length !== 1) return { status: null, evidence: null, detected, eligible_official_sources: eligible.length, reason: "OFFICIAL_SOURCES_DISAGREE" };
  return {
    status: "CONTRADICTED",
    evidence: {
      method: hasFreshLiveAdministrationDirectory(conflicting[0].source, now) ? "LIVE_OFFICIAL_ADMINISTRATION_DIRECTORY_NAME_CONFLICT" : "RECENT_OFFICIAL_OFFICEHOLDER_NAME_CONFLICT",
      office: detected.office,
      claimed_holder: detected.claimed_holder,
      reported_current_holder: conflicting[0].holder,
      retrieved_at: conflicting[0].source.retrieved_at || null,
      publication_date: conflicting[0].source.published_date || null,
      publication_date_semantics: conflicting[0].source.publication_date_semantics || "SOURCE_PUBLICATION_DATE",
      supporting_sources: conflicting.map(item => ({ title: item.source.title, url: item.source.url, published_date: item.source.published_date || null, retrieved_at: item.source.retrieved_at || null, publication_date_semantics: item.source.publication_date_semantics || "SOURCE_PUBLICATION_DATE", evidence_kind: item.source.evidence_kind || null })),
      limitation: hasFreshLiveAdministrationDirectory(conflicting[0].source, now) ? "Verdict based on the live White House Administration directory fetched directly during this verification. The page did not expose a source publication date; retrieval time is recorded separately. Confirm the linked official page and its current content when relying on this result." : "Verdict based on a recent dated official-domain source identifying the office holder. Confirm the linked primary source and its effective date before relying on this result."
    }
  };
}

export function resolveClaimContext(claim, answer = "") {
  const original = String(claim || "").trim();
  const context = String(answer || "").slice(0, 12000);
  // Resolve a pronoun-led clause only when the answer contains an unambiguous,
  // explicitly named antecedent. Keep the user's original claim unchanged.
  const twitterMention = /\b(?:Twitter|X\s*\(formerly\s+Twitter\))\b/i.test(context);
  if (twitterMention && /^(?:its|their|it)\b/i.test(original)) {
    return { original_claim: original, resolved_claim: original.replace(/^(its|their|it)\b/i, "Twitter's"), entity: "Twitter / X", resolution: "EXPLICIT_ANTECEDENT_ALIAS" };
  }
  return { original_claim: original, resolved_claim: original, entity: null, resolution: "UNRESOLVED_OR_NOT_NEEDED" };
}


export function canonicalEvidenceTokens(value, normalizeTokens) {
  const text = String(value || "").replace(/\b(?:X\s*\(formerly\s+Twitter\)|formerly\s+Twitter)\b/gi, " Twitter ");
  const tokens = normalizeTokens(text);
  // X and Twitter are aliases for the same platform in this narrow, explicit
  // identity context; do not globally treat every standalone X as Twitter.
  if (/\btwitter\b/i.test(String(value || "")) || /\bX\b.{0,60}\b(?:brand|platform|social network|formerly)\b/i.test(String(value || ""))) tokens.push("twitter");
  return tokens;
}

export function buildTemporalSearchQuery(claim, year = new Date().getUTCFullYear(), context = "") {
  const text = String(claim || "").trim().slice(0, 1200);
  const contextText = String(context || "").slice(0, 2400);
  const combined = text + " " + contextText;
  // Preserve entity context across clauses while keeping each claim independently assessed.
  if (/\b(?:twitter|x)\b/i.test(combined) && /\b(?:brand|name|known|called|rebrand|renam|changed|change)\b/i.test(combined)) {
    return text + ' "X" "Twitter" official platform brand name rebrand X Corp ' + year;
  }
  return text;
}

export function isTwitterBrandIdentityClaim(claim) {
  return /\b(?:twitter|x)\b/i.test(String(claim || "")) &&
    /\b(?:currently|known as|brand|name|rebrand|renam(?:e|ed|ing)|chang(?:e|ed|ing)|formerly|called)\b/i.test(String(claim || ""));
}
export async function searchTwitterBrandIdentityEvidence(claim, year, search) {
  if (!isTwitterBrandIdentityClaim(claim)) return [];
  // Brand-identity claims need both present-day platform identity and historical
  // institutional evidence. Do not apply a one-year publication window to the
  // historical query: the original 2023 rebrand is material evidence in 2026.
  const [officialPlatform, institutionalHistory] = await Promise.all([
    search('site:about.x.com "Twitter" "X" official platform name rebrand ' + year, ["about.x.com"], { timeRange: null }),
    search('"X" "Twitter" social networking service renamed rebrand', ["loc.gov", "supremecourt.gov", "courtlistener.com"], { timeRange: null })
  ]);
  const seen = new Set();
  return [...officialPlatform, ...institutionalHistory].filter(source => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

export function extractDomainContext(rawContent) {
  const content = String(rawContent || "");
  const marker = content.toLowerCase().indexOf("administration president");
  return marker >= 0 ? content.slice(Math.max(0, marker - 120), marker + 520) : "";
}

function isOfficialNodeReleaseSource(url) {
  const value = String(url || "");
  return safeHost(value) === "nodejs.org" ||
    (safeHost(value) === "github.com" && /^https:\/\/github\.com\/nodejs\/Release\/(?:blob|tree)\//i.test(value)) ||
    (safeHost(value) === "raw.githubusercontent.com" && /^https:\/\/raw\.githubusercontent\.com\/nodejs\/Release\//i.test(value));
}

function parseNodeScheduleJson(content) {
  try {
    const parsed = JSON.parse(String(content || ""));
    const rows = [];
    for (const [key, value] of Object.entries(parsed)) {
      const match = key.match(/^v?(\d+)$/);
      if (!match || !value || typeof value !== "object") continue;
      rows.push({
        major: Number(match[1]),
        lts: value.lts || null,
        maintenance: value.maintenance || null,
        end: value.end || null,
        start: value.start || null,
        codename: value.codename || null
      });
    }
    return rows;
  } catch { return []; }
}

function parseNodeReleaseRows(content) {
  const text = String(content || "");
  const rows = [];
  const pattern = /\|?\s*v?(\d+)(?:\.x)?\s*\|\s*([^|]*)\|\s*([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})\s*\|\s*([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})\s*\|\s*(LTS|EOL|Current|Alpha)\b/gi;
  for (const match of text.matchAll(pattern)) {
    const firstReleased = Date.parse(match[3]);
    const lastUpdated = Date.parse(match[4]);
    if (!Number.isFinite(firstReleased) || !Number.isFinite(lastUpdated)) continue;
    rows.push({ major: Number(match[1]), first_released: new Date(firstReleased).toISOString().slice(0, 10), last_updated: new Date(lastUpdated).toISOString().slice(0, 10), status: match[5].toUpperCase() });
  }
  return rows;
}

export function assessNodeReleaseLifecycle(claim, sources, now = Date.now()) {
  const text = String(claim || "");
  const wantsLts = /\b(?:LTS|long[ -]term support)\b/i.test(text);
  const wantsLatestTrack = /\b(?:current|latest|newest)\b/i.test(text);
  const assertsOngoingSupport = wantsLts && /(?:\b(?:remains?|remain|still)\s+(?:actively\s+)?(?:supported|maintained|active)\b|\b(?:is|are)\s+(?:(?:currently|still)\s+)?(?:an?\s+)?(?:actively\s+)?(?:supported|maintained|active)\b)/i.test(text);
  const claimedMajorMatch = text.match(/\bNode\.?js\s+v?(\d+)(?:\.x|(?:\.\d+){0,2})?/i);
  if (!wantsLts || (!wantsLatestTrack && !assertsOngoingSupport) || !claimedMajorMatch) return { status: null, evidence: null };
  const claimedMajor = Number(claimedMajorMatch[1]);
  const candidates = [];
  for (const source of sources || []) {
    if (!isOfficialNodeReleaseSource(source.url)) continue;
    const content = String(source.content || source.snippet || "");
    const jsonRows = parseNodeScheduleJson(content);
    if (jsonRows.length) candidates.push({ source, kind: "SCHEDULE_JSON", rows: jsonRows });
    const tableRows = parseNodeReleaseRows(content);
    if (tableRows.length) candidates.push({ source, kind: "RELEASE_TABLE", rows: tableRows });
  }
  const freshness = candidate => {
    if (candidate.kind === "SCHEDULE_JSON") {
      const updatedAt = Date.parse(candidate.source.published_date || "");
      return Number.isFinite(updatedAt) ? updatedAt : 0;
    }
    const retrievedAt = Date.parse(candidate.source.retrieved_at || "");
    if (Number.isFinite(retrievedAt)) return retrievedAt;
    const dates = candidate.rows.map(row => Date.parse(row.last_updated || "")).filter(Number.isFinite);
    return dates.length ? Math.max(...dates) : 0;
  };
  // Prefer a complete immutable schedule row for the claimed major over
  // a more recently retrieved HTML table that only exposes EOL status and
  // "last updated". Retrieval recency must not erase lifecycle dates.
  const completeSchedule = candidates.filter(candidate =>
    candidate.kind === "SCHEDULE_JSON" &&
    candidate.rows.some(row => row.major === claimedMajor && row.lts && row.end)
  );
  const pool = completeSchedule.length ? completeSchedule : candidates;
  pool.sort((a, b) => freshness(b) - freshness(a));
  const best = pool[0];
  if (!best) return { status: null, evidence: null };
  if (best.kind === "SCHEDULE_JSON") {
    const updatedAt = Date.parse(best.source.published_date || "");
    if (!Number.isFinite(updatedAt) || updatedAt > now + 86400000 || (now - updatedAt) / 86400000 > 365) return { status: null, evidence: null };
    const row = best.rows.find(item => item.major === claimedMajor);
    if (!row || !row.lts || !row.end) return { status: null, evidence: null };
    const ltsAt = Date.parse(row.lts + "T00:00:00Z");
    const maintenanceAt = row.maintenance ? Date.parse(row.maintenance + "T00:00:00Z") : NaN;
    const endAt = Date.parse(row.end + "T23:59:59Z");
    if (![ltsAt, endAt].every(Number.isFinite)) return { status: null, evidence: null };
    const supportedNow = now >= ltsAt && now <= endAt;
    const latestLtsMajor = best.rows.filter(item => item.lts && Date.parse(item.lts + "T00:00:00Z") <= now && Date.parse(item.end + "T23:59:59Z") >= now).reduce((max, item) => Math.max(max, item.major), 0);
    const evidence = {
      method: "OFFICIAL_NODEJS_RELEASE_SCHEDULE_JSON",
      claimed_major: claimedMajor,
      support_status: supportedNow ? (Number.isFinite(maintenanceAt) && now >= maintenanceAt ? "MAINTENANCE_LTS" : "ACTIVE_LTS") : (now > endAt ? "EOL" : "NOT_YET_LTS"),
      lts_start: row.lts,
      maintenance_start: row.maintenance,
      end_of_life: row.end,
      latest_lts_major: latestLtsMajor,
      is_latest_lts_major: claimedMajor === latestLtsMajor,
      source: { title: best.source.title, url: best.source.url, published_date: best.source.published_date || null },
      limitation: "Derived from the official Node.js Release Working Group schedule.json. Dates are subject to change; this does not establish patch-level currency."
    };
    if (assertsOngoingSupport) return { status: supportedNow ? "CURRENT" : "SUPERSEDED", evidence };
    if (wantsLatestTrack) return { status: claimedMajor === latestLtsMajor ? "CURRENT" : "SUPERSEDED", evidence };
    return { status: null, evidence: null };
  }
  const ltsRows = best.rows.filter(row => row.status === "LTS");
  const latestLtsMajor = ltsRows.reduce((max, row) => Math.max(max, row.major), 0);
  const claimedRow = best.rows.find(row => row.major === claimedMajor);
  if (assertsOngoingSupport) {
    if (!claimedRow) return { status: null, evidence: null };
    const updatedAt = Date.parse(best.source.retrieved_at || claimedRow.last_updated || "");
    if (!Number.isFinite(updatedAt) || updatedAt > now + 86400000 || (now - updatedAt) / 86400000 > 365) return { status: null, evidence: null };
    if (claimedRow.status === "LTS" || claimedRow.status === "EOL") return {
      status: claimedRow.status === "LTS" ? "CURRENT" : "SUPERSEDED",
      evidence: { method: "OFFICIAL_NODEJS_RELEASE_TABLE_STATUS", claimed_major: claimedMajor, support_status: claimedRow.status, last_updated: claimedRow.last_updated, latest_lts_major: latestLtsMajor, is_latest_lts_major: claimedMajor === latestLtsMajor, source: { title: best.source.title, url: best.source.url, published_date: best.source.published_date || null, retrieved_at: best.source.retrieved_at || null }, limitation: "Official release table status; last_updated is the release row's update date, not its EOL date. Retrieval time is reported separately; this does not assess patch-level currency." }
    };
    return { status: null, evidence: null };
  }
  if (wantsLatestTrack && latestLtsMajor > 0) return {
    status: claimedMajor === latestLtsMajor ? "CURRENT" : "SUPERSEDED",
    evidence: { method: "OFFICIAL_NODEJS_LTS_TRACK_COMPARISON", claimed_major: claimedMajor, latest_lts_major: latestLtsMajor, claimed_major_still_listed_as_lts: claimedRow?.status === "LTS", source: { title: best.source.title, url: best.source.url, published_date: best.source.published_date || null }, limitation: "Official release table comparison; this does not assess patch-level currency." }
  };
  return { status: null, evidence: null };
}


const PYTHON_SUNSET_URL = "https://www.python.org/doc/sunset-python-2/";
function extractVisibleHtmlText(html) {
  return String(html || "")
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ").trim();
}
function validatesPython2SunsetText(value) {
  const text = String(value || "");
  const hasSunsetDate = /January\s+1(?:st)?[,]?\s+2020/i.test(text);
  const hasNoSupportStatement = /Python 2 is no longer supported/i.test(text)
    || /sunset(?:ted|ting)? Python 2/i.test(text)
    || /will not improve it anymore/i.test(text)
    || /no new bug reports, fixes, or changes will be made to Python 2/i.test(text);
  return hasSunsetDate && hasNoSupportStatement;
}
export async function fetchPython2SunsetEvidenceDetailed(fetchImpl = fetch, now = Date.now()) {
  const fetched = await fetchOfficialHtml(fetchImpl, PYTHON_SUNSET_URL, "python.org", 500000);
  if (!fetched.ok) return { sources: [], diagnostics: [{ provider: "PYTHON_ORG", ...fetched.diagnostic }] };
  if (!new URL(fetched.finalUrl).pathname.toLowerCase().startsWith("/doc/sunset-python-2")) {
    return { sources: [], diagnostics: [{ provider: "PYTHON_ORG", status: "PATH_REJECTED" }] };
  }
  const text = extractVisibleHtmlText(fetched.html);
  if (!validatesPython2SunsetText(text)) {
    return { sources: [], diagnostics: [{ provider: "PYTHON_ORG", status: "CONTENT_NOT_VALIDATED" }] };
  }
  const retrievedAt = new Date(now).toISOString();
  return {
    sources: [{
      title: "Sunsetting Python 2 | Python.org", url: fetched.finalUrl,
      snippet: text.slice(0, 1800), content: text, published_date: null,
      retrieved_at: retrievedAt, source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
      evidence_kind: "OFFICIAL_PYTHON2_SUNSET_NOTICE",
      event_date_candidate: "2020-01-01", event_date_basis: "OFFICIAL_SUNSET_STATEMENT",
      publication_date_semantics: "NOT_PROVIDED"
    }],
    diagnostics: [{ provider: "PYTHON_ORG", status: "VALIDATED", evidence_count: 1 }]
  };
}
export async function fetchPython2SunsetEvidence(fetchImpl = fetch, now = Date.now()) {
  return (await fetchPython2SunsetEvidenceDetailed(fetchImpl, now)).sources;
}

function isPython2EndOfLifeClaim(claim) {
  const value = String(claim || "");
  const namesPython2 = /\bpython\s*2(?:\.7)?\b/i.test(value);
  const englishSupportSignal = /(?:end of life|eol|sunset|support ended|no longer supported|reached end|(?:still\s+)?(?:officially|actively|currently)\s+supported|support(?:ed)?)/i.test(value);
  // Keep Arabic matching explicit so historical mentions of Python 2.7 alone do not activate the lifecycle adapter.
  const arabicSupportSignal = /(?:لا\s*يزال|لا\s*زالت|ما\s*زال|ما\s*زالت|مدعوم(?:اً|ا|ة)?|مدعومة|الدعم|انتهى\s+الدعم|لم\s+يعد\s+مدعوم|غير\s+مدعوم)/i.test(value);
  return namesPython2 && (englishSupportSignal || arabicSupportSignal);
}
const WHITE_HOUSE_SOCIAL_URL = "https://www.whitehouse.gov/";
export async function fetchWhiteHouseXIdentityEvidenceDetailed(fetchImpl = fetch, now = Date.now()) {
  const fetched = await fetchOfficialHtml(fetchImpl, WHITE_HOUSE_SOCIAL_URL, "whitehouse.gov", 1000000);
  if (!fetched.ok) return { sources: [], diagnostics: [{ provider: "WHITE_HOUSE", ...fetched.diagnostic }] };
  const links = [...fetched.html.matchAll(/href=["'](https?:\/\/(?:www\.)?x\.com\/whitehouse\/?(?:[?#][^"']*)?)["']/gi)].map(m => m[1]);
  if (!links.length) return { sources: [], diagnostics: [{ provider: "WHITE_HOUSE", status: "CLAIMED_HANDLE_LINK_NOT_FOUND" }] };
  const retrievedAt = new Date(now).toISOString();
  return {
    sources: [{
      title: "The White House — Official website social links", url: fetched.finalUrl,
      snippet: "The official White House website links to X account https://x.com/whitehouse in its own social-media links.",
      content: "First-party link on whitehouse.gov: https://x.com/whitehouse", published_date: null,
      retrieved_at: retrievedAt, source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
      evidence_kind: "FIRST_PARTY_OFFICIAL_SOCIAL_ACCOUNT_LINK",
      linked_account: "https://x.com/whitehouse", publication_date_semantics: "NOT_PROVIDED"
    }],
    diagnostics: [{ provider: "WHITE_HOUSE", status: "VALIDATED", evidence_count: 1 }]
  };
}
export async function fetchWhiteHouseXIdentityEvidence(fetchImpl = fetch, now = Date.now()) {
  return (await fetchWhiteHouseXIdentityEvidenceDetailed(fetchImpl, now)).sources;
}

const DOMAIN_ADAPTER_DEFINITIONS = [
  {
    id: "python2_lifecycle",
    scope: "Python 2.7 end-of-life and support claims",
    verdict_policy: "Only the official Python.org sunset notice may establish the Python 2 support end date.",
    resolve: claim => {
      if (!isPython2EndOfLifeClaim(claim)) return null;
      return {
        id: "python2_lifecycle",
        resolvedContext: { original_claim: claim, resolved_claim: claim, entity: "Python 2.7", resolution: "PYTHON2_EOL_PATTERN_MATCH" },
        primaryQuery: () => 'site:python.org/doc/sunset-python-2 "January 1, 2020" Python 2 no longer supported',
        primaryDomains: ["python.org"],
        additionalEvidence: async ({ fetch: fetchImpl, search }) => {
          const direct = await fetchPython2SunsetEvidenceDetailed(fetchImpl);
          if (direct.sources.length || typeof search !== "function") return direct;
          // Python.org may deny Cloudflare Worker egress (HTTP 403). Use a
          // domain-restricted search-index fallback, but accept only the exact
          // first-party sunset page and a snippet that contains the event date
          // and explicit end-of-support wording.
          const fallbackResults = await search(
            'site:python.org/doc/sunset-python-2 "January 1, 2020" "Python 2 is no longer supported"',
            ["python.org"],
            { timeRange: null }
          );
          const candidate = fallbackResults.find(source => {
            const url = String(source.url || "");
            try {
              const parsed = new URL(url);
              return safeHost(url) === "python.org"
                && parsed.pathname.toLowerCase().startsWith("/doc/sunset-python-2")
                && validatesPython2SunsetText(source.snippet || source.content || "");
            } catch { return false; }
          });
          if (!candidate) return {
            sources: [],
            diagnostics: [...(direct.diagnostics || []), {
              provider: "PYTHON_ORG",
              stage: "SEARCH_INDEX_FALLBACK",
              status: "NO_VALIDATED_FIRST_PARTY_RESULT"
            }]
          };
          const retrievedAt = new Date().toISOString();
          const excerpt = String(candidate.content || candidate.snippet || "");
          return {
            sources: [{
              title: candidate.title || "Sunsetting Python 2 | Python.org",
              url: candidate.url,
              snippet: excerpt.slice(0, 1800),
              content: excerpt,
              published_date: null,
              retrieved_at: retrievedAt,
              source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
              evidence_kind: "OFFICIAL_PYTHON2_SUNSET_NOTICE",
              event_date_candidate: "2020-01-01",
              event_date_basis: "OFFICIAL_SUNSET_STATEMENT",
              publication_date_semantics: "NOT_PROVIDED",
              acquisition_method: "TAVILY_INDEXED_FIRST_PARTY_PAGE",
              acquisition_limitation: "Python.org direct retrieval was denied; the official page URL and its date/support wording were validated from a domain-restricted search-index excerpt. The page itself was not fetched."
            }],
            diagnostics: [...(direct.diagnostics || []), {
              provider: "PYTHON_ORG",
              stage: "SEARCH_INDEX_FALLBACK",
              status: "VALIDATED_FIRST_PARTY_EXCERPT",
              evidence_count: 1
            }]
          };
        },
        strictSourceEligibility: true,
        rankSource: source => source.evidence_kind === "OFFICIAL_PYTHON2_SUNSET_NOTICE" && safeHost(source.url) === "python.org"
          ? { relevance: "HIGH", matched_terms: ["python 2", "end of life", "january 1 2020"], unmatched_terms: [], matched_term_count: 3, claim_term_count: 3, lexical_coverage: null, method: "OFFICIAL_PYTHON_ORG_EOL_NOTICE" }
          : null,
        priority: source => source.evidence_kind === "OFFICIAL_PYTHON2_SUNSET_NOTICE" ? 5 : 0,
        adjudicate: (sources, context = {}) => {
          const official = sources.find(source => source.evidence_kind === "OFFICIAL_PYTHON2_SUNSET_NOTICE" && safeHost(source.url) === "python.org" && validatesPython2SunsetText(source.content || source.snippet || ""));
          if (official) return { status: "SUPERSEDED", evidence: { method: "OFFICIAL_PYTHON_ORG_SUNSET_NOTICE", event_date: "2020-01-01", source: { title: official.title, url: official.url, publication_date: null, retrieved_at: official.retrieved_at, acquisition_method: official.acquisition_method || "DIRECT_FIRST_PARTY_FETCH" }, limitation: official.acquisition_limitation || "Python.org explicitly states that Python 2 was sunset on January 1, 2020 and is no longer supported. The source publication date is not provided; retrieval time is recorded separately." } };
          const retrievalStatus = context.retrievalDiagnostics?.find(item => item.provider === "PYTHON_ORG")?.status || "NOT_RECORDED";
          return { status: "NEEDS_REVIEW", evidence: { method: "OFFICIAL_SOURCE_NOT_OBTAINED", retrieval_status: retrievalStatus, limitation: `The official Python.org notice was not validated (retrieval status: ${retrievalStatus}); no lifecycle verdict is inferred.` } };
        }
      };
    }
  },
  {
    id: "whitehouse_x_identity",
    scope: "official White House X account identity",
    verdict_policy: "A first-party link from whitehouse.gov to x.com/whitehouse is required; search snippets and third-party directories alone are insufficient.",
    resolve: claim => {
      const text = String(claim || "");
      if (!/white house/i.test(text) || !/@whitehouse|x[.]com[/]whitehouse|official.{0,45}account|account.{0,45}official/i.test(text) || !/(^|[^a-z])(x|twitter)([^a-z]|$)/i.test(text)) return null;
      return {
        id: "whitehouse_x_identity",
        resolvedContext: { original_claim: text, resolved_claim: text, entity: "White House official X account", resolution: "FIRST_PARTY_SOCIAL_IDENTITY_PATTERN_MATCH" },
        primaryQuery: () => 'site:whitehouse.gov "x.com/whitehouse" OR "twitter.com/whitehouse"',
        primaryDomains: ["whitehouse.gov"],
        additionalEvidence: async ({ fetch: fetchImpl }) => fetchWhiteHouseXIdentityEvidenceDetailed(fetchImpl),
        strictSourceEligibility: true,
        rankSource: source => source.evidence_kind === "FIRST_PARTY_OFFICIAL_SOCIAL_ACCOUNT_LINK" && safeHost(source.url) === "whitehouse.gov"
          ? { relevance: "HIGH", matched_terms: ["white house", "x", "whitehouse"], unmatched_terms: [], matched_term_count: 3, claim_term_count: 3, lexical_coverage: null, method: "FIRST_PARTY_OFFICIAL_SOCIAL_LINK" }
          : null,
        priority: source => source.evidence_kind === "FIRST_PARTY_OFFICIAL_SOCIAL_ACCOUNT_LINK" ? 5 : 0,
        adjudicate: (sources, context = {}) => {
          const official = sources.find(source => source.evidence_kind === "FIRST_PARTY_OFFICIAL_SOCIAL_ACCOUNT_LINK" && safeHost(source.url) === "whitehouse.gov" && source.linked_account === "https://x.com/whitehouse");
          if (official) return { status: "CURRENT", evidence: { method: "FIRST_PARTY_OFFICIAL_WEBSITE_LINK", linked_account: official.linked_account, source: { title: official.title, url: official.url, retrieved_at: official.retrieved_at }, limitation: "The official White House website directly links to this X account. This verifies the institutional link, not the authenticity of every post or account security state." } };
          const retrievalStatus = context.retrievalDiagnostics?.find(item => item.provider === "WHITE_HOUSE")?.status || "NOT_RECORDED";
          return { status: "NEEDS_REVIEW", evidence: { method: "FIRST_PARTY_LINK_NOT_OBTAINED", retrieval_status: retrievalStatus, limitation: `No direct first-party White House link was validated (retrieval status: ${retrievalStatus}).` } };
        }
      };
    }
  },

  {
    id: "office_holder",
    scope: "explicit US presidential office-holder claims",
    verdict_policy: "Recent official evidence naming a different holder may yield CONTRADICTED; otherwise abstain.",
    resolve: (claim, _answer, isPrimaryDomain) => {
      const office = detectOfficeHolderClaim(claim);
      if (!office) return null;
      return {
        id: "office_holder",
        resolvedContext: { original_claim: claim, resolved_claim: claim, entity: "United States President", resolution: "ROLE_PATTERN_MATCH" },
        primaryQuery: year => office.query + " " + year,
        additionalEvidence: async ({ fetch: fetchImpl }) => fetchWhiteHouseAdministrationEvidenceDetailed(fetchImpl),
        primaryDomains: ["whitehouse.gov"],
        shouldFallback: sources => shouldRunOfficeHolderFallback(sources),
        fallbackQuery: year => 'site:whitehouse.gov/administration/ "President Donald J. Trump" "Vice President" "First Lady" ' + year,
        rankSource: source => {
          const holder = isPrimaryDomain(source.url) ? extractCurrentOfficeHolder(source) : null;
          return holder ? { relevance: "HIGH", matched_terms: [holder], unmatched_terms: [], matched_term_count: 1, claim_term_count: 1, lexical_coverage: null, method: "ROLE_SPECIFIC_OFFICEHOLDER_MATCH" } : null;
        },
        priority: () => 0,
        adjudicate: sources => adjudicateOfficeHolderClaim(claim, sources)
      };
    }
  },
  {
    id: "software_release",
    scope: "current/latest Node.js releases and LTS lifecycle claims",
    verdict_policy: "Official Node.js lifecycle listing may support a narrow latest-LTS-major comparison; patch-level and general release claims remain review-only.",
    resolve: (claim) => {
      const text = String(claim || "");
      const latestReleaseClaim = /\b(?:latest|newest|current|stable)\b/i.test(text);
      const ongoingLtsSupportClaim = /\b(?:LTS|long[ -]term support)\b/i.test(text) && /(?:\b(?:remains?|remain|still)\s+(?:actively\s+)?(?:supported|maintained|active)\b|\b(?:is|are)\s+(?:(?:currently|still)\s+)?(?:an?\s+)?(?:actively\s+)?(?:supported|maintained|active)\b)/i.test(text);
      if ((!latestReleaseClaim && !ongoingLtsSupportClaim) || !/\b(?:version|release|LTS|long[ -]term support)\b/i.test(text) || !/\bnode\.?js\b/i.test(text)) return null;
      return {
        id: "software_release",
        resolvedContext: { original_claim: text, resolved_claim: text, entity: "Node.js", resolution: "SOFTWARE_RELEASE_PATTERN_MATCH" },
        primaryQuery: () => {
          const major = text.match(/\bnode\.?js\s+v?(\d+)/i)?.[1] || "22";
          return /\b(?:LTS|long[ -]term support)\b/i.test(text)
            ? `Node.js v${major} official release schedule LTS maintenance end of life`
            : "Node.js latest stable release current version official downloads release notes";
        },
        primaryDomains: ["nodejs.org"],
        // Retrieve the canonical machine-readable schedule directly. Search snippets
        // are intentionally short and cannot be treated as complete JSON documents.
        additionalEvidence: async ({ fetch: fetchImpl }) => {
          if (!/\b(?:LTS|long[ -]term support)\b/i.test(text)) return [];
          const commitsUrl = "https://api.github.com/repos/nodejs/Release/commits?path=schedule.json&per_page=1";
          try {
            // Resolve the schedule commit first, then fetch the file from that exact
            // immutable revision so its content and publication metadata cannot race.
            let commitSha = null;
            let committedAt = null;
            try {
              const commitResponse = await fetchImpl(commitsUrl, {
                signal: AbortSignal.timeout(8000),
                headers: { accept: "application/vnd.github+json", "user-agent": "FreshProof-temporal-verifier" }
              });
              const commitType = commitResponse.headers?.get?.("content-type") || "";
              if (commitResponse.ok && responseMatchesExpectedSource(commitResponse, commitsUrl, "api.github.com", "/repos/nodejs/Release/commits") && /application\/json/i.test(commitType)) {
                const commits = await commitResponse.json();
                commitSha = commits?.[0]?.sha || null;
                committedAt = commits?.[0]?.commit?.committer?.date || null;
              }
            } catch { /* use the public GitHub Atom commit feed below */ }
            // Atom is a read-only public fallback when the GitHub REST API is
            // unavailable or rate-limited. It still resolves an immutable SHA.
            if (!commitSha || !committedAt) {
              const atomResponse = await fetchImpl("https://github.com/nodejs/Release/commits/main/schedule.json.atom", {
                signal: AbortSignal.timeout(8000),
                headers: { accept: "application/atom+xml, application/xml" }
              });
              const atomType = atomResponse.headers?.get?.("content-type") || "";
              if (atomResponse.ok && responseMatchesExpectedSource(atomResponse, "https://github.com/nodejs/Release/commits/main/schedule.json.atom", "github.com", "/nodejs/Release/commits/main/schedule.json.atom") && /(?:application\/atom\+xml|application\/xml|text\/xml)/i.test(atomType)) {
                const atom = await atomResponse.text();
                const shaMatch = atom.match(/Grit::Commit\/([a-f0-9]{40})/i);
                const dateMatch = atom.match(/<updated>\s*([^<]+)\s*<\/updated>/i);
                if (shaMatch && dateMatch) {
                  commitSha = shaMatch[1];
                  committedAt = dateMatch[1].trim();
                }
              }
            }
            const timestamp = committedAt ? Date.parse(committedAt) : NaN;
            if (typeof commitSha === "string" && /^[a-f0-9]{40}$/i.test(commitSha) &&
                Number.isFinite(timestamp) && timestamp <= Date.now() + 86400000 &&
                (Date.now() - timestamp) / 86400000 <= 365) {
              const rawUrl = `https://raw.githubusercontent.com/nodejs/Release/${commitSha}/schedule.json`;
              const rawResponse = await fetchImpl(rawUrl, {
                signal: AbortSignal.timeout(8000),
                headers: { accept: "application/json" }
              });
              const rawType = rawResponse.headers?.get?.("content-type") || "";
              if (rawResponse.ok && responseMatchesExpectedSource(rawResponse, rawUrl, "raw.githubusercontent.com", `/nodejs/Release/${commitSha}/schedule.json`) && /application\/json/i.test(rawType)) {
                const content = await rawResponse.text();
                if (content && content.length <= 65536) {
                  const schedule = JSON.parse(content);
                  const rows = schedule && typeof schedule === "object" && !Array.isArray(schedule)
                    ? Object.entries(schedule).filter(([key, row]) =>
                        /^v\d+$/.test(key) && row && typeof row === "object" &&
                        Number.isInteger(Number(key.slice(1))) && Number(key.slice(1)) > 0 &&
                        typeof row.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.start) &&
                        (row.lts == null || (typeof row.lts === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.lts))) &&
                        typeof row.end === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.end) &&
                        Number.isFinite(Date.parse(row.start + "T00:00:00Z")) &&
                        (row.lts == null || Number.isFinite(Date.parse(row.lts + "T00:00:00Z")) ) &&
                        Number.isFinite(Date.parse(row.end + "T23:59:59Z"))
                      ) : [];
                  if (rows.length) return [{
                    title: "Node.js Release Working Group — schedule.json",
                    url: rawUrl,
                    snippet: content.slice(0, 900),
                    content,
                    published_date: new Date(timestamp).toISOString().slice(0, 10),
                    source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
                    evidence_kind: "IMMUTABLE_OFFICIAL_RELEASE_SCHEDULE"
                  }];
                }
              }
            }
          } catch {
            // Fall through to the official Node.js release table below.
          }
          // Resilient first-party fallback: the Node.js project publishes the
          // release lifecycle table on its own domain. Its per-version
          // "Last updated" value is parsed separately from the page fetch date.
          try {
            const officialUrl = "https://nodejs.org/en/about/previous-releases";
            const response = await fetchImpl(officialUrl, {
              signal: AbortSignal.timeout(8000),
              headers: { accept: "text/html" }
            });
            if (!response.ok) return [];
            const finalUrl = response.url || officialUrl;
            if (safeHost(finalUrl) !== "nodejs.org" || !new URL(finalUrl).pathname.toLowerCase().startsWith("/en/about/previous-releases")) return [];
            if (!/text\/html/i.test(response.headers?.get?.("content-type") || "")) return [];
            const declaredLength = Number(response.headers?.get?.("content-length") || 0);
            if (declaredLength > 1000000) return [];
            const html = await response.text();
            if (!html || html.length > 1000000) return [];
            const textContent = html
              .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
              .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
              .replace(/<\/(?:td|th)>/gi, " | ")
              .replace(/<\/(?:tr)>/gi, "\n")
              .replace(/<[^>]+>/g, " ")
              .replace(/&nbsp;/gi, " ")
              .replace(/&amp;/gi, "&")
              .replace(/&#39;|&apos;/gi, "'")
              .replace(/&quot;/gi, '"')
              .replace(/\s+/g, " ");
            const rows = parseNodeReleaseRows(textContent);
            if (!rows.length) return [];
            return [{
              title: "Node.js — Official Previous Releases and Lifecycle Table",
              url: finalUrl,
              snippet: textContent.slice(0, 1200),
              content: textContent,
              // Retrieval time is recorded separately; it is not represented as
              // the source publication date or the version's last-update date.
              retrieved_at: new Date().toISOString(),
              published_date: null,
              source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
              evidence_kind: "OFFICIAL_NODEJS_RELEASE_TABLE"
            }];
          } catch {
            return [];
          }
        },
        strictSourceEligibility: true,
        // Search providers can occasionally return an empty result set for a
        // domain-restricted query. Retry once with a broader query, but retain
        // the official-host gate in rankSource so broader retrieval cannot
        // promote third-party pages into primary evidence.
        fallbackQuery: () => '"Node.js" latest release LTS Current version official release schedule',
        fallbackDomains: [],
        rankSource: (source, relevance) => {
          const text = String(source.title || "") + " " + String(source.snippet || "");
          const officialRelease = isOfficialNodeReleaseSource(source.url) && /\b(?:release|download|version|LTS|Current|schedule)\b/i.test(text);
          return officialRelease ? { ...relevance, relevance: relevance.relevance === "LOW" ? "MEDIUM" : relevance.relevance, method: "OFFICIAL_SOFTWARE_RELEASE_SOURCE", limitation: "Official project source lead; verify release channel (Current vs LTS) and release date before adjudication." } : null;
        },
        priority: source => isOfficialNodeReleaseSource(source.url) ? 2 : 0,
        adjudicate: (sources, context = {}) => assessNodeReleaseLifecycle(text, sources, context.now || Date.now())
      };
    }
  },
  {
    id: "official_pricing",
    scope: "official pricing claims for OpenAI and ChatGPT products",
    verdict_policy: "Official vendor pricing-source retrieval only; no automated truth verdict.",
    resolve: (claim) => {
      const text = String(claim || "");
      if (!/\b(?:price|pricing|cost|monthly|per month|subscription|plan)\b/i.test(text) || !/\b(?:OpenAI|ChatGPT)\b/i.test(text)) return null;
      return {
        id: "official_pricing",
        resolvedContext: { original_claim: text, resolved_claim: text, entity: "OpenAI / ChatGPT", resolution: "OFFICIAL_PRICING_PATTERN_MATCH" },
        primaryQuery: () => 'site:help.openai.com/en/articles/6950777-what-is-chatgpt-plus "ChatGPT Plus" "$20/month"',
        primaryDomains: ["help.openai.com"],
        additionalEvidence: async ({ fetch: fetchImpl, search }) => {
          const officialUrl = "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus";
          const fetched = await fetchOfficialHtml(fetchImpl, officialUrl, "help.openai.com", 300000);
          if (fetched.ok && responseMatchesExpectedSource({ url: fetched.finalUrl }, officialUrl, "help.openai.com", "/en/articles/6950777-what-is-chatgpt-plus")) {
            const textContent = decodeHtmlText(fetched.html
              .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " "));
            const priceMatch = textContent.match(/ChatGPT Plus[^.]{0,260}\$\s?20\s*\/\s*month|Price:\s*\$\s?20\s*\/\s*month/i);
            if (priceMatch) return {
              sources: [{
                title: "What is ChatGPT Plus? | OpenAI Help Center",
                url: fetched.finalUrl,
                snippet: priceMatch[0].slice(0, 420),
                content: textContent.slice(0, 12000),
                published_date: null,
                retrieved_at: new Date().toISOString(),
                source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
                evidence_kind: "OFFICIAL_CHATGPT_PLUS_PRICING_HELP_ARTICLE",
                publication_date_semantics: "NOT_PROVIDED"
              }],
              diagnostics: [{ provider: "OPENAI_HELP_CENTER", stage: "DIRECT_EVIDENCE", status: "VALIDATED_OFFICIAL_PRICING_ARTICLE", evidence_count: 1 }]
            };
          }
          if (typeof search === "function") {
            const results = await search('site:help.openai.com/en/articles/6950777-what-is-chatgpt-plus "ChatGPT Plus" "$20/month"', ["help.openai.com"], { timeRange: null });
            const candidate = results.find(item => {
              try {
                const url = new URL(item.url);
                return url.hostname === "help.openai.com" && url.pathname === "/en/articles/6950777-what-is-chatgpt-plus" && /ChatGPT Plus/i.test(item.title || "") && /\$\s?20\s*\/\s*month/i.test(item.snippet || item.content || "");
              } catch { return false; }
            });
            if (candidate) return {
              sources: [{
                title: candidate.title,
                url: candidate.url,
                snippet: String(candidate.snippet || candidate.content || "").slice(0, 900),
                published_date: candidate.published_date || null,
                retrieved_at: new Date().toISOString(),
                source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN",
                evidence_kind: "OFFICIAL_CHATGPT_PLUS_PRICING_HELP_ARTICLE",
                acquisition_method: "TAVILY_INDEXED_FIRST_PARTY_PAGE",
                acquisition_limitation: "The official Help Center page was not fetched directly; a domain-restricted indexed excerpt was validated.",
                publication_date_semantics: candidate.published_date ? "PROVIDER_PUBLICATION_DATE" : "NOT_PROVIDED"
              }],
              diagnostics: [{ provider: "OPENAI_HELP_CENTER", stage: "SEARCH_INDEX_FALLBACK", status: "VALIDATED_FIRST_PARTY_EXCERPT", evidence_count: 1 }]
            };
          }
          return { sources: [], diagnostics: [{ provider: "OPENAI_HELP_CENTER", stage: "DIRECT_EVIDENCE", status: fetched.diagnostic?.status || "NO_VALIDATED_OFFICIAL_PRICING_SOURCE", http_status: fetched.diagnostic?.http_status || null }] };
        },
        rankSource: (source, relevance) => {
          const host = safeHost(source.url);
          const official = host === "help.openai.com" && new URL(source.url).pathname === "/en/articles/6950777-what-is-chatgpt-plus" && /\b(?:price|pricing|Plus|plan|month|subscription)\b/i.test(String(source.title || "") + " " + String(source.snippet || ""));
          return official ? { ...relevance, relevance: relevance.relevance === "LOW" ? "MEDIUM" : relevance.relevance, method: "OFFICIAL_PRODUCT_PRICING_SOURCE", limitation: "Official vendor pricing source; confirm checkout currency, country, tax treatment, and effective date." } : null;
        },
        strictSourceEligibility: true,
        priority: source => safeHost(source.url) === "help.openai.com" ? 2 : 0,
        adjudicate: () => ({ status: null, evidence: null })
      };
    }
  },
  {
    id: "social_brand_identity",
    scope: "Twitter/X identity and rebranding claims",
    verdict_policy: "Retrieval enrichment only; never emits a truth verdict.",
    resolve: (claim, answer, isPrimaryDomain) => {
      const resolved = resolveClaimContext(claim, answer);
      if (!isTwitterBrandIdentityClaim(resolved.resolved_claim)) return null;
      return {
        id: "social_brand_identity",
        resolvedContext: resolved,
        primaryQuery: (year, retrievalClaim) => buildTemporalSearchQuery(retrievalClaim, year, answer),
        primaryDomains: [],
        additionalEvidence: ({ year, search }) => searchTwitterBrandIdentityEvidence(resolved.resolved_claim, year, search),
        rankSource: (source, relevance) => {
          const text = String(source.title || "") + " " + String(source.snippet || "");
          const lower = text.toLowerCase();
          const official = isPrimaryDomain(source.url) && (lower.includes("twitter") || (safeHost(source.url) === "x.com" && (lower.includes("platform") || lower.includes("social") || lower.includes(" x "))));
          return official && relevance.relevance === "LOW" ? { ...relevance, relevance: "MEDIUM", method: "OFFICIAL_DOMAIN_IDENTITY_LEAD", limitation: "Official-domain identity lead retained for review; this is not evidence of support or contradiction." } : null;
        },
        priority: source => isPrimaryDomain(source.url) ? 1 : 0,
        adjudicate: () => ({ status: null, evidence: null })
      };
    }
  }
];
export const DOMAIN_ADAPTERS = Object.freeze(DOMAIN_ADAPTER_DEFINITIONS.map(({ id, scope, verdict_policy }) => Object.freeze({ id, scope, verdict_policy })));
export function resolveDomainAdapter(claim, answer = "", isPrimaryDomain = () => false) {
  for (const adapter of DOMAIN_ADAPTER_DEFINITIONS) {
    const resolved = adapter.resolve(claim, answer, isPrimaryDomain);
    if (resolved) return resolved;
  }
  return null;
}