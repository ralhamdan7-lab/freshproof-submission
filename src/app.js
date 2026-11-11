import { detectTextDirection } from "./text-direction.js";
const input = document.querySelector("#answer");
const verify = document.querySelector("#verify");
const notice = document.querySelector("#notice");
const counter = document.querySelector("#counter");
const results = document.querySelector("#results");
const list = document.querySelector("#claim-list");
const summary = document.querySelector("#summary");

input.addEventListener("input", () => counter.textContent = `${input.value.length.toLocaleString()} / 12,000`);
verify.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) { notice.textContent = "Paste an answer first."; input.focus(); return; }
  verify.disabled = true;
  verify.querySelector("span").textContent = "Checking evidence…";
  notice.textContent = "Searching for recent evidence. Search results are leads, not verdicts.";
  results.hidden = true;
  try {
    const response = await fetch("/api/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Verification request failed.");
    render(data);
    notice.textContent = "Evidence review complete. FreshProof abstains when the available evidence cannot justify a verdict.";
  } catch (err) { notice.textContent = err.message || "Could not complete verification. Please retry."; }
  finally { verify.disabled = false; verify.querySelector("span").textContent = "Verify claims"; }
});
function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function render(data) {
  const statusLabel = (status, arabic) => arabic ? ({
    CURRENT: "صحيح وفق الأدلة",
    SUPERSEDED: "معلومة قديمة",
    CONTRADICTED: "غير صحيح وفق الأدلة",
    UNVERIFIABLE: "تعذر التحقق",
    NEEDS_REVIEW: "يحتاج إلى مراجعة",
    NOT_TIME_SENSITIVE: "غير حساس زمنياً — ليس حكماً على الصحة"
  }[status] || status.replaceAll("_", " ")) : ({
    CURRENT: "SUPPORTED BY EVIDENCE",
    SUPERSEDED: "OUTDATED",
    CONTRADICTED: "CONTRADICTED BY EVIDENCE",
    UNVERIFIABLE: "UNVERIFIABLE",
    NEEDS_REVIEW: "NEEDS REVIEW",
    NOT_TIME_SENSITIVE: "NOT TIME-SENSITIVE — NOT A TRUTH VERDICT"
  }[status] || status.replaceAll("_", " "));
  const statusTone = status => status === "CURRENT" ? "good"
    : ["CONTRADICTED", "SUPERSEDED"].includes(status) ? "bad"
    : status === "NEEDS_REVIEW" ? "warn" : "neutral";
  list.replaceChildren();
  const counts = data.claims.reduce((acc, claim) => (acc[claim.status] = (acc[claim.status] || 0) + 1, acc), {});
  const providedCorrections = data.claims.filter(claim => claim.correction?.status === "PROVIDED").length;
  const arabicReport = data.claims[0] ? detectTextDirection(data.claims[0].text).lang === "ar" : false;
  summary.textContent = arabicReport
    ? `${data.claims.length} ادعاءات · ${counts.CURRENT || 0} مدعوم · ${counts.CONTRADICTED || 0} متعارض · ${counts.SUPERSEDED || 0} قديم · ${counts.NEEDS_REVIEW || 0} للمراجعة · ${counts.UNVERIFIABLE || 0} تعذر التحقق · ${providedCorrections} تصحيح معتمد`
    : `${data.claims.length} CLAIMS · ${counts.CURRENT || 0} SUPPORTED · ${counts.CONTRADICTED || 0} CONTRADICTED · ${counts.SUPERSEDED || 0} OUTDATED · ${counts.NEEDS_REVIEW || 0} REVIEW · ${counts.UNVERIFIABLE || 0} UNVERIFIABLE · ${providedCorrections} CORRECTIONS PROVIDED`;
  data.claims.forEach((claim, index) => {
    const { lang, dir } = detectTextDirection(claim.text);
    const arabic = lang === "ar";
    const card = node("article", "claim");
    card.dir = "ltr"; card.lang = "en";
    const top = node("div", "claim-top"); top.dir = dir; top.lang = lang;
    top.append(node("span", "meta", arabic ? `الادعاء ${String(index + 1).padStart(2, "0")}` : `CLAIM ${String(index + 1).padStart(2, "0")}`), node("span", `status ${statusTone(claim.status)}`, statusLabel(claim.status, arabic)));
    const claimText = node("p", "claim-text", claim.text); claimText.dir = dir; claimText.lang = lang;
    card.append(top, claimText);
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
    const metrics = node("div", "metric-row");
    metrics.append(node("span", "metric", arabic ? `موثوقية الأدلة · ${{MULTI_SOURCE:"مصادر متعددة",MULTI_SOURCE_WITH_DATES:"مصادر متعددة مؤرخة",LIMITED:"محدودة",NONE:"لا توجد",NOT_ASSESSED:"لم تُقيّم"}[claim.evidence_confidence] || claim.evidence_confidence || "لم تُقيّم"}` : `EVIDENCE CONFIDENCE · ${claim.evidence_confidence || "NOT ASSESSED"}`));
    const reliabilities = [...new Set(claim.sources?.map(s => s.source_reliability) || [])];
    metrics.append(node("span", "metric", arabic ? `تصنيف المصادر · ${reliabilities.length ? reliabilities.join("، ") : "لا توجد"}` : `SOURCE PROFILE · ${reliabilities.length ? reliabilities.join(", ") : "NONE"}`));
    metrics.dir = dir; metrics.lang = lang;
    card.append(metrics);
    if (claim.explanation) { const explanation = node("p", "explanation", arabic ? (claim.status === "SUPERSEDED" ? "تُظهر الأدلة أن الادعاء أصبح قديماً أو تجاوزته تطورات لاحقة." : claim.status === "CURRENT" ? "تدعم مصادر مستقلة مؤهلة هذا الادعاء ضمن النطاق المحدد." : claim.status === "CONTRADICTED" ? "تتعارض مصادر مستقلة مؤهلة مع الادعاء." : claim.status === "NEEDS_REVIEW" ? "لم تتحقق عتبة الأدلة والتأييد المستقل؛ لذلك امتنع المحرك عن الحكم." : claim.explanation) : claim.explanation); explanation.dir = dir; explanation.lang = lang; card.append(explanation); }
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
      card.append(explainBox);
    }
    // Plain-language comparison: preserve the exact submitted claim and never invent a replacement.
    {
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
        CONTRADICTED: "النتيجة: الادعاء يتعارض مع الأدلة المؤهلة المرتبطة به.",
        SUPERSEDED: "النتيجة: المعلومة أصبحت قديمة وتجاوزها تغير موثق.",
        NEEDS_REVIEW: "النتيجة: الأدلة الحالية لا تكفي لإثبات صحة الادعاء أو نفيه.",
        UNVERIFIABLE: "النتيجة: لم تتوفر أدلة قابلة للاستخدام للتحقق من الادعاء.",
        NOT_TIME_SENSITIVE: "لم يُكتشف محفز زمني؛ هذه ليست نتيجة تحقق من صحة المعلومة."
      } : {
        CURRENT: "Finding: evidence supports this claim within the reviewed scope and timeframe.",
        CONTRADICTED: "Finding: the claim conflicts with the eligible evidence retrieved for it.",
        SUPERSEDED: "Finding: a documented change has made the original information outdated.",
        NEEDS_REVIEW: "Finding: available evidence is not sufficient to establish or refute the claim.",
        UNVERIFIABLE: "Finding: no usable evidence was available to verify the claim.",
        NOT_TIME_SENSITIVE: "No temporal trigger was detected; this is not a factual verdict."
      };
      const finding = node("p", "comparison-finding", findingMap[claim.status] || claim.explanation || "");
      finding.dir = dir; finding.lang = lang; comparison.append(finding);
      comparison.append(node("div", "comparison-label", arabic ? "ما الصحيح؟" : "WHAT IS CORRECT?"));
      const correction = claim.correction || {};
      let correctText = "";
      if (correction.status === "PROVIDED" && typeof correction.text === "string" && correction.text.trim()) correctText = correction.text;
      else if (claim.status === "CURRENT") correctText = arabic ? "المعلومة الواردة في الادعاء أعلاه مدعومة بالأدلة ضمن النطاق المتحقق؛ لا يلزم استبدالها." : "The original statement above is supported within the reviewed scope; no replacement is needed.";
      else if (claim.status === "CONTRADICTED" || claim.status === "SUPERSEDED") correctText = arabic ? "لم يعتمد المحرك حتى الآن صياغة بديلة مستوفية لشروط الإثبات المستقل وتطابق النطاق والزمن. لذلك لن يخمّن المعلومة الصحيحة. راجع الأدلة الأصلية أدناه." : "No replacement has yet passed the independent-evidence, scope, and timeframe checks. FreshProof will not guess the correct statement. Review the original sources below.";
      else if (claim.status === "NEEDS_REVIEW") correctText = arabic ? "لا يمكن الجزم بالمعلومة الصحيحة حالياً؛ توجد أدلة لكنها غير كافية أو تحتاج إلى حسم التعارض." : "The correct statement cannot yet be established; evidence is incomplete or conflicting.";
      else if (claim.status === "UNVERIFIABLE") correctText = arabic ? "لا يمكن تحديد المعلومة الصحيحة لعدم توفر أدلة قابلة للاستخدام." : "The correct statement cannot be determined because no usable evidence was obtained.";
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
      card.append(correctionBox);
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
      card.append(verdict);
    }
    (claim.sources || []).forEach(source => {
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
      if (source.retrieved_at) dateParts.push(arabic ? `وقت الاسترجاع ${source.retrieved_at} (UTC)` : `RETRIEVED AT ${source.retrieved_at} (UTC)`);
      if (source.event_date_candidate) dateParts.push(arabic ? `تاريخ الحدث المحتمل في المقتطف ${source.event_date_candidate}` : `POSSIBLE EVENT DATE IN SNIPPET ${source.event_date_candidate}`);
      const sourceMeta = node("div", "meta", dateParts.join(" · ")); sourceMeta.dir = dir; sourceMeta.lang = lang;
      evidence.append(sourceMeta);
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
      card.append(evidence);
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
      card.append(excludedBox);
    }
    const semantic = claim.semantic_assessment;
    if (semantic) {
      const semanticBox = node("div", "alignment"); semanticBox.dir = "ltr";
      semanticBox.append(node("div", "meta", `SEMANTIC TRIAGE · ${semantic.status.replaceAll("_", " ")}`));
      semantic.assessments?.forEach(item => semanticBox.append(node("p", "alignment-note", `SOURCE ${item.source_index + 1} · ${item.relation.replaceAll("_", " ")} — ${item.rationale}`)));
      semanticBox.append(node("p", "alignment-note", semantic.limitation || "Advisory model output only; no final verdict."));
      card.append(semanticBox);
    }
    if (claim.cross_source_conflicts?.length) {
      const conflictBox = node("div", "alignment"); conflictBox.dir = "ltr";
      conflictBox.append(node("div", "meta", `CROSS-SOURCE CONFLICT CANDIDATES · ${claim.cross_source_conflicts.length}`));
      claim.cross_source_conflicts.forEach(conflict => {
        const item = node("p", "alignment-note", `${conflict.signal.replaceAll("_", " ")} — ${conflict.warning}`);
        conflictBox.append(item);
      });
      card.append(conflictBox);
    }
    const retrievalIssues = (claim.retrieval_diagnostics || []).filter(item => !["RESULTS_FOUND", "HTTP_OK", "VALIDATED", "EVIDENCE_FOUND"].includes(item.status));
    if (retrievalIssues.length) {
      const retrievalBox = node("div", "alignment"); retrievalBox.dir = "ltr"; retrievalBox.lang = "en";
      retrievalBox.append(node("div", "meta", "RETRIEVAL DIAGNOSTICS · REVIEW"));
      retrievalIssues.forEach(item => retrievalBox.append(node("p", "alignment-note", `${item.provider || "EVIDENCE PROVIDER"} · ${item.stage || "DIRECT_EVIDENCE"} · ${item.status}${item.http_status ? ` · HTTP ${item.http_status}` : ""}`)));
      retrievalBox.append(node("p", "alignment-note", "Retrieval diagnostics explain evidence acquisition only; they are not evidence for or against the claim."));
      card.append(retrievalBox);
    }
    if (!claim.sources?.length) { const empty = node("div", "empty", arabic ? "لم يتم استرجاع أدلة قابلة للاستخدام لهذا الادعاء." : "No usable evidence was retrieved for this claim."); empty.dir = dir; empty.lang = lang; card.append(empty); }
    list.append(card);
  });
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}
