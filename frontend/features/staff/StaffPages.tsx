import { useEffect, useState, type ReactNode } from "react";

type StaffPage = "admin" | "builder" | "preview" | "instructor";

export type CourseResource = {
  name: string;
  url: string;
};

export type StaffCourse = {
  title: string;
  desc: string;
  level: string;
  lessons: number;
  duration: string;
  instructor: string;
  instructorImage?: string;
  image: string;
  category: string;
  objectives: string[];
  sections: string[];
  sampleLessons: string[];
  lessonContent?: {
    title: string;
    section: string;
    slides: CourseResource[];
    video?: CourseResource;
    youtubeUrl?: string;
  }[];
};

type StaffPagesProps = {
  courses: StaffCourse[];
  onNavigate: (page: StaffPage, course?: StaffCourse) => void;
  onSaveCourse: (course: StaffCourse) => boolean;
  onDeleteCourse: (course: StaffCourse) => void;
  editingCourse?: StaffCourse;
};

type LessonDraft = {
  title: string;
  slides: CourseResource[];
  video?: CourseResource;
  youtubeUrl: string;
};

type SectionDraft = {
  title: string;
  lessons: LessonDraft[];
};

const MAX_VIDEO_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function readFile(file: File): Promise<CourseResource> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, url: String(reader.result) });
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^https?\/\//i.test(trimmed)) return trimmed.replace(/^https?/i, "https:");
  return `https://${trimmed}`;
}

function StaffButton({
  children,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline";
}) {
  return (
    <button type="button" className={`btn ${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}

function StaffShell({
  children,
  active,
  onNavigate,
}: {
  children: ReactNode;
  active: StaffPage;
  onNavigate: StaffPagesProps["onNavigate"];
}) {
  const [open, setOpen] = useState(false);
  const nav: [StaffPage, string, string][] = [
    ["admin", "Overview", "Manage the learning hub"],
    ["instructor", "Instructor workspace", "Create and teach courses"],
    ["builder", "Create course", "Build a learning path"],
  ];

  return (
    <div className="app-shell">
      <aside className={`side ${open ? "open" : ""}`}>
        <button className="brand" onClick={() => onNavigate("admin")}>
          <span className="brand-mark">✈</span>
          <span>
            <b>ELITE RC</b>
            <small>STAFF WORKSPACE</small>
          </span>
        </button>
        <div className="side-label">STAFF WORKSPACE</div>
        <nav>
          {nav.map(([page, label, description]) => (
            <button
              key={page}
              className={active === page ? "active" : ""}
              title={description}
              onClick={() => {
                onNavigate(page);
                setOpen(false);
              }}
            >
              <span aria-hidden="true">{page === "builder" ? "+" : "•"}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <span>AK</span>
          <div>
            <b>Ama Kusi</b>
            <small>Staff administrator</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-top">
          <button className="app-menu" onClick={() => setOpen(!open)}>
            Menu
          </button>
          <div>
            <span className="status-dot" />
            Staff tools
          </div>
          <button className="top-profile" onClick={() => onNavigate("admin")}>
            AK
          </button>
        </header>
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  );
}

export function StaffOverview({
  courses,
  onNavigate,
  onDeleteCourse,
}: StaffPagesProps) {
  return (
    <StaffShell active="admin" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">STAFF OVERVIEW</span>
          <h1>Learning hub control center</h1>
          <p>Manage courses, instructors, and student learning experiences.</p>
        </div>
        <StaffButton onClick={() => onNavigate("builder")}>
          Create new course
        </StaffButton>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Course management</h2>
            <p>Review published content and assign instructor ownership.</p>
          </div>
          <StaffButton
            variant="outline"
            onClick={() => onNavigate("instructor")}
          >
            Open instructor workspace
          </StaffButton>
        </div>
        {courses.map((course) => (
          <div className="skill-row" key={course.title}>
            <img src={course.image} alt="" />
            <div>
              <b>{course.title}</b>
              <span>
                {course.category} · {course.level} · {course.lessons} lessons
              </span>
            </div>
            <StaffButton
              variant="outline"
              onClick={() => onNavigate("builder", course)}
            >
              Edit
            </StaffButton>
            <StaffButton variant="outline" onClick={() => onDeleteCourse(course)}>
              Delete
            </StaffButton>
          </div>
        ))}
      </section>
    </StaffShell>
  );
}

export function InstructorWorkspace({
  courses,
  onNavigate,
  onDeleteCourse,
}: StaffPagesProps) {
  const [selectedInstructor, setSelectedInstructor] = useState("All instructors");
  const instructors = ["All instructors", ...new Set(courses.map((course) => course.instructor))];
  const assignedCourses =
    selectedInstructor === "All instructors"
      ? courses
      : courses.filter((course) => course.instructor === selectedInstructor);

  return (
    <StaffShell active="instructor" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">INSTRUCTOR WORKSPACE</span>
          <h1>Teach with clarity.</h1>
          <p>Organize your curriculum and keep every practical lesson moving.</p>
        </div>
        <StaffButton onClick={() => onNavigate("builder")}>
          Create lesson plan
        </StaffButton>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Instructor assignments</h2>
            <p>Filter courses by the instructor responsible for delivery.</p>
          </div>
          <select
            value={selectedInstructor}
            onChange={(event) => setSelectedInstructor(event.target.value)}
            aria-label="Filter by instructor"
          >
            {instructors.map((instructor) => (
              <option key={instructor}>{instructor}</option>
            ))}
          </select>
        </div>
        {assignedCourses.map((course) => (
          <div className="skill-row" key={course.title}>
            <img src={course.image} alt="" />
            <div>
              <b>{course.title}</b>
              <span>
                Instructor: {course.instructor} · {course.sections.length} sections
              </span>
            </div>
            <StaffButton
              variant="outline"
              onClick={() => onNavigate("builder", course)}
            >
              Edit course
            </StaffButton>
            <StaffButton variant="outline" onClick={() => onDeleteCourse(course)}>
              Delete
            </StaffButton>
          </div>
        ))}
      </section>
    </StaffShell>
  );
}

export function CourseBuilderPage({
  courses,
  onNavigate,
  onSaveCourse,
  editingCourse,
}: StaffPagesProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [instructor, setInstructor] = useState("");
  const [instructorImage, setInstructorImage] = useState("");
  const [courseImage, setCourseImage] = useState("");
  const [learningPoints, setLearningPoints] = useState<string[]>([""]);
  const [sections, setSections] = useState<SectionDraft[]>([
    {
      title: "",
      lessons: [{ title: "", slides: [], video: undefined, youtubeUrl: "" }],
    },
  ]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const validateFileSize = (file: File, maxBytes: number, label: string) => {
    if (file.size <= maxBytes) return true;
    setError(
      `${label} is too large. Choose a file smaller than ${Math.round(
        maxBytes / (1024 * 1024),
      )} MB.`,
    );
    return false;
  };

  useEffect(() => {
    if (!editingCourse) return;
    setTitle(editingCourse.title);
    setDescription(editingCourse.desc);
    setDifficulty(editingCourse.level);
    setInstructor(editingCourse.instructor);
    setInstructorImage(editingCourse.instructorImage ?? "");
    setCourseImage(editingCourse.image);
    setLearningPoints(editingCourse.objectives.length ? editingCourse.objectives : [""]);
    const savedLessons = editingCourse.lessonContent ?? [];
    setSections(
      editingCourse.sections.length
        ? editingCourse.sections.map((section) => ({
            title: section,
            lessons: savedLessons
              .filter((lesson) => lesson.section === section)
              .map((lesson) => ({
                title: lesson.title,
                slides: lesson.slides,
                video: lesson.video,
                youtubeUrl: lesson.youtubeUrl ?? "",
              })),
          }))
        : [{ title: "", lessons: [{ title: "", slides: [], video: undefined, youtubeUrl: "" }] }],
    );
  }, [editingCourse]);

  const addLearningPoint = () =>
    setLearningPoints((points) => [...points, ""]);
  const updateLearningPoint = (index: number, value: string) =>
    setLearningPoints((points) =>
      points.map((point, pointIndex) => (pointIndex === index ? value : point)),
    );
  const addSection = () =>
    setSections((current) => [
      ...current,
      {
        title: "",
        lessons: [{ title: "", slides: [], video: undefined, youtubeUrl: "" }],
      },
    ]);
  const updateSectionTitle = (index: number, value: string) =>
    setSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, title: value } : section,
      ),
    );
  const addLesson = (sectionIndex: number) =>
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              lessons: [
                ...section.lessons,
                {
                  title: "",
                  slides: [],
                  video: undefined,
                  youtubeUrl: "",
                },
              ],
            }
          : section,
      ),
    );
  const updateLesson = (
    sectionIndex: number,
    lessonIndex: number,
    update: Partial<LessonDraft>,
  ) =>
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              lessons: section.lessons.map((lesson, currentLessonIndex) =>
                currentLessonIndex === lessonIndex
                  ? { ...lesson, ...update }
                  : lesson,
              ),
            }
          : section,
      ),
    );
  return (
    <StaffShell active="builder" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">COURSE BUILDER</span>
          <h1>Create a course</h1>
          <p>Draft the course identity before adding lessons and resources.</p>
        </div>
        <StaffButton variant="outline" onClick={() => onNavigate("admin")}>
          Back to courses
        </StaffButton>
      </div>
      <section className="panel builder-form">
        <div className="builder-section-heading">
          <span className="badge">STEP 1</span>
          <div>
            <h2>Course details</h2>
            <p>Define how the course appears to students.</p>
          </div>
        </div>
        <label>
          Course title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Advanced Flight Tuning"
          />
        </label>
        <label>
          Short description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What practical outcome will students achieve?"
            rows={4}
          />
        </label>
        <label>
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>
        <label>
          Course instructor
          <input
            value={instructor}
            onChange={(event) => setInstructor(event.target.value)}
            placeholder="e.g. Daniel Mensah"
          />
        </label>
        <div className="builder-two-column">
          <label>
            Course instructor image
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!validateFileSize(file, MAX_IMAGE_BYTES, "Instructor image")) {
                  event.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setInstructorImage(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
            {instructorImage && <small>Instructor image selected</small>}
          </label>
          <label>
            Course image
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!validateFileSize(file, MAX_IMAGE_BYTES, "Course image")) {
                  event.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setCourseImage(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
            {courseImage && <small>Course image selected</small>}
          </label>
        </div>
        <div className="builder-list">
          <div className="builder-section-heading">
            <span className="badge">STEP 2</span>
            <div>
              <h2>What students will learn</h2>
              <p>Add the practical outcomes as clear points.</p>
            </div>
          </div>
          {learningPoints.map((point, index) => (
            <div className="builder-inline" key={`point-${index}`}>
              <input
                value={point}
                onChange={(event) => updateLearningPoint(index, event.target.value)}
                placeholder="e.g. Configure a safe RC aircraft power system"
              />
              {index === learningPoints.length - 1 && (
                <button className="text-link" type="button" onClick={addLearningPoint}>
                  + Add point
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="builder-list">
          <div className="builder-section-heading">
            <span className="badge">STEP 3</span>
            <div>
              <h2>Sections and lessons</h2>
              <p>Organize lessons and attach the resources students need.</p>
            </div>
          </div>
          {sections.map((section, sectionIndex) => (
            <div className="curriculum-builder-section" key={`section-${sectionIndex}`}>
              <label>
                Section {sectionIndex + 1} title
                <input
                  value={section.title}
                  onChange={(event) =>
                    updateSectionTitle(sectionIndex, event.target.value)
                  }
                  placeholder="e.g. Electronics and control systems"
                />
              </label>
              {section.lessons.map((lesson, lessonIndex) => (
                <div className="lesson-builder-card" key={`lesson-${lessonIndex}`}>
                  <label>
                    Lesson {lessonIndex + 1} title
                    <input
                      value={lesson.title}
                      onChange={(event) =>
                        updateLesson(sectionIndex, lessonIndex, {
                          title: event.target.value,
                        })
                      }
                      placeholder="e.g. Binding your transmitter"
                    />
                  </label>
                  <div className="builder-two-column">
                    <label>
                      Slides
                      <input
                        type="file"
                        accept=".pdf,.ppt,.pptx,.key"
                        multiple
                        onChange={async (event) => {
                          updateLesson(sectionIndex, lessonIndex, {
                            slides: await Promise.all(
                              Array.from(event.target.files ?? []).map(readFile),
                            ),
                          });
                        }}
                      />
                      {lesson.slides.length > 0 && (
                        <small>{lesson.slides.map((slide) => slide.name).join(", ")}</small>
                      )}
                    </label>
                    <label>
                      Short video preview
                      <input
                        type="file"
                        accept="video/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            if (!validateFileSize(file, MAX_VIDEO_BYTES, "Video preview")) {
                              event.target.value = "";
                              return;
                            }
                            updateLesson(sectionIndex, lessonIndex, {
                              video: await readFile(file),
                            });
                          }
                        }}
                      />
                      {lesson.video && <small>{lesson.video.name}</small>}
                      <small>Use an MP4 preview smaller than 5 MB for browser playback.</small>
                    </label>
                  </div>
                  <label>
                    Full video on YouTube
                    <input
                      type="url"
                      value={lesson.youtubeUrl}
                      onChange={(event) =>
                        updateLesson(sectionIndex, lessonIndex, {
                          youtubeUrl: event.target.value,
                        })
                      }
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <small>
                      Learners will see the short preview first, then use this
                      link to watch the complete video.
                    </small>
                  </label>
                </div>
              ))}
              <button
                className="text-link"
                type="button"
                onClick={() => addLesson(sectionIndex)}
              >
                + Add lesson to section
              </button>
            </div>
          ))}
          <StaffButton variant="outline" onClick={addSection}>
            + Add section
          </StaffButton>
        </div>
        <div className="builder-actions">
          <StaffButton
            onClick={() => {
              try {
                const lessonTitles = sections.flatMap((section) =>
                  section.lessons
                    .map((lesson) => lesson.title.trim())
                    .filter(Boolean),
                );
                const completedSections = sections
                  .map((section) => section.title.trim())
                  .filter(Boolean);

                if (!title.trim()) {
                  setError("Add a course title before saving.");
                  return;
                }

                setError("");
                const savedCourse = onSaveCourse({
                  title: title.trim(),
                  desc: description.trim(),
                  level: difficulty,
                  lessons: lessonTitles.length,
                  duration: "Self-paced",
                  instructor: instructor.trim() || "ELITE RC Instructor",
                  instructorImage: instructorImage || undefined,
                  image: courseImage || courses[0]?.image || "",
                  category: "New course",
                  objectives: learningPoints.map((point) => point.trim()).filter(Boolean),
                  sections: completedSections,
                  sampleLessons: lessonTitles.slice(0, 3),
                  lessonContent: sections.flatMap((section) =>
                    section.lessons
                      .filter((lesson) => lesson.title.trim())
                      .map((lesson) => ({
                        title: lesson.title.trim(),
                        section: section.title.trim() || "Course lessons",
                        slides: lesson.slides,
                        video: lesson.video,
                        youtubeUrl: lesson.youtubeUrl
                          ? normalizeLink(lesson.youtubeUrl)
                          : undefined,
                      })),
                  ),
                });
                if (savedCourse) {
                  setSaved(true);
                  return;
                }
                setError(
                  "The course could not be saved. The uploaded files may be too large for browser storage. Use a shorter, compressed video clip and try again.",
                );
              } catch (error) {
                console.error("Unable to save course.", error);
                setError(
                  "Something went wrong while saving this course. Check the course details and try again.",
                );
              }
            }}
          >
            Save course
          </StaffButton>
          {error && <span className="form-error" role="alert">{error}</span>}
          {saved && <span role="status">Draft saved locally for this session.</span>}
        </div>
      </section>
      <section className="panel">
        <h2>Existing course templates</h2>
        <p>Start from an existing curriculum when creating a related course.</p>
        <div className="course-grid">
          {courses.slice(0, 3).map((course) => (
            <button
              className="template-card"
              key={course.title}
              onClick={() => {
                setTitle(`${course.title} Workshop`);
                setDescription(course.desc);
              }}
            >
              <img src={course.image} alt="" />
              <b>{course.title}</b>
              <span>Use as template</span>
            </button>
          ))}
        </div>
      </section>
    </StaffShell>
  );
}

export function StaffCoursePreview({
  course,
  onNavigate,
}: {
  course: StaffCourse;
  onNavigate: StaffPagesProps["onNavigate"];
}) {
  return (
    <StaffShell active="preview" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">COURSE PREVIEW</span>
          <h1>{course.title}</h1>
          <p>Review the student-facing experience before publishing.</p>
        </div>
        <StaffButton variant="outline" onClick={() => onNavigate("admin")}>
          Back to courses
        </StaffButton>
      </div>
      <section className="panel preview-panel">
        <img src={course.image} alt="" />
        <div>
          <span className="badge">{course.level}</span>
          <h2>{course.title}</h2>
          <p>{course.desc}</p>
          <p>
            <b>Instructor:</b> {course.instructor}
          </p>
          <h3>Curriculum</h3>
          <ul>
            {course.sections.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
        </div>
      </section>
    </StaffShell>
  );
}
