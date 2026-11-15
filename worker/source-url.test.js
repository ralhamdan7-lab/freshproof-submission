import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSource } from "./index.js";

test("accepts HTTPS evidence URLs without embedded credentials", () => {
  const source = normalizeSource({
    title: "Trusted source",
    url: "https://example.org/research/article?ref=search#section",
    content: "A sufficiently descriptive source excerpt for the verification pipeline.",
    score: 0.9
  });
  assert.ok(source);
  assert.equal(source.url, "https://example.org/research/article?ref=search#section");
});

test("rejects HTTP evidence URLs before they enter claim evidence", () => {
  assert.equal(normalizeSource({
    url: "http://example.org/article",
    content: "An otherwise relevant excerpt long enough to be retained."
  }), null);
});

test("rejects HTTPS evidence URLs containing username or password", () => {
  for (const url of [
    "https://user@example.org/article",
    "https://user:secret@example.org/article",
    "https://:secret@example.org/article"
  ]) {
    assert.equal(normalizeSource({ url, content: "A relevant excerpt with enough content." }), null, url);
  }
});

test("rejects malformed, whitespace-padded, and oversized evidence URLs", () => {
  for (const url of [
    "not-a-url",
    " https://example.org/article",
    "https://example.org/" + "a".repeat(2050)
  ]) {
    assert.equal(normalizeSource({ url, content: "A relevant excerpt with enough content." }), null);
  }
});

test("rejects non-HTTPS schemes even when URL parsing succeeds", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "ftp://example.org/article"
  ]) {
    assert.equal(normalizeSource({ url, content: "A relevant excerpt with enough content." }), null, url);
  }
});
