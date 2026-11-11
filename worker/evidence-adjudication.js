// Deterministic, conservative claim-level evidence adjudication.
const VALID_RELATIONS = new Set(["SUPPORTS","CONTRADICTS","MIXED","IRRELEVANT","INSUFFICIENT"]);
const DAY = 86400000;
function hostOf(url) { try { return new URL(url).hostname.toLowerCase().replace(/^www\./,""); } catch { return ""; } }
function validDate(value) { const n = Date.parse(value || ""); return Number.isFinite(n) ? n : null; }
function recentDated(source, now, maxAgeDays) { const date=validDate(source.published_date); return date!==null && date<=now+DAY && now-date<=maxAgeDays*DAY; }
function uniqueHosts(items) { return new Set(items.map(x=>hostOf(x.url)).filter(Boolean)); }
function relationMap(assessment,count) { const map=new Map(); for(const item of assessment?.assessments||[]) if(Number.isInteger(item.source_index)&&item.source_index>=0&&item.source_index<count&&VALID_RELATIONS.has(item.relation)) map.set(item.source_index,item.relation); return map; }
function evidenceItem(source,relation,index) { return {source_index:index,title:source.title||"",url:source.url,published_date:source.published_date||null,event_date_candidate:source.event_date_candidate||null,source_reliability:source.source_reliability||"UNKNOWN",relation}; }

/**
 * Time-sensitive claims require recent primary/official evidence.
 * Stable claims still undergo factual review; they may use independent
 * primary or institutional sources without an arbitrary publication-age gate.
 * In both paths, source relevance alone is never treated as semantic support.
 */
export function adjudicateEvidence({claim,sources=[],semanticAssessment=null,domainResult=null,crossSourceConflicts=[],now=Date.now(),maxEvidenceAgeDays=180,temporalSensitive=true}={}) {
  if(domainResult?.status&&["CURRENT","SUPERSEDED","CONTRADICTED","UNVERIFIABLE","NEEDS_REVIEW","NOT_TIME_SENSITIVE"].includes(domainResult.status)) return {status:domainResult.status,method:"DOMAIN_SPECIFIC_RULE",rationale:"A narrowly scoped domain adapter supplied an explicit adjudication result.",evidence:domainResult.evidence||null,adjudication_signals:{semantic_relations:"ADVISORY_ONLY"}};
  if(!sources.length) return {status:"UNVERIFIABLE",method:"INSUFFICIENT_EVIDENCE",rationale:"No usable evidence sources were available; no factual verdict was inferred.",evidence:[],adjudication_signals:{dated_sources:0,independent_domains:0,temporal_sensitive:!!temporalSensitive}};
  const relations=relationMap(semanticAssessment,sources.length);
  const eligible=sources.map((source,index)=>({source,index,relation:relations.get(index)||"UNASSESSED"})).filter(x=>x.source.relevance_assessment?.relevance!=="LOW"&&x.source.url);
  const dated=eligible.filter(x=>recentDated(x.source,now,maxEvidenceAgeDays));
  const qualified=temporalSensitive
    ? dated.filter(x=>x.source.source_reliability==="PRIMARY_OR_OFFICIAL_DOMAIN")
    : eligible.filter(x=>["PRIMARY_OR_OFFICIAL_DOMAIN","INSTITUTIONAL"].includes(x.source.source_reliability));
  const supporting=qualified.filter(x=>x.relation==="SUPPORTS"), contradicting=qualified.filter(x=>x.relation==="CONTRADICTS");
  const supportHosts=uniqueHosts(supporting.map(x=>x.source)), contradictHosts=uniqueHosts(contradicting.map(x=>x.source));
  const conflict=crossSourceConflicts.length>0||eligible.some(x=>x.relation==="MIXED");
  const signals={temporal_sensitive:!!temporalSensitive,dated_sources:dated.length,qualified_sources:qualified.length,independent_supporting_domains:supportHosts.size,independent_contradicting_domains:contradictHosts.size,semantic_relations:semanticAssessment?.status||"UNAVAILABLE",cross_source_conflict_candidates:crossSourceConflicts.length,event_dates_kept_separate:true};
  if(!conflict&&contradictHosts.size>=2) return {status:"CONTRADICTED",method:temporalSensitive?"CORROBORATED_RECENT_PRIMARY_EVIDENCE":"CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE",rationale:"Two independent eligible sources were classified as contradicting the exact claim; review the linked evidence and scope.",evidence:contradicting.map(x=>evidenceItem(x.source,x.relation,x.index)),adjudication_signals:signals};
  if(!conflict&&supportHosts.size>=2) return {status:"CURRENT",method:temporalSensitive?"CORROBORATED_RECENT_PRIMARY_EVIDENCE":"CORROBORATED_PRIMARY_OR_INSTITUTIONAL_EVIDENCE",rationale:temporalSensitive?"Two independent, recent primary/official sources support the claim within the retrieved scope. Publication dates are not treated as event dates.":"Two independent primary/official or institutional sources support the claim within the retrieved scope. A publication-age requirement was not applied because the claim was classified as not time-sensitive.",evidence:supporting.map(x=>evidenceItem(x.source,x.relation,x.index)),adjudication_signals:signals};
  const mixed=eligible.some(x=>x.relation==="CONTRADICTS")&&eligible.some(x=>x.relation==="SUPPORTS");
  const status=conflict||mixed||qualified.length||eligible.length?"NEEDS_REVIEW":"UNVERIFIABLE";
  return {status,method:"CONSERVATIVE_EVIDENCE_ADJUDICATION",rationale:status==="UNVERIFIABLE"?"No usable evidence was obtained; no truth verdict is inferred.":"Evidence did not meet the independent-source and semantic-relation threshold. Search relevance, source profile, and model availability are not proof of support or contradiction.",evidence:eligible.map(x=>evidenceItem(x.source,x.relation,x.index)),adjudication_signals:{...signals,independent_dated_domains:uniqueHosts(dated.map(x=>x.source)).size,semantic_support_contradiction_mix:mixed}};
}
