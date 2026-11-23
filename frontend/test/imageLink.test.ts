import assert from "node:assert/strict";
import { test } from "node:test";
import { imageLinkProblem } from "../features/staff/imageLink";

test("secure links to pictures are accepted", () => {
  assert.equal(imageLinkProblem("https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000"), "");
  assert.equal(imageLinkProblem("  https://example.com/board.png  "), "");
});

test("empty, broken and insecure links are refused with a reason", () => {
  assert.match(imageLinkProblem(""), /Paste/);
  assert.match(imageLinkProblem("images.unsplash.com/photo"), /https:\/\//);
  assert.match(imageLinkProblem("http://example.com/board.png"), /secure/);
  assert.match(imageLinkProblem("javascript:alert(1)"), /secure/);
  assert.match(imageLinkProblem("data:image/png;base64,AAAA"), /secure/);
});

test("an Unsplash page link says how to copy the picture's own link", () => {
  assert.match(imageLinkProblem("https://unsplash.com/photos/a-circuit-board-abc123"), /Copy image address/);
  assert.match(imageLinkProblem("https://www.unsplash.com/photos/abc"), /Copy image address/);
});
