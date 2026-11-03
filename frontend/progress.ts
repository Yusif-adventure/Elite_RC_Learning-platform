// Works out a member's progress from the lessons they have marked complete.
// Kept free of React and Supabase so it can be tested alone.

export type ProgressRow = {
  course_id: string;
  lesson_key: string;
  completed_at: string;
};

type LessonRef = { section: string; title: string };
type CourseRef = { id?: string; lessonContent?: LessonRef[] };

export type CourseProgress = {
  done: number;
  total: number;
  percent: number;
  nextIndex: number | undefined;
  finished: boolean;
};

// Saving a course replaces its lessons, so lessons are known by section and
// title rather than by database id. Renaming a lesson resets its progress.
export function lessonKey(lesson: LessonRef) {
  return JSON.stringify([lesson.section.trim(), lesson.title.trim()]);
}

export function courseProgress(course: CourseRef, rows: ProgressRow[]): CourseProgress {
  const lessons = course.lessonContent ?? [];
  const completed = new Set(
    rows.filter((row) => row.course_id === course.id).map((row) => row.lesson_key),
  );
  const isDone = lessons.map((lesson) => completed.has(lessonKey(lesson)));
  const done = isDone.filter(Boolean).length;
  const total = lessons.length;
  const next = isDone.indexOf(false);
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    nextIndex: next === -1 ? undefined : next,
    finished: total > 0 && done === total,
  };
}

export function coursesInProgress<Course extends CourseRef>(courses: Course[], rows: ProgressRow[]) {
  return courses
    .map((course) => {
      const progress = courseProgress(course, rows);
      const keys = new Set((course.lessonContent ?? []).map(lessonKey));
      const lastActivity = rows
        .filter((row) => row.course_id === course.id && keys.has(row.lesson_key))
        .map((row) => row.completed_at)
        .sort()
        .at(-1);
      return { course, progress, lastActivity: lastActivity ?? "" };
    })
    .filter((entry) => entry.progress.done > 0)
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}
