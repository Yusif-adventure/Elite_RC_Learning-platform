import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogCategories } from "../categories.ts";

const standard = ["RC Planes", "RC Cars", "RC Boats", "Electronics", "Robotics", "IoT"];

test("the catalog offers every standard category in a fixed order", () => {
  assert.deepEqual(catalogCategories([]), standard);
});

test("a course in a category outside the standard list still gets a filter", () => {
  assert.deepEqual(catalogCategories(["Electronics", "New course", "Drones", "New course"]), [
    ...standard,
    "New course",
    "Drones",
  ]);
});

test("blank categories do not become filters", () => {
  assert.deepEqual(catalogCategories(["", "  "]), standard);
});
