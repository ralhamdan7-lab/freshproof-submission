// FreshProof v0.2.84 — publisher identity (telemetry and first-party confirmation).
//
// Reads what a fetched page declares about its own publisher (JSON-LD
// Organization name, og:site_name, trailing title segment) and whether the
// claim names that organisation. It is recorded in the source trace and the
// JSON-LD name also feeds first-party page confirmation. It never confers
// authority by itself: a page can declare any identity, so authority still
// requires the registrable-domain first-party match plus semantic
// originating confirmation. No topic or publisher list is used.

const GENERIC_NAME_WORDS = new Set([
  "home", "homepage", "official", "website", "site", "portal", "page", "news", "newsroom", "press", "media",
  "welcome", "the", "of", "and", "for", "in", "on", "at", "to", "a", "an", "de", "la", "le", "du", "des",
  "government", "ministry", "department", "agency", "office", "organization", "organisation", "national",
  "international", "world", "global", "public", "information", "services", "service", "online", "about",
  "convention", "union", "council", "commission", "authority", "institute", "university", "foundation",
  "corporation", "company", "group", "association", "society", "center", "centre", "bank", "court"
]);
const ORG_TYPES = /"@type"\s*:\s*(?:\[[^\]]*?)?"(GovernmentOrganization|Organization|NGO|EducationalOrganization|CollegeOrUniversity|Corporation|ResearchOrganization|MedicalOrganization|NewsMediaOrganization)"/;

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[’'`]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Organisation name declared in JSON-LD, if any (bounded scan of the blocks). */
export function declaredOrganization(ldBlocks = []) {
  for (const block of ldBlocks.slice(0, 6)) {
    const text = String(block || "").slice(0, 20000);
    const typeMatch = text.match(ORG_TYPES);
    if (!typeMatch) continue;
    // Prefer "publisher"/"author" organisation names, then any "name" near the type.
    const publisher = text.match(/"(?:publisher|sourceOrganization|author)"\s*:\s*\{[^{}]{0,600}?"name"\s*:\s*"([^"]{2,160})"/);
    const near = text.slice(Math.max(0, typeMatch.index - 400), typeMatch.index + 600).match(/"name"\s*:\s*"([^"]{2,160})"/);
    const name = publisher?.[1] || near?.[1];
    if (name) return { name, type: typeMatch[1] };
  }
  return null;
}

/**
 * Name keys for matching.
 *  - phrases: normalised full name (parenthesised acronyms removed); matched case-insensitively.
 *  - acronyms: upper-case acronyms / initialisms; matched case-sensitively so ordinary words
 *    ("who", "un") in a sentence never count as naming an organisation.
 */
export function organizationKeys(name) {
  const raw = String(name || "").trim();
  if (!raw) return { phrases: [], acronyms: [] };
  const phrases = new Set();
  const acronyms = new Set();
  const withoutParens = raw.replace(/\([^)]*\)/g, " ");
  const full = normalize(withoutParens);
  const significant = full.split(" ").filter(word => word.length > 1 && !GENERIC_NAME_WORDS.has(word));
  if (significant.length >= 2 || (significant.length === 1 && significant[0].length >= 4)) phrases.add(full);
  for (const match of raw.matchAll(/\(([A-Z][A-Za-z0-9&.\-]{1,14})\)/g)) acronyms.add(match[1].replace(/\./g, ""));
  for (const match of raw.matchAll(/\b([A-Z][A-Z0-9&]{2,9})\b/g)) acronyms.add(match[1]);
  const capitalised = withoutParens.split(/[\s\-–—|:]+/).filter(word => /^[A-Z]/.test(word));
  if (capitalised.length >= 3 && capitalised.length <= 8) acronyms.add(capitalised.map(word => word[0]).join(""));
  return {
    phrases: [...phrases].filter(key => key.length >= 4),
    acronyms: [...acronyms].filter(key => key.length >= 3 && /[A-Z]{2}/.test(key))
  };
}

/** Does the claim name the organisation? Whole-phrase / whole-token match only. */
export function claimNamesOrganization(claim, name) {
  const keys = organizationKeys(name);
  const text = " " + normalize(claim) + " ";
  const phrase = keys.phrases.find(key => text.includes(" " + key + " "));
  if (phrase) return phrase;
  const original = String(claim || "");
  return keys.acronyms.find(key => new RegExp(`(?:^|[^A-Za-z0-9])${key.replace(/[&]/g, "\\&")}(?:$|[^A-Za-z0-9])`).test(original)) || null;
}

/**
 * Assess what the fetched page says about its own publisher and whether the
 * claim is about that publisher.
 * @returns {{publisher_name: string|null, identity_evidence: string[], organization_type: string|null, claim_named_key: string|null}}
 */
export function assessPublisherIdentity({ siteName = null, title = null, organization = null } = {}, claim = "") {
  const candidates = [];
  if (organization?.name) candidates.push({ name: organization.name, evidence: "JSONLD_ORGANIZATION" });
  if (siteName) candidates.push({ name: siteName, evidence: "OG_SITE_NAME" });
  if (title) {
    // Publisher names usually sit at one end of the title, after a separator.
    // Only the trailing segment of a separated title is treated as a publisher name; the
    // leading segment usually names the topic and would trivially "match" the claim.
    const parts = String(title).split(/\s+[|\-–—]\s+/).map(part => part.trim()).filter(Boolean);
    if (parts.length > 1) candidates.push({ name: parts[parts.length - 1], evidence: "PAGE_TITLE_SUFFIX" });
  }
  for (const candidate of candidates) {
    const key = claimNamesOrganization(claim, candidate.name);
    if (key) return { publisher_name: candidate.name.slice(0, 160), identity_evidence: [candidate.evidence], organization_type: organization?.type || null, claim_named_key: key };
  }
  const first = candidates[0];
  return { publisher_name: first ? first.name.slice(0, 160) : null, identity_evidence: first ? [first.evidence] : [], organization_type: organization?.type || null, claim_named_key: null };
}

/**
 * First-party confirmation by acronym: the page declares an organisation, the
 * claim names that same organisation, and the organisation's acronym or compact
 * name equals the domain key that matched the claim (e.g. a page declaring
 * "Quilomab Standards Council" on qsc.org for a claim naming that council).
 */
export function publisherNameMatchesDomainKey(document, claim, domainKey) {
  const key = String(domainKey || "").toLowerCase();
  if (key.length < 3) return false;
  const candidates = [document?.organization?.name, document?.site_name].filter(Boolean);
  const title = String(document?.title || "").split(/\s+[|\-–—]\s+/);
  if (title.length > 1) candidates.push(title[title.length - 1]);
  return candidates.some(name => {
    if (!claimNamesOrganization(claim, name)) return false;
    const keys = organizationKeys(name);
    if (keys.acronyms.some(acronym => acronym.toLowerCase() === key)) return true;
    return keys.phrases.some(phrase => phrase.replace(/ /g, "") === key);
  });
}
