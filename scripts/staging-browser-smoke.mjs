import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.FRESH_PROOF_BASE_URL || "https://freshproof-staging.ralhamdan7.workers.dev";
const fixture = {
  product: "FreshProof",
  version: "browser-smoke",
  claims: [
    {
      text: "الرياض عاصمة المملكة العربية السعودية.",
      status: "NEEDS_REVIEW",
      temporal_assessment: { status: "NOT_TIME_SENSITIVE" },
      evidence_confidence: "LIMITED",
      sources: [],
      explanation: "Fixture: evidence assessment remains inconclusive.",
      explanation_detail: {
        summary: "لم تتوفر أدلة كافية للحكم.",
        reason: "اختبار واجهة اصطناعي.",
        date_interpretation: { event_date: null, publication_date: null, retrieved_at: "2026-11-11T00:00:00Z" },
        evidence_basis: [{ title: "Official source fixture", url: "https://example.com/official", relation: "REVIEW" }],
        limitations: ["Synthetic browser test fixture."]
      },
      correction: { status: "WITHHELD", text: null, evidence_refs: [], limitations: ["Insufficient evidence."] }
    },
    {
      text: "Water is composed of hydrogen and oxygen atoms.",
      status: "NEEDS_REVIEW",
      temporal_assessment: { status: "NOT_TIME_SENSITIVE" },
      evidence_confidence: "LIMITED",
      sources: [],
      explanation: "Insufficient evidence for a factual verdict.",
      explanation_detail: {
        summary: "No factual verdict.",
        reason: "Synthetic browser test fixture.",
        date_interpretation: { event_date: null, publication_date: null, retrieved_at: "2026-11-11T00:00:00Z" },
        evidence_basis: [],
        limitations: ["Synthetic browser test fixture."]
      },
      correction: { status: "WITHHELD", text: null, evidence_refs: [], limitations: ["Insufficient evidence."] }
    },
    {
      text: "Python 2.7 is still officially supported.",
      status: "SUPERSEDED",
      temporal_assessment: { status: "TEMPORAL_REVIEW_REQUIRED" },
      evidence_confidence: "LIMITED",
      sources: [{ title: "Sunsetting Python 2 | Python.org", url: "https://www.python.org/doc/sunset-python-2/", source_reliability: "PRIMARY_OR_OFFICIAL_DOMAIN", snippet: "Python 2 is no longer supported as of January 1, 2020." }],
      explanation: "The official lifecycle notice establishes the end of support.",
      explanation_detail: {
        summary: "Python 2 support ended.",
        reason: "Official first-party sunset notice.",
        date_interpretation: { event_date: "2020-01-01", publication_date: null, retrieved_at: "2026-11-12T00:00:00Z" },
        evidence_basis: [{ title: "Sunsetting Python 2 | Python.org", url: "https://www.python.org/doc/sunset-python-2/", relation: "CONTRADICTS" }],
        limitations: ["Synthetic browser test fixture."]
      },
      correction: {
        status: "PROVIDED",
        text: "Python 2 support ended on January 1, 2020.",
        evidence_refs: [{ title: "Sunsetting Python 2 | Python.org", url: "https://www.python.org/doc/sunset-python-2/", event_date: "2020-01-01", supporting_quote: "Python 2 is no longer supported." }],
        limitations: ["Synthetic browser test fixture."]
      }
    },
    {
      text: "<img src=x onerror=alert(1)> is untrusted user text.",
      status: "NEEDS_REVIEW",
      temporal_assessment: { status: "NOT_TIME_SENSITIVE" },
      evidence_confidence: "NONE",
      sources: [],
      explanation: "Untrusted HTML-like text must remain inert.",
      explanation_detail: {
        summary: "No factual verdict.",
        reason: "Synthetic browser security fixture.",
        date_interpretation: { event_date: null, publication_date: null, retrieved_at: "2026-11-11T00:00:00Z" },
        evidence_basis: [],
        limitations: ["Synthetic browser security fixture."]
      },
      correction: { status: "WITHHELD", text: null, evidence_refs: [], limitations: ["Insufficient evidence."] }
    }
  ]
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.route("**/api/verify", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
  });

  const response = await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45000 });
  assert.equal(response.status(), 200, "Staging root must return HTTP 200");
  await page.locator("#answer").waitFor();
  assert.match(await page.title(), /FreshProof/);

  await page.locator("#verify").click();
  assert.match(await page.locator("#notice").innerText(), /Paste an answer first/i);

  await page.locator("#answer").fill("واجهة اختبار ثنائية اللغة.");
  assert.match(await page.locator("#counter").innerText(), /\d+ \/ 12,000/);
  await page.locator("#verify").click();
  await page.locator("#results").waitFor({ state: "visible" });

  const cards = page.locator("#claim-list .claim");
  assert.equal(await cards.count(), 4);
  assert.equal(await cards.nth(0).locator(".claim-text").getAttribute("dir"), "rtl");
  assert.equal(await cards.nth(0).locator(".claim-text").getAttribute("lang"), "ar");
  assert.equal(await cards.nth(1).locator(".claim-text").getAttribute("dir"), "ltr");
  assert.equal(await cards.nth(1).locator(".claim-text").getAttribute("lang"), "en");
  assert.match(await page.locator("#summary").innerText(), /ادعاءات/);
  assert.equal(await cards.nth(0).locator(".claim-comparison").count(), 1);
  assert.equal(await cards.nth(0).locator(".correction-outcome").count(), 1);
  assert.equal(await cards.nth(0).locator(".outcome-evidence a").getAttribute("href"), "https://example.com/official");
  assert.match(await cards.nth(2).locator(".comparison-correct").innerText(), /Python 2 support ended/);
  assert.equal(await cards.nth(2).locator(".correction-outcome .outcome-quote").innerText(), "Python 2 is no longer supported.");
  assert.equal(await cards.nth(2).locator(".correction-outcome a").getAttribute("href"), "https://www.python.org/doc/sunset-python-2/");
  assert.equal(await cards.nth(2).locator(".correction-outcome a").getAttribute("rel"), "noopener noreferrer");
  assert.equal(await cards.nth(3).locator(".claim-text").innerText(), "<img src=x onerror=alert(1)> is untrusted user text.");
  assert.equal(await cards.nth(3).locator("img").count(), 0, "untrusted HTML-like input must render as text, never as an element");

  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, `Mobile horizontal overflow: ${JSON.stringify(dimensions)}`);
  assert.deepEqual(pageErrors, [], "No uncaught browser JavaScript errors");
  console.log("PASS: Staging browser UI, empty-input validation, bilingual RTL/LTR rendering, evidence/correction blocks, mobile overflow, and browser console checks.");

  // Exercise the real browser-to-Worker API path once with a non-sensitive stable fact.
  // This consumes one bounded Staging evidence lookup; the preceding fixture test is deterministic.
  const livePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const liveErrors = [];
  await livePage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45000 });
  livePage.on("pageerror", error => liveErrors.push(error.message));
  const textbox = livePage.getByRole("textbox", { name: /PASTE AN AI-GENERATED ANSWER OR ENTER YOUR OWN CLAIM/i });
  await textbox.waitFor();
  await textbox.fill("Water is composed of hydrogen and oxygen.");
  const verifyButton = livePage.getByRole("button", { name: /Verify claims/i });
  await livePage.keyboard.press("Tab");
  assert.equal(await livePage.evaluate(() => document.activeElement?.id), "verify", "Verify button must be keyboard reachable after the labeled input");
  const apiResponsePromise = livePage.waitForResponse(response => response.url().endsWith("/api/verify") && response.request().method() === "POST", { timeout: 90000 });
  await livePage.keyboard.press("Enter");
  const apiResponse = await apiResponsePromise;
  assert.equal(apiResponse.status(), 200, "Live browser-to-Worker verification request must return HTTP 200");
  const liveBody = await apiResponse.json();
  assert.equal(liveBody.product, "FreshProof");
  assert.equal(liveBody.version, "0.2.46");
  assert.equal(liveBody.claims?.length, 1);
  assert.equal(liveBody.claims[0].temporal_assessment?.status, "NOT_TIME_SENSITIVE");
  assert.ok(["NEEDS_REVIEW", "UNVERIFIABLE"].includes(liveBody.claims[0].status), "Stable claim must abstain when advisory semantic triage cannot establish sufficient factual evidence");
  assert.equal(liveBody.claims[0].correction?.status, "WITHHELD");
  await livePage.locator("#results").waitFor({ state: "visible", timeout: 30000 });
  assert.equal(await livePage.locator("#claim-list .claim").count(), 1);
  assert.match(await livePage.locator("#notice").innerText(), /Evidence review complete/i);
  assert.deepEqual(liveErrors, [], "No uncaught browser JavaScript errors on live API path");
  console.log("PASS: Real browser-to-Worker API integration, keyboard submission, live stable-claim abstention, and rendered report.");

} finally {
  await browser.close();
}
