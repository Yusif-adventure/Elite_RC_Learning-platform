import assert from "node:assert/strict";
import { test } from "node:test";
import { splitOutcomes } from "../features/staff/outcomes";

test("a pasted list becomes separate outcomes without its markers", () => {
  assert.deepEqual(splitOutcomes("- Blink an LED\n• Read a button\n3. Move a servo\n\n  * Plan a project  "), [
    "Blink an LED",
    "Read a button",
    "Move a servo",
    "Plan a project",
  ]);
  assert.deepEqual(splitOutcomes("Explain what a sketch is"), ["Explain what a sketch is"]);
});
