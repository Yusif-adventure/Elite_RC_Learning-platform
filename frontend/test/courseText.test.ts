import assert from "node:assert/strict";
import { test } from "node:test";
import { descriptionText } from "../courseText";

test("\\n and \\t in a description become a new line and a tab", () => {
  assert.equal(descriptionText(String.raw`Line one\nLine two\tindented`), "Line one\nLine two\tindented");
  assert.equal(descriptionText("Real\nline breaks stay"), "Real\nline breaks stay");
});

test("a doubled backslash shows one backslash, and other escapes are left alone", () => {
  assert.equal(descriptionText(String.raw`C:\\new folder`), String.raw`C:\new folder`);
  assert.equal(descriptionText(String.raw`a \x b`), String.raw`a \x b`);
});
