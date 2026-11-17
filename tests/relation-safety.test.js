import test from "node:test";
import assert from "node:assert/strict";
import { claimYearsAbsent } from "../worker/index.js";

test("v0.3.3: a source cannot support a claim about a year it never mentions", () => {
  assert.equal(claimYearsAbsent("The Berlin Wall fell in 1991.", "The Berlin Wall fell on 9 November 1989."), true);
  assert.equal(claimYearsAbsent("The Berlin Wall fell in 1989.", "The Berlin Wall fell on 9 November 1989."), false);
  assert.equal(claimYearsAbsent("سقط جدار برلين عام ١٩٨٩.", "The wall fell in 1989."), false, "Arabic-Indic digits are normalised");
  assert.equal(claimYearsAbsent("Water is a liquid.", "Anything"), false, "claims without a year are not affected");
  assert.equal(claimYearsAbsent("The station opened in 1998.", "Opened 11998 units"), true, "years must be whole tokens");
});
