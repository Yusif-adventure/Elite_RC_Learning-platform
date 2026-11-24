// Instructor names on courses. Kept free of React so it can be tested alone.

// One course can name several instructors, such as "Ama Kusi, Kofi Mensah & Yaw Boateng".
export function splitInstructors(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/\s*(?:,|&|\/|\band\b)\s*/i)
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Courses that name this instructor, alone or alongside others.
export function coursesTaughtBy<Course extends { instructor: string }>(name: string, courses: Course[]): Course[] {
  return courses.filter((course) => splitInstructors(course.instructor).some((other) => sameName(other, name)));
}

// The instructor's photo, taken from a course they teach alone, since a
// shared course's photo may show someone else.
export function instructorPhoto(
  name: string,
  courses: { instructor: string; instructorImage?: string }[],
): string | undefined {
  return courses.find((course) => {
    const names = splitInstructors(course.instructor);
    return course.instructorImage && names.length === 1 && sameName(names[0], name);
  })?.instructorImage;
}
