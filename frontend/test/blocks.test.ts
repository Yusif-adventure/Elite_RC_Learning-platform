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
