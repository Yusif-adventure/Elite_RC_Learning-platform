import { supabase } from "./supabaseClient";
import type { ProgressRow } from "./progress";

// "unavailable" means progress cannot be read, for example because
// supabase/003_lesson_progress.sql has not been run. The app then hides
// progress instead of failing.
export type ProgressState =
  | { status: "off" | "loading" | "ready"; rows: ProgressRow[] }
  | { status: "unavailable"; rows: ProgressRow[]; reason: string };

const TABLE = "lesson_progress";

export async function loadProgress(): Promise<ProgressState> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("course_id, lesson_key, completed_at");
  if (error) {
    console.warn("Lesson progress is unavailable:", error.message);
    return { status: "unavailable", rows: [], reason: error.message };
  }
  return { status: "ready", rows: data ?? [] };
}

export async function markLessonComplete(userId: string, courseId: string, lessonKey: string) {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, course_id: courseId, lesson_key: lessonKey },
      { onConflict: "user_id,course_id,lesson_key", ignoreDuplicates: true },
    );
  if (error) throw new Error(`Your progress could not be saved. ${error.message}`);
}

export async function markLessonNotDone(userId: string, courseId: string, lessonKey: string) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("lesson_key", lessonKey);
  if (error) throw new Error(`Your progress could not be saved. ${error.message}`);
}
