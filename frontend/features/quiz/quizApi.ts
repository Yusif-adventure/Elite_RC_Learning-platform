import { supabase } from "../../supabaseClient";
import { API_URL } from "../staff/courseApi";
import type { AttemptHistory, AttemptResult, LearnerFinalExam, LearnerQuiz } from "./quizState";

// Quizzes are only reached through the backend, which keeps the answer key
// until an attempt is submitted and works out every score.

async function request(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to take this quiz.");
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("We could not reach the quiz. Check your connection and try again.");
  }
  return response;
}

async function readError(response: Response) {
  const payload: { error?: string } = await response.json().catch(() => ({}));
  return new Error(payload.error || `The quiz service returned ${response.status}.`);
}

// null when the lesson has no quiz.
export async function loadLessonQuiz(lessonId: string): Promise<LearnerQuiz | null> {
  const response = await request(`/api/lessons/${encodeURIComponent(lessonId)}/assessment`);
  if (response.status === 404) return null;
  if (!response.ok) throw await readError(response);
  const payload: { assessment: LearnerQuiz } = await response.json();
  return payload.assessment;
}

// null when the course has no final exam. The API withholds the answer key.
export async function loadFinalExam(courseId: string): Promise<LearnerFinalExam | null> {
  const response = await request(`/api/courses/${encodeURIComponent(courseId)}/final-exam`);
  if (response.status === 404) return null;
  if (!response.ok) throw await readError(response);
  const payload: { exam: LearnerFinalExam } = await response.json();
  return payload.exam;
}

// The member's attempts, newest first, with the review of the newest one.
export async function loadAttemptHistory(quizId: string): Promise<AttemptHistory> {
  const response = await request(`/api/quizzes/${encodeURIComponent(quizId)}/attempts?review=latest`);
  if (!response.ok) throw await readError(response);
  return response.json();
}

export async function submitAttempt(quizId: string, answers: Record<string, string>): Promise<AttemptResult> {
  const response = await request(`/api/quizzes/${encodeURIComponent(quizId)}/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) throw await readError(response);
  return response.json();
}
