import assert from "node:assert/strict";
import { randomUUID as randomId } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { startFakeSupabase } from "./fakeSupabase.js";

const SERVER_PATH = fileURLToPath(new URL("../server.js", import.meta.url));
const SERVICE_KEY = "fake-service-key";
const MEGABYTE = 1024 * 1024;
const STAFF_TOKEN = "staff-sign-in";
const MEMBER_TOKEN = "member-sign-in";
const SELF_NAMED_STAFF_TOKEN = "self-named-staff-sign-in";
const INSTRUCTOR_TOKEN = "instructor-sign-in";
let staffUser;
let memberUser;
let instructorUser;

let fake;
const servers = [];
let api;
let apiWithoutServiceKey;

function findFreePort() {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function startBackend(extraEnv) {
  const port = await findFreePort();
  // Running from an empty folder means dotenv cannot load the real backend/.env.
  const child = spawn(process.execPath, [SERVER_PATH], {
    cwd: mkdtempSync(join(tmpdir(), "elite-rc-backend-test-")),
    env: {
      ...process.env,
      SUPABASE_URL: fake.url,
      SUPABASE_ANON_KEY: "fake-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "",
      PORT: String(port),
      ...extraEnv,
    },
    stdio: "ignore",
  });
  servers.push(child);
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await fetch(`${base}/health`);
      return base;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error("The backend did not start.");
}

before(async () => {
  fake = await startFakeSupabase({ serviceKey: SERVICE_KEY });
  api = await startBackend({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY });
  apiWithoutServiceKey = await startBackend({});
});

after(async () => {
  servers.forEach((child) => child.kill());
  await fake.close();
});

beforeEach(() => {
  fake.reset();
  // Staff is marked in app_metadata, which only the service key can change.
  staffUser = fake.addUser(STAFF_TOKEN, {
    email: "staff@example.com",
    appMetadata: { role: "staff" },
  });
  memberUser = fake.addUser(MEMBER_TOKEN, { email: "member@example.com" });
  instructorUser = fake.addUser(INSTRUCTOR_TOKEN, {
    email: "instructor@example.com",
    appMetadata: { role: "instructor" },
  });
  // Members can write anything into their own user_metadata when they sign up.
  fake.addUser(SELF_NAMED_STAFF_TOKEN, {
    email: "sneaky@example.com",
    userMetadata: { role: "staff" },
  });
});

function signedIn(token, headers = {}) {
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

function course(overrides = {}) {
  return {
    title: "Flight Basics",
    desc: "Learn to fly.",
    level: "Intermediate",
    duration: "2h",
    instructor: "Ama Kusi",
    instructorImage: "https://example.com/ama.png",
    image: "https://example.com/course.png",
    category: "RC Planes",
    status: "published",
    objectives: ["Fly safely"],
    sections: ["Setup", "Flying"],
    lessonContent: [
      {
        title: "Welcome",
        section: "Setup",
        slides: [{ name: "welcome.pdf", url: "https://example.com/welcome.pdf" }],
        video: { name: "welcome.mp4", url: "https://example.com/welcome.mp4" },
        youtubeUrl: "https://www.youtube.com/watch?v=abc",
      },
      { title: "Welcome", section: "Flying", slides: [] },
    ],
    ...overrides,
  };
}

function sendCourse(method, path, body, { token = STAFF_TOKEN, base = api } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: signedIn(token, { "Content-Type": "application/json" }),
    body: body && JSON.stringify(body),
  });
}

async function createCourse(overrides) {
  const response = await sendCourse("POST", "/api/courses", course(overrides));
  assert.equal(response.status, 201);
  return (await response.json()).course;
}

// Lesson ids change whenever a course is saved, so content is compared without them.
function withoutLessonIds(saved) {
  for (const lesson of saved.lessonContent) assert.equal(typeof lesson.id, "string");
  return { ...saved, lessonContent: saved.lessonContent.map(({ id, ...lesson }) => lesson) };
}

async function readCourse(id) {
  const response = await fetch(`${api}/api/courses/${id}`);
  assert.equal(response.status, 200);
  return (await response.json()).course;
}

function upload(kind, name, size = 10, { token = STAFF_TOKEN, base = api } = {}) {
  const query = new URLSearchParams({ kind, name });
  return fetch(`${base}/api/uploads?${query}`, {
    method: "POST",
    headers: signedIn(token, { "Content-Type": "application/octet-stream" }),
    body: Buffer.alloc(size, 7),
  });
}

// Lesson quizzes need 10 to 25 questions and final exams exactly 50. The first
// choice of every question is the correct one.
function assessment(title = "Knowledge check", passMark, count = title === "Final exam" ? 50 : 10) {
  return {
    title,
    ...(passMark === undefined ? {} : { passMark }),
    questions: Array.from({ length: count }, (_, index) => ({
      questionText: `Question ${index + 1}: which control keeps the aircraft level?`,
      explanation: "The ailerons control roll.",
      choices: [
        { text: "Ailerons", isCorrect: true },
        { text: "Landing gear", isCorrect: false },
      ],
    })),
  };
}

// Answers every question, getting the first `correctCount` right.
function answersFor(quiz, correctCount = quiz.questions.length) {
  return Object.fromEntries(
    quiz.questions.map((question, index) => [question.id, question.choices[index < correctCount ? 0 : 1].id]),
  );
}

async function createLessonQuiz(lessonId, body = assessment()) {
  const response = await sendJson("POST", `/api/lessons/${lessonId}/assessment`, body);
  assert.equal(response.status, 201);
  return (await response.json()).assessment;
}

async function createFinalExam(courseId, passMark) {
  const response = await sendJson("POST", `/api/courses/${courseId}/final-exam`, assessment("Final exam", passMark));
  assert.equal(response.status, 201);
  return (await response.json()).exam;
}

function submit(quizId, answers, { token = MEMBER_TOKEN } = {}) {
  return sendJson("POST", `/api/quizzes/${quizId}/attempts`, { answers }, { token });
}

function loadLessonQuiz(lessonId, { token = MEMBER_TOKEN } = {}) {
  return fetch(`${api}/api/lessons/${lessonId}/assessment`, { headers: signedIn(token) });
}

function sendJson(method, path, body, { token = STAFF_TOKEN, base = api } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: signedIn(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
}

async function assertJsonError(response, status) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.equal(typeof body.error, "string");
  assert.ok(body.error.length > 0);
  return body.error;
}

test("a created course comes back whole and appears in the shared list", async () => {
  const created = await createCourse();

  const listResponse = await fetch(`${api}/api/courses`);
  const { courses } = await listResponse.json();

  assert.deepEqual(courses, [created]);
  assert.equal(created.title, "Flight Basics");
  assert.equal(created.status, "published");
  assert.deepEqual(created.objectives, ["Fly safely"]);
  assert.deepEqual(created.sections, ["Setup", "Flying"]);
  assert.deepEqual(withoutLessonIds(created).lessonContent, [
    {
      title: "Welcome",
      section: "Setup",
      slides: [{ name: "welcome.pdf", url: "https://example.com/welcome.pdf" }],
      video: { name: "welcome.mp4", url: "https://example.com/welcome.mp4" },
      youtubeUrl: "https://www.youtube.com/watch?v=abc",
    },
    { title: "Welcome", section: "Flying", slides: [] },
  ]);
});

test("titles with stray spaces keep their lessons and files", async () => {
  const created = await createCourse({
    sections: [" Setup "],
    lessonContent: [
      {
        title: " Welcome ",
        section: " Setup ",
        slides: [{ name: "welcome.pdf", url: "https://example.com/welcome.pdf" }],
      },
    ],
  });

  assert.deepEqual(withoutLessonIds(created).lessonContent, [
    {
      title: "Welcome",
      section: "Setup",
      slides: [{ name: "welcome.pdf", url: "https://example.com/welcome.pdf" }],
    },
  ]);
});

test("a repeated course title is refused with a clear message", async () => {
  await createCourse();

  const response = await sendCourse("POST", "/api/courses", course());

  assert.match(await assertJsonError(response, 409), /already exists/i);
  assert.equal(fake.db.courses.length, 1);
});

test("renaming a course to another course's title is refused", async () => {
  await createCourse();
  const other = await createCourse({ title: "Radio Setup" });

  const response = await sendCourse("PUT", `/api/courses/${other.id}`, course());

  assert.match(await assertJsonError(response, 409), /already exists/i);
  assert.equal((await readCourse(other.id)).title, "Radio Setup");
});

const invalidCourses = [
  ["a title that is not text", { title: 123 }],
  ["a blank section title", { sections: ["Setup", "  "], lessonContent: [] }],
  ["a repeated section title", { sections: ["Setup", " Setup "], lessonContent: [] }],
  [
    "a repeated lesson title in one section",
    {
      sections: ["Setup"],
      lessonContent: [
        { title: "Welcome", section: "Setup", slides: [] },
        { title: " Welcome ", section: "Setup", slides: [] },
      ],
    },
  ],
  ["a lesson with no title", { lessonContent: [{ title: " ", section: "Setup", slides: [] }] }],
  ["a lesson in a section that does not exist", { lessonContent: [{ title: "Welcome", section: "Missing", slides: [] }] }],
  ["lesson content that is not a list", { lessonContent: "Welcome" }],
  ["slides that are not a list", { lessonContent: [{ title: "Welcome", section: "Setup", slides: "welcome.pdf" }] }],
  ["a course image that is not a web link", { image: "data:image/png;base64,AAAA" }],
  ["an instructor image that is not a web link", { instructorImage: "javascript:alert(1)" }],
  [
    "a slide that is not a web link",
    { lessonContent: [{ title: "Welcome", section: "Setup", slides: [{ name: "a.pdf", url: "javascript:alert(1)" }] }] },
  ],
  [
    "a video that is not a web link",
    { lessonContent: [{ title: "Welcome", section: "Setup", slides: [], video: { name: "a.mp4", url: "data:video/mp4;base64,AAAA" } }] },
  ],
  [
    "a YouTube link that is not a web link",
    { lessonContent: [{ title: "Welcome", section: "Setup", slides: [], youtubeUrl: "javascript:alert(1)" }] },
  ],
];

for (const [description, overrides] of invalidCourses) {
  test(`creating a course with ${description} is refused and saves nothing`, async () => {
    const response = await sendCourse("POST", "/api/courses", course(overrides));

    await assertJsonError(response, 400);
    assert.equal(fake.db.courses.length, 0);
  });

  test(`editing a course with ${description} is refused and changes nothing`, async () => {
    const created = await createCourse();

    const response = await sendCourse("PUT", `/api/courses/${created.id}`, course(overrides));

    await assertJsonError(response, 400);
    assert.deepEqual(withoutLessonIds(await readCourse(created.id)), withoutLessonIds(created));
  });
}

test("an edit replaces the course's content and keeps its id", async () => {
  const created = await createCourse();

  const response = await sendCourse(
    "PUT",
    `/api/courses/${created.id}`,
    course({
      title: "Flight Basics 2",
      objectives: ["Land safely"],
      sections: ["Landing"],
      lessonContent: [{ title: "Approach", section: "Landing", slides: [] }],
    }),
  );

  assert.equal(response.status, 200);
  const saved = await readCourse(created.id);
  assert.equal(saved.title, "Flight Basics 2");
  assert.deepEqual(saved.objectives, ["Land safely"]);
  assert.deepEqual(saved.sections, ["Landing"]);
  assert.deepEqual(withoutLessonIds(saved).lessonContent, [{ title: "Approach", section: "Landing", slides: [] }]);
  assert.equal(fake.db.courses.length, 1);
});

for (const table of ["course_objectives", "course_sections", "course_lessons", "lesson_resources"]) {
  test(`an edit that fails while saving ${table} puts the previous course back`, async () => {
    const created = await createCourse();
    fake.failNext(table);

    const response = await sendCourse(
      "PUT",
      `/api/courses/${created.id}`,
      course({
        title: "Half Saved",
        objectives: ["Land safely"],
        sections: ["Landing"],
        lessonContent: [
          {
            title: "Approach",
            section: "Landing",
            slides: [{ name: "approach.pdf", url: "https://example.com/approach.pdf" }],
          },
        ],
      }),
    );

    assert.match(await assertJsonError(response, 500), /previous version/i);
    assert.deepEqual(withoutLessonIds(await readCourse(created.id)), withoutLessonIds(created));
  });
}

test("when an edit and its restore both fail the error says so", async () => {
  const created = await createCourse();
  fake.failNext("course_lessons");
  fake.failNext("lesson_resources");

  const response = await sendCourse(
    "PUT",
    `/api/courses/${created.id}`,
    course({
      sections: ["Landing"],
      lessonContent: [{ title: "Approach", section: "Landing", slides: [] }],
    }),
  );

  assert.match(await assertJsonError(response, 500), /could not be restored/i);
});

test("editing a course that does not exist returns not found and saves nothing", async () => {
  const response = await sendCourse(
    "PUT",
    "/api/courses/7b1f8a54-3c0e-4a69-9a53-2f6a1d0c9e11",
    course(),
  );

  await assertJsonError(response, 404);
  assert.equal(fake.db.courses.length, 0);
  assert.equal(fake.db.course_sections.length, 0);
});

test("a course id that is not valid returns not found", async () => {
  const readResponse = await fetch(`${api}/api/courses/not-a-real-id`);
  const editResponse = await sendCourse("PUT", "/api/courses/not-a-real-id", course());

  await assertJsonError(readResponse, 404);
  await assertJsonError(editResponse, 404);
});

test("deleting a course removes it and everything inside it", async () => {
  const created = await createCourse();
  const kept = await createCourse({ title: "Radio Setup" });

  const response = await sendCourse("DELETE", `/api/courses/${created.id}`);

  assert.equal(response.status, 204);
  const { courses } = await (await fetch(`${api}/api/courses`)).json();
  assert.deepEqual(courses, [kept]);
  assert.equal((await fetch(`${api}/api/courses/${created.id}`)).status, 404);
});

test("a request body that is too big returns a clear error", async () => {
  const response = await sendCourse("POST", "/api/courses", course({ desc: "x".repeat(MEGABYTE + 1) }));

  await assertJsonError(response, 413);
});

test("a broken request body returns a clear error", async () => {
  const response = await fetch(`${api}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ not json",
  });

  await assertJsonError(response, 400);
});

const uploadCases = [
  ["course-image", "wing photo.PNG", "course-images", "image/png"],
  ["course-image", "wing.jpeg", "course-images", "image/jpeg"],
  ["instructor-image", "ama.webp", "instructor-images", "image/webp"],
  ["slide", "lesson 1.pdf", "lesson-resources", "application/pdf"],
  [
    "slide",
    "lesson 1.pptx",
    "lesson-resources",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  ["video", "preview.mp4", "lesson-resources", "video/mp4"],
];

for (const [kind, name, bucket, contentType] of uploadCases) {
  test(`uploading ${name} as ${kind} stores it in ${bucket} and returns a working link`, async () => {
    const response = await upload(kind, name);

    assert.equal(response.status, 201);
    const { file } = await response.json();
    assert.equal(file.name, name);
    assert.equal(new URL(file.url).pathname.split("/").includes(bucket), true);

    const stored = await fetch(file.url);
    assert.equal(stored.status, 200);
    assert.equal(stored.headers.get("content-type"), contentType);
    assert.equal((await stored.arrayBuffer()).byteLength, 10);
  });
}

test("two files with the same name do not overwrite each other", async () => {
  const first = await (await upload("slide", "notes.pdf")).json();
  const second = await (await upload("slide", "notes.pdf")).json();

  assert.notEqual(first.file.url, second.file.url);
  assert.equal(fake.files.size, 2);
});

test("a file name cannot choose where the file is stored", async () => {
  const response = await upload("course-image", "../../secret/evil.png");

  assert.equal(response.status, 201);
  const { file } = await response.json();
  assert.equal(file.name, "evil.png");
  const [storedPath] = [...fake.files.keys()];
  assert.match(storedPath, /^course-images\/course-image\/[0-9a-f-]{36}\.png$/);
});

const refusedUploads = [
  ["course-image", "drawing.svg"],
  ["course-image", "page.html"],
  ["instructor-image", "photo"],
  ["slide", "program.exe"],
  ["video", "still.png"],
  ["unknown", "photo.png"],
  ["constructor", "photo.png"],
  ["course-image", ""],
];

for (const [kind, name] of refusedUploads) {
  test(`uploading "${name}" as ${kind} is refused and stores nothing`, async () => {
    await assertJsonError(await upload(kind, name), 400);
    assert.equal(fake.files.size, 0);
  });
}

test("an empty file is refused", async () => {
  await assertJsonError(await upload("course-image", "wing.png", 0), 400);
  assert.equal(fake.files.size, 0);
});

const sizeLimits = [
  ["course-image", "wing.png", 10],
  ["instructor-image", "ama.png", 10],
  ["video", "preview.mp4", 50],
  ["slide", "lesson.pdf", 20],
];

for (const [kind, name, limitInMegabytes] of sizeLimits) {
  test(`${kind} files can be up to ${limitInMegabytes} MB but no bigger`, async () => {
    const atLimit = await upload(kind, name, limitInMegabytes * MEGABYTE);
    assert.equal(atLimit.status, 201);
    assert.equal(fake.files.size, 1);

    await assertJsonError(await upload(kind, name, limitInMegabytes * MEGABYTE + 1), 413);
    assert.equal(fake.files.size, 1);
  });
}

test("a storage failure returns a clear error and the backend keeps running", async () => {
  fake.failNext("storage");

  await assertJsonError(await upload("course-image", "wing.png"), 500);

  assert.equal((await upload("course-image", "wing.png")).status, 201);
});

test("without the secret key uploads explain the problem and courses can still be read", async () => {
  const created = await createCourse();

  const response = await upload("course-image", "wing.png", 10, { base: apiWithoutServiceKey });
  assert.match(await assertJsonError(response, 503), /SUPABASE_SERVICE_ROLE_KEY/);
  assert.equal(fake.files.size, 0);

  const { courses } = await (await fetch(`${apiWithoutServiceKey}/api/courses`)).json();
  assert.deepEqual(courses, [created]);
});

test("without the secret key saving explains the problem and changes nothing", async () => {
  const created = await createCourse();
  const send = (method, path, body) =>
    sendCourse(method, path, body, { base: apiWithoutServiceKey });

  const responses = [
    await send("POST", "/api/courses", course({ title: "Radio Setup" })),
    await send("PUT", `/api/courses/${created.id}`, course({ title: "Renamed" })),
    await send("DELETE", `/api/courses/${created.id}`),
  ];

  for (const response of responses) {
    assert.match(await assertJsonError(response, 503), /SUPABASE_SERVICE_ROLE_KEY/);
  }
  const { courses } = await (await fetch(`${api}/api/courses`)).json();
  assert.deepEqual(courses, [created]);
});

const outsiders = [
  ["someone who is not signed in", null, 401],
  ["someone whose sign-in is expired or made up", "not-a-real-sign-in", 401],
  ["a signed-in member who is not staff", MEMBER_TOKEN, 403],
  ["a member who named themselves staff in their own profile", SELF_NAMED_STAFF_TOKEN, 403],
];

for (const [who, token, status] of outsiders) {
  test(`${who} cannot create, edit, delete or upload, and nothing changes`, async () => {
    const created = await createCourse();

    const responses = [
      await sendCourse("POST", "/api/courses", course({ title: "Radio Setup" }), { token }),
      await sendCourse("PUT", `/api/courses/${created.id}`, course({ title: "Renamed" }), { token }),
      await sendCourse("DELETE", `/api/courses/${created.id}`, undefined, { token }),
      await upload("course-image", "wing.png", 10, { token }),
    ];

    for (const response of responses) {
      await assertJsonError(response, status);
    }
    assert.equal(fake.db.courses.length, 1);
    assert.deepEqual(withoutLessonIds(await readCourse(created.id)), withoutLessonIds(created));
    assert.equal(fake.files.size, 0);
  });
}

test("a new course records which staff member created it", async () => {
  const created = await createCourse();

  const [row] = fake.db.courses;
  assert.equal(row.id, created.id);
  assert.equal(row.created_by, staffUser.id);
});

test("an instructor role can manage course content", async () => {
  const response = await sendCourse(
    "POST",
    "/api/courses",
    course({ title: "Instructor Setup" }),
    { token: INSTRUCTOR_TOKEN },
  );
  assert.equal(response.status, 201);
});

test("editing a course keeps the staff member who created it", async () => {
  const created = await createCourse();
  fake.addUser("other-staff-sign-in", {
    email: "other-staff@example.com",
    appMetadata: { role: "staff" },
  });

  const response = await sendCourse("PUT", `/api/courses/${created.id}`, course({ title: "Renamed" }), {
    token: "other-staff-sign-in",
  });

  assert.equal(response.status, 200);
  assert.equal(fake.db.courses[0].created_by, staffUser.id);
});

test("when sign-ins cannot be checked, staff are told to try again rather than to sign in", async () => {
  fake.failNext("auth");

  const response = await sendCourse("POST", "/api/courses", course());

  assert.match(await assertJsonError(response, 503), /try again/i);
  assert.equal(fake.db.courses.length, 0);
});

// Staff dashboard: drafts, members, progress, and roles.

function staffGet(path, { token = STAFF_TOKEN, base = api } = {}) {
  return fetch(`${base}${path}`, { headers: signedIn(token) });
}

function setRole(userId, role, { token = STAFF_TOKEN } = {}) {
  return fetch(`${api}/api/staff/members/${userId}/role`, {
    method: "PUT",
    headers: signedIn(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ role }),
  });
}

function recordProgress(userId, courseId, lessonKey, completedAt) {
  fake.db.lesson_progress.push({
    user_id: userId,
    course_id: courseId,
    lesson_key: lessonKey,
    completed_at: completedAt,
  });
}

test("staff see draft courses that the public list leaves out", async () => {
  const published = await createCourse({ title: "Live Course" });
  await createCourse({ title: "Work In Progress", status: "draft" });

  const publicList = (await (await fetch(`${api}/api/courses`)).json()).courses;
  const response = await staffGet("/api/staff/courses");

  assert.deepEqual(publicList.map((item) => item.id), [published.id]);
  assert.equal(response.status, 200);
  const { courses } = await response.json();
  assert.deepEqual(
    courses.map((item) => [item.title, item.status]),
    [["Live Course", "published"], ["Work In Progress", "draft"]],
  );
});

test("the staff course list says who created each course and when it last changed", async () => {
  const created = await createCourse();
  const before = (await (await staffGet("/api/staff/courses")).json()).courses[0];

  await sendCourse("PUT", `/api/courses/${created.id}`, course({ desc: "Changed." }));
  const after = (await (await staffGet("/api/staff/courses")).json()).courses[0];

  assert.equal(before.createdBy, staffUser.id);
  assert.equal(typeof before.createdAt, "string");
  assert.ok(after.updatedAt > before.updatedAt);
});

test("members and signed-out visitors cannot open the staff course list", async () => {
  await assertJsonError(await staffGet("/api/staff/courses", { token: MEMBER_TOKEN }), 403);
  await assertJsonError(await staffGet("/api/staff/courses", { token: null }), 401);
});

test("a course can only be saved as a draft or published", async () => {
  const response = await sendCourse("POST", "/api/courses", course({ status: "secret" }));

  assert.match(await assertJsonError(response, 400), /draft or published/i);
  assert.equal(fake.db.courses.length, 0);
});

test("staff see each member with their role and when they joined", async () => {
  const ama = fake.addUser("ama-sign-in", {
    email: "ama@example.com",
    userMetadata: { full_name: "Ama Kusi" },
    createdAt: "2026-11-01T10:00:00.000Z",
    lastSignInAt: "2026-11-05T09:00:00.000Z",
  });

  const response = await staffGet("/api/staff/members");

  assert.equal(response.status, 200);
  const { members } = await response.json();
  const byEmail = Object.fromEntries(members.map((member) => [member.email, member]));
  assert.deepEqual(byEmail["ama@example.com"], {
    id: ama.id,
    email: "ama@example.com",
    name: "Ama Kusi",
    role: "member",
    joinedAt: "2026-11-01T10:00:00.000Z",
    lastSignInAt: "2026-11-05T09:00:00.000Z",
  });
  assert.equal(byEmail["member@example.com"].name, "member");
  assert.equal(byEmail["staff@example.com"].role, "staff");
  assert.equal(byEmail["instructor@example.com"].role, "instructor");
  // A role written into user_metadata by the member themselves does not count.
  assert.equal(byEmail["sneaky@example.com"].role, "member");
});

test("every account is listed even beyond the first page of accounts", async () => {
  for (let index = 0; index < 1000; index += 1) {
    fake.addUser(`extra-${index}`, { email: `extra-${index}@example.com` });
  }

  const { members } = await (await staffGet("/api/staff/members")).json();

  assert.equal(members.length, 1004);
});

test("members cannot see the member list", async () => {
  await assertJsonError(await staffGet("/api/staff/members", { token: MEMBER_TOKEN }), 403);
});

test("staff can read every member's lesson progress", async () => {
  const created = await createCourse();
  recordProgress(memberUser.id, created.id, '["Setup","Welcome"]', "2026-11-02T08:00:00.000Z");
  recordProgress(instructorUser.id, created.id, '["Flying","Welcome"]', "2026-11-03T08:00:00.000Z");

  const response = await staffGet("/api/staff/progress");

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).progress, [
    { user_id: memberUser.id, course_id: created.id, lesson_key: '["Setup","Welcome"]', completed_at: "2026-11-02T08:00:00.000Z" },
    { user_id: instructorUser.id, course_id: created.id, lesson_key: '["Flying","Welcome"]', completed_at: "2026-11-03T08:00:00.000Z" },
  ]);
});

test("progress beyond the first page of rows is still returned", async () => {
  const created = await createCourse();
  for (let index = 0; index < 1001; index += 1) {
    recordProgress(randomId(), created.id, '["Setup","Welcome"]', "2026-11-02T08:00:00.000Z");
  }

  const { progress } = await (await staffGet("/api/staff/progress")).json();

  assert.equal(progress.length, 1001);
});

test("members cannot read everyone's progress", async () => {
  await assertJsonError(await staffGet("/api/staff/progress", { token: MEMBER_TOKEN }), 403);
});

test("staff can make a member an instructor, who can then manage courses", async () => {
  const response = await setRole(memberUser.id, "instructor");

  assert.equal(response.status, 200);
  assert.equal((await response.json()).member.role, "instructor");
  const created = await sendCourse("POST", "/api/courses", course(), { token: MEMBER_TOKEN });
  assert.equal(created.status, 201);
});

test("staff can return an instructor to a member account", async () => {
  const response = await setRole(instructorUser.id, "member");

  assert.equal(response.status, 200);
  assert.equal((await response.json()).member.role, "member");
  await assertJsonError(await staffGet("/api/staff/courses", { token: INSTRUCTOR_TOKEN }), 403);
});

test("instructors cannot change anyone's role", async () => {
  const response = await setRole(memberUser.id, "staff", { token: INSTRUCTOR_TOKEN });

  assert.match(await assertJsonError(response, 403), /staff/i);
  assert.equal(memberUser.app_metadata.role, undefined);
});

test("staff cannot change their own role", async () => {
  const response = await setRole(staffUser.id, "member");

  assert.match(await assertJsonError(response, 400), /your own/i);
  assert.equal(staffUser.app_metadata.role, "staff");
});

test("an unknown role is refused", async () => {
  const response = await setRole(memberUser.id, "owner");

  assert.equal((await assertJsonError(response, 400)).length > 0, true);
  assert.equal(memberUser.app_metadata.role, undefined);
});

test("changing the role of an account that does not exist returns not found", async () => {
  await assertJsonError(await setRole(randomId(), "instructor"), 404);
  await assertJsonError(await setRole("not-an-id", "instructor"), 404);
});

test("lesson assessments hide answer keys and return answer feedback after submission", async () => {
  await createCourse();
  const lessonId = fake.db.course_lessons[0].id;
  const created = await createLessonQuiz(lessonId);

  const loadResponse = await loadLessonQuiz(lessonId);
  const loaded = (await loadResponse.json()).assessment;
  assert.equal(loadResponse.status, 200);
  assert.equal(loaded.questions.length, 10);
  for (const question of loaded.questions) {
    assert.equal("explanation" in question, false);
    for (const choice of question.choices) assert.equal("isCorrect" in choice, false);
  }

  const submitResponse = await submit(created.id, answersFor(loaded, 7));
  const result = await submitResponse.json();
  assert.equal(submitResponse.status, 201);
  assert.equal(result.passed, true);
  assert.equal(result.attempt.score, 70);
  assert.equal(result.review[0].correct, true);
  assert.equal(result.review[9].correct, false);
  assert.equal(result.review[9].correctChoiceId, loaded.questions[9].choices[0].id);
  assert.equal(result.review[9].explanation, "The ailerons control roll.");
});

test("lesson quizzes can be retaken without a limit", async () => {
  await createCourse();
  const quiz = await createLessonQuiz(fake.db.course_lessons[0].id);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await submit(quiz.id, answersFor(quiz, 0));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).attempt.attempt_number, attempt);
  }
});

test("staff loading a quiz get the answer key and explanations to edit", async () => {
  await createCourse();
  const lessonId = fake.db.course_lessons[0].id;
  await createLessonQuiz(lessonId);
  const loaded = (await (await loadLessonQuiz(lessonId, { token: STAFF_TOKEN })).json()).assessment;
  assert.equal(loaded.questions[0].explanation, "The ailerons control roll.");
  assert.equal(loaded.questions[0].choices[0].isCorrect, true);
});

test("members cannot load or answer quizzes in a draft course", async () => {
  const draft = await createCourse({ status: "draft" });
  const lessonId = fake.db.course_lessons[0].id;
  const quiz = await createLessonQuiz(lessonId);
  const exam = await createFinalExam(draft.id);

  await assertJsonError(await loadLessonQuiz(lessonId), 404);
  await assertJsonError(await fetch(`${api}/api/courses/${draft.id}/final-exam`, {
    headers: signedIn(MEMBER_TOKEN),
  }), 404);
  await assertJsonError(await submit(quiz.id, answersFor(quiz)), 404);
  await assertJsonError(await submit(exam.id, answersFor(exam)), 404);
  assert.equal(fake.db.assessment_attempts.length, 0);
  assert.equal((await loadLessonQuiz(lessonId, { token: STAFF_TOKEN })).status, 200);
});

const questionCountCases = [
  ["a lesson quiz with 9 questions", "lesson", 9],
  ["a lesson quiz with 26 questions", "lesson", 26],
  ["a final exam with 49 questions", "final", 49],
  ["a final exam with 51 questions", "final", 51],
];

for (const [name, type, count] of questionCountCases) {
  test(`${name} is refused`, async () => {
    const created = await createCourse();
    const path = type === "lesson"
      ? `/api/lessons/${fake.db.course_lessons[0].id}/assessment`
      : `/api/courses/${created.id}/final-exam`;
    const title = type === "lesson" ? "Knowledge check" : "Final exam";
    assert.match(await assertJsonError(await sendJson("POST", path, assessment(title, undefined, count)), 400), /questions/);
    assert.equal(fake.db.quizzes.length, 0);
  });
}

test("a final exam passes at 80% unless the instructor sets another mark", async () => {
  const created = await createCourse();
  const exam = await createFinalExam(created.id);
  assert.equal(exam.passMark, 80);
  assert.equal(fake.db.final_exams[0].pass_mark, 80);

  const failing = await (await submit(exam.id, answersFor(exam, 39))).json();
  assert.equal(failing.attempt.score, 78);
  assert.equal(failing.passed, false);
  const passing = await (await submit(exam.id, answersFor(exam, 40))).json();
  assert.equal(passing.passed, true);
});

test("questions cannot be added past the limit or removed below it", async () => {
  await createCourse();
  const full = await createLessonQuiz(fake.db.course_lessons[0].id, assessment("Knowledge check", undefined, 25));
  const extra = assessment().questions[0];
  assert.match(await assertJsonError(await sendJson("POST", `/api/quizzes/${full.id}/questions`, extra), 400), /10 to 25/);

  const smallest = await createLessonQuiz(fake.db.course_lessons[1].id);
  assert.match(
    await assertJsonError(await sendJson("DELETE", `/api/questions/${smallest.questions[0].id}`), 400),
    /10 to 25/,
  );
  assert.equal(fake.db.questions.filter((row) => row.quiz_id === smallest.id).length, 10);
  assert.equal((await sendJson("POST", `/api/quizzes/${smallest.id}/questions`, extra)).status, 201);
  assert.equal((await sendJson("DELETE", `/api/questions/${smallest.questions[0].id}`)).status, 204);
});

test("editing a quiz keeps the ids of questions and choices sent back", async () => {
  await createCourse();
  const quiz = await createLessonQuiz(fake.db.course_lessons[0].id);
  const edited = {
    title: "Renamed check",
    questions: [
      ...quiz.questions.slice(1).map((question) => ({
        ...question,
        questionText: `${question.questionText} (edited)`,
      })),
      { ...assessment().questions[0], questionText: "A brand new question" },
    ],
  };

  const response = await sendJson("PUT", `/api/quizzes/${quiz.id}`, edited);
  const saved = (await response.json()).assessment;
  assert.equal(response.status, 200);
  assert.deepEqual(saved.questions.slice(0, 9).map((question) => question.id), quiz.questions.slice(1).map((question) => question.id));
  assert.deepEqual(saved.questions[0].choices.map((choice) => choice.id), quiz.questions[1].choices.map((choice) => choice.id));
  assert.match(saved.questions[0].questionText, /\(edited\)$/);
  assert.equal(saved.questions[9].questionText, "A brand new question");
  assert.equal(fake.db.questions.some((row) => row.id === quiz.questions[0].id), false);
});

test("saving a course keeps its lesson quizzes and their attempts", async () => {
  const created = await createCourse();
  const welcome = created.lessonContent[0];
  const quiz = await createLessonQuiz(welcome.id);
  assert.equal((await submit(quiz.id, answersFor(quiz))).status, 201);

  const response = await sendCourse("PUT", `/api/courses/${created.id}`, course({ title: "Flight Basics 2" }));
  assert.equal(response.status, 200);
  const saved = (await response.json()).course;
  assert.notEqual(saved.lessonContent[0].id, welcome.id);
  const reloaded = (await (await loadLessonQuiz(saved.lessonContent[0].id)).json()).assessment;
  assert.equal(reloaded.id, quiz.id);
  assert.equal(fake.db.assessment_attempts.length, 1);
  assert.equal((await loadLessonQuiz(saved.lessonContent[1].id)).status, 404);
});

test("a course edit that fails puts its lesson quizzes back too", async () => {
  const created = await createCourse();
  const quiz = await createLessonQuiz(created.lessonContent[0].id);
  fake.failNext("lesson_resources");

  const response = await sendCourse("PUT", `/api/courses/${created.id}`, course({ title: "Half Saved" }));
  assert.match(await assertJsonError(response, 500), /previous version/i);
  const restored = await readCourse(created.id);
  assert.equal((await (await loadLessonQuiz(restored.lessonContent[0].id)).json()).assessment.id, quiz.id);
});

test("final exams enforce three attempts and issue one certificate when passed", async () => {
  const created = await createCourse();
  const exam = await createFinalExam(created.id, 50);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await submit(exam.id, answersFor(exam, 0));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).attemptsRemaining, 3 - attempt);
  }
  const passingResponse = await submit(exam.id, answersFor(exam));
  const passingResult = await passingResponse.json();
  assert.equal(passingResponse.status, 201);
  assert.equal(passingResult.passed, true);
  assert.equal(typeof passingResult.certificate.certificate_identifier, "string");

  assert.match(await assertJsonError(await submit(exam.id, answersFor(exam)), 409), /limit|passed/i);
  assert.equal(fake.db.certificates.length, 1);
  assert.equal(fake.db.course_completions.length, 1);
});

test("a final exam refuses a fourth failed attempt", async () => {
  const created = await createCourse();
  const exam = await createFinalExam(created.id, 100);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal((await submit(exam.id, answersFor(exam, 0))).status, 201);
  }
  await assertJsonError(await submit(exam.id, answersFor(exam, 0)), 409);
});

test("a passing submission that cannot issue the certificate does not use up an attempt", async () => {
  const created = await createCourse();
  const exam = await createFinalExam(created.id);
  fake.failNext("certificates");

  await assertJsonError(await submit(exam.id, answersFor(exam)), 500);
  assert.equal(fake.db.assessment_attempts.length, 0);
  assert.equal(fake.db.certificates.length, 0);
  assert.equal(fake.db.course_completions.length, 0);

  const retry = await (await submit(exam.id, answersFor(exam))).json();
  assert.equal(retry.attempt.attempt_number, 1);
  assert.equal(retry.attemptsRemaining, 2);
  assert.equal(typeof retry.certificate.certificate_identifier, "string");
});

function loadAttempts(quizId, { token = MEMBER_TOKEN, review = false } = {}) {
  return fetch(`${api}/api/quizzes/${quizId}/attempts${review ? "?review=latest" : ""}`, {
    headers: signedIn(token),
  });
}

test("a member's quiz results come back newest first, with the latest review, on any device", async () => {
  await createCourse();
  const quiz = await createLessonQuiz(fake.db.course_lessons[0].id);
  assert.equal((await submit(quiz.id, answersFor(quiz, 4))).status, 201);
  assert.equal((await submit(quiz.id, answersFor(quiz, 9))).status, 201);

  const response = await loadAttempts(quiz.id, { review: true });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.attempts.map((attempt) => [attempt.attempt_number, attempt.score]), [[2, 90], [1, 40]]);
  assert.equal("answers" in body.attempts[0], false);
  assert.equal(body.attemptsRemaining, null);
  assert.equal(body.review.length, 10);
  assert.equal(body.review[8].correct, true);
  assert.equal(body.review[9].correct, false);
  assert.equal(body.review[9].correctChoiceId, quiz.questions[9].choices[0].id);
  assert.equal(body.review[9].explanation, "The ailerons control roll.");

  const withoutReview = await (await loadAttempts(quiz.id)).json();
  assert.equal(withoutReview.review, null);
});

test("a member with no attempts gets an empty history and no answer key", async () => {
  await createCourse();
  const quiz = await createLessonQuiz(fake.db.course_lessons[0].id);
  const body = await (await loadAttempts(quiz.id, { review: true })).json();
  assert.deepEqual(body.attempts, []);
  assert.equal(body.review, null);
});

test("members only see their own quiz attempts", async () => {
  await createCourse();
  const quiz = await createLessonQuiz(fake.db.course_lessons[0].id);
  assert.equal((await submit(quiz.id, answersFor(quiz))).status, 201);
  const other = await (await loadAttempts(quiz.id, { token: STAFF_TOKEN, review: true })).json();
  assert.deepEqual(other.attempts, []);
  assert.equal(other.review, null);
});

test("the attempt history skips questions added after the attempt", async () => {
  await createCourse();
  const quiz = await createLessonQuiz(fake.db.course_lessons[0].id);
  await submit(quiz.id, answersFor(quiz));
  assert.equal((await sendJson("POST", `/api/quizzes/${quiz.id}/questions`, assessment().questions[0])).status, 201);

  const body = await (await loadAttempts(quiz.id, { review: true })).json();
  assert.equal(body.review.length, 10);
  assert.equal(body.attempts[0].score, 100);
});

test("final exam history says how many attempts remain", async () => {
  const created = await createCourse();
  const exam = await createFinalExam(created.id);
  await submit(exam.id, answersFor(exam, 0));
  const body = await (await loadAttempts(exam.id)).json();
  assert.equal(body.attemptsRemaining, 2);
  assert.equal(body.attempts[0].passed, false);
});

test("quiz history needs a sign-in and a published course", async () => {
  const draft = await createCourse({ status: "draft" });
  const quiz = await createLessonQuiz(fake.db.course_lessons[0].id);
  assert.equal((await fetch(`${api}/api/quizzes/${quiz.id}/attempts`)).status, 401);
  await assertJsonError(await loadAttempts(quiz.id), 404);
  await assertJsonError(await loadAttempts(randomId()), 404);
  assert.equal(draft.status, "draft");
});

test("without the secret key the member list explains the problem", async () => {
  const response = await staffGet("/api/staff/members", { base: apiWithoutServiceKey });

  assert.match(await assertJsonError(response, 503), /SUPABASE_SERVICE_ROLE_KEY/);
});

test("when progress tracking was never set up, staff are told which setup file to run", async () => {
  fake.dropTable("lesson_progress");

  const response = await staffGet("/api/staff/progress");

  assert.match(await assertJsonError(response, 503), /supabase\/003_lesson_progress\.sql/);
});

// Quizzes and the final exam travel with the course, so the course builder
// saves everything with one Save or Publish.
function courseWithAssessments(overrides = {}) {
  const base = course();
  return course({
    lessonContent: [{ ...base.lessonContent[0], quiz: assessment() }, base.lessonContent[1]],
    finalExam: assessment("Final exam", 60),
    ...overrides,
  });
}

test("saving a course stores its lesson quiz and final exam for staff to edit", async () => {
  const created = await createCourse(courseWithAssessments());

  const quiz = created.lessonContent[0].quiz;
  assert.equal(quiz.title, "Knowledge check");
  assert.equal(quiz.questions[0].questionText, "Question 1: which control keeps the aircraft level?");
  assert.equal(quiz.questions[0].explanation, "The ailerons control roll.");
  assert.deepEqual(
    quiz.questions[0].choices.map((choice) => [choice.text, choice.isCorrect]),
    [["Ailerons", true], ["Landing gear", false]],
  );
  assert.equal(created.lessonContent[1].quiz, undefined);
  assert.equal(created.finalExam.title, "Final exam");
  assert.equal(created.finalExam.passMark, 60);
  assert.equal(created.finalExam.questions.length, 50);

  // The quiz hangs off the lesson learners open, in the right section.
  assert.equal(fake.db.lesson_assessments.length, 1);
  const lesson = fake.db.course_lessons.find((row) => row.id === fake.db.lesson_assessments[0].lesson_id);
  assert.equal(fake.db.course_sections.find((row) => row.id === lesson.section_id).title, "Setup");
  const learnerResponse = await fetch(`${api}/api/lessons/${lesson.id}/assessment`, {
    headers: signedIn(MEMBER_TOKEN),
  });
  assert.equal(learnerResponse.status, 200);
  assert.equal((await learnerResponse.json()).assessment.id, quiz.id);
});

test("saving a course again keeps its quizzes and learners' attempts, even after a lesson is renamed", async () => {
  const created = await createCourse(courseWithAssessments());
  const quiz = created.lessonContent[0].quiz;
  const question = quiz.questions[0];
  // A learner takes the quiz before the instructor edits it.
  const attempt = await submit(quiz.id, answersFor(quiz));
  assert.equal(attempt.status, 201);

  const editedQuiz = {
    ...quiz,
    questions: [
      {
        ...question,
        questionText: "Which control rolls the aircraft?",
        choices: [...question.choices, { text: "Rudder", isCorrect: false }],
      },
      {
        questionText: "What powers a brushless motor?",
        choices: [{ text: "An ESC", isCorrect: true }, { text: "A servo", isCorrect: false }],
      },
      ...quiz.questions.slice(2),
    ],
  };
  const response = await sendCourse("PUT", `/api/courses/${created.id}`, {
    ...created,
    lessonContent: [
      { ...created.lessonContent[0], title: "Welcome aboard", quiz: editedQuiz },
      created.lessonContent[1],
    ],
    finalExam: { ...created.finalExam, passMark: 80 },
  });
  assert.equal(response.status, 200);
  const saved = (await response.json()).course;

  const savedQuiz = saved.lessonContent[0].quiz;
  assert.equal(saved.lessonContent[0].title, "Welcome aboard");
  assert.equal(savedQuiz.id, quiz.id);
  assert.equal(savedQuiz.questions[0].id, question.id);
  assert.equal(savedQuiz.questions[0].questionText, "Which control rolls the aircraft?");
  assert.deepEqual(
    savedQuiz.questions[0].choices.slice(0, 2).map((choice) => choice.id),
    question.choices.map((choice) => choice.id),
  );
  assert.equal(savedQuiz.questions[0].choices[2].text, "Rudder");
  assert.equal(savedQuiz.questions[1].questionText, "What powers a brushless motor?");
  assert.equal(saved.finalExam.id, created.finalExam.id);
  assert.equal(saved.finalExam.passMark, 80);
  assert.equal(fake.db.quizzes.length, 2);
  assert.equal(fake.db.assessment_attempts.length, 1);
});

test("removing a lesson quiz or the final exam deletes it", async () => {
  const created = await createCourse(courseWithAssessments());

  const response = await sendCourse("PUT", `/api/courses/${created.id}`, {
    ...created,
    lessonContent: [{ ...created.lessonContent[0], quiz: null }, created.lessonContent[1]],
    finalExam: null,
  });

  assert.equal(response.status, 200);
  const saved = (await response.json()).course;
  assert.equal(saved.lessonContent[0].quiz, undefined);
  assert.equal(saved.finalExam, undefined);
  assert.equal(fake.db.quizzes.length, 0);
  assert.equal(fake.db.final_exams.length, 0);
  assert.equal(fake.db.lesson_assessments.length, 0);
});

test("a course saved without any quiz details, as older pages send it, keeps its quizzes", async () => {
  const created = await createCourse(courseWithAssessments());

  const response = await sendCourse("PUT", `/api/courses/${created.id}`, course({ title: "Flight Basics 2" }));

  assert.equal(response.status, 200);
  const saved = (await response.json()).course;
  assert.equal(saved.lessonContent[0].quiz.id, created.lessonContent[0].quiz.id);
  assert.equal(saved.finalExam.id, created.finalExam.id);
  assert.equal(fake.db.quizzes.length, 2);
});

test("an incomplete lesson quiz is refused with a message naming the lesson, and nothing is saved", async () => {
  const quiz = assessment();
  quiz.questions[0].choices[0].isCorrect = false;

  const response = await sendCourse("POST", "/api/courses", courseWithAssessments({
    lessonContent: [{ ...course().lessonContent[0], quiz }],
  }));

  const error = await assertJsonError(response, 400);
  assert.match(error, /Welcome/);
  assert.match(error, /question 1/i);
  assert.match(error, /correct answer/i);
  assert.equal(fake.db.courses.length, 0);
  assert.equal(fake.db.quizzes.length, 0);
});

test("a final exam pass mark must be a whole percentage from 1 to 100", async () => {
  const created = await createCourse(courseWithAssessments());

  for (const passMark of [0, 101, 72.5, "seventy", null]) {
    const response = await sendCourse("PUT", `/api/courses/${created.id}`, {
      ...created,
      finalExam: { ...created.finalExam, passMark },
    });
    assert.match(await assertJsonError(response, 400), /pass mark/i, `pass mark ${passMark}`);
  }
  assert.equal(fake.db.final_exams[0].pass_mark, 60);
});

test("the separate final exam routes refuse a pass mark of 0", async () => {
  const created = await createCourse();

  const response = await sendJson("POST", `/api/courses/${created.id}/final-exam`, assessment("Final exam", 0));

  assert.match(await assertJsonError(response, 400), /pass mark/i);
  assert.equal(fake.db.final_exams.length, 0);
});

test("an edit that fails while saving a quiz puts the previous quiz back", async () => {
  const created = await createCourse(courseWithAssessments());
  const quiz = created.lessonContent[0].quiz;
  fake.failNext("answer_choices");

  const response = await sendCourse("PUT", `/api/courses/${created.id}`, {
    ...created,
    lessonContent: [
      {
        ...created.lessonContent[0],
        quiz: { ...quiz, questions: [{ ...quiz.questions[0], questionText: "Half saved?" }, ...quiz.questions.slice(1)] },
      },
      created.lessonContent[1],
    ],
    finalExam: { ...created.finalExam, passMark: 90 },
  });

  assert.match(await assertJsonError(response, 500), /previous version was kept/i);
  const staffResponse = await staffGet("/api/staff/courses");
  const [restored] = (await staffResponse.json()).courses;
  assert.deepEqual(restored.lessonContent[0].quiz, quiz);
  assert.deepEqual(restored.finalExam, created.finalExam);
});

test("before the assessment tables are set up, staff can still list and save courses, and adding a quiz says what to run", async () => {
  const created = await createCourse();
  for (const table of ["quizzes", "questions", "answer_choices", "lesson_assessments", "final_exams"]) {
    fake.dropTable(table);
  }

  assert.equal((await staffGet("/api/staff/courses")).status, 200);
  const withoutQuizzes = {
    ...created,
    desc: "Updated",
    lessonContent: created.lessonContent.map((lesson) => ({ ...lesson, quiz: null })),
    finalExam: null,
  };
  assert.equal((await sendCourse("PUT", `/api/courses/${created.id}`, withoutQuizzes)).status, 200);

  const withQuiz = await sendCourse("PUT", `/api/courses/${created.id}`, courseWithAssessments());
  assert.match(await assertJsonError(withQuiz, 503), /004_assessments\.sql/);
  const newWithQuiz = await sendCourse("POST", "/api/courses", courseWithAssessments({ title: "Another" }));
  assert.match(await assertJsonError(newWithQuiz, 503), /004_assessments\.sql/);
  assert.equal((await readCourse(created.id)).desc, "Updated");
  assert.equal(fake.db.courses.length, 1);
});

test("the public course reads never include quizzes or answer keys", async () => {
  const created = await createCourse(courseWithAssessments());

  const listed = (await (await fetch(`${api}/api/courses`)).json()).courses[0];
  const single = await readCourse(created.id);

  for (const publicCourse of [listed, single]) {
    assert.equal(publicCourse.finalExam, undefined);
    assert.equal(JSON.stringify(publicCourse).includes("isCorrect"), false);
    assert.equal(JSON.stringify(publicCourse).includes("Ailerons"), false);
  }
});
