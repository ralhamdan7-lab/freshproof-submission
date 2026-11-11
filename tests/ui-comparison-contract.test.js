import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

test("claim report explicitly labels the original claim and wrong/right comparison in Arabic and English", () => {
  for (const text of ["ما الخطأ؟", "ما الصحيح؟", "WHAT IS WRONG?", "WHAT IS CORRECT?", "claim.text"]) assert.ok(app.includes(text), `missing UI contract: ${text}`);
});

test("corrected wording is displayed only for a validated PROVIDED correction", () => {
  assert.match(app, /correction\.status === "PROVIDED" && typeof correction\.text === "string"/);
  assert.match(app, /No replacement has yet passed/);
  assert.match(app, /لن يخمّن المعلومة الصحيحة/);
});

test("review and unverifiable states explicitly abstain rather than imply a correct answer", () => {
  assert.match(app, /The correct statement cannot yet be established/);
  assert.match(app, /The correct statement cannot be determined/);
  assert.match(app, /لا يمكن الجزم بالمعلومة الصحيحة/);
});

test("validated correction references remain clickable and safe from opener access", () => {
  assert.match(app, /link\.href = item\.url/);
  assert.match(app, /link\.rel = "noopener noreferrer"/);
  assert.match(app, /supporting_quote/);
});

test("comparison styles keep original, validated correction, and unresolved states visually distinct", () => {
  assert.match(css, /\.comparison-original/);
  assert.match(css, /\.comparison-correct/);
  assert.match(css, /\.comparison-unresolved/);
});
