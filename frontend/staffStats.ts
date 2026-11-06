// Works out the staff dashboard's numbers from members, courses, and progress.
// Kept free of React and Supabase so it can be tested alone.
import { courseProgress, lessonKey, type ProgressRow } from "./progress";

export type Role = "member" | "instructor" | "staff";

export type Member = {
  id: string;
  email: string;
  name: string;
  role: Role;
  joinedAt: string;
  lastSignInAt: string | null;
};

export type StaffProgressRow = ProgressRow & { user_id: string };

type LessonRef = { section: string; title: string };

export type StaffCourseRef = {
  id?: string;
  title: string;
  status?: string;
  category?: string;
  instructor?: string;
  lessonContent?: LessonRef[];
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CourseInsight<Course extends StaffCourseRef> = {
  course: Course;
  learners: number;
  finished: number;
  averagePercent: number;
  lastActivity: string;
};

export type ActivityItem = {
  key: string;
  kind: "joined" | "completed" | "created" | "updated";
  at: string;
  text: string;
};

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const latest = (times: (string | null | undefined)[]) =>
  times.filter((time): time is string => Boolean(time)).sort().at(-1) ?? "";

// Progress on a lesson that was renamed or removed no longer matches any lesson.
function countedRows(courses: StaffCourseRef[], progress: StaffProgressRow[]) {
  const keysByCourse = new Map(
    courses.map((course) => [course.id, new Set((course.lessonContent ?? []).map(lessonKey))]),
  );
  return progress.filter((row) => keysByCourse.get(row.course_id)?.has(row.lesson_key));
}

export function dashboardTotals(
  members: Member[],
  courses: StaffCourseRef[],
  progress: StaffProgressRow[],
  now: Date,
) {
  const weekStart = new Date(now.getTime() - WEEK).toISOString();
  const learners = members.filter((member) => member.role === "member");
  const rows = countedRows(courses, progress);
  const thisWeek = rows.filter((row) => row.completed_at >= weekStart);
  return {
    learners: learners.length,
    newThisWeek: learners.filter((member) => member.joinedAt >= weekStart).length,
    lessonsCompleted: rows.length,
    completedThisWeek: thisWeek.length,
    activeThisWeek: new Set(thisWeek.map((row) => row.user_id)).size,
    published: courses.filter((course) => course.status === "published").length,
    drafts: courses.filter((course) => course.status === "draft").length,
  };
}

export function courseInsights<Course extends StaffCourseRef>(
  courses: Course[],
  progress: StaffProgressRow[],
): CourseInsight<Course>[] {
  const rows = countedRows(courses, progress);
  return courses.map((course) => {
    const courseRows = rows.filter((row) => row.course_id === course.id);
    const learnerIds = [...new Set(courseRows.map((row) => row.user_id))];
    const results = learnerIds.map((id) =>
      courseProgress(course, courseRows.filter((row) => row.user_id === id)),
    );
    const totalPercent = results.reduce((sum, result) => sum + result.percent, 0);
    return {
      course,
      learners: learnerIds.length,
      finished: results.filter((result) => result.finished).length,
      averagePercent: results.length ? Math.round(totalPercent / results.length) : 0,
      lastActivity: latest(courseRows.map((row) => row.completed_at)),
    };
  });
}

// How many learners finished each lesson, so instructors can see where people stop.
export function lessonCompletion(course: StaffCourseRef, progress: StaffProgressRow[]) {
  return (course.lessonContent ?? []).map((lesson) => {
    const key = lessonKey(lesson);
    const learners = new Set(
      progress
        .filter((row) => row.course_id === course.id && row.lesson_key === key)
        .map((row) => row.user_id),
    );
    return { section: lesson.section, title: lesson.title, learners: learners.size };
  });
}

export function memberSummary(member: Member, courses: StaffCourseRef[], progress: StaffProgressRow[]) {
  const rows = countedRows(courses, progress).filter((row) => row.user_id === member.id);
  const started = courses
    .map((course) => ({ course, result: courseProgress(course, rows) }))
    .filter(({ result }) => result.done > 0)
    .map(({ course, result }) => ({
      courseId: course.id ?? "",
      title: course.title,
      done: result.done,
      total: result.total,
      percent: result.percent,
      finished: result.finished,
    }));
  return {
    lessonsCompleted: rows.length,
    coursesStarted: started.length,
    coursesFinished: started.filter((course) => course.finished).length,
    lastActive: latest([...rows.map((row) => row.completed_at), member.lastSignInAt]) || null,
    courses: started,
  };
}

export function recentActivity(
  members: Member[],
  courses: StaffCourseRef[],
  progress: StaffProgressRow[],
  limit = 8,
): ActivityItem[] {
  const names = new Map(members.map((member) => [member.id, member.name]));
  const items: Omit<ActivityItem, "key">[] = [
    ...members.map((member) => ({
      kind: "joined" as const,
      at: member.joinedAt,
      text: `${member.name} joined`,
    })),
    ...countedRows(courses, progress).map((row) => {
      const course = courses.find((item) => item.id === row.course_id)!;
      const lesson = course.lessonContent!.find((item) => lessonKey(item) === row.lesson_key)!;
      return {
        kind: "completed" as const,
        at: row.completed_at,
        text: `${names.get(row.user_id) ?? "A member"} completed "${lesson.title}" in ${course.title}`,
      };
    }),
    ...courses.flatMap((course) => [
      ...(course.createdAt
        ? [{
            kind: "created" as const,
            at: course.createdAt,
            text: `${(course.createdBy && names.get(course.createdBy)) || "A staff member"} created ${course.title}`,
          }]
        : []),
      ...(course.updatedAt && course.createdAt && course.updatedAt > course.createdAt
        ? [{ kind: "updated" as const, at: course.updatedAt, text: `${course.title} was updated` }]
        : []),
    ]),
  ];
  return items
    .filter((item) => item.at)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .map((item, index) => ({ ...item, key: `${item.kind}-${item.at}-${index}` }));
}

export type CourseFilters = {
  search: string;
  status: "all" | "published" | "draft";
  sort: "updated" | "title" | "learners";
};

export function filterCourseInsights<Course extends StaffCourseRef>(
  insights: CourseInsight<Course>[],
  { search, status, sort }: CourseFilters,
) {
  const query = search.trim().toLowerCase();
  const changed = (course: StaffCourseRef) => course.updatedAt ?? course.createdAt ?? "";
  return insights
    .filter(({ course }) => status === "all" || course.status === status)
    .filter(({ course }) =>
      [course.title, course.category, course.instructor].some((text) =>
        text?.toLowerCase().includes(query),
      ),
    )
    .sort((a, b) => {
      if (sort === "updated") return changed(b.course).localeCompare(changed(a.course));
      if (sort === "learners" && a.learners !== b.learners) return b.learners - a.learners;
      return a.course.title.localeCompare(b.course.title);
    });
}

export function filterMembers(members: Member[], { search, role }: { search: string; role: "all" | Role }) {
  const query = search.trim().toLowerCase();
  return members
    .filter((member) => role === "all" || member.role === role)
    .filter((member) => [member.name, member.email].some((text) => text.toLowerCase().includes(query)))
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
}

export function timeAgo(time: string | null, now = new Date()) {
  if (!time) return "never";
  const date = new Date(time);
  const elapsed = now.getTime() - date.getTime();
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(elapsed / DAY);
  if (days < 2) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
