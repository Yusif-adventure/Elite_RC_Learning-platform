import assert from "node:assert/strict";
import { test } from "node:test";
import { courseProgress, coursesInProgress, lessonKey, type ProgressRow } from "../progress.ts";

const course = {
  id: "course-1",
  lessonContent: [
    { section: "Setup", title: "Welcome" },
    { section: "Setup", title: "Parts" },
    { section: "Flying", title: "Welcome" },
  ],
};

function done(courseId: string, section: string, title: string, at = "2026-11-01T10:00:00Z"): ProgressRow {
  return { course_id: courseId, lesson_key: lessonKey({ section, title }), completed_at: at };
}

test("lessons with the same title in different sections are tracked separately", () => {
  assert.notEqual(lessonKey({ section: "Setup", title: "Welcome" }), lessonKey({ section: "Flying", title: "Welcome" }));
});

test("stray spaces do not change which lesson is meant", () => {
  assert.equal(lessonKey({ section: " Setup ", title: "Welcome " }), lessonKey({ section: "Setup", title: "Welcome" }));
});

test("a course nobody has started is at 0% and starts at the first lesson", () => {
  assert.deepEqual(courseProgress(course, []), { done: 0, total: 3, percent: 0, nextIndex: 0, finished: false });
});

test("one of three lessons done is 33% and the next lesson is the first one not done", () => {
  assert.deepEqual(courseProgress(course, [done("course-1", "Setup", "Welcome")]), {
    done: 1,
    total: 3,
    percent: 33,
    nextIndex: 1,
    finished: false,
  });
});

test("the next lesson skips lessons already done out of order", () => {
  const rows = [done("course-1", "Setup", "Welcome"), done("course-1", "Flying", "Welcome")];
  assert.equal(courseProgress(course, rows).nextIndex, 1);
});

test("progress in another course does not count", () => {
  assert.equal(courseProgress(course, [done("course-2", "Setup", "Welcome")]).done, 0);
});

test("a lesson that was renamed or removed no longer counts", () => {
  const rows = [done("course-1", "Setup", "Old title"), done("course-1", "Setup", "Welcome")];
  assert.equal(courseProgress(course, rows).done, 1);
});

test("every lesson done finishes the course", () => {
  const rows = course.lessonContent.map((lesson) => done("course-1", lesson.section, lesson.title));
  assert.deepEqual(courseProgress(course, rows), { done: 3, total: 3, percent: 100, nextIndex: undefined, finished: true });
});

test("a course with no lessons is never finished", () => {
  assert.deepEqual(courseProgress({ id: "empty", lessonContent: [] }, []), {
    done: 0,
    total: 0,
    percent: 0,
    nextIndex: undefined,
    finished: false,
  });
});

test("courses in progress are only the started ones, most recent first", () => {
  const other = { id: "course-2", lessonContent: [{ section: "Radio", title: "Binding" }] };
  const untouched = { id: "course-3", lessonContent: [{ section: "Boats", title: "Hulls" }] };
  const rows = [
    done("course-1", "Setup", "Welcome", "2026-11-01T10:00:00Z"),
    done("course-2", "Radio", "Binding", "2026-11-02T09:00:00Z"),
    done("course-1", "Setup", "Parts", "2026-11-03T08:00:00Z"),
  ];

  const started = coursesInProgress([other, untouched, course], rows);

  assert.deepEqual(started.map((entry) => entry.course.id), ["course-1", "course-2"]);
  assert.equal(started[0].progress.done, 2);
  assert.equal(started[0].lastActivity, "2026-11-03T08:00:00Z");
});

test("a course whose only progress is on removed lessons is not in progress", () => {
  assert.deepEqual(coursesInProgress([course], [done("course-1", "Setup", "Old title")]), []);
});
