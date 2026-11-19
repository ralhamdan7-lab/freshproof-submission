import test from "node:test";
import assert from "node:assert/strict";
import { validateDecomposition, hasUnresolvedSubject } from "../worker/llm-tasks.js";

const text = "When Google DeepMind and Isomorphic Labs published AlphaFold 3 in May 2024, they simultaneously released the complete inference source code and pretrained model weights under a permissive open-source license, allowing unrestricted commercial and academic deployment without requiring access to AlphaFold Server.";

test("pronoun-led and subject-less parts are rejected and their span is verified instead", () => {
  const parsed = { claims: [
    { claim: "Google DeepMind and Isomorphic Labs published AlphaFold 3 in May 2024.", span: text, kind: "FACT" },
    { claim: "They released the complete inference source code under a permissive open-source license.", span: text, kind: "FACT" },
    { claim: "The permissive open-source license allows unrestricted commercial and academic deployment.", span: text, kind: "FACT" }
  ] };
  const { claims, rejected } = validateDecomposition(parsed, text);
  assert.equal(rejected.unresolved_subject, 2);
  assert.equal(claims.length, 2);
  assert.equal(claims[1].claim, text);
  assert.equal(claims[1].from_span, true);
});

test("self-contained atomic claims are kept", () => {
  const t = "Meta's Llama 3.1 405B was trained on more than 15 trillion tokens and supports a 128K-token context window.";
  const { claims } = validateDecomposition({ claims: [
    { claim: "Meta's Llama 3.1 405B was trained on more than 15 trillion tokens.", span: t, kind: "FACT" },
    { claim: "Llama 3.1 405B supports a 128K-token context window.", span: t, kind: "FACT" }
  ] }, t);
  assert.equal(claims.length, 2);
  assert.ok(claims.every(c => !c.from_span));
});

test("subject checks", () => {
  assert.equal(hasUnresolvedSubject("It was trained on 15 trillion tokens.", "Llama 3.1 405B. It was trained on 15 trillion tokens."), true);
  assert.equal(hasUnresolvedSubject("25,000 units were delivered.", "Boston Dynamics delivered 25,000 Atlas units."), true);
  assert.equal(hasUnresolvedSubject("25,000 Atlas units were delivered by Boston Dynamics.", "Boston Dynamics delivered 25,000 Atlas units."), false);
  assert.equal(hasUnresolvedSubject("هذه العضوية بدأت في 2006.", "انضمت السعودية إلى المنظمة."), true);
  assert.equal(hasUnresolvedSubject("Water boils at 100 degrees Celsius.", "water boils at 100 degrees celsius at sea level."), false);
});

test("v0.3.15: a clause span without names is checked against the whole text", () => {
  const t = "The United Kingdom formally left the European Union on 31 January 2020, while the transition period ended on 31 December 2020.";
  const { claims, rejected } = validateDecomposition({ claims: [
    { claim: "The United Kingdom formally left the European Union on 31 January 2020.", span: "The United Kingdom formally left the European Union on 31 January 2020", kind: "FACT" },
    { claim: "The transition period ended on 31 December 2020.", span: "while the transition period ended on 31 December 2020", kind: "FACT" },
    { claim: "The United Kingdom's transition period ended on 31 December 2020.", span: "while the transition period ended on 31 December 2020", kind: "FACT" }
  ] }, t);
  assert.equal(rejected.unresolved_subject, 1);
  assert.deepEqual(claims.map(c => c.claim), ["The United Kingdom formally left the European Union on 31 January 2020.", "The United Kingdom's transition period ended on 31 December 2020."]);
});
