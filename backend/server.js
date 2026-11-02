import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "1mb" }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

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

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unexpected database error.";
}

function toCourse(row) {
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
  };
}

function validateCourse(input) {
  if (!input || typeof input !== "object") return "A course object is required.";
  if (!String(input.title || "").trim()) return "Course title is required.";
  if (!String(input.instructor || "").trim()) return "Instructor is required.";
  if (!Array.isArray(input.sections)) return "Sections must be an array.";
  return null;
}

async function findCourse(id) {
  const { data, error } = await supabase
    .from("courses")
    .select(courseSelect)
    .eq("id", id)
    .single();
  if (error) throw error;
  return toCourse(data);
}

async function saveChildren(courseId, input) {
  const objectives = (input.objectives || [])
    .map((objective, position) => ({ course_id: courseId, objective: String(objective).trim(), position }))
    .filter((item) => item.objective);
  if (objectives.length) {
    const { error } = await supabase.from("course_objectives").insert(objectives);
    if (error) throw error;
  }

  for (const [sectionPosition, sectionTitle] of input.sections.entries()) {
    const { data: section, error: sectionError } = await supabase
      .from("course_sections")
      .insert({ course_id: courseId, title: String(sectionTitle).trim(), position: sectionPosition })
      .select("id")
      .single();
    if (sectionError) throw sectionError;

    const lessons = (input.lessonContent || [])
      .filter((lesson) => lesson.section === sectionTitle && String(lesson.title || "").trim())
      .map((lesson, position) => ({
        section_id: section.id,
        title: String(lesson.title).trim(),
        position,
        youtube_url: lesson.youtubeUrl || null,
      }));
    if (!lessons.length) continue;

    const { data: savedLessons, error: lessonsError } = await supabase
      .from("course_lessons")
      .insert(lessons)
      .select("id, title");
    if (lessonsError) throw lessonsError;

    for (const savedLesson of savedLessons) {
      const sourceLesson = input.lessonContent.find((lesson) => lesson.title === savedLesson.title && lesson.section === sectionTitle);
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
        const { error: resourcesError } = await supabase.from("lesson_resources").insert(resources);
        if (resourcesError) throw resourcesError;
      }
    }
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
    res.status(error.code === "PGRST116" ? 404 : 500).json({ error: getErrorMessage(error) });
  }
});

app.post("/api/courses", async (req, res) => {
  if (!requireSupabase(res)) return;
  const validationError = validateCourse(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  const input = req.body;
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: input.title.trim(),
      description: input.desc || "",
      difficulty: input.level || "Beginner",
      duration: input.duration || "Self-paced",
      instructor: input.instructor.trim(),
      instructor_image_url: input.instructorImage || null,
      image_url: input.image || null,
      category: input.category || "General",
      status: input.status || "draft",
    })
    .select("id")
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  try {
    await saveChildren(data.id, input);
    res.status(201).json({ course: await findCourse(data.id) });
  } catch (childError) {
    await supabase.from("courses").delete().eq("id", data.id);
    res.status(500).json({ error: getErrorMessage(childError) });
  }
});

app.put("/api/courses/:id", async (req, res) => {
  if (!requireSupabase(res)) return;
  const validationError = validateCourse(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  const input = req.body;
  const { error } = await supabase
    .from("courses")
    .update({
      title: input.title.trim(),
      description: input.desc || "",
      difficulty: input.level || "Beginner",
      duration: input.duration || "Self-paced",
      instructor: input.instructor.trim(),
      instructor_image_url: input.instructorImage || null,
      image_url: input.image || null,
      category: input.category || "General",
      status: input.status || "draft",
    })
    .eq("id", req.params.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const { error: deleteError } = await supabase.from("course_objectives").delete().eq("course_id", req.params.id);
  if (deleteError) {
    res.status(500).json({ error: deleteError.message });
    return;
  }
  const { error: sectionsError } = await supabase.from("course_sections").delete().eq("course_id", req.params.id);
  if (sectionsError) {
    res.status(500).json({ error: sectionsError.message });
    return;
  }
  try {
    await saveChildren(req.params.id, input);
    res.json({ course: await findCourse(req.params.id) });
  } catch (childError) {
    res.status(500).json({ error: getErrorMessage(childError) });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  if (!requireSupabase(res)) return;
  const { error } = await supabase.from("courses").delete().eq("id", req.params.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(204).end();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
