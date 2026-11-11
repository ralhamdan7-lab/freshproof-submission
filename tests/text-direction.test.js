import test from "node:test";
import assert from "node:assert/strict";
import { detectTextDirection } from "../src/text-direction.js";

test("Arabic-dominant claims receive RTL language metadata", () => {
  assert.deepEqual(detectTextDirection("الرياض عاصمة المملكة العربية السعودية."), {
    lang: "ar",
    dir: "rtl"
  });
});

test("English claims receive LTR language metadata", () => {
  assert.deepEqual(detectTextDirection("Riyadh is the capital of Saudi Arabia."), {
    lang: "en",
    dir: "ltr"
  });
});

test("Arabic prose remains RTL when it contains Latin acronyms and numbers", () => {
  assert.deepEqual(detectTextDirection("القرار الحالي في المملكة العربية السعودية وفق GDP 2026."), {
    lang: "ar",
    dir: "rtl"
  });
});

test("balanced or empty text defaults deterministically to LTR", () => {
  assert.deepEqual(detectTextDirection("ABC DEF عرب"), {
    lang: "en",
    dir: "ltr"
  });
  assert.deepEqual(detectTextDirection(""), {
    lang: "en",
    dir: "ltr"
  });
});

test("non-string values are safely normalized before direction detection", () => {
  assert.deepEqual(detectTextDirection(null), {
    lang: "en",
    dir: "ltr"
  });
});
