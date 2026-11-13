import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);

function asPattern(value) {
  return String(value)
    .trim()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
}

function getAllowedOriginPatterns() {
  return (process.env.FRONTEND_ORIGIN_PATTERNS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((pattern) => new RegExp(`^${asPattern(pattern)}$`, "i"));
}

function getAllowedOrigins() {
  const configured = [
    process.env.FRONTEND_ORIGIN,
    process.env.FRONTEND_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length) {
    return [...new Set(configured)];
  }

  // Safe local defaults for development only.
  return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"];
}

const allowedOrigins = getAllowedOrigins();
const allowedOriginPatterns = getAllowedOriginPatterns();

app.use(cors({
  origin(origin, callback) {
    // Requests from tools like curl or same-origin server calls may omit Origin.
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    if (allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS."));
  },
}));
app.use(express.json({ limit: "1mb" }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

// The database and buckets refuse writes from the anon key, so the backend saves
// with the secret key. Public reads keep using the anon key.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : null;

const MEGABYTE = 1024 * 1024;
// The largest single file the team's Supabase project accepts.
const MAX_UPLOAD_BYTES = 50 * MEGABYTE;
const imageTypes = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const uploadKinds = {
  "course-image": {
    label: "Course image",
    bucket: "course-images",
    maxBytes: 10 * MEGABYTE,
    types: imageTypes,
  },
  "instructor-image": {
    label: "Instructor image",
    bucket: "instructor-images",
    maxBytes: 10 * MEGABYTE,
    types: imageTypes,
  },
  slide: {
    label: "Slide file",
    bucket: "lesson-resources",
    maxBytes: 20 * MEGABYTE,
    types: {
      ".key": "application/vnd.apple.keynote",
      ".pdf": "application/pdf",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    },
  },
  video: {
    label: "Video preview",
    bucket: "lesson-resources",
    maxBytes: MAX_UPLOAD_BYTES,
    types: {
      ".mov": "video/quicktime",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
    },
  },
};

const courseSelect = `
  *,
  course_objectives (id, objective, position),
  course_sections (
    id, title, position,
    course_lessons (
      id, title, position, youtube_url,
      lesson_resources (id, resource_type, name, url, storage_path, mime_type, size_bytes, position)
    )
  )
`;

function requireSupabase(res) {
  if (!supabase) {
    res.status(503).json({
      error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
    });
    return false;
  }
  return true;
}

function requireSupabaseAdmin(res) {
  if (!supabaseAdmin) {
    res.status(503).json({
      error: "Saving and uploads are not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
    });
    return false;
  }
  return true;
}

// Staff are marked in app_metadata, which only the service key can change.
// user_metadata is not used because members can write anything into it.
const ROLES = ["member", "instructor", "staff"];

function roleOf(user) {
  const role = user?.app_metadata?.role;
  return role === "staff" || role === "instructor" ? role : "member";
}

function isStaff(user) {
  return roleOf(user) !== "member";
}

async function requireStaff(req, res, next) {
  if (!requireSupabase(res)) return;
  const token = /^Bearer (.+)$/.exec(req.get("authorization") || "")?.[1];
  if (!token) {
    res.status(401).json({ error: "Sign in with a staff account to continue." });
    return;
  }
  const { data, error } = await supabase.auth.getUser(token);
  // Supabase answers 4xx for a bad sign-in; anything else means it could not check.
  if (error && !(error.status >= 400 && error.status < 500)) {
    res.status(503).json({ error: "We could not check your sign-in. Please try again in a moment." });
    return;
  }
  if (error || !data?.user) {
    res.status(401).json({ error: "Your sign-in has expired. Sign in again to continue." });
    return;
  }
  if (!isStaff(data.user)) {
    res.status(403).json({ error: "Only staff and instructor accounts can use the staff workspace." });
    return;
  }
  req.user = data.user;
  next();
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unexpected database error.";
}

function toCourse(row, includeExamAnswers = false) {
  const sections = [...(row.course_sections || [])].sort((a, b) => a.position - b.position);
  const lessonContent = sections.flatMap((section) =>
    [...(section.course_lessons || [])]
      .sort((a, b) => a.position - b.position)
      .map((lesson) => {
        const resources = [...(lesson.lesson_resources || [])]
          .sort((a, b) => a.position - b.position);
        return {
          title: lesson.title,
          section: section.title,
          slides: resources
            .filter((resource) => resource.resource_type === "slide")
            .map(({ name, url }) => ({ name, url })),
          video: resources.find((resource) => resource.resource_type === "video")
            ? resources
                .filter((resource) => resource.resource_type === "video")
                .map(({ name, url }) => ({ name, url }))[0]
            : undefined,
          youtubeUrl: lesson.youtube_url || undefined,
        };
      }),
  );

  return {
    id: row.id,
    title: row.title,
    desc: row.description,
    level: row.difficulty,
    lessons: lessonContent.length,
    duration: row.duration,
    instructor: row.instructor,
    instructorImage: row.instructor_image_url || undefined,
    image: row.image_url || "",
    category: row.category,
    status: row.status,
    objectives: [...(row.course_objectives || [])]
      .sort((a, b) => a.position - b.position)
      .map((item) => item.objective),
    sections: sections.map((section) => section.title),
    sampleLessons: lessonContent.slice(0, 3).map((lesson) => lesson.title),
    lessonContent,
    finalExam: (row.final_exam || []).map(({ prompt, options, correctIndex }) => ({
      prompt,
      options,
      ...(includeExamAnswers ? { correctIndex } : {}),
    })),
  };
}

function toCourseRow(input) {
  return {
    title: input.title.trim(),
    description: input.desc || "",
    difficulty: input.level || "Beginner",
    duration: input.duration || "Self-paced",
    instructor: input.instructor.trim(),
    instructor_image_url: input.instructorImage || null,
    image_url: input.image || null,
    category: input.category || "General",
    status: input.status || "draft",
    final_exam: input.finalExam || [],
  };
}

function isWebLink(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validateLessons(lessons, sections) {
  if (!Array.isArray(lessons)) return "Lessons must be an array.";
  const seenLessons = new Set();
  for (const lesson of lessons) {
    const title = String(lesson?.title || "").trim();
    const section = String(lesson?.section || "").trim();
    if (!title) return "Every lesson needs a title.";
    if (!sections.includes(section)) return `Lesson "${title}" needs a section that is part of this course.`;
    const lessonKey = JSON.stringify([section, title]);
    if (seenLessons.has(lessonKey)) return `Section "${section}" has more than one lesson called "${title}".`;
    seenLessons.add(lessonKey);

    const slides = lesson.slides ?? [];
    if (!Array.isArray(slides)) return `Slides for lesson "${title}" must be an array.`;
    const links = [
      ...slides.map((slide) => slide?.url),
      ...(lesson.video ? [lesson.video.url] : []),
      ...(lesson.youtubeUrl ? [lesson.youtubeUrl] : []),
    ];
    if (!links.every(isWebLink)) return `Lesson "${title}" has a file or video that is not a web link.`;
  }
  return null;
}

function validateCourse(input) {
  if (!input || typeof input !== "object") return "A course object is required.";
  if (typeof input.title !== "string" || !input.title.trim()) return "Course title is required.";
  if (input.status !== undefined && !["draft", "published"].includes(input.status)) {
    return "A course can only be saved as a draft or published.";
  }
  if (typeof input.instructor !== "string" || !input.instructor.trim()) return "Instructor is required.";
  if (!Array.isArray(input.sections)) return "Sections must be an array.";
  if (input.image && !isWebLink(input.image)) return "Course image must be a web link.";
  if (input.instructorImage && !isWebLink(input.instructorImage)) return "Instructor image must be a web link.";

  const sections = input.sections.map((section) => String(section).trim());
  if (sections.some((section) => !section)) return "Every section needs a title.";
  if (new Set(sections).size !== sections.length) return "Each section in a course needs a different title.";
  const exam = input.finalExam ?? [];
  if (!Array.isArray(exam)) return "Final exam questions must be a list.";
  if (input.status === "published" && exam.length === 0) return "Add at least one final exam question before publishing this course.";
  for (const [index, question] of exam.entries()) {
    if (!String(question?.prompt || "").trim() || !Array.isArray(question.options) || question.options.length < 2 || question.options.some((option) => !String(option).trim())) {
      return `Final exam question ${index + 1} needs a prompt and at least two answer choices.`;
    }
    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.options.length) {
      return `Choose the correct answer for final exam question ${index + 1}.`;
    }
  }
  return validateLessons(input.lessonContent ?? [], sections);
}

function sendFindError(res, error) {
  // An id that is not a valid UUID cannot belong to any course.
  if (error.code === "PGRST116" || error.code === "22P02") {
    res.status(404).json({ error: "Course not found." });
    return;
  }
  res.status(500).json({ error: getErrorMessage(error) });
}

function sendCourseWriteError(res, error) {
  if (error.code === "23505") {
    res.status(409).json({ error: "A course with this title already exists." });
    return;
  }
  res.status(500).json({ error: error.message });
}

async function findCourse(id, client = supabase, includeExamAnswers = false) {
  const { data, error } = await client
    .from("courses")
    .select(courseSelect)
    .eq("id", id)
    .single();
  if (error) throw error;
  return toCourse(data, includeExamAnswers);
}

async function saveChildren(courseId, input) {
  const objectives = (input.objectives || [])
    .map((objective, position) => ({ course_id: courseId, objective: String(objective).trim(), position }))
    .filter((item) => item.objective);
  if (objectives.length) {
    const { error } = await supabaseAdmin.from("course_objectives").insert(objectives);
    if (error) throw error;
  }

  for (const [sectionPosition, sectionTitle] of input.sections.entries()) {
    const title = String(sectionTitle).trim();
    const { data: section, error: sectionError } = await supabaseAdmin
      .from("course_sections")
      .insert({ course_id: courseId, title, position: sectionPosition })
      .select("id")
      .single();
    if (sectionError) throw sectionError;

    const sectionLessons = (input.lessonContent || [])
      .filter((lesson) => String(lesson.section).trim() === title);
    const lessons = sectionLessons
      .map((lesson, position) => ({
        section_id: section.id,
        title: String(lesson.title).trim(),
        position,
        youtube_url: lesson.youtubeUrl || null,
      }));
    if (!lessons.length) continue;

    const { data: savedLessons, error: lessonsError } = await supabaseAdmin
      .from("course_lessons")
      .insert(lessons)
      .select("id, title");
    if (lessonsError) throw lessonsError;

    for (const savedLesson of savedLessons) {
      const sourceLesson = sectionLessons.find((lesson) => String(lesson.title).trim() === savedLesson.title);
      const resources = [
        ...(sourceLesson?.slides || []).map((resource, position) => ({
          lesson_id: savedLesson.id,
          resource_type: "slide",
          name: resource.name,
          url: resource.url,
          position,
        })),
        ...(sourceLesson?.video ? [{
          lesson_id: savedLesson.id,
          resource_type: "video",
          name: sourceLesson.video.name,
          url: sourceLesson.video.url,
          position: 0,
        }] : []),
      ];
      if (resources.length) {
        const { error: resourcesError } = await supabaseAdmin.from("lesson_resources").insert(resources);
        if (resourcesError) throw resourcesError;
      }
    }
  }
}

async function replaceChildren(courseId, input) {
  const { error: objectivesError } = await supabaseAdmin.from("course_objectives").delete().eq("course_id", courseId);
  if (objectivesError) throw objectivesError;
  const { error: sectionsError } = await supabaseAdmin.from("course_sections").delete().eq("course_id", courseId);
  if (sectionsError) throw sectionsError;
  await saveChildren(courseId, input);
}

async function restoreCourse(courseId, previous) {
  try {
    const { error } = await supabaseAdmin.from("courses").update(toCourseRow(previous)).eq("id", courseId);
    if (error) throw error;
    await replaceChildren(courseId, previous);
    return true;
  } catch (error) {
    console.error(`Unable to restore course ${courseId}.`, error);
    return false;
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "elite-rc-backend", timestamp: new Date().toISOString() });
});

app.get("/api/status", async (req, res) => {
  if (!requireSupabase(res)) return;
  const { error } = await supabase.from("courses").select("id").limit(1);
  if (error) {
    res.status(500).json({ connected: false, message: error.message });
    return;
  }
  res.json({ connected: true, message: "Supabase is connected and responding." });
});

app.get("/api/courses", async (req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase
    .from("courses")
    .select(courseSelect)
    .eq("status", "published")
    .order("created_at", { ascending: true });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ courses: (data || []).map((row) => toCourse(row)) });
});

app.get("/api/courses/:id", async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    res.json({ course: await findCourse(req.params.id) });
  } catch (error) {
    sendFindError(res, error);
  }
});

app.post("/api/courses", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const validationError = validateCourse(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  const input = req.body;
  const { data, error } = await supabaseAdmin
    .from("courses")
    .insert({ ...toCourseRow(input), created_by: req.user.id })
    .select("id")
    .single();
  if (error) {
    sendCourseWriteError(res, error);
    return;
  }
  try {
    await saveChildren(data.id, input);
    res.status(201).json({ course: await findCourse(data.id, supabaseAdmin, true) });
  } catch (childError) {
    await supabaseAdmin.from("courses").delete().eq("id", data.id);
    res.status(500).json({ error: getErrorMessage(childError) });
  }
});

app.put("/api/courses/:id", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const validationError = validateCourse(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  const input = req.body;
  let previous;
  try {
    previous = await findCourse(req.params.id, supabaseAdmin, true);
  } catch (findError) {
    sendFindError(res, findError);
    return;
  }
  const { error } = await supabaseAdmin
    .from("courses")
    .update(toCourseRow(input))
    .eq("id", req.params.id);
  if (error) {
    sendCourseWriteError(res, error);
    return;
  }
  try {
    await replaceChildren(req.params.id, input);
    res.json({ course: await findCourse(req.params.id, supabaseAdmin, true) });
  } catch (childError) {
    console.error(`Unable to update course ${req.params.id}.`, childError);
    const restored = await restoreCourse(req.params.id, previous);
    res.status(500).json({
      error: restored
        ? "The course could not be updated, so the previous version was kept. Please try again."
        : "The course could not be updated and its previous content could not be restored. Check this course before editing it again.",
    });
  }
});

app.delete("/api/courses/:id", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const { error } = await supabaseAdmin.from("courses").delete().eq("id", req.params.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(204).end();
});

// Staff dashboard. These read across every member, so they use the secret key,
// and only after requireStaff has checked the request comes from staff.

// Supabase returns at most this many rows or accounts per request.
const PAGE_SIZE = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toMember(user) {
  return {
    id: user.id,
    email: user.email || "",
    name: String(user.user_metadata?.full_name || user.email?.split("@")[0] || "Member"),
    role: roleOf(user),
    joinedAt: user.created_at,
    lastSignInAt: user.last_sign_in_at || null,
  };
}

async function listAllUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
}

// Every course, drafts included, with who created it and when it last changed.
app.get("/api/staff/courses", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(courseSelect)
    .order("created_at", { ascending: true });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({
    courses: (data || []).map((row) => ({
      ...toCourse(row, true),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
});

app.get("/api/staff/members", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  try {
    res.json({ members: (await listAllUsers()).map(toMember) });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.get("/api/staff/progress", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const progress = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    // Ordering by the whole primary key keeps pages from overlapping.
    const { data, error } = await supabaseAdmin
      .from("lesson_progress")
      .select("user_id, course_id, lesson_key, completed_at")
      .order("completed_at")
      .order("user_id")
      .order("course_id")
      .order("lesson_key")
      .range(from, from + PAGE_SIZE - 1);
    // PGRST205 (or 42P01 on older projects) means the table does not exist yet.
    if (error && ["PGRST205", "42P01"].includes(error.code)) {
      res.status(503).json({
        error: "Learner progress is not set up in the database yet. Run supabase/003_lesson_progress.sql in the Supabase SQL editor to start saving it.",
      });
      return;
    }
    if (error) {
      res.status(500).json({ error: `Lesson progress could not be read. ${error.message}` });
      return;
    }
    progress.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  res.json({ progress });
});

// Only full staff choose who else is staff; instructors can look but not change.
app.put("/api/staff/members/:id/role", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  if (roleOf(req.user) !== "staff") {
    res.status(403).json({ error: "Only staff accounts can change someone's role." });
    return;
  }
  const role = req.body?.role;
  if (!ROLES.includes(role)) {
    res.status(400).json({ error: "Choose member, instructor, or staff." });
    return;
  }
  if (req.params.id === req.user.id) {
    res.status(400).json({ error: "You cannot change your own role. Ask another staff member to do it." });
    return;
  }
  if (!UUID_PATTERN.test(req.params.id)) {
    res.status(404).json({ error: "That account was not found." });
    return;
  }
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, {
    app_metadata: { role: role === "member" ? null : role },
  });
  if (error) {
    const notFound = error.status === 404;
    res.status(notFound ? 404 : 500).json({ error: notFound ? "That account was not found." : error.message });
    return;
  }
  res.json({ member: toMember(data.user) });
});

// Staff are checked before the file is read, so outsiders cannot send large bodies.
app.post("/api/uploads", requireStaff, express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const kindName = String(req.query.kind || "");
  if (!Object.hasOwn(uploadKinds, kindName)) {
    res.status(400).json({ error: "Unknown upload type." });
    return;
  }
  const kind = uploadKinds[kindName];
  const name = String(req.query.name || "").split(/[\\/]/).pop().trim();
  const extension = extname(name).toLowerCase();
  if (!Object.hasOwn(kind.types, extension)) {
    res.status(400).json({ error: `${kind.label} must be one of these file types: ${Object.keys(kind.types).join(", ")}.` });
    return;
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: `${name} is empty.` });
    return;
  }
  if (req.body.length > kind.maxBytes) {
    res.status(413).json({ error: `${kind.label} must be ${kind.maxBytes / MEGABYTE} MB or smaller.` });
    return;
  }
  // The stored name is generated, so a file name cannot overwrite or move another file.
  const path = `${kindName}/${randomUUID()}${extension}`;
  try {
    const bucket = supabaseAdmin.storage.from(kind.bucket);
    const { error } = await bucket.upload(path, req.body, { contentType: kind.types[extension] });
    if (error) throw error;
    res.status(201).json({ file: { name, url: bucket.getPublicUrl(path).data.publicUrl } });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = error.status || 500;
  const messages = {
    400: "The request could not be read.",
    413: "That is too large to send. Use a smaller file or less text.",
  };
  res.status(status).json({ error: messages[status] || "Unexpected server error." });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
