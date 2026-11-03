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
};

function databaseError(status, code, message) {
  return { status, body: { code, message, details: null, hint: null } };
}

// Shaped like the user Supabase Auth returns from GET /auth/v1/user.
function authUser({ id = randomUUID(), email, appMetadata = {}, userMetadata = {} }) {
  const now = new Date(0).toISOString();
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: now,
    phone: "",
    confirmed_at: now,
    last_sign_in_at: now,
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

  const reset = () => {
    db = Object.fromEntries(Object.keys(TABLE_RULES).map((table) => [table, []]));
    files = new Map();
    failures = new Set();
    clock = 0;
    users = new Map();
  };
  reset();

  const nestedCourse = (course) => ({
    ...course,
    course_objectives: db.course_objectives.filter((row) => row.course_id === course.id),
    course_sections: db.course_sections
      .filter((section) => section.course_id === course.id)
      .map((section) => ({
        ...section,
        course_lessons: db.course_lessons
          .filter((lesson) => lesson.section_id === section.id)
          .map((lesson) => ({
            ...lesson,
            lesson_resources: db.lesson_resources.filter((row) => row.lesson_id === lesson.id),
          })),
      })),
  });

  const removeRows = (table, shouldRemove) => {
    const removed = db[table].filter(shouldRemove);
    db[table] = db[table].filter((row) => !shouldRemove(row));
    for (const [childTable, rules] of Object.entries(TABLE_RULES)) {
      if (rules.parent?.[1] !== table) continue;
      const [column] = rules.parent;
      const removedIds = new Set(removed.map((row) => row.id));
      removeRows(childTable, (row) => removedIds.has(row[column]));
    }
  };

  const findViolation = (table, row, ignoreId) => {
    const rules = TABLE_RULES[table];
    if (rules.parent) {
      const [column, parentTable] = rules.parent;
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
      .filter(([key]) => !["select", "order", "columns"].includes(key))
      .map(([key, value]) => [key, value.replace(/^eq\./, "")]);
    for (const [key, value] of filters) {
      if ((key === "id" || key.endsWith("_id")) && !UUID_PATTERN.test(value)) {
        return databaseError(400, "22P02", `invalid input syntax for type uuid: "${value}"`);
      }
    }
    const matches = (row) => filters.every(([key, value]) => row[key] === value);

    if (method === "GET") {
      const rows = db[table].filter(matches).map((row) => (table === "courses" ? nestedCourse(row) : row));
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
        const row = {
          ...TABLE_RULES[table].defaults,
          ...values,
          id: randomUUID(),
          created_at: new Date(++clock).toISOString(),
        };
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
