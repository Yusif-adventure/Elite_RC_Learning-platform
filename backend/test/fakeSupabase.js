import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

// An in-memory stand-in for the parts of Supabase the backend uses, so tests
// never touch a real database. It speaks the same HTTP API as Supabase and
// applies the same rules as supabase/001_shared_course_data.sql, plus the
// row-level security seen on the real project: the anon key can read but not write.
// Supabase Auth only answers "who does this sign-in token belong to?".

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKETS = ["course-images", "instructor-images", "lesson-resources"];

const COURSE_DEFAULTS = {
  description: "",
  difficulty: "Beginner",
  duration: "Self-paced",
  instructor_image_url: null,
  image_url: null,
  category: "General",
  status: "published",
  created_by: null,
};

const TABLE_RULES = {
  courses: { defaults: COURSE_DEFAULTS, unique: ["title"] },
  course_objectives: { defaults: { position: 0 }, parent: ["course_id", "courses"] },
  course_sections: {
    defaults: { position: 0 },
    parent: ["course_id", "courses"],
    unique: ["course_id", "title"],
  },
  course_lessons: {
    defaults: { position: 0, youtube_url: null },
    parent: ["section_id", "course_sections"],
    unique: ["section_id", "title"],
  },
  lesson_resources: {
    defaults: { storage_path: null, mime_type: null, size_bytes: null, position: 0 },
    parent: ["lesson_id", "course_lessons"],
  },
  // From supabase/003_lesson_progress.sql: deleting a course removes its progress.
  lesson_progress: { defaults: {}, parent: ["course_id", "courses"] },
  quizzes: { defaults: { created_by: null }, parent: null },
  questions: { defaults: { explanation: null, position: 0 }, parent: ["quiz_id", "quizzes"] },
  answer_choices: { defaults: { is_correct: false, position: 0 }, parent: ["question_id", "questions"] },
  lesson_assessments: {
    defaults: {},
    parent: ["lesson_id", "course_lessons"],
    otherParents: [["quiz_id", "quizzes"]],
    unique: ["lesson_id"],
  },
  final_exams: {
    defaults: { pass_mark: 70 },
    parent: ["course_id", "courses"],
    otherParents: [["quiz_id", "quizzes"]],
    unique: ["course_id"],
  },
  assessment_attempts: {
    defaults: { answers: {}, passed: false },
    parent: ["quiz_id", "quizzes"],
    unique: ["user_id", "quiz_id", "attempt_number"],
  },
  course_completions: {
    defaults: {},
    parent: ["course_id", "courses"],
    unique: ["user_id", "course_id"],
  },
  certificates: {
    defaults: {},
    parent: ["course_id", "courses"],
    unique: ["user_id", "course_id"],
  },
};

// Every foreign key on a table; deleting any parent row deletes the child row.
const parentsOf = (rules) => [rules.parent, ...(rules.otherParents || [])].filter(Boolean);

// Like Supabase Auth's admin API errors, e.g. for an id that matches no account.
const authError = (status, errorCode, msg) => ({ status, body: { code: status, error_code: errorCode, msg } });

function databaseError(status, code, message) {
  return { status, body: { code, message, details: null, hint: null } };
}

// Shaped like the user Supabase Auth returns from GET /auth/v1/user.
function authUser({
  id = randomUUID(),
  email,
  appMetadata = {},
  userMetadata = {},
  createdAt = new Date(0).toISOString(),
  lastSignInAt = new Date(0).toISOString(),
}) {
  const now = createdAt;
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: now,
    phone: "",
    confirmed_at: now,
    last_sign_in_at: lastSignInAt,
    app_metadata: { provider: "email", providers: ["email"], ...appMetadata },
    user_metadata: { email, email_verified: true, ...userMetadata },
    identities: [],
    created_at: now,
    updated_at: now,
    is_anonymous: false,
  };
}

export async function startFakeSupabase({ serviceKey }) {
  let db;
  let files;
  let failures;
  let clock;
  let users;

  let missingTables;

  const reset = () => {
    missingTables = new Set();
    db = Object.fromEntries(Object.keys(TABLE_RULES).map((table) => [table, []]));
    files = new Map();
    failures = new Set();
    clock = 0;
    users = new Map();
  };
  reset();

  const nestedQuiz = (quizId) => {
    const quiz = db.quizzes.find((row) => row.id === quizId);
    return {
      ...quiz,
      questions: db.questions
        .filter((question) => question.quiz_id === quizId)
        .map((question) => ({
          ...question,
          answer_choices: db.answer_choices.filter((choice) => choice.question_id === question.id),
        })),
    };
  };

  // Like PostgREST, a one-to-one embed (its key is also unique) is an object or null.
  const embedOne = (row) => (row ? { ...row, quizzes: nestedQuiz(row.quiz_id) } : null);

  // Quizzes are only embedded when the select asks for them, as the staff read does.
  const nestedCourse = (course, select) => ({
    ...course,
    course_objectives: db.course_objectives.filter((row) => row.course_id === course.id),
    ...(select.includes("final_exams")
      ? { final_exams: embedOne(db.final_exams.find((row) => row.course_id === course.id)) }
      : {}),
    course_sections: db.course_sections
      .filter((section) => section.course_id === course.id)
      .map((section) => ({
        ...section,
        course_lessons: db.course_lessons
          .filter((lesson) => lesson.section_id === section.id)
          .map((lesson) => ({
            ...lesson,
            lesson_resources: db.lesson_resources.filter((row) => row.lesson_id === lesson.id),
            ...(select.includes("lesson_assessments")
              ? { lesson_assessments: embedOne(db.lesson_assessments.find((row) => row.lesson_id === lesson.id)) }
              : {}),
          })),
      })),
  });

  const removeRows = (table, shouldRemove) => {
    const removed = db[table].filter(shouldRemove);
    db[table] = db[table].filter((row) => !shouldRemove(row));
    const removedIds = new Set(removed.map((row) => row.id));
    for (const [childTable, rules] of Object.entries(TABLE_RULES)) {
      for (const [column, parentTable] of parentsOf(rules)) {
        if (parentTable === table) removeRows(childTable, (row) => removedIds.has(row[column]));
      }
    }
  };

  const findViolation = (table, row, ignoreId) => {
    const rules = TABLE_RULES[table];
    for (const [column, parentTable] of parentsOf(rules)) {
      if (!db[parentTable].some((parent) => parent.id === row[column])) {
        return databaseError(409, "23503", `insert on "${table}" violates foreign key constraint`);
      }
    }
    if (rules.unique) {
      const repeated = db[table].some((existing) =>
        existing.id !== ignoreId && rules.unique.every((column) => existing[column] === row[column]),
      );
      if (repeated) {
        return databaseError(409, "23505", `duplicate key value violates unique constraint on "${table}"`);
      }
    }
    return null;
  };

  const handleTable = (table, method, url, headers, body) => {
    const filters = [...url.searchParams]
      .filter(([key]) => !["select", "order", "columns", "limit", "offset"].includes(key))
      .map(([key, value]) => [key, value.replace(/^eq\./, "")]);
    // Like PostgREST, a GET returns at most `limit` rows starting at `offset`.
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Number(url.searchParams.get("limit") || Infinity);
    for (const [key, value] of filters) {
      if ((key === "id" || key.endsWith("_id")) && !UUID_PATTERN.test(value)) {
        return databaseError(400, "22P02", `invalid input syntax for type uuid: "${value}"`);
      }
    }
    const matches = (row) => filters.every(([key, value]) => row[key] === value);

    if (method === "GET") {
      const select = url.searchParams.get("select") || "*";
      // What PostgREST answers when a select embeds a table whose setup SQL was never run.
      const missingEmbed = [...missingTables].find((name) => select.includes(name));
      if (missingEmbed) {
        return databaseError(400, "PGRST200", `Could not find a relationship between '${table}' and '${missingEmbed}' in the schema cache`);
      }
      const rows = db[table]
        .filter(matches)
        .slice(offset, offset + limit)
        .map((row) => (table === "courses" ? nestedCourse(row, select) : row));
      if (!String(headers.accept).includes("vnd.pgrst.object")) return { status: 200, body: rows };
      return rows.length === 1
        ? { status: 200, body: rows[0] }
        : databaseError(406, "PGRST116", `The result contains ${rows.length} rows`);
    }

    if (headers.authorization !== `Bearer ${serviceKey}`) {
      // Row-level security refuses inserts, while updates and deletes quietly match no rows.
      return method === "POST"
        ? databaseError(401, "42501", `new row violates row-level security policy for table "${table}"`)
        : { status: 204, body: null };
    }

    if (failures.delete(table)) {
      return databaseError(500, "XX000", `Simulated database failure on ${table}.`);
    }

    if (method === "POST") {
      const inserted = [];
      const stagedRows = [...db[table]];
      for (const values of [body].flat()) {
        const createdAt = new Date(++clock).toISOString();
        const row = {
          ...TABLE_RULES[table].defaults,
          ...values,
          id: randomUUID(),
          created_at: createdAt,
          // supabase/001 keeps courses.updated_at current with a trigger.
          ...(table === "courses" ? { updated_at: createdAt } : {}),
        };
        if (table === "certificates" && !row.certificate_identifier) {
          row.certificate_identifier = randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
        }
        if (table === "assessment_attempts" && !row.submitted_at) {
          row.submitted_at = createdAt;
        }
        const violation = findViolation(table, row);
        if (violation) {
          db[table] = stagedRows;
          return violation;
        }
        db[table].push(row);
        inserted.push(row);
      }
      if (!String(headers.prefer).includes("return=representation")) return { status: 201, body: null };
      const wantsOne = String(headers.accept).includes("vnd.pgrst.object");
      return { status: 201, body: wantsOne ? inserted[0] : inserted };
    }

    if (method === "PATCH") {
      for (const row of db[table].filter(matches)) {
        const violation = findViolation(table, { ...row, ...body }, row.id);
        if (violation) return violation;
        Object.assign(row, body);
        if (table === "courses") row.updated_at = new Date(++clock).toISOString();
      }
      return { status: 204, body: null };
    }

    if (method === "DELETE") {
      removeRows(table, matches);
      return { status: 204, body: null };
    }

    return databaseError(405, "PGRST117", `Unsupported method ${method}.`);
  };

  const storageError = (statusCode, error, message) => ({
    status: 400,
    body: { statusCode: String(statusCode), error, message },
  });

  const handleStorageUpload = (objectPath, headers, body) => {
    const [bucket, ...rest] = objectPath.split("/");
    if (failures.delete("storage")) return storageError(500, "Internal", "Simulated storage failure.");
    if (!BUCKETS.includes(bucket)) return storageError(404, "Bucket not found", "Bucket not found");
    // The buckets only have a public read policy, so only the service key can write.
    if (headers.authorization !== `Bearer ${serviceKey}`) {
      return storageError(403, "Unauthorized", "new row violates row-level security policy");
    }
    files.set(objectPath, { body, contentType: headers["content-type"] });
    return { status: 200, body: { Id: randomUUID(), Key: `${bucket}/${rest.join("/")}` } };
  };

  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const url = new URL(req.url, "http://fake.supabase");
      const raw = Buffer.concat(chunks);
      const send = ({ status, body }) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(body === null ? undefined : JSON.stringify(body));
      };

      const publicPrefix = "/storage/v1/object/public/";
      const uploadPrefix = "/storage/v1/object/";
      const tablePrefix = "/rest/v1/";

      if (url.pathname === "/auth/v1/user" && req.method === "GET") {
        if (failures.delete("auth")) {
          send({ status: 500, body: { code: 500, error_code: "unexpected_failure", msg: "Simulated auth failure." } });
          return;
        }
        const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
        const user = users.get(token);
        send(user
          ? { status: 200, body: user }
          : { status: 403, body: { code: 403, error_code: "bad_jwt", msg: "invalid JWT: unable to parse or verify signature" } });
        return;
      }
      // Supabase Auth's admin API: listing accounts and changing app_metadata.
      // Only the service key may use it.
      if (url.pathname.startsWith("/auth/v1/admin/users")) {
        if (req.headers.authorization !== `Bearer ${serviceKey}`) {
          send(authError(403, "not_admin", "User not allowed"));
          return;
        }
        const everyone = [...users.values()];
        if (req.method === "GET" && url.pathname === "/auth/v1/admin/users") {
          const perPage = Number(url.searchParams.get("per_page") || 50);
          const page = Number(url.searchParams.get("page") || 1);
          send({
            status: 200,
            body: { aud: "authenticated", users: everyone.slice((page - 1) * perPage, page * perPage) },
          });
          return;
        }
        const id = url.pathname.split("/").pop();
        const user = everyone.find((candidate) => candidate.id === id);
        if (req.method === "PUT" && user) {
          const changes = raw.length ? JSON.parse(raw) : {};
          // Supabase Auth merges the keys given into the existing app_metadata.
          if (changes.app_metadata) Object.assign(user.app_metadata, changes.app_metadata);
          send({ status: 200, body: user });
          return;
        }
        send(authError(404, "user_not_found", "User not found"));
        return;
      }
      if (url.pathname.startsWith(publicPrefix)) {
        const file = files.get(decodeURIComponent(url.pathname.slice(publicPrefix.length)));
        if (!file) {
          send({ status: 404, body: { message: "Object not found" } });
          return;
        }
        res.writeHead(200, { "Content-Type": file.contentType });
        res.end(file.body);
        return;
      }
      if (url.pathname.startsWith(uploadPrefix) && req.method === "POST") {
        send(handleStorageUpload(decodeURIComponent(url.pathname.slice(uploadPrefix.length)), req.headers, raw));
        return;
      }
      if (url.pathname.startsWith(tablePrefix)) {
        const table = url.pathname.slice(tablePrefix.length);
        if (missingTables.has(table)) {
          // What PostgREST answers for a table whose setup SQL was never run.
          send(databaseError(404, "PGRST205", `Could not find the table 'public.${table}' in the schema cache`));
          return;
        }
        if (!db[table]) {
          send(databaseError(404, "42P01", `relation "public.${table}" does not exist`));
          return;
        }
        send(handleTable(table, req.method, url, req.headers, raw.length ? JSON.parse(raw) : null));
        return;
      }
      send({ status: 404, body: { message: `Unexpected request to ${url.pathname}` } });
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  return {
    url: `http://127.0.0.1:${server.address().port}`,
    reset,
    close: () => new Promise((resolve) => server.close(resolve)),
    failNext: (target) => failures.add(target),
    // Acts as if a setup SQL file was never run on the project.
    dropTable: (table) => missingTables.add(table),
    // Signs someone in: the token then identifies them to Supabase Auth.
    addUser: (token, details) => {
      const user = authUser(details);
      users.set(token, user);
      return user;
    },
    get db() {
      return db;
    },
    get files() {
      return files;
    },
  };
}
