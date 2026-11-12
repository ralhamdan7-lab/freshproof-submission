// Bounded, reproducible randomized-order live acceptance against the isolated Staging Worker.
const base = process.env.FRESH_PROOF_BASE_URL || "https://freshproof-staging.ralhamdan7.workers.dev";
const seed = 0x46f2026;
let state = seed >>> 0;
function random() { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x100000000; }
function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const cases = [
  {id:"stable-science-en",text:"Water is composed of hydrogen and oxygen.",expectedClaims:1,stable:true},
  {id:"stale-software-ar",text:"لا يزال Python 2.7 مدعوماً رسمياً.",expectedClaims:1,expectedStatus:"SUPERSEDED"},
  {id:"stale-software-en",text:"Python 2.7 is still officially supported.",expectedClaims:1,expectedStatus:"SUPERSEDED"},
  {id:"obsolete-office-holder",text:"Joe Biden is the current President of the United States.",expectedClaims:1,expectedStatus:"CONTRADICTED"},
  {id:"node-lifecycle-en",text:"Node.js v20 remains actively supported under LTS.",expectedClaims:1,expectedStatus:"SUPERSEDED"},
  {id:"openai-pricing-en",text:"ChatGPT Plus currently costs $20 per month in the United States.",expectedClaims:1,expectedStatus:"NEEDS_REVIEW"},
  {id:"multi-claim-mixed-time",text:"Apollo 11 landed on the Moon in 1969. Water is composed of hydrogen and oxygen. Python 2.7 is still officially supported.",expectedClaims:3,multi:true}
];
const validStatuses = new Set(["CURRENT","SUPERSEDED","CONTRADICTED","NEEDS_REVIEW","UNVERIFIABLE"]);
const validTemporal = new Set(["TIME_SENSITIVE","NOT_TIME_SENSITIVE","TEMPORAL_REVIEW_REQUIRED"]);
const validCorrection = new Set(["PROVIDED","WITHHELD","NOT_NEEDED","NONE"]);
function canonicalSourceUrl(value) {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  while (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
  return url.origin + url.pathname;
}
const results = [];
for (const item of shuffle(cases)) {
  const started = Date.now();
  const response = await fetch(base + "/api/verify", {
    method:"POST",
    headers:{"content-type":"application/json","origin":base},
    body:JSON.stringify({text:item.text}),
    signal:AbortSignal.timeout(60000)
  });
  const raw = await response.text();
  if (response.status !== 200) throw new Error(item.id + ": HTTP " + response.status + " — " + raw.slice(0,1200));
  const body = JSON.parse(raw);
  if (body.product !== "FreshProof" || body.version !== "0.2.46" || !Array.isArray(body.claims)) {
    throw new Error(item.id + ": unexpected product/version/claims response");
  }
  if (body.claims.length !== item.expectedClaims) {
    throw new Error(item.id + ": expected " + item.expectedClaims + " claims, got " + body.claims.length);
  }
  const ids = new Set();
  for (const claim of body.claims) {
    if (!claim.claim_id || ids.has(claim.claim_id)) throw new Error(item.id + ": missing or duplicate claim_id");
    ids.add(claim.claim_id);
    if (!validStatuses.has(claim.status)) throw new Error(item.id + ": invalid factual status " + claim.status);
    if (!validTemporal.has(claim.temporal_assessment?.status)) throw new Error(item.id + ": invalid/missing temporal assessment");
    if (!Array.isArray(claim.sources) || !Array.isArray(claim.explanation_detail?.evidence_basis)) throw new Error(item.id + ": malformed evidence/explanation arrays");
    if (!claim.correction || !validCorrection.has(claim.correction.status)) throw new Error(item.id + ": invalid correction status");
    if (claim.correction.status === "PROVIDED") {
      if (!claim.correction.text || !Array.isArray(claim.correction.evidence_refs) || claim.correction.evidence_refs.length === 0) {
        throw new Error(item.id + ": correction PROVIDED without text/evidence references");
      }
      const sourceUrls = new Set(claim.sources.map(s => canonicalSourceUrl(s.url)));
      for (const ref of claim.correction.evidence_refs) {
        if (!ref.url || !sourceUrls.has(canonicalSourceUrl(ref.url))) throw new Error(item.id + ": correction cites a URL not present in the claim source set after harmless query/trailing-slash normalization");
        if (claim.domain_adapter === "python2_lifecycle") {
          const source = claim.sources.find(s => canonicalSourceUrl(s.url) === canonicalSourceUrl(ref.url));
          const excerpt = String(source?.snippet || "");
          const hasSunsetDate = /January\s+1(?:st)?[,]?\s+2020/i.test(excerpt);
          const hasEndOfSupport = /Python 2 is no longer supported|sunset(?:ted|ting)? Python 2|will not improve it anymore|no new bug reports, fixes, or changes will be made to Python 2/i.test(excerpt);
          if (!hasSunsetDate || !hasEndOfSupport) throw new Error(item.id + ": Python correction citation does not expose the validated first-party sunset date and end-of-support wording");
        } else if (!ref.supporting_quote) {
          throw new Error(item.id + ": generic correction evidence reference lacks a verbatim supporting quote");
        }
      }
    }
  }
  if (item.stable) {
    const claim = body.claims[0];
    if (claim.temporal_assessment.status !== "NOT_TIME_SENSITIVE") throw new Error("stable control lacks NOT_TIME_SENSITIVE secondary classification");
    if (!["NEEDS_REVIEW","UNVERIFIABLE"].includes(claim.status)) throw new Error("stable control must still pass factual verification and abstain when evidence is insufficient");
    if (claim.correction.status !== "WITHHELD") throw new Error("stable unresolved control must not receive a correction");
  }
  if (item.expectedStatus && body.claims[0].status !== item.expectedStatus) {
    throw new Error(item.id + ": expected " + item.expectedStatus + ", got " + body.claims[0].status);
  }
  if (item.id === "node-lifecycle-en") {
    const claim = body.claims[0];
    if (claim.domain_adapter !== "software_release" || claim.domain_evidence?.support_status !== "EOL") {
      throw new Error("Node lifecycle claim lacks the official software-release EOL adjudication.");
    }
    if (!claim.domain_evidence?.source?.url || new URL(claim.domain_evidence.source.url).hostname !== "nodejs.org") {
      throw new Error("Node lifecycle verdict lacks the official Node.js source.");
    }
    if (claim.correction.status !== "WITHHELD") throw new Error("Node correction must remain withheld unless separately validated.");
  }
  if (item.id === "openai-pricing-en") {
    const claim = body.claims[0];
    if (claim.domain_adapter !== "official_pricing" || claim.status !== "NEEDS_REVIEW") {
      throw new Error("Official pricing must remain in review without independent price adjudication.");
    }
    const official = claim.sources.find(s => canonicalSourceUrl(s.url) === "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus" && /\$20\/month/i.test(s.snippet || ""));
    if (!official) throw new Error("Pricing result lacks the official Help Center monthly price excerpt.");
  }
  results.push({
    id:item.id,
    claim_count:body.claims.length,
    claims:body.claims.map(c=>({
      claim_id:c.claim_id,
      status:c.status,
      temporal_status:c.temporal_assessment.status,
      source_count:c.sources.length,
      evidence_basis_count:c.explanation_detail.evidence_basis.length,
      correction_status:c.correction.status,
      citation_refs:c.correction.evidence_refs?.length ?? 0
    })),
    elapsed_ms:Date.now()-started,
    search_budget:body.methodology?.search_budget ?? null
  });
}
console.log(JSON.stringify({suite:"staging-randomized-live-acceptance",seed:"0x46f2026",case_count:results.length,results},null,2));
console.log("PASS: randomized-order live acceptance; claim isolation, temporal classification, evidence shape, correction citations, and abstention contracts verified.");
