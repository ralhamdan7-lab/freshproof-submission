import test from "node:test";
import assert from "node:assert/strict";
import { sourceDebunksClaim } from "../worker/index.js";

test("a debunking source cannot support an affirmative claim", () => {
  const claim = "COVID-19 vaccines contain microchips for tracking people.";
  assert.equal(sourceDebunksClaim(claim, "Myth: COVID-19 vaccines contain microchips. Fact: vaccines do not contain microchips."), true);
  assert.equal(sourceDebunksClaim(claim, "This conspiracy theory has been debunked by health agencies."), true);
  assert.equal(sourceDebunksClaim(claim, "There is no evidence that vaccines contain tracking devices."), true);
});

test("Arabic debunking language is recognised", () => {
  assert.equal(sourceDebunksClaim("لقاحات كورونا تحتوي على شرائح تتبع.", "هذه شائعة لا صحة لها، واللقاحات لا تحتوي على شرائح."), true);
});

test("a claim that itself states the debunk is not blocked", () => {
  assert.equal(sourceDebunksClaim("It is a myth that vaccines contain microchips.", "Myth: vaccines contain microchips."), false);
  assert.equal(sourceDebunksClaim("There is no evidence that vaccines cause autism.", "Studies found no evidence of a link."), false);
});

test("ordinary supporting text is unaffected", () => {
  assert.equal(sourceDebunksClaim("Water boils at 100 degrees Celsius at sea level.", "At sea level, water boils at 100 °C (212 °F)."), false);
  assert.equal(sourceDebunksClaim("The Eiffel Tower was completed in 1889.", "The tower was completed in March 1889 for the World's Fair."), false);
});
