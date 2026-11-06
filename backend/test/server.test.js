import assert from "node:assert/strict";
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
  fake.addUser(MEMBER_TOKEN, { email: "member@example.com" });
  fake.addUser(INSTRUCTOR_TOKEN, {
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
  assert.deepEqual(created.lessonContent, [
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

  assert.deepEqual(created.lessonContent, [
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
    assert.deepEqual(await readCourse(created.id), created);
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
  assert.deepEqual(saved.lessonContent, [{ title: "Approach", section: "Landing", slides: [] }]);
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
    assert.deepEqual(await readCourse(created.id), created);
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
    assert.deepEqual(await readCourse(created.id), created);
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
