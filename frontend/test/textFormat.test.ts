import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInline, parseRichText } from "../textFormat";

test("a plain quiz question stays one paragraph of plain text", () => {
  assert.deepEqual(parseRichText("Which control surface makes the aircraft roll?", "code"), [
    { type: "paragraph", lines: [[{ type: "text", text: "Which control surface makes the aircraft roll?" }]] },
  ]);
});

test("quiz text keeps every line break and the indentation of each line", () => {
  const [block] = parseRichText("What does this print?\n\n  int x = 2 * 3;", "code");
  assert.equal(block.type, "paragraph");
  assert.deepEqual(block.type === "paragraph" && block.lines.map((line) => line.map((part) => part.type === "text" && part.text)), [
    ["What does this print?"],
    [],
    ["  int x = 2 * 3;"],
  ]);
});

test("quiz text never treats * as formatting, so maths stays as typed", () => {
  assert.deepEqual(parseInline("What is 2 * 3 * 4?", "code"), [{ type: "text", text: "What is 2 * 3 * 4?" }]);
});

test("a fenced code block keeps its lines, spaces and language", () => {
  const text = "What does this print?\n```cpp\nvoid loop() {\n  Serial.println(1 / 2);\n}\n```\nPick one.";
  assert.deepEqual(parseRichText(text, "code"), [
    { type: "paragraph", lines: [[{ type: "text", text: "What does this print?" }]] },
    { type: "code", language: "cpp", text: "void loop() {\n  Serial.println(1 / 2);\n}" },
    { type: "paragraph", lines: [[{ type: "text", text: "Pick one." }]] },
  ]);
});

test("an unclosed code fence is shown as text rather than hiding the rest", () => {
  const blocks = parseRichText("```\nint x;", "code");
  assert.deepEqual(blocks.map((block) => block.type), ["paragraph"]);
});

test("inline code is recognised in quiz text and lesson text", () => {
  assert.deepEqual(parseInline("Use `pinMode` first", "code"), [
    { type: "text", text: "Use " },
    { type: "code", text: "pinMode" },
    { type: "text", text: " first" },
  ]);
});

test("formatting inside inline code is left alone", () => {
  assert.deepEqual(parseInline("`**not bold**`"), [{ type: "code", text: "**not bold**" }]);
});

test("lesson text understands headings, lists, callouts and paragraphs", () => {
  const text = "# Blink\nIntro line\nsecond line\n\n- one\n- **two**\n\n1. first\n2. second\n\n> Tip: unplug first";
  assert.deepEqual(parseRichText(text).map((block) => block.type), [
    "heading",
    "paragraph",
    "list",
    "list",
    "quote",
  ]);
  const [, paragraph, bullets, numbers] = parseRichText(text);
  assert.equal(paragraph.type === "paragraph" && paragraph.lines.length, 2);
  assert.equal(bullets.type === "list" && bullets.ordered, false);
  assert.deepEqual(bullets.type === "list" && bullets.items[1], [
    { type: "bold", children: [{ type: "text", text: "two" }] },
  ]);
  assert.equal(numbers.type === "list" && numbers.ordered, true);
});

test("only web links become links", () => {
  assert.deepEqual(parseInline("[docs](https://docs.arduino.cc)"), [
    { type: "link", href: "https://docs.arduino.cc", children: [{ type: "text", text: "docs" }] },
  ]);
  assert.deepEqual(parseInline("[bad](javascript:alert(1))"), [{ type: "text", text: "[bad](javascript:alert(1))" }]);
});

test("italic needs a closing marker and ignores snake_case words", () => {
  assert.deepEqual(parseInline("a *quirky* LED"), [
    { type: "text", text: "a " },
    { type: "italic", children: [{ type: "text", text: "quirky" }] },
    { type: "text", text: " LED" },
  ]);
  assert.deepEqual(parseInline("led_pin and led_state"), [{ type: "text", text: "led_pin and led_state" }]);
});
