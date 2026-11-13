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

const quizSelect = `
  id, title,
  questions (id, question_text, explanation, position, answer_choices (id, choice_text, is_correct, position))
`;

// Staff also get each lesson quiz and the final exam, answer keys included,
// so the course builder can edit them. Learners never get this select.
const staffCourseSelect = `
  *,
  course_objectives (id, objective, position),
  final_exams (pass_mark, quizzes (${quizSelect})),
  course_sections (
    id, title, position,
    course_lessons (
      id, title, position, youtube_url,
      lesson_resources (id, resource_type, name, url, storage_path, mime_type, size_bytes, position),
      lesson_assessments (quizzes (${quizSelect}))
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

async function requireUser(req, res, next) {
  if (!requireSupabase(res)) return;
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error && !(error.status >= 400 && error.status < 500)) {
    res.status(503).json({ error: "We could not check your sign-in. Please try again in a moment." });
    return;
  }
  if (error || !data?.user) {
    res.status(401).json({ error: "Your sign-in has expired. Sign in again to continue." });
    return;
  }
  req.user = data.user;
  next();
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

// PostgREST embeds a one-to-one table as an object, or as a list on older versions.
function embeddedOne(value) {
  return (Array.isArray(value) ? value[0] : value) || null;
}

function savedQuiz(quiz) {
  const questions = quiz.questions || [];
  const choices = questions.flatMap((question) =>
    (question.answer_choices || []).map((choice) => ({ ...choice, question_id: question.id })),
  );
  return publicQuiz(quiz, [...questions], choices, true);
}

function toCourse(row) {
  const sections = [...(row.course_sections || [])].sort((a, b) => a.position - b.position);
  const finalExam = embeddedOne(row.final_exams);
  const lessonContent = sections.flatMap((section) =>
    [...(section.course_lessons || [])]
      .sort((a, b) => a.position - b.position)
      .map((lesson) => {
        const resources = [...(lesson.lesson_resources || [])]
          .sort((a, b) => a.position - b.position);
        const quiz = embeddedOne(lesson.lesson_assessments)?.quizzes;
        return {
          // Changes each time the course is saved. Learner pages use it to
          // load the lesson's quiz.
          id: lesson.id,
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
          ...(quiz ? { quiz: savedQuiz(quiz) } : {}),
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
    ...(finalExam?.quizzes
      ? { finalExam: { ...savedQuiz(finalExam.quizzes), passMark: Number(finalExam.pass_mark) } }
      : {}),
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
    if (lesson.quiz != null) {
      const quizProblem = validateQuiz(lesson.quiz, "lesson");
      if (quizProblem) return `Lesson "${title}" quiz: ${quizProblem}`;
    }
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
  const lessonProblem = validateLessons(input.lessonContent ?? [], sections);
  if (lessonProblem) return lessonProblem;
  if (input.finalExam != null) {
    const examProblem = validateQuiz(input.finalExam, "final");
    if (examProblem) return `Final exam: ${examProblem}`;
    return passMarkProblem(input.finalExam.passMark);
  }
  return null;
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

async function findCourse(id, client = supabase) {
  const { data, error } = await client
    .from("courses")
    .select(courseSelect)
    .eq("id", id)
    .single();
  if (error) throw error;
  return toCourse(data);
}

// Error codes for assessment tables that do not exist because
// supabase/004_assessments.sql was never run.
const MISSING_TABLE_CODES = ["PGRST200", "PGRST205", "42P01"];

const ASSESSMENTS_NOT_SET_UP =
  "Quizzes and final exams are not set up in the database yet. Run supabase/004_assessments.sql in the Supabase SQL editor, then save again.";

// Checked before a course with quizzes changes anything. Any other read error
// is left for the save itself to report.
async function assessmentTablesMissing(input) {
  const sendsAssessments = Boolean(input.finalExam) || (input.lessonContent || []).some((lesson) => lesson.quiz);
  if (!sendsAssessments) return false;
  const { error } = await supabaseAdmin.from("quizzes").select("id").limit(1);
  return MISSING_TABLE_CODES.includes(error?.code);
}

// Reads courses the way staff see them, with quizzes and answer keys. Until
// the assessment tables exist, staff still get their courses without quizzes.
async function readStaffCourses(narrow) {
  const run = (select) => narrow(supabaseAdmin.from("courses").select(select));
  const result = await run(staffCourseSelect);
  return MISSING_TABLE_CODES.includes(result.error?.code) ? run(courseSelect) : result;
}

async function findStaffCourse(id) {
  const { data, error } = await readStaffCourses((query) => query.eq("id", id).single());
  if (error) throw error;
  return toCourse(data);
}

function lessonKey(lesson) {
  return JSON.stringify([String(lesson.section).trim(), String(lesson.title).trim()]);
}

// Returns the new id of every lesson, keyed by its section and title.
async function saveChildren(courseId, input) {
  const lessonIds = new Map();
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
      lessonIds.set(lessonKey({ section: title, title: savedLesson.title }), savedLesson.id);
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
  return lessonIds;
}

async function replaceChildren(courseId, input) {
  const { error: objectivesError } = await supabaseAdmin.from("course_objectives").delete().eq("course_id", courseId);
  if (objectivesError) throw objectivesError;
  const { error: sectionsError } = await supabaseAdmin.from("course_sections").delete().eq("course_id", courseId);
  if (sectionsError) throw sectionsError;
  return saveChildren(courseId, input);
}

async function restoreCourse(courseId, previous, userId) {
  try {
    const { error } = await supabaseAdmin.from("courses").update(toCourseRow(previous)).eq("id", courseId);
    if (error) throw error;
    const lessonIds = await replaceChildren(courseId, previous);
    // Quizzes are only deleted after a save works, so the previous ones still exist.
    await saveCourseAssessments(courseId, previous, previous, lessonIds, userId);
    return true;
  } catch (error) {
    console.error(`Unable to restore course ${courseId}.`, error);
    return false;
  }
}

// Agreed assessment design: lesson quizzes have 10 to 25 questions and unlimited
// retakes; final exams have 50 questions, an 80% default pass mark and three attempts.
const DEFAULT_PASS_MARK = 80;
const FINAL_EXAM_ATTEMPTS = 3;
const QUESTION_LIMITS = {
  lesson: { min: 10, max: 25, message: "A lesson quiz needs 10 to 25 questions." },
  final: { min: 50, max: 50, message: "A final exam needs exactly 50 questions." },
};

function questionCountError(type, count) {
  const limits = QUESTION_LIMITS[type];
  return limits && (count < limits.min || count > limits.max) ? limits.message : null;
}

// A pass mark left out uses the default. A pass mark of 0 would pass everyone.
function passMarkProblem(passMark) {
  if (passMark === undefined) return null;
  return Number.isInteger(passMark) && passMark >= 1 && passMark <= 100
    ? null
    : "Pass mark must be a whole percentage from 1 to 100.";
}

// `type` is "lesson" or "final" when a whole assessment is saved, so the
// question count is checked. It is left out when a single question is checked.
function validateQuiz(input, type) {
  if (!input || typeof input !== "object") return "An assessment object is required.";
  if (input.title !== undefined && (typeof input.title !== "string" || !input.title.trim())) {
    return "Assessment title is required.";
  }
  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    return "An assessment needs at least one question.";
  }
  const countError = questionCountError(type, input.questions.length);
  if (countError) return countError;
  for (const [index, question] of input.questions.entries()) {
    if (typeof question?.questionText !== "string" || !question.questionText.trim()) {
      return `Question ${index + 1} needs question text.`;
    }
    if (!Array.isArray(question.choices) || question.choices.length < 2) {
      return `Question ${index + 1} needs at least two answer choices.`;
    }
    const correct = question.choices.filter((choice) => choice?.isCorrect === true);
    if (correct.length !== 1) {
      return `Question ${index + 1} must have exactly one correct answer.`;
    }
    if (question.choices.some((choice) => typeof choice?.text !== "string" || !choice.text.trim())) {
      return `Every answer choice for question ${index + 1} needs text.`;
    }
  }
  return null;
}

function publicQuiz(quiz, questions, choices, includeAnswers = false) {
  return {
    id: quiz.id,
    title: quiz.title,
    questions: questions
      .sort((a, b) => a.position - b.position)
      .map((question) => ({
        id: question.id,
        questionText: question.question_text,
        // Explanations usually give the answer away, so they travel with the answer key.
        ...(includeAnswers ? { explanation: question.explanation } : {}),
        position: question.position,
        choices: choices
          .filter((choice) => choice.question_id === question.id)
          .sort((a, b) => a.position - b.position)
          .map((choice) => ({
            id: choice.id,
            text: choice.choice_text,
            position: choice.position,
            ...(includeAnswers ? { isCorrect: choice.is_correct } : {}),
          })),
      })),
  };
}

async function readQuiz(quizId, includeAnswers = false) {
  const { data: quiz, error: quizError } = await supabaseAdmin
    .from("quizzes")
    .select("id, title")
    .eq("id", quizId)
    .single();
  if (quizError) throw quizError;
  const { data: questions, error: questionsError } = await supabaseAdmin
    .from("questions")
    .select("id, quiz_id, question_text, explanation, position")
    .eq("quiz_id", quizId)
    .order("position");
  if (questionsError) throw questionsError;
  const questionIds = (questions || []).map((question) => question.id);
  let choices = [];
  for (const questionId of questionIds) {
    const { data, error } = await supabaseAdmin
      .from("answer_choices")
      .select("id, question_id, choice_text, position, is_correct")
      .eq("question_id", questionId)
      .order("position");
    if (error) throw error;
    choices = choices.concat(data || []);
  }
  return publicQuiz(quiz, questions || [], choices, includeAnswers);
}

// Saves rows in order: a row sent with the id of one of `table`'s rows under
// `parent` is updated in place, any other row is added, and rows no longer
// sent are deleted. Keeping ids means learners' saved answers still point at
// the questions and choices they answered. Returns the saved ids in order.
async function saveOrderedRows(table, [parentColumn, parentId], rows) {
  const { data: existing, error: readError } = await supabaseAdmin
    .from(table)
    .select("id")
    .eq(parentColumn, parentId);
  if (readError) throw readError;
  const unused = new Set((existing || []).map((row) => row.id));
  const savedIds = [];
  for (const [position, { id, fields }] of rows.entries()) {
    if (unused.delete(id)) {
      const { error } = await supabaseAdmin.from(table).update({ ...fields, position }).eq("id", id);
      if (error) throw error;
      savedIds.push(id);
    } else {
      const { data, error } = await supabaseAdmin
        .from(table)
        .insert({ ...fields, [parentColumn]: parentId, position })
        .select("id")
        .single();
      if (error) throw error;
      savedIds.push(data.id);
    }
  }
  for (const id of unused) {
    const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
    if (error) throw error;
  }
  return savedIds;
}

async function saveQuizQuestions(quizId, questions) {
  const questionIds = await saveOrderedRows("questions", ["quiz_id", quizId], questions.map((question) => ({
    id: question.id,
    fields: {
      question_text: question.questionText.trim(),
      explanation: question.explanation?.trim() || null,
    },
  })));
  for (const [index, question] of questions.entries()) {
    await saveOrderedRows("answer_choices", ["question_id", questionIds[index]], question.choices.map((choice) => ({
      id: choice.id,
      fields: { choice_text: choice.text.trim(), is_correct: choice.isCorrect === true },
    })));
  }
}

async function updateQuiz(quizId, input, defaultTitle) {
  const { error } = await supabaseAdmin
    .from("quizzes")
    .update({ title: input.title?.trim() || defaultTitle })
    .eq("id", quizId);
  if (error) throw error;
  await saveQuizQuestions(quizId, input.questions);
}

async function createQuiz(input, userId, defaultTitle = "Assessment") {
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .insert({ title: input.title?.trim() || defaultTitle, created_by: userId })
    .select("id")
    .single();
  if (error) throw error;
  try {
    await saveQuizQuestions(data.id, input.questions);
    return data.id;
  } catch (error) {
    await supabaseAdmin.from("quizzes").delete().eq("id", data.id);
    throw error;
  }
}

// Saves the lesson quizzes and final exam sent with a course. Saving a course
// recreates its lessons, which drops their quiz links, so each quiz is linked
// again to its lesson's new row and edited in place: its id, unchanged
// questions, and learners' attempts all stay. `current` is the course as
// stored before this save (null for a new course), and `lessonIds` are the
// newly saved lessons, keyed by section and title. A lesson or course sent
// with no quiz details at all keeps what it had; null removes it.
// Returns the quizzes the course no longer uses, to delete once the save works.
async function saveCourseAssessments(courseId, input, current, lessonIds, userId) {
  const currentQuizIds = new Map((current?.lessonContent || [])
    .filter((lesson) => lesson.quiz)
    .map((lesson) => [lessonKey(lesson), lesson.quiz.id]));
  const unused = new Set(currentQuizIds.values());
  const created = [];
  const saveQuiz = async (quiz, defaultTitle) => {
    // Only this course's own quizzes can be edited through it.
    if (unused.delete(quiz.id)) {
      await updateQuiz(quiz.id, quiz, defaultTitle);
      return quiz.id;
    }
    const quizId = await createQuiz(quiz, userId, defaultTitle);
    created.push(quizId);
    return quizId;
  };

  try {
    for (const lesson of input.lessonContent || []) {
      let quizId = null;
      if (lesson.quiz) {
        quizId = await saveQuiz(lesson.quiz, "Lesson quiz");
      } else if (lesson.quiz === undefined) {
        const kept = currentQuizIds.get(lessonKey(lesson));
        if (unused.delete(kept)) quizId = kept;
      }
      if (!quizId) continue;
      const { error } = await supabaseAdmin
        .from("lesson_assessments")
        .insert({ lesson_id: lessonIds.get(lessonKey(lesson)), quiz_id: quizId });
      if (error) throw error;
    }

    const currentExam = current?.finalExam;
    if (input.finalExam === null && currentExam) {
      // Deleting the exam's quiz also deletes the exam.
      unused.add(currentExam.id);
    } else if (input.finalExam) {
      const passMark = Number(input.finalExam.passMark ?? DEFAULT_PASS_MARK);
      if (currentExam) {
        const { error } = await supabaseAdmin
          .from("final_exams")
          .update({ pass_mark: passMark })
          .eq("course_id", courseId);
        if (error) throw error;
        await updateQuiz(currentExam.id, input.finalExam, "Final exam");
      } else {
        const quizId = await createQuiz(input.finalExam, userId, "Final exam");
        created.push(quizId);
        const { error } = await supabaseAdmin
          .from("final_exams")
          .insert({ course_id: courseId, quiz_id: quizId, pass_mark: passMark });
        if (error) throw error;
      }
    }
  } catch (error) {
    for (const quizId of created) await supabaseAdmin.from("quizzes").delete().eq("id", quizId);
    throw error;
  }
  return [...unused];
}

// Removing a quiz also removes learners' attempts at it. A quiz that cannot be
// removed is left unlinked, which learners never see, so the save still stands.
async function removeQuizzes(quizIds) {
  for (const quizId of quizIds) {
    const { error } = await supabaseAdmin.from("quizzes").delete().eq("id", quizId);
    if (error) console.error(`Unable to remove quiz ${quizId}.`, error);
  }
}

async function readSingleReference(table, column, value) {
  const { data, error } = await supabaseAdmin.from(table).select("*").eq(column, value).single();
  if (error) throw error;
  return data;
}

async function assessmentForQuiz(quizId) {
  try {
    const lesson = await readSingleReference("lesson_assessments", "quiz_id", quizId);
    return { type: "lesson", lessonId: lesson.lesson_id };
  } catch (error) {
    if (error.code !== "PGRST116") throw error;
  }
  const finalExam = await readSingleReference("final_exams", "quiz_id", quizId);
  return { type: "final", courseId: finalExam.course_id, passMark: Number(finalExam.pass_mark) };
}

function sendAssessmentError(res, error) {
  if (error.code === "23505") {
    res.status(409).json({ error: "That assessment already exists." });
    return;
  }
  if (error.code === "23503" || error.code === "PGRST116" || error.code === "22P02") {
    res.status(404).json({ error: "Assessment or course content was not found." });
    return;
  }
  res.status(500).json({ error: getErrorMessage(error) });
}

async function createLessonAssessment(req, res) {
  if (!requireSupabaseAdmin(res)) return;
  const validationError = validateQuiz(req.body, "lesson");
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  try {
    const quizId = await createQuiz(req.body, req.user.id);
    const { error } = await supabaseAdmin.from("lesson_assessments").insert({
      lesson_id: req.params.lessonId,
      quiz_id: quizId,
    });
    if (error) throw error;
    res.status(201).json({ assessment: await readQuiz(quizId, true) });
  } catch (error) {
    sendAssessmentError(res, error);
  }
}

async function createFinalExam(req, res) {
  if (!requireSupabaseAdmin(res)) return;
  const validationError = validateQuiz(req.body, "final") || passMarkProblem(req.body?.passMark);
  const passMark = Number(req.body?.passMark ?? DEFAULT_PASS_MARK);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  try {
    const quizId = await createQuiz(req.body, req.user.id);
    const { error } = await supabaseAdmin.from("final_exams").insert({
      course_id: req.params.courseId,
      quiz_id: quizId,
      pass_mark: passMark,
    });
    if (error) throw error;
    res.status(201).json({ exam: { ...(await readQuiz(quizId, true)), passMark } });
  } catch (error) {
    sendAssessmentError(res, error);
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
  res.json({ courses: (data || []).map(toCourse) });
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
  if (await assessmentTablesMissing(req.body)) {
    res.status(503).json({ error: ASSESSMENTS_NOT_SET_UP });
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
    const lessonIds = await saveChildren(data.id, input);
    await saveCourseAssessments(data.id, input, null, lessonIds, req.user.id);
    res.status(201).json({ course: await findStaffCourse(data.id) });
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
  if (await assessmentTablesMissing(req.body)) {
    res.status(503).json({ error: ASSESSMENTS_NOT_SET_UP });
    return;
  }
  const input = req.body;
  let previous;
  try {
    previous = await findStaffCourse(req.params.id);
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
    const lessonIds = await replaceChildren(req.params.id, input);
    const unusedQuizIds = await saveCourseAssessments(req.params.id, input, previous, lessonIds, req.user.id);
    await removeQuizzes(unusedQuizIds);
    res.json({ course: await findStaffCourse(req.params.id) });
  } catch (childError) {
    console.error(`Unable to update course ${req.params.id}.`, childError);
    const restored = await restoreCourse(req.params.id, previous, req.user.id);
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

// Members only reach assessments in published courses. Staff also see drafts,
// and get the answer key and explanations so they can check them.
async function courseStatusForLesson(lessonId) {
  const lesson = await readSingleReference("course_lessons", "id", lessonId);
  const section = await readSingleReference("course_sections", "id", lesson.section_id);
  const course = await readSingleReference("courses", "id", section.course_id);
  return course.status;
}

app.get("/api/lessons/:lessonId/assessment", requireUser, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const staff = isStaff(req.user);
  try {
    if (!staff && (await courseStatusForLesson(req.params.lessonId)) !== "published") {
      res.status(404).json({ error: "This lesson does not have an assessment." });
      return;
    }
    const assessment = await readSingleReference("lesson_assessments", "lesson_id", req.params.lessonId);
    res.json({ assessment: await readQuiz(assessment.quiz_id, staff) });
  } catch (error) {
    if (error.code === "PGRST116") {
      res.status(404).json({ error: "This lesson does not have an assessment." });
      return;
    }
    sendAssessmentError(res, error);
  }
});

app.get("/api/courses/:courseId/final-exam", requireUser, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const staff = isStaff(req.user);
  try {
    const course = await readSingleReference("courses", "id", req.params.courseId);
    if (!staff && course.status !== "published") {
      res.status(404).json({ error: "This course does not have a final exam." });
      return;
    }
    if (!staff && !(await courseContentComplete(req.user.id, req.params.courseId))) {
      res.status(403).json({ error: "Complete all course lessons before opening the final exam." });
      return;
    }
    const exam = await readSingleReference("final_exams", "course_id", req.params.courseId);
    res.json({ exam: { ...(await readQuiz(exam.quiz_id, staff)), passMark: Number(exam.pass_mark) } });
  } catch (error) {
    if (error.code === "PGRST116") {
      res.status(404).json({ error: "This course does not have a final exam." });
      return;
    }
    sendAssessmentError(res, error);
  }
});

// Final exams unlock only after every lesson in the course has been marked
// complete. Staff can preview exams without learner progress.
async function courseContentComplete(userId, courseId) {
  const [{ data: sections, error: sectionsError }, { data: progress, error: progressError }] = await Promise.all([
    supabaseAdmin.from("course_sections").select("title, course_lessons(title)").eq("course_id", courseId),
    supabaseAdmin.from("lesson_progress").select("lesson_key").eq("user_id", userId).eq("course_id", courseId),
  ]);
  if (sectionsError) throw sectionsError;
  if (progressError) throw progressError;
  const lessons = (sections || []).flatMap((section) =>
    (section.course_lessons || []).map((lesson) => JSON.stringify([section.title, lesson.title])),
  );
  if (!lessons.length) return false;
  const completed = new Set((progress || []).map((row) => row.lesson_key));
  return lessons.every((key) => completed.has(key));
}

app.post("/api/lessons/:lessonId/assessment", requireStaff, createLessonAssessment);
app.post("/api/courses/:courseId/final-exam", requireStaff, createFinalExam);

app.put("/api/courses/:courseId/final-exam", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const validationError = validateQuiz(req.body, "final") || passMarkProblem(req.body?.passMark);
  const passMark = Number(req.body?.passMark ?? DEFAULT_PASS_MARK);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  try {
    const exam = await readSingleReference("final_exams", "course_id", req.params.courseId);
    const { error: examError } = await supabaseAdmin
      .from("final_exams")
      .update({ pass_mark: passMark })
      .eq("course_id", req.params.courseId);
    if (examError) throw examError;
    const { error: quizError } = await supabaseAdmin
      .from("quizzes")
      .update({ title: req.body.title?.trim() || "Final exam" })
      .eq("id", exam.quiz_id);
    if (quizError) throw quizError;
    await saveQuizQuestions(exam.quiz_id, req.body.questions);
    res.json({ exam: { ...(await readQuiz(exam.quiz_id, true)), passMark } });
  } catch (error) {
    sendAssessmentError(res, error);
  }
});

app.put("/api/quizzes/:quizId", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  try {
    const { type } = await assessmentForQuiz(req.params.quizId);
    const validationError = validateQuiz(req.body, type);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    const { error } = await supabaseAdmin
      .from("quizzes")
      .update({ title: req.body.title?.trim() || "Assessment" })
      .eq("id", req.params.quizId);
    if (error) throw error;
    await saveQuizQuestions(req.params.quizId, req.body.questions);
    res.json({ assessment: await readQuiz(req.params.quizId, true) });
  } catch (error) {
    sendAssessmentError(res, error);
  }
});

app.put("/api/quizzes/:quizId/questions/reorder", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  if (!Array.isArray(req.body?.questionIds) || req.body.questionIds.length === 0) {
    res.status(400).json({ error: "Question IDs must be a non-empty array." });
    return;
  }
  try {
    for (const [position, id] of req.body.questionIds.entries()) {
      const { error } = await supabaseAdmin.from("questions").update({ position }).eq("id", id).eq("quiz_id", req.params.quizId);
      if (error) throw error;
    }
    res.json({ assessment: await readQuiz(req.params.quizId, true) });
  } catch (error) {
    sendAssessmentError(res, error);
  }
});

async function countQuestions(quizId) {
  const { data, error } = await supabaseAdmin.from("questions").select("id").eq("quiz_id", quizId);
  if (error) throw error;
  return (data || []).length;
}

app.post("/api/quizzes/:quizId/questions", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const validationError = validateQuiz({ questions: [req.body] });
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  try {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("questions")
      .select("position")
      .eq("quiz_id", req.params.quizId)
      .order("position", { ascending: false })
      .limit(1);
    if (existingError) throw existingError;
    const { type } = await assessmentForQuiz(req.params.quizId);
    if ((await countQuestions(req.params.quizId)) + 1 > QUESTION_LIMITS[type].max) {
      res.status(400).json({ error: QUESTION_LIMITS[type].message });
      return;
    }
    const position = existing?.length ? existing[0].position + 1 : 0;
    const { data: question, error: questionError } = await supabaseAdmin
      .from("questions")
      .insert({
        quiz_id: req.params.quizId,
        question_text: req.body.questionText.trim(),
        explanation: req.body.explanation?.trim() || null,
        position,
      })
      .select("id")
      .single();
    if (questionError) throw questionError;
    const { error: choicesError } = await supabaseAdmin.from("answer_choices").insert(
      req.body.choices.map((choice, choicePosition) => ({
        question_id: question.id,
        choice_text: choice.text.trim(),
        is_correct: choice.isCorrect === true,
        position: choicePosition,
      })),
    );
    if (choicesError) throw choicesError;
    res.status(201).json({ assessment: await readQuiz(req.params.quizId, true) });
  } catch (error) {
    sendAssessmentError(res, error);
  }
});

app.put("/api/questions/:questionId", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const validationError = validateQuiz({ questions: [req.body] });
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  try {
    const { data: question, error: findError } = await supabaseAdmin
      .from("questions")
      .select("quiz_id")
      .eq("id", req.params.questionId)
      .single();
    if (findError) throw findError;
    const { error: updateError } = await supabaseAdmin
      .from("questions")
      .update({
        question_text: req.body.questionText.trim(),
        explanation: req.body.explanation?.trim() || null,
      })
      .eq("id", req.params.questionId);
    if (updateError) throw updateError;
    await saveOrderedRows("answer_choices", ["question_id", req.params.questionId], req.body.choices.map((choice) => ({
      id: choice.id,
      fields: { choice_text: choice.text.trim(), is_correct: choice.isCorrect === true },
    })));
    res.json({ assessment: await readQuiz(question.quiz_id, true) });
  } catch (error) {
    sendAssessmentError(res, error);
  }
});

app.delete("/api/questions/:questionId", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  try {
    const question = await readSingleReference("questions", "id", req.params.questionId);
    const { type } = await assessmentForQuiz(question.quiz_id);
    if ((await countQuestions(question.quiz_id)) - 1 < QUESTION_LIMITS[type].min) {
      res.status(400).json({ error: QUESTION_LIMITS[type].message });
      return;
    }
    const { error } = await supabaseAdmin.from("questions").delete().eq("id", req.params.questionId);
    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    sendAssessmentError(res, error);
  }
});

app.delete("/api/quizzes/:quizId", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const { error } = await supabaseAdmin.from("quizzes").delete().eq("id", req.params.quizId);
  if (error) {
    sendAssessmentError(res, error);
    return;
  }
  res.status(204).end();
});

// Members only reach assessments in published courses; staff reach every one.
async function canReachAssessment(user, assessment) {
  if (isStaff(user)) return true;
  const status = assessment.type === "lesson"
    ? await courseStatusForLesson(assessment.lessonId)
    : (await readSingleReference("courses", "id", assessment.courseId)).status;
  return status === "published";
}

// What a learner sees after submitting: for each question they answered, their
// choice, the correct choice, and the explanation. `quiz` must include the
// answer key. Questions added since the attempt are left out, and so are
// questions whose correct answer cannot be found.
function reviewAnswers(quiz, answers) {
  return quiz.questions.flatMap((question) => {
    const selectedChoiceId = answers?.[question.id];
    const correctChoice = question.choices.find((choice) => choice.isCorrect);
    if (typeof selectedChoiceId !== "string" || !correctChoice) return [];
    return [{
      questionId: question.id,
      selectedChoiceId,
      correctChoiceId: correctChoice.id,
      correct: selectedChoiceId === correctChoice.id,
      explanation: question.explanation,
    }];
  });
}

// The signed-in member's attempts at a quiz, newest first, so results follow
// them to any browser or device. `?review=latest` adds the review of the
// newest attempt, which is the only way to see answers again after a refresh.
app.get("/api/quizzes/:quizId/attempts", requireUser, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  try {
    const assessment = await assessmentForQuiz(req.params.quizId);
    if (!(await canReachAssessment(req.user, assessment))) {
      res.status(404).json({ error: "Assessment or course content was not found." });
      return;
    }
    const { data, error } = await supabaseAdmin
      .from("assessment_attempts")
      .select("id, attempt_number, score, passed, submitted_at, answers")
      .eq("user_id", req.user.id)
      .eq("quiz_id", req.params.quizId)
      .order("attempt_number", { ascending: false });
    if (error) throw error;
    const rows = [...(data || [])].sort((a, b) => b.attempt_number - a.attempt_number);
    const review = req.query.review === "latest" && rows.length
      ? reviewAnswers(await readQuiz(req.params.quizId, true), rows[0].answers)
      : null;
    res.json({
      attempts: rows.map(({ answers: _answers, ...attempt }) => ({ ...attempt, score: Number(attempt.score) })),
      attemptsRemaining: assessment.type === "final" ? Math.max(0, FINAL_EXAM_ATTEMPTS - rows.length) : null,
      review,
    });
  } catch (error) {
    sendAssessmentError(res, error);
  }
});

// Records the completion and issues the one certificate for this member and
// course. Running it again returns the certificate that already exists.
async function completeCourse(userId, courseId) {
  const { error: completionError } = await supabaseAdmin
    .from("course_completions")
    .insert({ user_id: userId, course_id: courseId });
  if (completionError && completionError.code !== "23505") throw completionError;
  const { data: created, error: certificateError } = await supabaseAdmin
    .from("certificates")
    .insert({ user_id: userId, course_id: courseId })
    .select("id, certificate_identifier, issued_at")
    .single();
  if (!certificateError) return created;
  if (certificateError.code !== "23505") throw certificateError;
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("id, certificate_identifier, issued_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();
  if (error) throw error;
  return data;
}

app.post("/api/quizzes/:quizId/attempts", requireUser, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  try {
    const assessment = await assessmentForQuiz(req.params.quizId);
    if (!(await canReachAssessment(req.user, assessment))) {
      res.status(404).json({ error: "Assessment or course content was not found." });
      return;
    }
    if (assessment.type === "final" && !isStaff(req.user) && !(await courseContentComplete(req.user.id, assessment.courseId))) {
      res.status(403).json({ error: "Complete all course lessons before submitting the final exam." });
      return;
    }
    const quiz = await readQuiz(req.params.quizId, true);
    const answers = req.body?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      res.status(400).json({ error: "Answers must be an object keyed by question ID." });
      return;
    }
    const answerRows = [];
    for (const question of quiz.questions) {
      const selectedId = answers[question.id];
      const selected = question.choices.find((choice) => choice.id === selectedId);
      if (!selected) {
        res.status(400).json({ error: "Answer every question before submitting." });
        return;
      }
      answerRows.push({ question, selected });
    }

    const { data: previousAttempts, error: attemptsError } = await supabaseAdmin
      .from("assessment_attempts")
      .select("attempt_number, passed")
      .eq("user_id", req.user.id)
      .eq("quiz_id", req.params.quizId)
      .order("attempt_number", { ascending: false });
    if (attemptsError) throw attemptsError;
    const attempts = previousAttempts || [];
    if (assessment.type === "final" && (attempts.length >= FINAL_EXAM_ATTEMPTS || attempts.some((attempt) => attempt.passed))) {
      res.status(409).json({ error: "The final exam attempt limit has been reached or the exam was already passed." });
      return;
    }
    const score = Math.round(
      (answerRows.filter(({ selected }) => selected.isCorrect).length / answerRows.length) * 10000,
    ) / 100;
    const passed = assessment.type === "lesson" ? score === 100 : score >= assessment.passMark;
    const attemptNumber = attempts.length + 1;
    const { data: attempt, error: insertError } = await supabaseAdmin
      .from("assessment_attempts")
      .insert({
        user_id: req.user.id,
        quiz_id: req.params.quizId,
        assessment_type: assessment.type,
        attempt_number: attemptNumber,
        answers,
        score,
        passed,
      })
      .select("id, attempt_number, score, passed, submitted_at")
      .single();
    if (insertError) throw insertError;

    let certificate = null;
    if (assessment.type === "final" && passed) {
      try {
        certificate = await completeCourse(req.user.id, assessment.courseId);
      } catch (error) {
        // A submission that could not be finished must not use up an attempt.
        // No earlier attempt passed (that is refused above), so no completion
        // should exist for this course either.
        await supabaseAdmin.from("assessment_attempts").delete().eq("id", attempt.id);
        await supabaseAdmin
          .from("course_completions")
          .delete()
          .eq("user_id", req.user.id)
          .eq("course_id", assessment.courseId);
        throw error;
      }
    }

    res.status(201).json({
      attempt,
      attemptsRemaining: assessment.type === "final" ? FINAL_EXAM_ATTEMPTS - attemptNumber : null,
      passed,
      certificate,
      review: reviewAnswers(quiz, answers),
    });
  } catch (error) {
    sendAssessmentError(res, error);
  }
});

app.get("/api/staff/certificates/:identifier", requireStaff, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("id, user_id, course_id, certificate_identifier, issued_at")
    .eq("certificate_identifier", req.params.identifier)
    .single();
  if (error?.code === "PGRST116") {
    res.status(404).json({ error: "Certificate not found.", valid: false });
    return;
  }
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ valid: true, certificate: data });
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
  const { data, error } = await readStaffCourses((query) => query.order("created_at", { ascending: true }));
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({
    courses: (data || []).map((row) => ({
      ...toCourse(row),
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
