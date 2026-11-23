import assert from "node:assert/strict";
import { test } from "node:test";
import {
  arrangeLines,
  blockProblem,
  checkOrder,
  framedHtml,
  moveItem,
  newBlock,
  shuffleLines,
  youtubeId,
} from "../features/lesson/blocks";

test("YouTube ids come out of every usual link shape", () => {
  for (const link of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "youtube.com/watch?v=dQw4w9WgXcQ",
  ]) {
    assert.equal(youtubeId(link), "dQw4w9WgXcQ", link);
  }
});

test("links that are not YouTube videos have no id", () => {
  for (const link of ["https://example.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/", "not a link", ""]) {
    assert.equal(youtubeId(link), null, link);
  }
});

test("arrange lines drop blank lines and trailing spaces but keep indentation", () => {
  assert.deepEqual(arrangeLines("void setup() {  \r\n\n  pinMode(13, OUTPUT);\n}\n"), [
    "void setup() {",
    "  pinMode(13, OUTPUT);",
    "}",
  ]);
});

test("shuffled lines are never already in order and keep every line", () => {
  const lines = ["a", "b", "c", "d"];
  for (let run = 0; run < 50; run += 1) {
    const shuffled = shuffleLines(lines);
    assert.notDeepEqual(shuffled, lines);
    assert.deepEqual([...shuffled].sort(), lines);
  }
  // A random source that always leaves them in order still gets them moved.
  assert.notDeepEqual(shuffleLines(["a", "b"], () => 0.999), ["a", "b"]);
});

test("lines that are all the same cannot be shuffled out of order", () => {
  assert.deepEqual(shuffleLines(["}", "}"]), ["}", "}"]);
});

test("identical lines count as right in either spot", () => {
  const answer = ["if (x) {", "}", "}"];
  assert.deepEqual(checkOrder(["if (x) {", "}", "}"], answer), [true, true, true]);
  assert.deepEqual(checkOrder(["}", "if (x) {", "}"], answer), [false, false, true]);
});

test("moving an item keeps the rest in order and ignores moves off the ends", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
  assert.deepEqual(moveItem(["a", "b"], 0, -1), ["a", "b"]);
});

test("new blocks start empty and say what they still need", () => {
  for (const type of ["text", "image", "youtube", "pdf", "video", "html", "arrange"] as const) {
    const block = newBlock(type);
    assert.equal(block.type, type);
    assert.notEqual(blockProblem(block), "", type);
  }
  assert.notEqual(newBlock("text").id, newBlock("text").id);
});

test("finished blocks have no problems", () => {
  assert.equal(blockProblem({ id: "1", type: "text", text: "Hi" }), "");
  assert.equal(blockProblem({ id: "1", type: "image", url: "https://e.com/a.png", alt: "Board" }), "");
  assert.match(blockProblem({ id: "1", type: "image", url: "https://e.com/a.png", alt: " " }), /describe/i);
  assert.equal(blockProblem({ id: "1", type: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }), "");
  assert.match(blockProblem({ id: "1", type: "youtube", url: "https://vimeo.com/123456" }), /YouTube/);
  assert.equal(blockProblem({ id: "1", type: "arrange", code: "a\nb" }), "");
  assert.match(blockProblem({ id: "1", type: "arrange", code: Array(41).fill("x").join("\n") }), /up to 40/);
});

test("framed HTML holds the instructor's code and only reports its height", () => {
  const page = framedHtml("<button>Hi</button>", "frame-1");
  assert.match(page, /<button>Hi<\/button>/);
  assert.match(page, /"frame-1"/);
  assert.match(page, /<base target="_blank">/);
  assert.doesNotMatch(page, /localStorage|document\.cookie/);
});

import { blockFromTemplate, fillTemplate, templateChanged, templateFields } from "../features/lesson/blocks";

test("template fields come from {{placeholders}}, once each, in order, with readable labels", () => {
  assert.deepEqual(templateFields("<h2>{{ question }}</h2><p>{{led_colour}} {{question}} {{ledColour}}</p>"), [
    { key: "question", label: "Question" },
    { key: "led_colour", label: "Led colour" },
    { key: "ledColour", label: "Led colour" },
  ]);
  assert.deepEqual(templateFields("{{question}}", [{ key: "question", label: "Your question" }]), [
    { key: "question", label: "Your question" },
  ]);
  assert.deepEqual(templateFields("{{ 1bad }} {{has space}}"), []);
});

test("filled templates show values as text and give scripts the raw values", () => {
  const html = fillTemplate("<p>{{answer}}</p><i>{{unknown}}</i>", [{ key: "answer", label: "Answer" }], {
    answer: "<b>HIGH</b> & \"LOW\"",
  });
  assert.match(html, /<p>&lt;b&gt;HIGH&lt;\/b&gt; &amp; &quot;LOW&quot;<\/p>/);
  assert.match(html, /<i>\{\{unknown\}\}<\/i>/);
  const script = html.split("</script>")[0].slice("<script>".length);
  assert.equal(script.includes("<"), false);
  assert.ok(script.startsWith("window.BLOCK_DATA = {\"answer\":"));
  assert.ok(script.includes("HIGH") && script.includes("LOW"));
});

test("a value cannot close the data script early", () => {
  const html = fillTemplate("", [{ key: "a", label: "A" }], { a: "</script><script>alert(1)</script>" });
  assert.equal(html.split("</script>").length, 2);
});

test("a block made from a template copies it and starts with empty values", () => {
  const template = { id: "t1", name: "Flip card", description: "", html: "{{front}}", fields: [{ key: "front", label: "Front" }] };
  const block = blockFromTemplate(template);
  assert.equal(block.type, "template");
  if (block.type !== "template") return;
  assert.deepEqual(block.values, { front: "" });
  assert.equal(templateChanged(block, template), false);
  assert.equal(templateChanged(block, { ...template, html: "<b>{{front}}</b>" }), true);
});
