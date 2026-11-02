import type { CourseResource, StaffCourse } from "./StaffPages";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export type UploadKind = "course-image" | "instructor-image" | "slide" | "video";

async function send(path: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error("We could not reach the course service. Check your connection and try again.");
  }
  if (response.ok) return response;
  const payload: { error?: string } = await response.json().catch(() => ({}));
  throw new Error(payload.error || `The course service returned ${response.status}.`);
}

async function sendCourse(path: string, method: "POST" | "PUT", course: StaffCourse) {
  const response = await send(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(course),
  });
  const payload: { course: StaffCourse } = await response.json();
  return payload.course;
}

export function createCourse(course: StaffCourse) {
  return sendCourse("/api/courses", "POST", course);
}

export function updateCourse(course: StaffCourse) {
  return sendCourse(`/api/courses/${course.id}`, "PUT", course);
}

export async function removeCourse(course: StaffCourse) {
  await send(`/api/courses/${course.id}`, { method: "DELETE" });
}

export async function uploadFile(file: File, kind: UploadKind): Promise<CourseResource> {
  const query = new URLSearchParams({ kind, name: file.name });
  const response = await send(`/api/uploads?${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
  });
  const payload: { file: CourseResource } = await response.json();
  return payload.file;
}
