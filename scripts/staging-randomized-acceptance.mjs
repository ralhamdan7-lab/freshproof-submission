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
  {id:"stable-science-en",category:"science",text:"Water is composed of hydrogen and oxygen.",expectedClaims:1,stable:true},
  {id:"stale-software-ar",category:"technology",text:"لا يزال Python 2.7 مدعوماً رسمياً.",expectedClaims:1,expectedStatus:"SUPERSEDED"},
  {id:"stale-software-en",category:"technology",text:"Python 2.7 is still officially supported.",expectedClaims:1,expectedStatus:"SUPERSEDED"},
  {id:"obsolete-office-holder",category:"government",text:"Joe Biden is the current President of the United States.",expectedClaims:1,expectedStatus:"CONTRADICTED"},
  {id:"node-lifecycle-en",category:"technology",text:"Node.js v20 remains actively supported under LTS.",expectedClaims:1,expectedStatus:"SUPERSEDED"},
  {id:"openai-pricing-en",category:"economics-and-pricing",text:"ChatGPT Plus currently costs $20 per month in the United States.",expectedClaims:1,expectedStatus:"NEEDS_REVIEW"},
  {id:"health-emergency-history",category:"public-health",diagnostic:true,text:"The World Health Organization ended COVID-19's status as a Public Health Emergency of International Concern on 5 May 2023.",expectedClaims:1},
  {id:"law-regulation-eu-ai-act",category:"law-and-regulation",diagnostic:true,text:"The European Union AI Act entered into force on 1 August 2024.",expectedClaims:1},
  {id:"cybersecurity-tls",category:"cybersecurity",diagnostic:true,text:"TLS 1.0 and TLS 1.1 are deprecated and should not be used for secure communications.",expectedClaims:1,expectedStatus:"CURRENT"},
  {id:"geopolitics-brexit",category:"geopolitics",diagnostic:true,text:"The United Kingdom is currently a member of the European Union.",expectedClaims:1},
  {id:"corporate-leadership",category:"business",text:"Satya Nadella is the current Chief Executive Officer of Microsoft.",expectedClaims:1},
  {id:"space-history-jwst",category:"space",text:"The James Webb Space Telescope launched on 25 December 2021.",expectedClaims:1},
  {id:"transport-history-elizabeth-line",category:"transport",text:"The Elizabeth line opened to passengers in May 2022.",expectedClaims:1},
  {id:"sports-history-world-cup",category:"sports",text:"Argentina won the 2022 FIFA World Cup.",expectedClaims:1},
  {id:"multi-claim-mixed-time",category:"cross-domain",text:"Apollo 11 landed on the Moon in 1969. Water is composed of hydrogen and oxygen. Python 2.7 is still officially supported. Joe Biden is the current President of the United States.",expectedClaims:4,multi:true},
  {id:"multi-domain-five-claims",category:"cross-domain",text:"The World Health Organization ended COVID-19's status as a Public Health Emergency of International Concern on 5 May 2023. The European Union AI Act entered into force on 1 August 2024. TLS 1.0 and TLS 1.1 are deprecated for secure communications. The United Kingdom is currently a member of the European Union. Satya Nadella is the current Chief Executive Officer of Microsoft.",expectedClaims:5,multiDomain:true}
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
  if (body.product !== "FreshProof" || body.version !== "0.2.47" || !Array.isArray(body.claims)) {
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
    const sourceUrlsForClaim = new Set(claim.sources.map(source => canonicalSourceUrl(source.url)));
    for (const source of claim.sources) {
      const parsed = new URL(source.url);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error(item.id + ": source URL is not safe HTTPS.");
    }
    for (const basis of claim.explanation_detail.evidence_basis) {
      if (!basis.url || !sourceUrlsForClaim.has(canonicalSourceUrl(basis.url))) throw new Error(item.id + ": evidence basis references a source outside this claim's source set.");
    }
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
  if (item.diagnostic) {
    const claim = body.claims[0];
    console.log(JSON.stringify({
      diagnostic_case:item.id,
      final_status:claim.status,
      temporal_status:claim.temporal_assessment?.status,
      adjudication:claim.adjudication?.adjudication_signals ?? null,
      semantic_status:claim.semantic_assessment?.status ?? null,
      semantic_relations:(claim.semantic_assessment?.assessments || []).map(x=>({source_index:x.source_index,relation:x.relation,rationale:String(x.rationale || "").slice(0,180)})),
      sources:claim.sources.map(source=>({
        host:new URL(source.url).hostname,
        url:source.url,
        reliability:source.source_reliability,
        relevance:source.relevance_assessment?.relevance ?? null,
        published_date:source.published_date ?? null,
        event_date_candidate:source.event_date_candidate ?? null,
        snippet:String(source.snippet || "").slice(0,220)
      })),
      evidence_basis:claim.explanation_detail.evidence_basis.map(x=>({host:new URL(x.url).hostname,url:x.url,relation:x.relation,publication_date:x.publication_date,event_date_candidate:x.event_date_candidate}))
    }));
  }
  if (item.expectedStatus && body.claims[0].status !== item.expectedStatus) {
    throw new Error(item.id + ": expected " + item.expectedStatus + ", got " + body.claims[0].status);
  }
  if (item.multi || item.multiDomain) {
    const byText = body.claims.map(c => ({ text: String(c.text || "").toLowerCase(), claim: c }));
    const findClaim = needle => byText.find(x => x.text.includes(needle))?.claim;
    const water = findClaim("water");
    const apollo = findClaim("apollo 11");
    const python = findClaim("python 2.7");
    const officeHolder = findClaim("joe biden");
    if (item.multi && (!water || !apollo || !python || !officeHolder)) throw new Error("English multi-claim case lost or merged one of its four distinct claims.");
    if (item.multiDomain) {
      const health = findClaim("world health organization");
      const euAct = findClaim("european union ai act");
      const tls = findClaim("tls 1.0");
      const brexit = findClaim("united kingdom");
      const microsoft = findClaim("satya nadella");
      const domainClaims = [health,euAct,tls,brexit,microsoft];
      if (domainClaims.some(x => !x) || new Set(domainClaims.map(x => x.claim_id)).size !== 5) throw new Error("Cross-domain input lost or merged one or more of five distinct claims.");
      if (new Set(domainClaims.map(x => x.claim_id)).size !== domainClaims.length) throw new Error("Cross-domain claims do not have independent identifiers.");
      for (const claim of domainClaims) {
        if (!validStatuses.has(claim.status) || !validTemporal.has(claim.temporal_assessment?.status)) throw new Error("Cross-domain claim has an invalid adjudication or temporal status.");
        if (!Array.isArray(claim.sources) || !Array.isArray(claim.explanation_detail?.evidence_basis)) throw new Error("Cross-domain claim is missing claim-local evidence arrays.");
      }
      console.log(JSON.stringify({case:item.id,domains:domainClaims.map((claim,index)=>({domain:["public-health","law-and-regulation","cybersecurity","geopolitics","business"][index],status:claim.status,temporal_status:claim.temporal_assessment.status,source_count:claim.sources.length,correction_status:claim.correction.status}))}));
    }
    if (item.multi && (water.temporal_assessment.status !== "NOT_TIME_SENSITIVE" || apollo.temporal_assessment.status !== "NOT_TIME_SENSITIVE" || python.temporal_assessment.status !== "TEMPORAL_REVIEW_REQUIRED" || officeHolder.temporal_assessment.status !== "TEMPORAL_REVIEW_REQUIRED")) {
      throw new Error("English multi-claim case has incorrect claim-specific temporal classification.");
    }
    if (item.multi && (python.domain_adapter !== "python2_lifecycle" || python.status !== "SUPERSEDED" || python.correction.status !== "PROVIDED" || !(python.correction.evidence_refs || []).some(x => x.url === "https://www.python.org/doc/sunset-python-2/"))) {
      throw new Error("Python lifecycle evidence/correction was not retained on its own claim.");
    }
    if (item.multi && (officeHolder.domain_adapter !== "office_holder" || officeHolder.status !== "CONTRADICTED")) {
      throw new Error("Current office-holder contradiction was not retained on its own claim.");
    }
    if (item.multi) {
      console.log(JSON.stringify({case:item.id,claim_contracts:[
        {kind:"water",status:water.status,correction_status:water.correction.status,correction_text_present:Boolean(water.correction.text),correction_refs:water.correction.evidence_refs?.length ?? 0},
        {kind:"apollo",status:apollo.status,correction_status:apollo.correction.status,correction_text_present:Boolean(apollo.correction.text),correction_refs:apollo.correction.evidence_refs?.length ?? 0},
        {kind:"python",status:python.status,correction_status:python.correction.status,correction_refs:python.correction.evidence_refs?.length ?? 0},
        {kind:"office_holder",status:officeHolder.status,correction_status:officeHolder.correction.status,correction_refs:officeHolder.correction.evidence_refs?.length ?? 0}
      ]}));
      for (const [kind, claim] of [["water",water],["apollo",apollo]]) {
        if (claim.correction.status === "PROVIDED" || claim.correction.text || (claim.correction.evidence_refs || []).length > 0) {
          throw new Error("Correction/evidence leaked into unrelated " + kind + " claim.");
        }
      }
    }
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
    category:item.category,
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
console.log(JSON.stringify({suite:"staging-randomized-live-acceptance",seed:"0x46f2026",case_count:results.length,categories:[...new Set(results.map(x=>x.category))],results},null,2));
console.log("PASS: randomized-order live acceptance; claim isolation, temporal classification, evidence shape, correction citations, and abstention contracts verified.");
