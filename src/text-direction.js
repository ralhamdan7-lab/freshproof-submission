export function detectTextDirection(value = "") {
  const text = String(value);
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;
  const lang = arabicCount > latinCount ? "ar" : "en";
  return { lang, dir: lang === "ar" ? "rtl" : "ltr" };
}
