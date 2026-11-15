import test from "node:test";
import assert from "node:assert/strict";
import { classifyClaimFrame, extractDateAnchors } from "../worker/claim-frame.js";
const REF = "2026-11-15T12:00:00.000Z";

test("dated completed events override adversarial model temporal labels", () => {
  const cases = [
    ["The Larkspur Water Convention entered into force on 20 April 2006.","REGULATORY_STATE"],
    ["The Velmora Coastal Protocol entered into force on 16 February 2004.","CURRENT_STATE"],
    ["The Ardent Medicines Agency approved Quilomab on 8 December 2023.","LIFECYCLE"],
    ["أُطلقت المهمة في 7 أكتوبر 2024.","SCHEDULED_EVENT"]
  ];
  for (const [claim,modelFrame] of cases) {
    const r=classifyClaimFrame(claim,{referenceTime:REF,modelFrame});
    assert.equal(r.frame,"TIME_ANCHORED_EVENT",claim);
    assert.equal(r.basis,"DETERMINISTIC");
    assert.ok(r.disagreement);
  }
});
test("present office-holder, price and membership claims stay current-state",()=>{
  for(const claim of [
    "Jane Doe is currently the CEO of Example Corp.",
    "The subscription currently costs $20 per month.",
    "Finland is still a member of NATO.",
    "The treaty remains in force.",
    "تشغل أمينة صالح حالياً منصب وزيرة الصحة.",
    "تكلفة الاشتراك حالياً ٢٥ دولاراً شهرياً.",
    "فنلندا لا تزال عضواً في حلف الناتو.",
    "الاتفاقية سارية المفعول حالياً."
  ]) assert.equal(classifyClaimFrame(claim,{referenceTime:REF,modelFrame:"HISTORICAL_EVENT"}).frame,"CURRENT_STATE",claim);
});
test("past state is distinguished from current state",()=>{
  assert.equal(classifyClaimFrame("She was the minister in 2018.",{referenceTime:REF}).frame,"STATE_AT_PAST_TIME");
});
test("future scheduled claims are not treated as current",()=>{
  assert.equal(classifyClaimFrame("The regulation is scheduled to take effect on 1 January 2027.",{referenceTime:REF}).frame,"SCHEDULED_FUTURE");
});
test("mixed past event and present state cues abstain at frame stage",()=>{
  assert.equal(classifyClaimFrame("The policy was approved in 2024 and remains in force.",{referenceTime:REF}).frame,"MIXED_OR_AMBIGUOUS");
});
test("model-only current-state label cannot temporalise stable text",()=>{
  const r=classifyClaimFrame("The Pacific Ocean is the largest ocean on Earth.",{referenceTime:REF,modelFrame:"CURRENT_STATE"});
  assert.equal(r.frame,"STABLE_FACT");assert.equal(r.is_time_sensitive,false);assert.ok(r.disagreement);
});
test("Arabic month dates and Arabic-Indic digits are normalized",()=>{
  const a=extractDateAnchors("دخلت الاتفاقية حيز التنفيذ في ٢٠ أبريل ٢٠٠٦.");
  assert.equal(a.length,1);assert.equal(a[0].normalized,"2006-04-20");assert.equal(a[0].precision,"DAY");
  assert.equal(classifyClaimFrame("دخلت الاتفاقية حيز التنفيذ في ٢٠ أبريل ٢٠٠٦.",{referenceTime:REF}).frame,"TIME_ANCHORED_EVENT");
});
test("Hijri date is retained without Gregorian conversion",()=>{
  const a=extractDateAnchors("وقع الاتفاق في ٢٠ رمضان ١٤٤٧هـ.");
  assert.equal(a[0].calendar,"HIJRI");assert.equal(a[0].normalized,null);
});
test("relative dates remain unresolved without an explicit resolver",()=>{
  const r=classifyClaimFrame("The minister was appointed last Monday.",{referenceTime:REF});
  assert.equal(r.anchors[0].precision,"RELATIVE");assert.equal(r.frame,"UNRESOLVED");
});
test("invalid reference time is rejected",()=>{
  assert.throws(()=>classifyClaimFrame("A neutral statement.",{referenceTime:"not-a-date"}),/valid date/);
});
test("80 English and Arabic dated events cannot be upgraded by semantic model",()=>{
  const en=["entered into force","was approved","was adopted","was signed","was launched","was released","was announced","was declared","was founded","was established"];
  const ar=["دخل حيز التنفيذ","اعتُمد","أُقر","وُقّع","أُطلق","أُعلن","تأسس","أُنشئ","افتُتح","اختُتم"];
  const years=[2001,2004,2007,2010];let n=0;
  for(const v of en)for(const y of years){assert.equal(classifyClaimFrame("The measure "+v+" in "+y+".",{referenceTime:REF,modelFrame:"REGULATORY_STATE"}).frame,"TIME_ANCHORED_EVENT",v+" "+y);n++;}
  for(const v of ar)for(const y of years){assert.equal(classifyClaimFrame("الاتفاقية "+v+" في "+y+".",{referenceTime:REF,modelFrame:"REGULATORY_STATE"}).frame,"TIME_ANCHORED_EVENT",v+" "+y);n++;}
  assert.equal(n,80);
});
test("same-year and ambiguous numeric dates are not guessed to be past",()=>{
  assert.equal(classifyClaimFrame("The rule entered into force in 2026.",{referenceTime:REF}).frame,"UNRESOLVED");
  assert.equal(classifyClaimFrame("The act was signed on 04/05/2020.",{referenceTime:REF}).frame,"UNRESOLVED");
});
test("month precision is preserved without inventing a day",()=>{
  const en=extractDateAnchors("The policy took effect in April 2006.");
  const ar=extractDateAnchors("دخل النظام حيز التنفيذ في أبريل ٢٠٠٦.");
  assert.equal(en[0].precision,"MONTH");assert.equal(en[0].normalized,"2006-04");
  assert.equal(ar[0].precision,"MONTH");assert.equal(ar[0].normalized,"2006-04");
});
// v0.2.84: a bare copula is not temporal evidence. Only typed mutable states
// (office, membership, price, regulation in force, lifecycle, name/capital,
// statistic) or explicit present markers create a current-state frame.
test("stable facts with 'is the' / 'are the' stay stable even when the model says CURRENT_STATE", () => {
  for (const claim of [
    "The Pacific Ocean is the largest ocean on Earth.",
    "Water is composed of hydrogen and oxygen.",
    "A triangle has three sides.",
    "Mount Arvel is the tallest peak in the Larkspur range.",
    "Light is faster than sound.",
    "يتكون الماء من الهيدروجين والأكسجين.",
    "المحيط الهادئ هو أكبر محيطات الأرض."
  ]) {
    const r = classifyClaimFrame(claim, { referenceTime: REF, modelFrame: "CURRENT_STATE" });
    assert.equal(r.frame, "STABLE_FACT", claim);
    assert.equal(r.requires_recent_evidence, false, claim);
  }
});
test("typed mutable states are current-state without an explicit 'currently'", () => {
  for (const [claim, cls] of [
    ["John Doe is CEO of Acme.", "OFFICE_HOLDER"],
    ["Velmora is a member of the Coastal Union.", "MEMBERSHIP"],
    ["The Ardent ferry pass costs 20 credits.", "PRICE_FEE"],
    ["Brasília is the capital of Brazil.", "NAME_IDENTITY"],
    ["The population of Ardent is 3 million.", "STATISTIC"],
    ["The current policy applies to public agencies.", "REGULATION_IN_FORCE"],
    ["يشغل خالد ناصر منصب وزير النقل.", "OFFICE_HOLDER"],
    ["عاصمة أردنت هي مدينة لاركسبر.", "NAME_IDENTITY"]
  ]) {
    const r = classifyClaimFrame(claim, { referenceTime: REF });
    assert.equal(r.frame, "CURRENT_STATE", claim);
    assert.equal(r.state_class, cls, claim);
    assert.equal(r.requires_recent_evidence, true, claim);
  }
});
test("time-anchored events never require recent evidence; relative events seek latest sources", () => {
  const event = classifyClaimFrame("The Larkspur Water Convention entered into force on 20 April 2006.", { referenceTime: REF });
  assert.equal(event.requires_recent_evidence, false);
  assert.equal(event.seeks_latest_sources, false);
  const relative = classifyClaimFrame("The coastal custom took effect last Thursday.", { referenceTime: REF });
  assert.equal(relative.frame, "UNRESOLVED");
  assert.equal(relative.seeks_latest_sources, true);
  assert.equal(relative.requires_recent_evidence, false);
});
