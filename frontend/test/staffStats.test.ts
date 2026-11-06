import assert from "node:assert/strict";
import { test } from "node:test";
import { lessonKey } from "../progress.ts";
import {
  courseInsights,
  dashboardTotals,
  filterCourseInsights,
  filterMembers,
  lessonCompletion,
  memberSummary,
  recentActivity,
  timeAgo,
  type Member,
  type StaffProgressRow,
} from "../staffStats.ts";

const NOW = new Date("2026-11-06T12:00:00Z");
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const daysAgo = (days: number) => ago(days * DAY);

function member(id: string, overrides: Partial<Member> = {}): Member {
  return {
    id,
    email: `${id}@example.com`,
    name: id,
    role: "member",
    joinedAt: daysAgo(30),
    lastSignInAt: null,
    ...overrides,
  };
}

const flight = {
  id: "c1",
  title: "Flight Basics",
  status: "published",
  category: "RC Planes",
  instructor: "Ama Kusi",
  lessonContent: [
    { section: "Setup", title: "Welcome" },
    { section: "Setup", title: "Parts" },
  ],
  createdBy: "staff1",
  createdAt: daysAgo(20),
  updatedAt: daysAgo(20),
};
const radios = {
  id: "c2",
  title: "Radio Setup",
  status: "draft",
  category: "Electronics",
  instructor: "Kofi Mensah",
  lessonContent: [{ section: "Intro", title: "Binding" }],
  createdBy: "staff1",
  createdAt: daysAgo(10),
  updatedAt: daysAgo(2),
};
const courses = [flight, radios];

function done(user: string, courseId: string, section: string, title: string, at = daysAgo(1)): StaffProgressRow {
  return { user_id: user, course_id: courseId, lesson_key: lessonKey({ section, title }), completed_at: at };
}

test("totals count learners, new sign-ups, and lessons completed this week", () => {
  const members = [
    member("ama", { joinedAt: daysAgo(2) }),
    member("kofi"),
    member("staff1", { role: "staff", joinedAt: daysAgo(1) }),
  ];
  const progress = [
    done("ama", "c1", "Setup", "Welcome", daysAgo(1)),
    done("kofi", "c1", "Setup", "Welcome", daysAgo(9)),
    done("kofi", "c1", "Setup", "Parts", daysAgo(3)),
  ];

  assert.deepEqual(dashboardTotals(members, courses, progress, NOW), {
    learners: 2,
    newThisWeek: 1,
    lessonsCompleted: 3,
    completedThisWeek: 2,
    activeThisWeek: 2,
    published: 1,
    drafts: 1,
  });
});

test("progress on lessons that were renamed or removed is not counted", () => {
  const progress = [done("ama", "c1", "Setup", "Old title"), done("ama", "gone", "Setup", "Welcome")];

  assert.equal(dashboardTotals([member("ama")], courses, progress, NOW).lessonsCompleted, 0);
});

test("course insights count learners, finishers, and average progress", () => {
  const progress = [
    done("ama", "c1", "Setup", "Welcome"),
    done("ama", "c1", "Setup", "Parts", daysAgo(0.5)),
    done("kofi", "c1", "Setup", "Welcome", daysAgo(4)),
  ];

  const [flightInsight, radioInsight] = courseInsights(courses, progress);

  assert.equal(flightInsight.course, flight);
  const { course: _flight, ...flightNumbers } = flightInsight;
  assert.deepEqual(flightNumbers, { learners: 2, finished: 1, averagePercent: 75, lastActivity: daysAgo(0.5) });
  const { course: _radios, ...radioNumbers } = radioInsight;
  assert.deepEqual(radioNumbers, { learners: 0, finished: 0, averagePercent: 0, lastActivity: "" });
});

test("a member summary shows each started course and when they were last active", () => {
  const ama = member("ama", { lastSignInAt: daysAgo(3) });
  const progress = [done("ama", "c1", "Setup", "Welcome", daysAgo(1)), done("kofi", "c2", "Intro", "Binding")];

  assert.deepEqual(memberSummary(ama, courses, progress), {
    lessonsCompleted: 1,
    coursesStarted: 1,
    coursesFinished: 0,
    lastActive: daysAgo(1),
    courses: [{ courseId: "c1", title: "Flight Basics", done: 1, total: 2, percent: 50, finished: false }],
  });
});

test("a member with no finished lessons was last active when they last signed in", () => {
  const ama = member("ama", { lastSignInAt: daysAgo(3) });

  assert.equal(memberSummary(ama, courses, []).lastActive, daysAgo(3));
});

test("recent activity lists sign-ups, lessons, and course changes newest first", () => {
  const members = [
    member("ama", { name: "Ama Kusi", joinedAt: daysAgo(5) }),
    member("staff1", { name: "Esi Owusu", role: "staff", joinedAt: daysAgo(40) }),
  ];
  const progress = [done("ama", "c1", "Setup", "Parts", daysAgo(1))];

  const items = recentActivity(members, courses, progress);

  assert.deepEqual(
    items.map((item) => [item.kind, item.text, item.at]),
    [
      ["completed", 'Ama Kusi completed "Parts" in Flight Basics', daysAgo(1)],
      ["updated", "Radio Setup was updated", daysAgo(2)],
      ["joined", "Ama Kusi joined", daysAgo(5)],
      ["created", "Esi Owusu created Radio Setup", daysAgo(10)],
      ["created", "Esi Owusu created Flight Basics", daysAgo(20)],
      ["joined", "Esi Owusu joined", daysAgo(40)],
    ],
  );
});

test("recent activity keeps only the newest items", () => {
  const items = recentActivity([member("ama")], courses, [], 2);

  assert.deepEqual(items.map((item) => item.at), [daysAgo(2), daysAgo(10)]);
});

test("a course whose creator is no longer listed is credited to a staff member", () => {
  const items = recentActivity([], [flight], []);

  assert.equal(items[0].text, "A staff member created Flight Basics");
});

test("course search matches title, category, or instructor", () => {
  const insights = courseInsights(courses, []);
  const find = (search: string) =>
    filterCourseInsights(insights, { search, status: "all", sort: "title" }).map((item) => item.course.id);

  assert.deepEqual(find("kofi"), ["c2"]);
  assert.deepEqual(find("rc planes"), ["c1"]);
  assert.deepEqual(find("  RADIO "), ["c2"]);
});

test("the course list can show only published courses or only drafts", () => {
  const insights = courseInsights(courses, []);
  const show = (status: "published" | "draft") =>
    filterCourseInsights(insights, { search: "", status, sort: "title" }).map((item) => item.course.id);

  assert.deepEqual(show("published"), ["c1"]);
  assert.deepEqual(show("draft"), ["c2"]);
});

test("courses can be sorted by last change, title, or learners", () => {
  const insights = courseInsights(courses, [done("ama", "c1", "Setup", "Welcome")]);
  const sorted = (sort: "updated" | "title" | "learners") =>
    filterCourseInsights(insights, { search: "", status: "all", sort }).map((item) => item.course.id);

  assert.deepEqual(sorted("updated"), ["c2", "c1"]);
  assert.deepEqual(sorted("title"), ["c1", "c2"]);
  assert.deepEqual(sorted("learners"), ["c1", "c2"]);
});

test("member search matches name or email, filters by role, and lists newest first", () => {
  const members = [
    member("ama", { name: "Ama Kusi", joinedAt: daysAgo(9) }),
    member("kofi", { name: "Kofi Mensah", email: "kofi@school.org", joinedAt: daysAgo(1) }),
    member("esi", { name: "Esi Owusu", role: "instructor", joinedAt: daysAgo(4) }),
  ];
  const ids = (search: string, role: "all" | "member" | "instructor" | "staff") =>
    filterMembers(members, { search, role }).map((item) => item.id);

  assert.deepEqual(ids("", "all"), ["kofi", "esi", "ama"]);
  assert.deepEqual(ids("school.org", "all"), ["kofi"]);
  assert.deepEqual(ids("AMA", "all"), ["ama"]);
  assert.deepEqual(ids("", "instructor"), ["esi"]);
});

test("times read as how long ago they happened", () => {
  assert.equal(timeAgo(ago(30 * 1000), NOW), "just now");
  assert.equal(timeAgo(ago(5 * MINUTE), NOW), "5 min ago");
  assert.equal(timeAgo(ago(3 * 60 * MINUTE), NOW), "3 h ago");
  assert.equal(timeAgo(daysAgo(1), NOW), "yesterday");
  assert.equal(timeAgo(daysAgo(4), NOW), "4 days ago");
  assert.equal(timeAgo("2026-09-12T10:00:00Z", NOW), "12 Sep 2026");
  assert.equal(timeAgo(null, NOW), "never");
});

test("lesson completion shows how many learners finished each lesson, in course order", () => {
  const progress = [
    done("ama", "c1", "Setup", "Welcome"),
    done("kofi", "c1", "Setup", "Welcome"),
    done("ama", "c1", "Setup", "Parts"),
    done("ama", "c2", "Intro", "Binding"),
  ];

  assert.deepEqual(lessonCompletion(flight, progress), [
    { section: "Setup", title: "Welcome", learners: 2 },
    { section: "Setup", title: "Parts", learners: 1 },
  ]);
});
