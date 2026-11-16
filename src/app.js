import { detectTextDirection } from "./text-direction.js";
const input = document.querySelector("#answer");
const verify = document.querySelector("#verify");
const notice = document.querySelector("#notice");
const counter = document.querySelector("#counter");
const results = document.querySelector("#results");
const list = document.querySelector("#claim-list");
const summary = document.querySelector("#summary");

input.addEventListener("input", () => counter.textContent = `${input.value.length.toLocaleString()} / 12,000`);
document.querySelectorAll("[data-example]").forEach(button => button.addEventListener("click", () => {
  if (verify.disabled) return;
  input.value = button.dataset.example;
  input.dispatchEvent(new Event("input"));
  verify.click();
}));
// v0.2.90: long or multi-claim text is first split into atomic claims
// (/api/extract), then each factual claim is verified in its own request so
// every claim gets the full evidence budget. Results render as they arrive.
async function postJson(path, payload, attempt = 0) {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (response.status === 429 && attempt < 4) {
    const wait = Math.min(30, Number(response.headers.get("retry-after")) || 12 + attempt * 6);
    notice.textContent = `Pacing requests to stay within free limits… resuming in ${wait} s.`;
    await new Promise(resolve => setTimeout(resolve, wait * 1000));
    return postJson(path, payload, attempt + 1);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Verification request failed.");
  return data;
}
verify.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) { notice.textContent = "Paste an answer first."; input.focus(); return; }
  verify.disabled = true;
  verify.querySelector("span").textContent = "Checking evidence…";
  notice.textContent = "Identifying the claims in the text…";
  results.hidden = true;
  try {
    let extracted = null;
    try { extracted = await postJson("/api/extract", { text }); } catch { extracted = null; }
    const items = Array.isArray(extracted?.claims) ? extracted.claims : [];
    const checkable = item => item.kind === "FACT" || item.kind === "QUESTION";
    const asked = item => item.kind === "QUESTION" ? { asked_as_question: item.span } : {};
    if (items.length <= 1) {
      notice.textContent = "Searching for evidence. Search results are leads, not verdicts.";
      const single = items[0];
      const data = await postJson("/api/verify", { text: single?.kind === "QUESTION" ? single.claim : text });
      if (single?.kind === "QUESTION") data.claims = (data.claims || []).map(claim => ({ ...claim, ...asked(single) }));
      render(data);
    } else {
      const aggregate = { version: extracted.version, claims: [], extraction: { method: extracted.method, detected_count: items.length, processed_count: 0, truncated_count: 0, is_truncated: false } };
      const slots = items.map(item => checkable(item) ? null : {
        text: item.claim, status: "NOT_CHECKABLE", not_checkable_kind: item.kind,
        explanation: item.kind === "OPINION" ? "This is an opinion or value judgement; evidence cannot make it true or false." : item.kind === "PREDICTION" ? "This is a prediction about the future; it cannot be verified yet." : "This is not a factual statement.",
        sources: []
      });
      const pending = items.map((item, index) => ({ item, index })).filter(entry => checkable(entry.item));
      let done = 0;
      const refresh = first => {
        aggregate.claims = slots.flatMap(slot => slot ? (Array.isArray(slot) ? slot : [slot]) : []);
        aggregate.extraction.processed_count = done;
        render(aggregate, { scroll: first });
      };
      refresh(true);
      notice.textContent = `Found ${items.length} claims (${pending.length} factual). Verifying each against evidence…`;
      const worker = async () => {
        while (pending.length) {
          const { item, index } = pending.shift();
          try {
            const data = await postJson("/api/verify", { text: item.claim });
            slots[index] = (data.claims || []).map(claim => ({ ...claim, source_span: item.span, ...asked(item) }));
          } catch (err) {
            slots[index] = { text: item.claim, status: "NOT_ASSESSED", explanation: err.message || "Request failed.", sources: [] };
          }
          done++;
          refresh(false);
          notice.textContent = `Verified ${done} of ${items.filter(checkable).length} factual claims…`;
        }
      };
      await Promise.all([worker(), worker()]);
    }
    notice.textContent = "Evidence review complete. Each verdict states its evidence basis; FreshProof abstains only when the evidence cannot settle a claim.";
  } catch (err) { notice.textContent = err.message || "Could not complete verification. Please retry."; }
  finally { verify.disabled = false; verify.querySelector("span").textContent = "Verify claims"; }
});
function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
// v0.2.99: the sentence of an evidence passage that best matches the claim,
// skipping navigation and wiki markup, for the verdict box.
const excerptWords = value => new Set((String(value || "").normalize("NFKC").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/^(?:ال|و|ب|ل)(?=[\u0621-\u064A]{3,})/gu, "").match(/[\p{L}\p{N}]{3,}/gu) || []));
export function bestExcerpt(snippet, claimText) {
  const text = String(snippet || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const claimWords = excerptWords(claimText);
  const sentences = text.split(/(?<=[.!?؟。])\s+|\s*[|•·]\s*|\s{2,}/u)
    .map(item => item.replace(/\[\[[^\]]{0,60}\]\]/g, " ").replace(/\s+/g, " ").trim()).filter(item => item.length >= 25);
  let best = null;
  let bestScore = -1;
  for (const sentence of sentences) {
    const noisy = /\[\[|\]\]|==|\{\{|https?:\/\//.test(sentence) || (sentence.match(/[\[\]|]/g) || []).length > 2;
    const words = excerptWords(sentence);
    let overlap = 0;
    for (const word of claimWords) if (words.has(word) || [...words].some(other => other.length >= 4 && word.length >= 4 && (other.startsWith(word.slice(0, 4)) || word.startsWith(other.slice(0, 4))))) overlap++;
    const score = overlap - (noisy ? 3 : 0) - (sentence.length > 320 ? 1 : 0);
    if (score > bestScore) { bestScore = score; best = sentence; }
  }
  const chosen = best || text;
  return chosen.length > 240 ? chosen.slice(0, 237) + "…" : chosen;
}
let lastReport = null;
const STATUS_TEXT = { CURRENT: "SUPPORTED", CONTRADICTED: "CONTRADICTED", SUPERSEDED: "OUTDATED", NEEDS_REVIEW: "NEEDS REVIEW", UNVERIFIABLE: "UNVERIFIABLE", NOT_ASSESSED: "NOT ASSESSED", NOT_CHECKABLE: "NOT A CHECKABLE FACT" };
export function reportText(data) {
  const lines = [`FreshProof verification report · v${data?.version || ""} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, ""];
  (data?.claims || []).forEach((claim, index) => {
    lines.push(`${index + 1}. [${STATUS_TEXT[claim.status] || claim.status}${claim.confidence_tier === "STRONG" ? " · HIGH CONFIDENCE" : claim.confidence_tier === "MODERATE" ? " · CONFIRMED BY INDEPENDENT SOURCES" : ""}] ${claim.text}`);
    if (claim.correction?.status === "PROVIDED" && claim.correction.text) lines.push(`   Correction: ${claim.correction.text}`);
    const counted = new Set((Array.isArray(claim.adjudication?.evidence) ? claim.adjudication.evidence : []).map(item => item.source_index));
    const sources = (claim.sources || []).filter((_, i) => counted.has(i)).slice(0, 4);
    sources.forEach(source => lines.push(`   - ${source.title || ""} ${source.url}`));
    lines.push("");
  });
  return lines.join("\n");
}
document.querySelector("#copy-report")?.addEventListener("click", async event => {
  if (!lastReport) return;
  const text = reportText(lastReport);
  try { await navigator.clipboard.writeText(text); event.target.textContent = "Copied ✓"; }
  catch { const area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); try { document.execCommand("copy"); event.target.textContent = "Copied ✓"; } catch {} area.remove(); }
  setTimeout(() => { event.target.textContent = "Copy report"; }, 1800);
});
function render(data, { scroll = true } = {}) {
  lastReport = data;
  const statusLabel = (status, arabic) => arabic ? ({
    CURRENT: "مدعوم كما ورد",
    SUPERSEDED: "معلومة قديمة",
    CONTRADICTED: "يتعارض مع الأدلة",
    UNVERIFIABLE: "تعذر التحقق",
    NEEDS_REVIEW: "يحتاج إلى مراجعة",
    NOT_ASSESSED: "لم يُقيَّم — تعذر تشغيلي",
    NOT_CHECKABLE: "ليس ادعاءً قابلاً للتحقق"
  }[status] || status.replaceAll("_", " ")) : ({
    CURRENT: "SUPPORTED AS STATED",
    SUPERSEDED: "OUTDATED",
    CONTRADICTED: "CONTRADICTED BY EVIDENCE",
    UNVERIFIABLE: "UNVERIFIABLE",
    NEEDS_REVIEW: "NEEDS REVIEW",
    NOT_ASSESSED: "NOT ASSESSED — SERVICE LIMIT OR ERROR",
    NOT_CHECKABLE: "NOT A CHECKABLE FACT"
  }[status] || status.replaceAll("_", " "));
  const statusTone = status => status === "CURRENT" ? "good"
    : ["CONTRADICTED", "SUPERSEDED"].includes(status) ? "bad"
    : status === "NEEDS_REVIEW" ? "warn" : "neutral";
  list.replaceChildren();
  const counts = data.claims.reduce((acc, claim) => (acc[claim.status] = (acc[claim.status] || 0) + 1, acc), {});
  const providedCorrections = data.claims.filter(claim => claim.correction?.status === "PROVIDED").length;
  const extractionNote = data.extraction?.is_truncated
    ? " · PARTIAL REVIEW: FIRST " + data.extraction.processed_count + " OF " + data.extraction.detected_count + " CLAIMS PROCESSED; " + data.extraction.truncated_count + " NOT REVIEWED"
    : "";
  // Keep the judge-facing report language English regardless of claim language.
  // Individual claim text and evidence retain their detected RTL/LTR direction.
  summary.textContent = data.claims.length + " CLAIMS · " + (counts.CURRENT || 0) + " SUPPORTED · " + (counts.CONTRADICTED || 0) + " CONTRADICTED · " + (counts.SUPERSEDED || 0) + " OUTDATED · " + (counts.NEEDS_REVIEW || 0) + " REVIEW · " + (counts.UNVERIFIABLE || 0) + " UNVERIFIABLE · " + (counts.NOT_ASSESSED ? counts.NOT_ASSESSED + " NOT ASSESSED · " : "") + (counts.NOT_CHECKABLE ? counts.NOT_CHECKABLE + " NOT CHECKABLE · " : "") + providedCorrections + " CORRECTIONS PROVIDED" + extractionNote;
  data.claims.forEach((claim, index) => {
    const { lang, dir } = detectTextDirection(claim.text);
    const arabic = lang === "ar";
    const card = node("article", "claim");
    card.dir = "ltr"; card.lang = "en";
    const top = node("div", "claim-top"); top.dir = dir; top.lang = lang;
    top.append(node("span", "meta", arabic ? `الادعاء ${String(index + 1).padStart(2, "0")}` : `CLAIM ${String(index + 1).padStart(2, "0")}`), node("span", `status ${statusTone(claim.status)}`, statusLabel(claim.status, arabic)));
    const claimText = node("p", "claim-text", claim.text); claimText.dir = dir; claimText.lang = lang;
    card.append(top, claimText);
    // v0.2.96: the verdict first, in plain words, with the key evidence. The
    // audit trail stays available below for anyone who wants every detail.
    {
      const decisive = ["CURRENT", "CONTRADICTED", "SUPERSEDED"].includes(claim.status);
      const tone = { CURRENT: "true", CONTRADICTED: "false", SUPERSEDED: "outdated" }[claim.status] || (claim.status === "NOT_ASSESSED" ? "limited" : "open");
      const headline = arabic ? ({
        CURRENT: "✓ الادعاء صحيح — الأدلة تؤكده",
        CONTRADICTED: "✗ الادعاء غير صحيح — الأدلة تنفيه",
        SUPERSEDED: "↻ الادعاء لم يعد صحيحاً — تغيّر الوضع",
        NEEDS_REVIEW: "الأدلة غير حاسمة بعد",
        UNVERIFIABLE: "ليس حقيقة قابلة للتحقق بالأدلة",
        NOT_CHECKABLE: "ليس حقيقة قابلة للتحقق بالأدلة",
        NOT_ASSESSED: "تعذّر التقييم الآن بسبب حدود الخدمة المجانية — أعد المحاولة لاحقاً"
      })[claim.status] : ({
        CURRENT: "✓ TRUE — the evidence supports this claim",
        CONTRADICTED: "✗ FALSE — the evidence contradicts this claim",
        SUPERSEDED: "↻ OUTDATED — this is no longer true",
        NEEDS_REVIEW: "Evidence is not conclusive yet",
        UNVERIFIABLE: "Not a fact that evidence can check",
        NOT_CHECKABLE: "Not a fact that evidence can check",
        NOT_ASSESSED: "Could not be assessed right now (free-tier service limit) — please retry"
      })[claim.status];
      if (headline) {
        const hero = node("section", `verdict-hero hero-${tone}`);
        hero.dir = dir; hero.lang = lang;
        hero.append(node("div", "hero-headline", headline));
        if (decisive && ["STRONG", "MODERATE"].includes(claim.confidence_tier)) {
          const broad = claim.adjudication?.adjudication_signals?.confidence_basis === "BROAD_INDEPENDENT_AGREEMENT";
          hero.append(node("div", "hero-sub", arabic
            ? (claim.confidence_tier === "STRONG" ? (broad ? "ثقة مرتفعة · اتفاق واسع بين مصادر مستقلة ومعتمدة دون أي مصدر مخالف" : "ثقة مرتفعة · مصدر رسمي أو تأييد من مصادر معتمدة") : "مؤكَّد · مصادر مستقلة متفقة دون أي مصدر مخالف")
            : (claim.confidence_tier === "STRONG" ? (broad ? "High confidence · broad agreement across independent and classified sources, none opposing" : "High confidence · official source or classified corroboration") : "Confirmed · independent sources agree, none opposing")));
        }
        if (claim.correction?.status === "PROVIDED" && claim.correction.text) {
          const fix = node("div", "hero-correction");
          fix.append(node("span", "hero-label", arabic ? "الصحيح:" : "Correct:"), node("span", "hero-correction-text", claim.correction.text));
          hero.append(fix);
        }
        if (decisive) {
          const evidence = Array.isArray(claim.adjudication?.evidence) ? claim.adjudication.evidence : [];
          const seen = new Set();
          // v0.2.99: classified publishers first, then the rest in verdict order.
          const tierRank = source => ({ PRIMARY_OR_OFFICIAL_DOMAIN: 0, INSTITUTIONAL: 1, SECONDARY_REPUTABLE: 2 }[source?.source_reliability] ?? 3);
          const keySources = evidence.map(item => (claim.sources || [])[item.source_index])
            .filter(source => source?.url && !seen.has(source.url) && seen.add(source.url))
            .map((source, order) => ({ source, order }))
            .sort((a, b) => tierRank(a.source) - tierRank(b.source) || a.order - b.order)
            .map(item => item.source).slice(0, 3);
          if (keySources.length) {
            hero.append(node("div", "hero-label", arabic ? "أبرز الأدلة:" : "Key evidence:"));
            const list = node("ul", "hero-evidence");
            keySources.forEach(source => {
              const li = document.createElement("li");
              let host = ""; try { host = new URL(source.url).hostname.replace(/^www\./, ""); } catch {}
              const link = document.createElement("a");
              link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer";
              link.textContent = host || source.url;
              li.append(link);
              const excerpt = bestExcerpt(source.snippet, claim.text);
              if (excerpt) {
                const quote = node("span", "hero-quote", ` — “${excerpt}”`);
                quote.dir = "auto"; li.append(quote);
              }
              list.append(li);
            });
            hero.append(list);
          }
        }
        card.append(hero);
      }
    }
    // v0.2.84: what kind of temporal claim this is, and whether it needs recent
    // evidence. Shown because it governs which evidence can count.
    if (claim.claim_frame?.frame) {
      const frameLabels = {
        TIME_ANCHORED_EVENT: ["DATED PAST EVENT", "حدث ماضٍ مؤرَّخ"],
        CURRENT_STATE: ["CURRENT STATE", "حالة راهنة"],
        STATE_AT_PAST_TIME: ["STATE AT A PAST TIME", "حالة في وقت سابق"],
        SCHEDULED_FUTURE: ["SCHEDULED / FUTURE", "مجدول / مستقبلي"],
        MIXED_OR_AMBIGUOUS: ["MIXED OR AMBIGUOUS TIME", "زمن مختلط أو غامض"],
        UNRESOLVED: ["TIME NOT RESOLVED", "زمن غير محدد"],
        STABLE_FACT: ["STABLE FACT", "حقيقة ثابتة"],
        ATTRIBUTED_FINDING: ["ATTRIBUTED FINDING", "نتيجة منسوبة"],
        NON_FACTUAL: ["NOT A FACTUAL CLAIM", "ليس ادعاءً واقعياً"]
      };
      const frame = claim.claim_frame;
      const label = frameLabels[frame.frame] || [frame.frame.replaceAll("_", " "), frame.frame];
      const recency = frame.requires_recent_evidence
        ? (arabic ? "يتطلب أدلة حديثة" : "RECENT EVIDENCE REQUIRED")
        : (arabic ? "تُقبل السجلات الموثوقة الأقدم" : "OLDER AUTHORITATIVE RECORDS ACCEPTED");
      const anchors = (frame.anchors || []).map(item => item.text).filter(Boolean).slice(0, 3);
      const frameRow = node("div", "frame-row");
      frameRow.dir = dir; frameRow.lang = lang;
      frameRow.append(node("span", "frame-chip", (arabic ? "نوع الادعاء · " : "CLAIM TYPE · ") + (arabic ? label[1] : label[0])));
      if (!["NON_FACTUAL", "STABLE_FACT"].includes(frame.frame)) frameRow.append(node("span", "frame-chip muted", recency));
      if (anchors.length) frameRow.append(node("span", "frame-chip muted", (arabic ? "المرجع الزمني · " : "TIME ANCHOR · ") + anchors.join(arabic ? "، " : ", ")));
      if (["STRONG", "MODERATE"].includes(claim.confidence_tier) && ["CURRENT", "CONTRADICTED", "SUPERSEDED"].includes(claim.status)) {
        const strong = claim.confidence_tier === "STRONG";
        frameRow.append(node("span", `frame-chip confidence-${strong ? "strong" : "moderate"}`, arabic
          ? (strong ? "الثقة · مرتفعة" : "مؤكَّد · مصادر مستقلة متفقة")
          : (strong ? "CONFIDENCE · HIGH" : "CONFIRMED · INDEPENDENT SOURCES AGREE")));
      }
      card.append(frameRow);
    }
    // Execution is reported separately from the factual verdict.
    const deferredNotes = [];
    if (claim.execution && claim.execution.status !== "COMPLETED") {
      const stageLabels = arabic
        ? { search: "البحث", fetch: "جلب الصفحات", semantic: "تقييم العلاقة" }
        : { search: "SEARCH", fetch: "PAGE FETCH", semantic: "RELATION MODEL" };
      const stageText = Object.entries(claim.execution.stages || {})
        .filter(([, value]) => value && value !== "OK" && value !== "NOT_RUN")
        .map(([key, value]) => `${stageLabels[key] || key}: ${value}`).join(" · ");
      const executionText = arabic
        ? ({ PARTIAL: "اكتمل التشغيل جزئياً", PROVIDER_LIMITED: "تقيّد التشغيل بحدود مزوّد الخدمة", FAILED: "تعذّر التشغيل" }[claim.execution.status] || claim.execution.status)
        : ({ PARTIAL: "RUN PARTIALLY COMPLETED", PROVIDER_LIMITED: "RUN LIMITED BY A PROVIDER", FAILED: "RUN FAILED" }[claim.execution.status] || claim.execution.status);
      const executionNode = node("div", "execution-note", executionText + (stageText ? " · " + stageText : "") + (arabic ? " — هذا وضع تشغيلي وليس دليلاً على صحة الادعاء أو خطئه." : " — operational state only, not evidence about the claim."));
      executionNode.dir = dir; executionNode.lang = lang;
      // A decisive verdict's operational notes belong in the audit trail.
      if (["CURRENT", "CONTRADICTED", "SUPERSEDED"].includes(claim.status)) deferredNotes.push(executionNode); else card.append(executionNode);
    }
    if (claim.asked_as_question) {
      const askedNode = node("div", "execution-note", arabic
        ? `سؤالك «${claim.asked_as_question}» فُحص بوصفه العبارة: «${claim.text}».`
        : `Your question “${claim.asked_as_question}” was checked as the statement: “${claim.text}”.`);
      askedNode.dir = dir; askedNode.lang = lang; card.append(askedNode);
    }
    if (claim.result_cache?.status === "HIT") {
      const when = String(claim.result_cache.assessed_at || "").replace("T", " ").slice(0, 16);
      const cacheNode = node("div", "execution-note", arabic
        ? `نتيجة محفوظة مؤقتاً لادعاء مطابق قُيِّم في ${when} UTC؛ الأدلة والحكم كما كانت في ذلك الوقت.`
        : `CACHED RESULT · identical claim assessed ${when} UTC; evidence and verdict are as of that time.`);
      cacheNode.dir = dir; cacheNode.lang = lang; card.append(cacheNode);
    }
    const auditDetails = node("details", "audit-details");
    deferredNotes.forEach(item => auditDetails.append(item));
    const auditSummary = node("summary", "audit-summary", arabic ? "تفاصيل الأدلة والمصادر وسجل التدقيق" : "Evidence, sources & audit details");
    auditDetails.append(auditSummary);
    if (claim.resolved_context?.entity) {
      const contextLine = node("div", "meta", arabic ? `الكيان المحدد · ${claim.resolved_context.entity} · تم الحفاظ على نص الادعاء الأصلي` : `RESOLVED ENTITY CONTEXT · ${claim.resolved_context.entity} · ORIGINAL CLAIM PRESERVED`); contextLine.dir = dir; contextLine.lang = lang; card.append(contextLine);
    }
    const fresh = claim.freshness || {};
    const meta = node("div", "meta", arabic ? `حداثة النشر: ${{FRESH:"حديث",AGING:"آخذ في التقادم",OLD:"قديم",UNKNOWN:"غير معروف",NOT_APPLICABLE:"لا ينطبق"}[fresh.label] || fresh.label || "غير معروف"}${fresh.newest_publication_date ? ` · أحدث تاريخ نشر ${fresh.newest_publication_date}` : ""}` : `PUBLICATION FRESHNESS: ${fresh.label || "UNKNOWN"}${fresh.newest_publication_date ? ` · NEWEST PUBLISHED ${fresh.newest_publication_date}` : ""}`);
    meta.dir = dir; meta.lang = lang;
    card.append(meta);
    if (claim.temporal_assessment) {
      const temporal = claim.temporal_assessment;
      const temporalText = arabic
        ? (temporal.status === "NOT_TIME_SENSITIVE" ? "التقييم الزمني: غير حساس زمنياً — التحقق الواقعي يستمر" : "التقييم الزمني: يتطلب مراجعة زمنية")
        : (temporal.status === "NOT_TIME_SENSITIVE" ? "TEMPORAL ASSESSMENT: NOT TIME-SENSITIVE · FACTUAL REVIEW STILL RUNS" : "TEMPORAL ASSESSMENT: TIME-SENSITIVE REVIEW");
      const temporalNode = node("div", "temporal-note", temporalText);
      temporalNode.dir = dir; temporalNode.lang = lang; card.append(temporalNode);
    }
    if (claim.status === "CURRENT") {
      const meaning = arabic
        ? "مدعوم كما ورد ضمن النطاق المتحقق؛ لا يعني ذلك أن الحدث حديث أو مستمر. تاريخ الحدث وحداثة النشر بُعدان منفصلان."
        : "SUPPORTED AS STATED WITHIN THE REVIEWED SCOPE · This does not mean the event is recent or ongoing; event date and publication freshness are separate.";
      const meaningNode = node("div", "temporal-note", meaning);
      meaningNode.dir = dir; meaningNode.lang = lang; card.append(meaningNode);
    }
    const metrics = node("div", "metric-row");
    metrics.append(node("span", "metric", arabic ? `موثوقية الأدلة · ${{MULTI_SOURCE:"مصادر متعددة",MULTI_SOURCE_WITH_DATES:"مصادر متعددة مؤرخة",LIMITED:"محدودة",NONE:"لا توجد",NOT_ASSESSED:"لم تُقيّم"}[claim.evidence_confidence] || claim.evidence_confidence || "لم تُقيّم"}` : `EVIDENCE CONFIDENCE · ${claim.evidence_confidence || "NOT ASSESSED"}`));
    const reliabilities = [...new Set(claim.sources?.map(s => s.source_reliability) || [])];
    metrics.append(node("span", "metric", arabic ? `تصنيف المصادر · ${reliabilities.length ? reliabilities.join("، ") : "لا توجد"}` : `SOURCE PROFILE · ${reliabilities.length ? reliabilities.join(", ") : "NONE"}`));
    metrics.dir = dir; metrics.lang = lang;
    card.append(metrics);
    if (claim.explanation) { const explanation = node("p", "explanation", arabic ? (claim.status === "SUPERSEDED" ? "تُظهر الأدلة أن الادعاء أصبح قديماً أو تجاوزته تطورات لاحقة." : claim.status === "CURRENT" ? "تدعم مصادر مستقلة مؤهلة هذا الادعاء ضمن النطاق المحدد." : claim.status === "CONTRADICTED" ? "تتعارض مصادر مستقلة مؤهلة مع الادعاء." : claim.status === "NEEDS_REVIEW" ? "لم تتحقق عتبة الأدلة والتأييد المستقل؛ لذلك امتنع المحرك عن الحكم." : claim.status === "NOT_CHECKABLE" ? (claim.not_checkable_kind === "PREDICTION" ? "هذا توقع لأمر مستقبلي ولا يمكن التحقق منه الآن." : "هذا رأي أو حكم قيمي، ولا يمكن للأدلة أن تثبته أو تنفيه.") : claim.explanation) : claim.explanation); explanation.dir = dir; explanation.lang = lang; card.append(explanation); }
    // v0.2.82: why the engine abstained, shown separately from verification
    // status, publication freshness, evidence confidence and source profile.
    // Descriptive only; no numeric score is shown or implied.
    if (claim.abstention_diagnosis) {
      const diagnosis = claim.abstention_diagnosis;
      const reasonText = {
        PIPELINE_EXCEPTION: ["An internal error occurred during evidence acquisition.", "حدث خطأ داخلي أثناء جمع الأدلة."],
        RETRIEVAL_PROVIDER_FAILURE: ["The search provider failed or was rate-limited.", "تعذّر الوصول إلى مزود البحث أو تجاوز حد الطلبات."],
        RETRIEVAL_NO_RESULTS: ["No search results were found.", "لم تُعثر على نتائج بحث."],
        NOT_A_FACTUAL_CLAIM: ["This is a judgement or recommendation, not a checkable fact, so no evidence search was run.", "هذه العبارة رأي أو حكم قيمي وليست حقيقة قابلة للتحقق، لذلك لم يُجرَ بحث عن أدلة."],
        OPEN_FORECAST: ["This predicts an uncertain future outcome; present evidence cannot establish it, so no evidence search was run.", "هذه العبارة تتوقع نتيجة مستقبلية غير محسومة؛ لا يمكن لأي دليل حالي إثباتها، لذلك لم يُجرَ بحث عن أدلة."],
        NO_RELEVANT_EVIDENCE: ["Sources were found, but none addressed the claim.", "عُثر على مصادر لكن لم يتناول أيٌّ منها الادعاء."],
        INSUFFICIENT_SOURCE_QUALITY: ["Relevant sources were found, but none was an official, institutional or reputable publisher.", "وُجدت مصادر ذات صلة لكن لم يكن بينها ناشر رسمي أو مؤسسي أو موثوق."],
        INSUFFICIENT_INDEPENDENT_CORROBORATION: ["Fewer than two independent publishers corroborated the finding.", "لم يؤكد النتيجةَ ناشران مستقلان على الأقل."],
        STALE_OR_UNDATED_EVIDENCE: ["The evidence is too old or undated for a time-sensitive claim. Retrieval time does not count as freshness.", "الأدلة قديمة أو غير مؤرخة بالنسبة لادعاء حساس زمنياً؛ وقت الاسترجاع لا يُعدّ دليلاً على الحداثة."],
        SEMANTIC_PROVIDER_UNAVAILABLE: ["The evidence-relation model was unavailable, so no verdict was inferred.", "نموذج تقييم علاقة الأدلة غير متاح؛ لذلك لم يُستنتج حكم."],
        SEMANTIC_UNCERTAINTY: ["The evidence neither clearly supported nor clearly contradicted the claim.", "لم تدعم الأدلة الادعاء بوضوح ولم تنقضه بوضوح."],
        GENUINE_EVIDENCE_CONFLICT: ["Qualified sources disagree with each other.", "تتعارض المصادر المؤهلة فيما بينها."],
        COMPONENT_COVERAGE_GAP: ["Not every part of a compound claim was covered by evidence.", "لم تغطِّ الأدلة جميع أجزاء الادعاء المركّب."],
        SPECIALIST_EVIDENCE_GATE: ["A specialist rule's evidence did not meet the core evidence gates.", "لم تستوفِ أدلة القاعدة المتخصصة شروط الأدلة الأساسية."],
        HIGH_IMPACT_SINGLE_SOURCE_BLOCK: ["High-impact claims need more than one independent source.", "الادعاءات عالية الأثر تتطلب أكثر من مصدر مستقل."]
      }[diagnosis.primary_reason] || [diagnosis.primary_reason, diagnosis.primary_reason];
      const box = node("section", "outcome-box abstention-reason");
      box.dir = dir; box.lang = lang;
      box.append(node("div", "outcome-heading", arabic ? "سبب عدم إصدار حكم" : "WHY NO VERDICT"));
      box.append(node("p", "outcome-reason", arabic ? reasonText[1] : reasonText[0]));
      const others = (diagnosis.contributing_factors || []).filter(item => item !== diagnosis.primary_reason);
      box.append(node("p", "outcome-meta", (arabic ? "السبب الرئيسي: " : "PRIMARY REASON: ") + diagnosis.primary_reason + (others.length ? (arabic ? " · عوامل أخرى: " : " · ALSO: ") + others.join(", ") : "")));
      (diagnosis.evidence_dates || []).slice(0, 4).forEach(item => {
        const basis = arabic
          ? { PUBLICATION_DATE: "تاريخ النشر", EDITORIAL_UPDATE_DATE: "تاريخ تحديث تحريري موثّق", UNDATED: "غير مؤرخ", LIVE_STRUCTURED_OBSERVATION: "ملاحظة مباشرة لقائمة رسمية" }[item.recency_basis] || item.recency_basis
          : item.recency_basis.replaceAll("_", " ");
        const line = node("p", "outcome-limitation", `${item.domain} · ${item.recency_date || (arabic ? "بلا تاريخ" : "NO DATE")} · ${basis}${item.within_window === false && diagnosis.recency_window_days ? (arabic ? ` · خارج نافذة ${diagnosis.recency_window_days} يوماً` : ` · OUTSIDE ${diagnosis.recency_window_days}-DAY WINDOW`) : ""}`);
        line.dir = dir; line.lang = lang; box.append(line);
      });
      card.append(box);
    }
    if (claim.explanation_detail) {
      const detail = claim.explanation_detail;
      const explainBox = node("section", "outcome-box explanation-outcome");
      explainBox.dir = dir; explainBox.lang = lang;
      explainBox.append(node("div", "outcome-heading", arabic ? "التفسير · لماذا هذه النتيجة؟" : "EXPLAIN · WHY THIS FINDING?"));
      if (detail.summary) explainBox.append(node("p", "outcome-summary", detail.summary));
      if (detail.reason) explainBox.append(node("p", "outcome-reason", detail.reason));
      if (detail.date_interpretation) {
        const dates = detail.date_interpretation;
        const dateLine = arabic
          ? `تاريخ الحدث: ${dates.event_date || "غير متاح"} · تاريخ النشر: ${dates.publication_date || "غير متاح"} · وقت الاسترجاع: ${dates.retrieved_at || "غير متاح"}`
          : `EVENT DATE: ${dates.event_date || "NOT PROVIDED"} · PUBLICATION DATE: ${dates.publication_date || "NOT PROVIDED"} · RETRIEVED AT: ${dates.retrieved_at || "NOT PROVIDED"}`;
        const dateNode = node("p", "outcome-meta", dateLine); dateNode.dir = dir; dateNode.lang = lang; explainBox.append(dateNode);
      }
      (detail.evidence_basis || []).forEach(item => {
        const row = node("p", "outcome-evidence");
        const link = node("a", "", item.title || item.url);
        link.href = item.url; link.target = "_blank"; link.rel = "noopener noreferrer";
        row.append(link, document.createTextNode(` · ${item.relation || "REVIEW"}`));
        explainBox.append(row);
      });
      (detail.limitations || []).forEach(item => {
        const note = node("p", "outcome-limitation", item); note.dir = dir; note.lang = lang; explainBox.append(note);
      });
      auditDetails.append(explainBox);
    }
    // Plain-language comparison: preserve the exact submitted claim and never invent a replacement.
    // v0.2.96: a supported claim needs no "what is wrong" panel; the verdict box says it.
    if (claim.status !== "CURRENT") {
      const comparison = node("section", "outcome-box claim-comparison");
      comparison.dir = dir; comparison.lang = lang;
      comparison.append(node("div", "outcome-heading", arabic ? "الخلاصة المباشرة · ما الخطأ وما الصحيح؟" : "PLAIN-LANGUAGE RESULT · WHAT IS WRONG AND WHAT IS CORRECT"));
      const wrongLabel = node("div", "comparison-label", arabic
        ? (claim.status === "CURRENT" ? "الادعاء الذي جرى التحقق منه" : ["CONTRADICTED", "SUPERSEDED"].includes(claim.status) ? "ما الخطأ؟ · الادعاء الأصلي محل المراجعة" : "ما الذي لم يُحسم؟ · الادعاء الأصلي")
        : (claim.status === "CURRENT" ? "CLAIM REVIEWED" : ["CONTRADICTED", "SUPERSEDED"].includes(claim.status) ? "WHAT IS WRONG? · ORIGINAL CLAIM" : "WHAT REMAINS UNRESOLVED? · ORIGINAL CLAIM"));
      comparison.append(wrongLabel);
      const original = node("p", "comparison-original", claim.text);
      original.dir = dir; original.lang = lang; comparison.append(original);
      const findingMap = arabic ? {
        CURRENT: "النتيجة: تدعم الأدلة هذا الادعاء ضمن النطاق والتاريخ الموضحين أدناه.",
        CONTRADICTED: "النتيجة: الادعاء يتعارض مع الأدلة المؤهلة المرتبطة به؛ راجع التصحيح والمصادر قبل اعتباره حقيقة محسومة.",
        SUPERSEDED: "النتيجة: المعلومة أصبحت قديمة وتجاوزها تغير موثق.",
        NEEDS_REVIEW: "النتيجة: الأدلة الحالية لا تكفي لإثبات صحة الادعاء أو نفيه.",
        UNVERIFIABLE: "النتيجة: لم تتوفر أدلة قابلة للاستخدام للتحقق من الادعاء.",
        NOT_ASSESSED: "لم يُقيَّم الادعاء بسبب تعذر تشغيلي (حد الخدمة أو خطأ)، وليس بسبب الأدلة. أعد المحاولة لاحقاً."
      } : {
        CURRENT: "Finding: evidence supports this claim within the reviewed scope and timeframe.",
        CONTRADICTED: "Finding: the claim conflicts with the eligible evidence retrieved for it.",
        SUPERSEDED: "Finding: a documented change has made the original information outdated.",
        NEEDS_REVIEW: "Finding: available evidence is not sufficient to establish or refute the claim.",
        UNVERIFIABLE: "Finding: no usable evidence was available to verify the claim.",
        NOT_ASSESSED: "Not assessed: an operational limit or error stopped the evidence process. This says nothing about the claim; try again later."
      };
      const finding = node("p", "comparison-finding", findingMap[claim.status] || claim.explanation || "");
      finding.dir = dir; finding.lang = lang; comparison.append(finding);
      comparison.append(node("div", "comparison-label", arabic ? "ما الصحيح؟" : "WHAT IS CORRECT?"));
      const correction = claim.correction || {};
      let correctText = "";
      if (correction.status === "PROVIDED" && typeof correction.text === "string" && correction.text.trim()) correctText = correction.text;
      else if (claim.status === "CURRENT") correctText = arabic ? "المعلومة الواردة في الادعاء أعلاه مدعومة بالأدلة ضمن النطاق المتحقق؛ لا يلزم استبدالها." : "The original statement above is supported within the reviewed scope; no replacement is needed.";
      else if ((claim.status === "CONTRADICTED" || claim.status === "SUPERSEDED") && (claim.officeholder_evidence || claim.domain_evidence)?.reported_current_holder) { const holderEvidence = claim.officeholder_evidence || claim.domain_evidence; const officeLabel = String(holderEvidence.office || "office").replaceAll("_", " "); correctText = arabic ? `المعلومة البديلة التي يذكرها المصدر الرسمي: ${holderEvidence.reported_current_holder} هو شاغل منصب ${officeLabel}.` : `Officially reported current office holder: ${holderEvidence.reported_current_holder} (${officeLabel}).`; }
      else if (claim.status === "CONTRADICTED" || claim.status === "SUPERSEDED") correctText = arabic ? "لم يعتمد المحرك حتى الآن صياغة بديلة مستوفية لشروط الإثبات المستقل وتطابق النطاق والزمن. لذلك لن يخمّن المعلومة الصحيحة. راجع الأدلة الأصلية أدناه." : "No replacement has yet passed the independent-evidence, scope, and timeframe checks. FreshProof will not guess the correct statement. Review the original sources below.";
      else if (claim.status === "NEEDS_REVIEW") correctText = arabic ? "لا يمكن الجزم بالمعلومة الصحيحة حالياً؛ توجد أدلة لكنها غير كافية أو تحتاج إلى حسم التعارض." : "The correct statement cannot yet be established; evidence is incomplete or conflicting.";
      else if (claim.status === "UNVERIFIABLE") correctText = arabic ? "لا يمكن تحديد المعلومة الصحيحة لعدم توفر أدلة قابلة للاستخدام." : "The correct statement cannot be determined because no usable evidence was obtained.";
      else if (claim.status === "NOT_ASSESSED") correctText = arabic ? "لم يُقيَّم الادعاء؛ لا يمكن اقتراح تصحيح." : "The claim was not assessed; no correction can be proposed."
      else correctText = arabic ? "لم يصدر حكم واقعي على صحة الادعاء؛ التقييم الزمني وحده لا يثبت الصحة أو الخطأ." : "No factual judgment was made; temporal classification alone does not establish truth or error.";
      const correct = node("p", correction.status === "PROVIDED" ? "comparison-correct" : "comparison-unresolved", correctText);
      correct.dir = dir; correct.lang = lang; comparison.append(correct);
      if (correction.status === "PROVIDED" && Array.isArray(correction.evidence_refs)) {
        correction.evidence_refs.forEach(item => {
          if (!item.url) return;
          const row = node("p", "outcome-evidence");
          const link = node("a", "", item.title || item.url);
          link.href = item.url; link.target = "_blank"; link.rel = "noopener noreferrer";
          row.append(link); comparison.append(row);
        });
      }
      card.append(comparison);
    }
    if (claim.correction) {
      const correction = claim.correction;
      const correctionBox = node("section", `outcome-box correction-outcome correction-${correction.status.toLowerCase()}`);
      correctionBox.dir = dir; correctionBox.lang = lang;
      const correctionLabels = arabic
        ? { PROVIDED: "مصادر التصحيح والقيود", NOT_NEEDED: "لا يلزم تصحيح", WITHHELD: "لم يعتمد بديل موثوق · تفاصيل الأدلة والقيود", NOT_APPLICABLE: "لا ينطبق التصحيح الزمني" }
        : { PROVIDED: "CORRECTION SOURCES & LIMITATIONS", NOT_NEEDED: "CORRECTION NOT REQUIRED", WITHHELD: "NO VERIFIED REPLACEMENT · EVIDENCE & LIMITATIONS", NOT_APPLICABLE: "CORRECTION NOT APPLICABLE" };
      correctionBox.append(node("div", "outcome-heading", correctionLabels[correction.status] || correction.status));
      (correction.evidence_refs || []).forEach(item => {
        const row = node("p", "outcome-evidence");
        const link = node("a", "", item.title || item.url);
        link.href = item.url; link.target = "_blank"; link.rel = "noopener noreferrer";
        row.append(link);
        if (item.event_date) row.append(document.createTextNode(` · ${arabic ? "تاريخ الحدث" : "EVENT"}: ${item.event_date}`));
        correctionBox.append(row);
        if (typeof item.supporting_quote === "string" && item.supporting_quote.trim()) {
          const quoteWrap = node("div", "outcome-quote-wrap");
          quoteWrap.append(node("div", "outcome-quote-label", arabic ? "مقتطف داعم من المصدر" : "SUPPORTING EXCERPT"));
          const quote = node("blockquote", "outcome-quote", item.supporting_quote);
          quote.dir = dir; quote.lang = lang;
          quoteWrap.append(quote);
          correctionBox.append(quoteWrap);
        }
      });
      (correction.limitations || []).forEach(item => {
        const note = node("p", "outcome-limitation", item); note.dir = dir; note.lang = lang; correctionBox.append(note);
      });
      auditDetails.append(correctionBox);
    }
    if (claim.domain_evidence || claim.officeholder_evidence) {
      const domainEvidence = claim.domain_evidence || claim.officeholder_evidence;
      const verdict = node("div", "alignment"); verdict.dir = "ltr"; verdict.lang = "en";
      const adapterLabel = node("div", "meta", arabic ? `موائم متخصص · ${{python2_lifecycle:"دورة حياة Python 2",whitehouse_x_identity:"هوية حساب البيت الأبيض",office_holder:"شاغل المنصب"}[claim.domain_adapter] || claim.domain_adapter} · نتيجة مبنية على قواعد ومصدر أولي` : `DOMAIN ADAPTER · ${(claim.domain_adapter || "specialized").replaceAll("_", " ").toUpperCase()} · RULE-BASED FINDING`); adapterLabel.dir = dir; adapterLabel.lang = lang; verdict.append(adapterLabel);
      if (domainEvidence.claimed_holder && domainEvidence.reported_current_holder) {
        verdict.append(node("p", "alignment-terms", "Claimed: " + domainEvidence.claimed_holder + " · Official result: " + domainEvidence.reported_current_holder));
      }
      // Surface the structured lifecycle facts that actually drive a specialized
      // verdict; a status badge without its underlying dates is not auditable.
      const lifecycleFacts = [
        ["Node.js major", domainEvidence.claimed_major ? `v${domainEvidence.claimed_major}` : null],
        ["Support status", domainEvidence.support_status],
        ["LTS start", domainEvidence.lts_start],
        ["Maintenance LTS", domainEvidence.maintenance_start],
        ["End of life", domainEvidence.end_of_life],
        ["Release row last updated", domainEvidence.last_updated],
        ["Source publication date", domainEvidence.publication_date || domainEvidence.supporting_sources?.[0]?.published_date || "NOT PROVIDED BY SOURCE"],
        ["Publication date semantics", domainEvidence.publication_date_semantics || domainEvidence.supporting_sources?.[0]?.publication_date_semantics],
        ["Evidence retrieved at (UTC)", domainEvidence.retrieved_at || domainEvidence.supporting_sources?.[0]?.retrieved_at],
        ["Page retrieved at", domainEvidence.source?.retrieved_at],
        ["Latest LTS major", domainEvidence.latest_lts_major ? `v${domainEvidence.latest_lts_major}` : null]
      ].filter(([, value]) => value);
      if (lifecycleFacts.length) {
        const facts = node("div", "alignment-facts");
        lifecycleFacts.forEach(([label, value]) => {
          const item = node("p", "alignment-terms", `${label}: ${value}`);
          facts.append(item);
        });
        verdict.append(facts);
      }
      const domainNote = node("p", "alignment-note", arabic ? (domainEvidence.method === "OFFICIAL_PYTHON_ORG_SUNSET_NOTICE" ? "تنص صفحة Python.org الرسمية على أن Python 2 انتهى دعمه في 1 يناير 2020. تاريخ نشر الصفحة غير متاح؛ وسُجل وقت الاسترجاع بصورة مستقلة." : domainEvidence.method === "FIRST_PARTY_OFFICIAL_WEBSITE_LINK" ? "يربط الموقع الرسمي للبيت الأبيض مباشرةً بحساب X هذا. يثبت ذلك الارتباط المؤسسي، ولا يثبت صحة كل منشور أو الحالة الأمنية للحساب." : domainEvidence.limitation || "دليل متخصص؛ راجع المصدر الأصلي وحدود الاستدلال.") : domainEvidence.limitation || "Domain-specific evidence; inspect the original sources and limitations."); domainNote.dir = arabic ? "rtl" : "ltr"; domainNote.lang = lang; verdict.append(domainNote);
      auditDetails.append(verdict);
    }
    // v0.2.84: group sources by how the adjudicator actually used them, using
    // the same trace the verdict was computed from (no reconstruction).
    const traceByIndex = new Map((claim.adjudication?.adjudication_signals?.source_trace || []).map(item => [item.index, item]));
    // v0.2.92: for a decisive verdict, the sources the verdict was computed
    // from (adjudication.evidence) are the counted ones, including sources that
    // formed an independent-agreement verdict.
    const decisiveVerdict = ["CURRENT", "CONTRADICTED", "SUPERSEDED"].includes(claim.status);
    const countedSources = new Map(decisiveVerdict ? (Array.isArray(claim.adjudication?.evidence) ? claim.adjudication.evidence : []).filter(item => Number.isInteger(item.source_index)).map(item => [item.source_index, item.relation]) : []);
    const contributionRank = (trace, index) => countedSources.has(index) ? (countedSources.get(index) === "CONTRADICTS" ? 1 : 0)
      : (countedSources.size ? (trace?.eligible ? 2 : 3) : (!trace ? 3 : trace.contribution === "SUPPORTS_ELIGIBLE" ? 0 : trace.contribution === "CONTRADICTS_ELIGIBLE" ? 1 : trace.eligible ? 2 : 3));
    const exclusionText = reason => {
      const key = String(reason || "");
      const table = {
        RELEVANCE: ["not directly about the claim", "لا يتناول الادعاء مباشرة"],
        RELIABILITY: ["publisher not classified as official, institutional or reputable", "الناشر غير مصنّف رسمياً أو مؤسسياً أو موثوقاً"],
        FIRST_PARTY_NOT_CONFIRMED_AS_ORIGINATING: ["not confirmed as the originating record", "لم يُؤكَّد أنه السجل الأصلي"],
        SCOPE_NO_MATCH: ["covers a different scope", "يغطي نطاقاً مختلفاً"],
        NOT_RECENT_FOR_CURRENT_STATE: ["too old or undated for a current-state claim", "قديم أو غير مؤرخ بالنسبة لادعاء حالة راهنة"],
        NO_SEMANTIC_RELATION: ["relation to the claim not assessed", "لم تُقيَّم علاقته بالادعاء"],
        INVALID_URL: ["invalid address", "عنوان غير صالح"]
      };
      const entry = table[key] || table[key.split("_")[0]] || [key.replaceAll("_", " ").toLowerCase(), key];
      return arabic ? entry[1] : entry[0];
    };
    const orderedSources = (claim.sources || []).map((source, index) => ({ source, index, trace: traceByIndex.get(index) }))
      .sort((a, b) => contributionRank(a.trace, a.index) - contributionRank(b.trace, b.index) || a.index - b.index);
    let currentGroup = null;
    orderedSources.forEach(({ source, trace, index: sourceIndex }) => {
      if (traceByIndex.size || countedSources.size) {
        const group = contributionRank(trace, sourceIndex);
        if (group !== currentGroup) {
          currentGroup = group;
          const headings = arabic
            ? ["مصادر احتُسبت داعمة", "مصادر احتُسبت مناقضة", "مصادر مؤهلة دون علاقة حاسمة", "مصادر لم تُحتسب في الحكم"]
            : ["COUNTED AS SUPPORTING", "COUNTED AS CONTRADICTING", "ELIGIBLE, NO DECISIVE RELATION", "NOT COUNTED IN THE VERDICT"];
          const heading = node("div", `source-group source-group-${group}`, headings[group]);
          heading.dir = dir; heading.lang = lang; auditDetails.append(heading);
        }
      }
      const evidence = node("div", "evidence");
      const anchor = node("a", "", source.title || source.url);
      anchor.href = source.url; anchor.target = "_blank"; anchor.rel = "noopener noreferrer";
      evidence.dir = "ltr";
      const titleArabic = /[\u0600-\u06FF]/.test(source.title || "");
      anchor.dir = titleArabic ? "rtl" : "ltr"; anchor.lang = titleArabic ? "ar" : "en";
      const snippet = node("p", "", source.snippet || "No excerpt supplied.");
      const snippetArabic = /[\u0600-\u06FF]/.test(source.snippet || "");
      snippet.dir = snippetArabic ? "rtl" : "ltr"; snippet.lang = snippetArabic ? "ar" : "en";
      evidence.append(anchor, snippet);
      const dateParts = arabic ? [`تاريخ نشر المصدر ${source.published_date || "غير متاح"}`, `تصنيف المصدر ${source.source_reliability || "غير مقيّم"}`] : [`SOURCE PUBLICATION ${source.published_date || "NOT PROVIDED"}`, `DOMAIN ${source.source_reliability || "UNASSESSED"}`];
      if (source.published_date && source.published_date_basis) dateParts[0] += arabic ? ` (${source.published_date_basis === "PAGE_METADATA" ? "من بيانات الصفحة" : "من مزود البحث"})` : ` (${source.published_date_basis.replaceAll("_", " ")})`;
      if (source.updated_date) dateParts.push(arabic ? `تحديث تحريري ${source.updated_date}` : `EDITORIAL UPDATE ${source.updated_date}`);
      else if (source.unverified_modified_date) dateParts.push(arabic ? `تاريخ تعديل غير معتمد ${source.unverified_modified_date}` : `UNVERIFIED MODIFIED DATE ${source.unverified_modified_date} (${String(source.unverified_modified_date_reason || "NOT TRUSTED").replaceAll("_", " ")})`);
      if (source.retrieved_at) dateParts.push(arabic ? `وقت الاسترجاع ${source.retrieved_at} (UTC)` : `RETRIEVED AT ${source.retrieved_at} (UTC)`);
      if (source.evidence_origin) dateParts.push(arabic
        ? ({ DIRECT_PAGE_PASSAGES: "مقتطفات حرفية من الصفحة", SEARCH_SNIPPET: "مقتطف محرك البحث فقط", SPECIALIST_DIRECT_ACQUISITION: "جلب مباشر متخصص" }[source.evidence_origin] || source.evidence_origin)
        : `EVIDENCE ${source.evidence_origin.replaceAll("_", " ")}`);
      if (source.first_party_confirmation === "NOT_CONFIRMED_BY_PAGE_IDENTITY" || source.first_party_confirmation === "NOT_FETCHED") dateParts.push(arabic ? "لم تُؤكَّد هوية الناشر الأصلي" : "FIRST-PARTY IDENTITY NOT CONFIRMED");
      if (source.event_date_candidate) dateParts.push(arabic ? `تاريخ الحدث المحتمل في المقتطف ${source.event_date_candidate}` : `POSSIBLE EVENT DATE IN SNIPPET ${source.event_date_candidate}`);
      const sourceMeta = node("div", "meta", dateParts.join(" · ")); sourceMeta.dir = dir; sourceMeta.lang = lang;
      evidence.append(sourceMeta);
      if (trace && !trace.eligible && trace.exclusion_reasons?.length && !countedSources.has(sourceIndex)) {
        const why = node("p", "source-exclusion", (arabic ? "لم يُحتسب: " : "Not counted: ") + [...new Set(trace.exclusion_reasons.map(exclusionText))].join(arabic ? "؛ " : "; "));
        why.dir = dir; why.lang = lang; evidence.append(why);
      }
      const relevance = source.relevance_assessment;
      if (relevance) {
        const relevanceBox = node("div", "alignment");
        relevanceBox.append(node("div", "meta", `SOURCE RELEVANCE · ${relevance.relevance} · ${relevance.matched_term_count}/${relevance.claim_term_count} CLAIM TERMS`));
        if (relevance.matched_terms?.length) relevanceBox.append(node("p", "alignment-terms", `Matched: ${relevance.matched_terms.join(", ")}`));
        relevanceBox.append(node("p", "alignment-note", "Bounded lexical screening is a relevance aid, not semantic entailment or a truth verdict."));
        evidence.append(relevanceBox);
      }
      const relation = source.relation_assessment;
      if (relation) {
        const assessment = node("div", "alignment");
        assessment.append(node("div", "meta", `RELATION SCREEN · ${relation.signal.replaceAll("_", " ")}`));
        assessment.append(node("p", "alignment-note", "Rule-based review signal only — not a support or contradiction verdict."));
        evidence.append(assessment);
      }
      const alignment = source.claim_alignment;
      if (alignment) {
        const overlap = node("div", "alignment");
        overlap.append(node("div", "meta", `CLAIM TERM OVERLAP · ${alignment.label.replaceAll("_", " ")}`));
        if (alignment.matched_claim_terms?.length) overlap.append(node("p", "alignment-terms", `Matched terms: ${alignment.matched_claim_terms.join(", ")}`));
        if (alignment.unmatched_claim_terms?.length) overlap.append(node("p", "alignment-terms muted", `Not found in snippet/title: ${alignment.unmatched_claim_terms.join(", ")}`));
        overlap.append(node("p", "alignment-note", "Lexical overlap only — this does not mean the source supports or contradicts the claim."));
        evidence.append(overlap);
      }
      auditDetails.append(evidence);
    });
    if (claim.excluded_sources?.length) {
      const excludedBox = node("div", "alignment"); excludedBox.dir = "ltr";
      excludedBox.append(node("div", "meta", `LOW-RELEVANCE RESULTS · EXCLUDED FROM ADJUDICATION · ${claim.excluded_sources.length}`));
      claim.excluded_sources.forEach(source => {
        const row = node("p", "alignment-note");
        const link = node("a", "", source.title || source.url);
        link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer";
        row.append(link, document.createTextNode(" · retained for audit, not treated as claim evidence"));
        excludedBox.append(row);
      });
      auditDetails.append(excludedBox);
    }
    const semantic = claim.semantic_assessment;
    if (semantic) {
      const semanticBox = node("div", "alignment"); semanticBox.dir = "ltr";
      semanticBox.append(node("div", "meta", `SEMANTIC TRIAGE · ${semantic.status.replaceAll("_", " ")}`));
      semantic.assessments?.forEach(item => semanticBox.append(node("p", "alignment-note", `SOURCE ${item.source_index + 1} · ${item.relation.replaceAll("_", " ")} — ${item.rationale}`)));
      if (semantic.status === "FAILED_CLOSED" && semantic.failure_details) {
        const failure = semantic.failure_details;
        const detail = String(failure.safe_message || "")
          .replace(/^Groq (?:model \S+ )?(?:returned|request rejected with) HTTP \d+\.?\s*:?\s*/i, "")
          .replace(/https?:\/\/\S+/gi, "[URL]")
          .slice(0, 140);
        const diagnostics = [
          failure.failure_code || semantic.failure_code || "UPSTREAM_FAILURE",
          failure.http_status ? `HTTP ${failure.http_status}` : null,
          detail || null
        ].filter(Boolean).join(" · ");
        semanticBox.append(node("p", "alignment-note", `PROVIDER DIAGNOSTIC · ${diagnostics}`));
      }
      semanticBox.append(node("p", "alignment-note", semantic.limitation || "Advisory model output only; no final verdict."));
      auditDetails.append(semanticBox);
    }
    if (claim.cross_source_conflicts?.length) {
      const conflictBox = node("div", "alignment"); conflictBox.dir = "ltr";
      conflictBox.append(node("div", "meta", `CROSS-SOURCE CONFLICT CANDIDATES · ${claim.cross_source_conflicts.length}`));
      claim.cross_source_conflicts.forEach(conflict => {
        const item = node("p", "alignment-note", `${conflict.signal.replaceAll("_", " ")} — ${conflict.warning}`);
        conflictBox.append(item);
      });
      auditDetails.append(conflictBox);
    }
    const retrievalIssues = (claim.retrieval_diagnostics || []).filter(item => !["RESULTS_FOUND", "HTTP_OK", "VALIDATED", "EVIDENCE_FOUND"].includes(item.status));
    if (retrievalIssues.length) {
      const retrievalBox = node("div", "alignment"); retrievalBox.dir = "ltr"; retrievalBox.lang = "en";
      retrievalBox.append(node("div", "meta", "RETRIEVAL DIAGNOSTICS · REVIEW"));
      retrievalIssues.forEach(item => retrievalBox.append(node("p", "alignment-note", `${item.provider || "EVIDENCE PROVIDER"} · ${item.stage || "DIRECT_EVIDENCE"} · ${item.status}${item.http_status ? ` · HTTP ${item.http_status}` : ""}`)));
      retrievalBox.append(node("p", "alignment-note", "Retrieval diagnostics explain evidence acquisition only; they are not evidence for or against the claim."));
      auditDetails.append(retrievalBox);
    }
    if (!claim.sources?.length) { const empty = node("div", "empty", arabic ? "لم يتم استرجاع أدلة قابلة للاستخدام لهذا الادعاء." : "No usable evidence was retrieved for this claim."); empty.dir = dir; empty.lang = lang; auditDetails.append(empty); }
    if (auditDetails.childElementCount > 1) card.append(auditDetails);
    list.append(card);
  });
  results.hidden = false;
  if (scroll) results.scrollIntoView({ behavior: "smooth", block: "start" });
}
