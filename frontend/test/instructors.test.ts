import assert from "node:assert/strict";
import { test } from "node:test";
import { coursesTaughtBy, instructorPhoto, splitInstructors } from "../instructors";

test("several instructors in one course are split into names", () => {
  assert.deepEqual(splitInstructors("Yusif Ibrahim , Enoch Esumah, Sammy Efriyie"), [
    "Yusif Ibrahim",
    "Enoch Esumah",
    "Sammy Efriyie",
  ]);
  assert.deepEqual(splitInstructors("Ama Kusi & Kofi Mensah and Yaw"), ["Ama Kusi", "Kofi Mensah", "Yaw"]);
  assert.deepEqual(splitInstructors("Daniel Mensah"), ["Daniel Mensah"]);
  // "and" inside a name is not a separator.
  assert.deepEqual(splitInstructors("Sandra Andrews"), ["Sandra Andrews"]);
});

test("an instructor's courses include the ones they share, whatever the letter case", () => {
  const courses = [
    { title: "A", instructor: "Yusif Ibrahim, Enoch Esumah" },
    { title: "B", instructor: "yusif ibrahim" },
    { title: "C", instructor: "Someone Else" },
  ];
  assert.deepEqual(coursesTaughtBy("Yusif Ibrahim", courses).map((course) => course.title), ["A", "B"]);
});

test("the instructor photo comes from a course they teach alone", () => {
  const courses = [
    { instructor: "Ama, Kofi", instructorImage: "https://x/shared.png" },
    { instructor: "Ama", instructorImage: "https://x/ama.png" },
  ];
  assert.equal(instructorPhoto("Ama", courses), "https://x/ama.png");
  assert.equal(instructorPhoto("Kofi", courses), undefined);
});
