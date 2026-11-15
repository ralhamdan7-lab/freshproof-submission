const EN_MONTHS = new Map([
  ["january","01"],["february","02"],["march","03"],["april","04"],["may","05"],["june","06"],
  ["july","07"],["august","08"],["september","09"],["october","10"],["november","11"],["december","12"]
]);
const AR_MONTHS = new Map([
  ["يناير","01"],["فبراير","02"],["مارس","03"],["أبريل","04"],["ابريل","04"],["مايو","05"],
  ["يونيو","06"],["يوليو","07"],["أغسطس","08"],["اغسطس","08"],["سبتمبر","09"],["أكتوبر","10"],
  ["اكتوبر","10"],["نوفمبر","11"],["ديسمبر","12"]
]);
const HIJRI_MONTHS = new Set(["محرم","صفر","ربيع الأول","ربيع الآخر","ربيع الثاني","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"]);
const EVENT = /\b(?:entered into force|came into force|took effect|approved|adopted|enacted|passed|signed|launched|released|announced|declared|founded|established|opened|closed|occurred|happened|joined|withdrew|ratified|concluded|started|began|ended|abolished|introduced|issued|elected|appointed|won|lost|died|was born|became|was renamed|renamed|merged|dissolved|expired|repealed|amended|was replaced|resigned|retired|discovered|completed|inaugurated|fell|collapsed|took office|left office)\b/i;
const EVENT_AR = /(?:دخل(?:ت)?[^.!؟]{0,40}حيز التنفيذ|أصبح(?:ت)?|صار(?:ت)?|تحول(?:ت)?|أُعيدت? تسمية|اعتُمد|اعتمد|أُقر|أقر|وُقّع|وقع|أُطلق|أطلق|أُعلن|أعلن|تأسس|تأسست|أُنشئ|أنشئ|افتُتح|افتتح|أُغلق|أغلق|انضم|انسحب|صُودق عليه|تمت المصادقة|اختُتم|اختتم|بدأ|انتهى|أُلغي|ألغي|استحدث|انتُخب|انتخب|عُيّن|عين|فاز|خسر|توفي|وُلد|ولد)/u;
const PAST_STATE = /\b(?:was|were|served as|held the position of|was a member|was the|were the)\b|(?:كان|كانت|كانوا|كان عضوا|كانت عضوا|كان يشغل|كانت تشغل|كان في منصب|كانت في منصب)/iu;
// Explicit present-time markers: these alone establish a current-state frame.
const PRESENT = /\b(?:currently|current|at present|now|still|remains?|is now|are now|as of today|in office|serves as|is still|are still)\b|(?:حالياً|حاليًا|الحالي|الحالية|الآن|لا يزال|لا تزال|ما زال|ما تزال|يشغل حالياً|تتولى حالياً|في الوقت الحالي|ساري المفعول حالياً)/iu;
// Present-tense predicates are only a current-state cue when the attribute is
// a typed mutable state (office, membership, price, regulation in force,
// lifecycle, official name/capital, statistic). A bare copula ("X is the
// largest ocean") is not temporal evidence; it stays a stable fact.
const PRESENT_PREDICATE = /\b(?:is|are|has|have|serves as|holds|leads|heads|runs|chairs|costs|charges|belongs to|owns|remains)\b|(?:\sهو\s|\sهي\s|يشغل|تشغل|يتولى|تتولى|يرأس|ترأس|يكلف|تكلف|يبلغ|تبلغ|ينتمي|تنتمي|عضو(?:ة)? في|ساري(?:ة)? المفعول|مدعوم(?:ة)?|متاح(?:ة)?)/iu;
const FUTURE = /\b(?:will|shall|is scheduled to|are scheduled to|is expected to|is planned to|is due to|is set to)\b|(?:سيتم|سوف|من المقرر أن|مقرر أن|سيكون|ستكون|من المتوقع أن)/iu;
const ATTRIBUTED = /\b(?:according to|the study found|researchers found|the report states|the report found|the survey found|the paper concludes|the authors report)\b|(?:وفقاً لـ|وفقًا لـ|بحسب|وجدت الدراسة|خلصت الدراسة|ذكر التقرير|أفاد التقرير|توصل الباحثون)/iu;
const NON_FACTUAL = /\b(?:i think|i believe|in my opinion|should|ought to|is better|is worse|beautiful|unfair|unjust|probably|might|may be the best)\b|(?:أعتقد|أرى أن|برأيي|من وجهة نظري|ينبغي|يجب أن|أفضل|أسوأ|جميل|غير عادل|ربما|قد يكون الأفضل)/iu;
const RELATIVE = /\b(?:yesterday|today|tomorrow|last week|last month|last year|last monday|last tuesday|last wednesday|last thursday|last friday|last saturday|last sunday|next week|next month|next year|recently|this morning|two days ago|a week ago)\b|(?:أمس|اليوم|غداً|غدًا|الأسبوع الماضي|الشهر الماضي|العام الماضي|السنة الماضية|الاثنين الماضي|الثلاثاء الماضي|الأربعاء الماضي|الخميس الماضي|الجمعة الماضية|السبت الماضي|الأحد الماضي|الأسبوع القادم|الشهر القادم|العام القادم|مؤخراً|مؤخرًا|قبل يومين|قبل أسبوع)/giu;
const STATE_CLASSES = [
  ["OFFICE_HOLDER",/\b(?:president|prime minister|minister|ceo|chief executive|chairman|chairwoman|chair|governor|mayor|king|queen|director|secretary-general|head of|leader of|commissioner)\b|(?:رئيس|رئيسة|وزير|وزيرة|مدير|مديرة|محافظ|عمدة|ملك|ملكة|أمين عام|الأمين العام)/iu],
  ["MEMBERSHIP",/\b(?:member|membership|belongs to|is part of)\b|(?:عضو|عضوية|منتسب|جزء من)/iu],
  ["PRICE_FEE",/\b(?:price|prices|priced|cost|costs|fee|fees|tariff|subscription|charges)\b|(?:سعر|تكلفة|تكلف|رسوم|تعرفة|اشتراك)/iu],
  ["REGULATION_IN_FORCE",/\b(?:in force|in effect|effective|valid|applies|is required|is mandatory|is banned|is prohibited|is legal|is illegal)\b|(?:نافذ|ساري|إلزامي|محظور|ممنوع)/iu],
  ["LIFECYCLE_SUPPORT",/\b(?:supported|unsupported|available|active|maintained|discontinued|deprecated|end.of.life|latest version|current version|latest release)\b|(?:مدعوم|متاح|نشط|انتهى الدعم|أحدث إصدار|الإصدار الحالي)/iu],
  ["NAME_IDENTITY",/\b(?:official name|officially named|is called|capital|official currency|official language|known as|headquartered in|headquarters)\b|(?:الاسم الرسمي|يسمى|تسمى|عاصمة|العملة الرسمية|اللغة الرسمية|يعرف باسم|مقر)/iu],
  ["STATISTIC",/\b(?:population|populous|gdp|unemployment|inflation|market share|users|subscribers|revenue|employees|interest rate|exchange rate)\b|(?:السكان|سكان|الناتج المحلي|البطالة|التضخم|الحصة السوقية|المستخدمين|الإيرادات|سعر الفائدة|سعر الصرف)/iu]
];function digits(s){return String(s).replace(/[٠-٩۰-۹]/g,c=>{const n=c.charCodeAt(0);return String(n-(n>=0x06f0?0x06f0:0x0660));});}
function dateIso(y,m,d){const yy=+y,mm=+m,dd=+d;if(!Number.isInteger(yy)||yy<1000||yy>9999||mm<1||mm>12||dd<1||dd>31)return null;const dt=new Date(Date.UTC(yy,mm-1,dd));return dt.getUTCFullYear()===yy&&dt.getUTCMonth()===mm-1&&dt.getUTCDate()===dd?dt.toISOString().slice(0,10):null;}
function extractDateAnchors(value){
  const text=digits(value);const out=[];
  const add=(s,i,n,p,calendar="GREGORIAN")=>{if(out.some(a=>i<a.index+a.text.length&&a.index<i+s.length))return;const vicinity=text.slice(Math.max(0,i-8),Math.min(text.length,i+s.length+8));const cal=/(?:هـ|هجرية|هجري)/u.test(vicinity)?"HIJRI":calendar;out.push({text:s,normalized:cal==="HIJRI"?null:n,precision:p,calendar:cal,tense_role:/(?:effective|in force|valid|from|until|through|as of|ساري|نافذ|اعتباراً من|اعتبارًا من)/i.test(vicinity)?"VALIDITY_TIME":/(?:according to|reported|announced|published|report|study|وفقاً|وفقًا|بحسب|أعلن|ذكر|تقرير|دراسة)/i.test(vicinity)?"REPORT_TIME":"EVENT_TIME",index:i});};
  for(const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g))add(m[0],m.index,dateIso(m[1],m[2],m[3]),"DAY");
  for(const m of text.matchAll(/\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/g)){const mo=EN_MONTHS.get(m[2].toLowerCase());if(mo)add(m[0],m.index,dateIso(m[3],mo,m[1]),"DAY");}
  for(const m of text.matchAll(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/g)){const mo=EN_MONTHS.get(m[1].toLowerCase());if(mo)add(m[0],m.index,dateIso(m[3],mo,m[2]),"DAY");}
  for(const m of text.matchAll(/\b([A-Za-z]+)\s+(\d{4})\b/g)){const mo=EN_MONTHS.get(m[1].toLowerCase());if(mo)add(m[0],m.index,m[2]+"-"+mo,"MONTH");}
  for(const m of text.matchAll(/\b(\d{1,2})\s+([\u0600-\u06FF]+)\s+(\d{4})\b/gu)){const mo=AR_MONTHS.get(m[2]);if(mo)add(m[0],m.index,dateIso(m[3],mo,m[1]),"DAY");else if(HIJRI_MONTHS.has(m[2]))add(m[0],m.index,null,"DAY","HIJRI");}
  for(const m of text.matchAll(/(?<![\u0600-\u06FF])([\u0600-\u06FF]+)\s+(\d{4})(?!\d)/gu)){const mo=AR_MONTHS.get(m[1]);if(mo)add(m[0],m.index,m[2]+"-"+mo,"MONTH");else if(HIJRI_MONTHS.has(m[1]))add(m[0],m.index,null,"MONTH","HIJRI");}
  for(const m of text.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g))add(m[0],m.index,null,"DAY","UNKNOWN");
  for(const m of text.matchAll(/\b(\d{4})\b/g)){if(!out.some(a=>m.index>=a.index&&m.index<a.index+a.text.length)&&+m[1]>=1000&&+m[1]<=9999)add(m[0],m.index,m[1],"YEAR");}
  for(const m of text.matchAll(RELATIVE))add(m[0],m.index,null,"RELATIVE","UNKNOWN");
  return out.sort((a,b)=>a.index-b.index).map(({index,...a})=>a);
}
function compareAnchor(a,ref){
  if(!a.normalized||a.calendar!=="GREGORIAN")return "UNKNOWN";
  if(a.precision==="YEAR"){const y=+a.normalized;return y<ref.getUTCFullYear()?"PAST":y>ref.getUTCFullYear()?"FUTURE":"CURRENT_PERIOD";}
  if(a.precision==="MONTH"){const [y,m]=a.normalized.split("-").map(Number);const v=y*12+m,r=ref.getUTCFullYear()*12+ref.getUTCMonth()+1;return v<r?"PAST":v>r?"FUTURE":"CURRENT_PERIOD";}
  const dt=new Date(a.normalized+"T00:00:00.000Z"),today=new Date(Date.UTC(ref.getUTCFullYear(),ref.getUTCMonth(),ref.getUTCDate()));
  return dt<today?"PAST":dt>today?"FUTURE":"TODAY";
}
function modelAlias(v){const x=String(v||"").toUpperCase();return ({LIFECYCLE:"CURRENT_STATE",PRICE_POLICY:"CURRENT_STATE",REGULATORY_STATE:"CURRENT_STATE",SCHEDULED_EVENT:"SCHEDULED_FUTURE",HISTORICAL_EVENT:"TIME_ANCHORED_EVENT"})[x]||(["CURRENT_STATE","TIME_ANCHORED_EVENT","STATE_AT_PAST_TIME","SCHEDULED_FUTURE","STABLE_FACT","ATTRIBUTED_FINDING","NON_FACTUAL"].includes(x)?x:null);}
function stateClass(t){for(const [k,p] of STATE_CLASSES)if(p.test(t))return k;return "OTHER";}
function make(frame,claim,ref,anchors,cls,basis,model,disagreement,reason){
  const temporal=["TIME_ANCHORED_EVENT","CURRENT_STATE","STATE_AT_PAST_TIME","SCHEDULED_FUTURE","MIXED_OR_AMBIGUOUS","UNRESOLVED"].includes(frame);
  const relative=anchors.some(a=>a.precision==="RELATIVE");
  return {frame,state_class:cls,anchors,reference_time:ref.toISOString(),basis,requires_recent_evidence:frame==="CURRENT_STATE",seeks_latest_sources:frame==="CURRENT_STATE"||frame==="SCHEDULED_FUTURE"||relative,...(model?{model_frame:model}:{}),...(disagreement?{disagreement}:{}),reason,is_time_sensitive:temporal,temporal_status:temporal?"TEMPORAL_REVIEW_REQUIRED":"NOT_TIME_SENSITIVE"};
}
/** Frame classifier only; it never determines the truth of a proposition. */
export function classifyClaimFrame(claim,{referenceTime=new Date(),modelFrame=null}={}){
  const text=digits(String(claim||"")).normalize("NFKC").trim(),ref=referenceTime instanceof Date?new Date(referenceTime):new Date(referenceTime);
  if(!Number.isFinite(ref.getTime()))throw new TypeError("referenceTime must be a valid date");
  const anchors=extractDateAnchors(text),model=modelAlias(modelFrame),past=anchors.some(a=>compareAnchor(a,ref)==="PAST"),future=anchors.some(a=>compareAnchor(a,ref)==="FUTURE"),uncertain=anchors.some(a=>["UNKNOWN","CURRENT_PERIOD","TODAY"].includes(compareAnchor(a,ref)));
  const cls=stateClass(text);
  const event=EVENT.test(text)||EVENT_AR.test(text),explicitPresent=PRESENT.test(text),typedPresent=cls!=="OTHER"&&PRESENT_PREDICATE.test(" "+text+" ")&&!PAST_STATE.test(text),present=explicitPresent||typedPresent,pastState=PAST_STATE.test(text),futureCue=FUTURE.test(text),attributed=ATTRIBUTED.test(text),nonfactual=NON_FACTUAL.test(text);
  let frame=null,reason=null;
  if(nonfactual){frame="NON_FACTUAL";reason="NON_FACTUAL_LANGUAGE";}
  else if(attributed){frame="ATTRIBUTED_FINDING";reason="ATTRIBUTED_PROPOSITION";}
  else if(present&&event&&past){frame="MIXED_OR_AMBIGUOUS";reason="PAST_EVENT_AND_PRESENT_STATE_CUES";}
  else if(past&&event&&!present){frame="TIME_ANCHORED_EVENT";reason="PAST_ABSOLUTE_ANCHOR_WITH_COMPLETED_EVENT_PREDICATE";}
  else if(past&&pastState){frame="STATE_AT_PAST_TIME";reason="PAST_ABSOLUTE_ANCHOR_WITH_PAST_STATE_PREDICATE";}
  else if(future&&(futureCue||event)){frame="SCHEDULED_FUTURE";reason="FUTURE_ABSOLUTE_ANCHOR";}
  else if(futureCue&&!past){frame="SCHEDULED_FUTURE";reason="FUTURE_MODAL_OR_SCHEDULED_PREDICATE";}
  else if(present){frame="CURRENT_STATE";reason=explicitPresent?"EXPLICIT_PRESENT_TIME_MARKER":"PRESENT_PREDICATE_ON_TYPED_MUTABLE_STATE";}
  else if(anchors.length&&uncertain&&(event||pastState)){frame="UNRESOLVED";reason="ANCHOR_CALENDAR_OR_PRECISION_UNRESOLVED";}
  if(frame){const disagreement=model&&model!==frame?"MODEL_"+model+"_VS_DETERMINISTIC_"+frame:null;return make(frame,text,ref,anchors,cls,"DETERMINISTIC",model,disagreement,reason);}
  if(model==="STABLE_FACT")return make("STABLE_FACT",text,ref,anchors,cls,"MODEL_ADVISORY_ACCEPTED",model,null,"MODEL_STABLE_FACT_WITH_NO_CONFLICTING_CUE");
  const disagreement=model?"MODEL_"+model+"_NOT_SUPPORTED_BY_DETERMINISTIC_CUES":null;
  return make("STABLE_FACT",text,ref,anchors,cls,"DETERMINISTIC",model,disagreement,model?"MODEL_FRAME_REJECTED_WITHOUT_COMPATIBLE_TEXTUAL_EVIDENCE":"NO_TEMPORAL_OR_NONFACTUAL_CUE_DETECTED");
}
export {extractDateAnchors};