// FreshProof v0.2.84 — bounded, claim-specific research planning.
//
// Q1 (claim-preserving baseline) is issued by the orchestrator for every claim.
// This module plans the additional, purpose-labelled queries:
//   VALUE_MASKED — the proposition without its asserted value (date, number,
//                  amount), so evidence for the TRUE value surfaces even when the
//                  claim is false ("X entered into force" rather than "X entered
//                  into force on <wrong date>").
//   CHANGE       — for current-state claims, a search for a later transition
//                  (replacement, repeal, renaming, end of support, withdrawal).
// Queries are built only from the claim's own words; no topic, entity or
// publisher list is consulted, and nothing is hard-coded for benchmark items.

const ARABIC = /[؀-ۿ]/;
const MONTHS_EN = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
const MONTHS_AR = "يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|محرم|صفر|ربيع الأول|ربيع الآخر|جمادى الأولى|جمادى الآخرة|رجب|شعبان|رمضان|شوال|ذو القعدة|ذو الحجة";

const VALUE_PATTERNS = [
  new RegExp(`\\b(?:on|in|since|from|by|as of)?\\s*\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS_EN})\\s+\\d{4}\\b`, "gi"),
  new RegExp(`\\b(?:on|in|since|from|by|as of)?\\s*(?:${MONTHS_EN})\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`, "gi"),
  new RegExp(`\\b(?:on|in|since|from|by|as of)?\\s*(?:${MONTHS_EN})\\s+\\d{4}\\b`, "gi"),
  /\b(?:on|in|since|from|by)?\s*\d{4}-\d{2}-\d{2}\b/gi,
  /\b(?:on|in|since|from|by)?\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/gi,
  /\b(?:in|since|from|by|during)\s+(?:the\s+year\s+)?\d{4}\b/gi,
  new RegExp(`(?:في|منذ|عام|سنة)?\\s*[\\d٠-٩]{1,2}\\s+(?:${MONTHS_AR})\\s+[\\d٠-٩]{4}\\s*(?:هـ|م)?`, "g"),
  new RegExp(`(?:في|منذ)?\\s*(?:${MONTHS_AR})\\s+[\\d٠-٩]{4}\\s*(?:هـ|م)?`, "g"),
  /(?:في|منذ)?\s*(?:عام|سنة)\s+[\d٠-٩]{4}\s*(?:هـ|م)?/g,
  /[$€£¥₹]\s?\d[\d,.]*(?:\s?(?:million|billion|thousand|bn|m|k))?/gi,
  /\b\d[\d,.]*\s?(?:%|percent|per cent|million|billion|thousand|km|kilometres|kilometers|metres|meters|miles|kg|tonnes|people|users|credits|dollars|euros|riyals|ريال|دولار|مليون|مليار|ألف|بالمئة|في المئة)\b/gi,
  /\b\d{4}\b/g,
  /[\d٠-٩]+(?:[.,][\d٠-٩]+)?/g
];

export function claimHasAssertedValue(claim) {
  const text = String(claim || "");
  return /\d|[٠-٩]/.test(text);
}

/** The proposition with its asserted values removed; null when nothing to mask. */
export function valueMaskedQuery(claim) {
  const text = String(claim || "").trim();
  if (!claimHasAssertedValue(text)) return null;
  let masked = text;
  for (const pattern of VALUE_PATTERNS) masked = masked.replace(pattern, " ");
  masked = masked
    .replace(/\b(?:on|in|since|from|by|of|at|as of|the year)\s*(?=[.,;:!?]|$)/gi, " ")
    .replace(/(?:في|منذ|عام|سنة)\s*(?=[.,;:!?؟،]|$)/g, " ")
    .replace(/[.,;:!?؟،]+\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = masked.split(/\s+/).filter(word => word.length > 1);
  if (words.length < 3 || masked === text) return null;
  return masked;
}

const CHANGE_TERMS = {
  en: {
    OFFICE_HOLDER: "appointed OR succeeded OR replaced OR resigned OR new",
    MEMBERSHIP: "joined OR withdrew OR left OR suspended OR membership",
    PRICE_FEE: "new price OR price change OR increase OR updated",
    REGULATION_IN_FORCE: "repealed OR amended OR replaced OR suspended OR expired",
    LIFECYCLE_SUPPORT: "end of life OR discontinued OR deprecated OR retired OR no longer supported",
    NAME_IDENTITY: "renamed OR changed OR moved OR new official name",
    STATISTIC: "latest figures OR updated data OR revised",
    OTHER: "changed OR replaced OR no longer OR latest"
  },
  ar: {
    OFFICE_HOLDER: "تعيين OR خلفاً OR استقالة OR جديد",
    MEMBERSHIP: "انضمام OR انسحاب OR تعليق العضوية",
    PRICE_FEE: "السعر الجديد OR تعديل الأسعار OR زيادة",
    REGULATION_IN_FORCE: "إلغاء OR تعديل OR استبدال OR وقف العمل",
    LIFECYCLE_SUPPORT: "انتهاء الدعم OR إيقاف OR لم يعد مدعوماً",
    NAME_IDENTITY: "تغيير الاسم OR نقل OR الاسم الرسمي الجديد",
    STATISTIC: "أحدث الأرقام OR بيانات محدثة",
    OTHER: "تغيير OR استبدال OR لم يعد OR أحدث"
  }
};

/** A transition-seeking query for current-state claims; null otherwise. */
export function changeQuery(claim, frame) {
  if (frame?.frame !== "CURRENT_STATE") return null;
  const text = String(claim || "").trim();
  const language = ARABIC.test(text) ? "ar" : "en";
  const core = (valueMaskedQuery(text) || text)
    .replace(/\b(?:currently|current|still|now|at present|remains?|is|are|the|a|an)\b/gi, " ")
    .replace(/(?:حالياً|حاليًا|الحالي|الحالية|لا يزال|لا تزال|الآن)/g, " ")
    .replace(/[.,;:!?؟،]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (core.split(/\s+/).length < 2) return null;
  const terms = CHANGE_TERMS[language][frame.state_class] || CHANGE_TERMS[language].OTHER;
  return `${core} ${terms}`.slice(0, 380);
}

/**
 * Ordered extra queries for one claim. Current-state claims put the change
 * search first (a later transition is what makes them false); other claims put
 * the value-masked search first (it surfaces the true value for false claims).
 */
export function buildResearchPlan(claim, frame) {
  const steps = [];
  const masked = valueMaskedQuery(claim);
  const change = changeQuery(claim, frame);
  if (frame?.frame === "CURRENT_STATE") {
    if (change) steps.push({ purpose: "CHANGE", query: change, time_range: null });
    if (masked) steps.push({ purpose: "VALUE_MASKED", query: masked, time_range: "year" });
  } else if (!["NON_FACTUAL", "SCHEDULED_FUTURE"].includes(frame?.frame)) {
    if (masked) steps.push({ purpose: "VALUE_MASKED", query: masked, time_range: null });
  }
  const seen = new Set([String(claim || "").trim().toLowerCase()]);
  return steps.filter(step => {
    const key = step.query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Fair share of extra queries for the claim being processed, after reserving
 * one baseline query for each claim still to come.
 */
export function extraQueryShare({ maxQueries, used, remainingClaimsAfter }) {
  const available = Math.max(0, maxQueries - used - Math.max(0, remainingClaimsAfter));
  if (!available) return 0;
  return Math.min(3, Math.ceil(available / (Math.max(0, remainingClaimsAfter) + 1)));
}
