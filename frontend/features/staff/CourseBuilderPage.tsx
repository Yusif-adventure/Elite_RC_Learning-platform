import { useState, type DragEvent, type ReactNode } from "react";
import { CATEGORY_NAMES } from "../../categories";
import { uploadFile, type UploadKind } from "./courseApi";
import { Field, FormIcon, RemoveButton } from "./formParts";
import { QuizEditor, type QuizChange } from "./QuizEditor";
import {
  emptyFinalExam,
  emptyQuiz,
  finalExamDraftFrom,
  finalExamFromDraft,
  passMarkProblem,
  quizDraftFrom,
  quizFromDraft,
  quizProblem,
  type FinalExamDraft,
  type QuizDraft,
} from "./quizDrafts";
import { StaffButton, StaffShell } from "./StaffPages";
import type {
  CourseResource,
  StaffCourse,
  StaffPagesProps,
} from "./StaffPages";
import "./courseBuilder.css";

const MEGABYTE = 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * MEGABYTE;
const MAX_VIDEO_BYTES = 50 * MEGABYTE;
const MAX_SLIDE_BYTES = 20 * MEGABYTE;
const IMAGE_TYPES = ".png,.jpg,.jpeg,.webp,.gif";
const IMAGE_HINT = "PNG, JPG, WEBP or GIF, up to 10 MB";
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const DEFAULT_INSTRUCTOR = "ELITE RC Instructor";
const YOUTUBE_LINK =
  /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/\S+$/i;

type LessonDraft = {
  id: number;
  title: string;
  slides: CourseResource[];
  video?: CourseResource;
  youtubeUrl: string;
  quiz: QuizDraft | null;
};

type SectionDraft = {
  id: number;
  title: string;
  lessons: LessonDraft[];
};

let lastDraftId = 0;
function newDraftId() {
  lastDraftId += 1;
  return lastDraftId;
}

function emptyLesson(): LessonDraft {
  return {
    id: newDraftId(),
    title: "",
    slides: [],
    video: undefined,
    youtubeUrl: "",
    quiz: null,
  };
}

function emptySection(): SectionDraft {
  return { id: newDraftId(), title: "", lessons: [emptyLesson()] };
}

function draftsFromCourse(course: StaffCourse): SectionDraft[] {
  if (!course.sections.length) return [emptySection()];
  const savedLessons = course.lessonContent ?? [];
  return course.sections.map((section) => ({
    id: newDraftId(),
    title: section,
    lessons: savedLessons
      .filter((lesson) => lesson.section === section)
      .map((lesson) => ({
        id: newDraftId(),
        title: lesson.title,
        slides: lesson.slides,
        video: lesson.video,
        youtubeUrl: lesson.youtubeUrl ?? "",
        quiz: lesson.quiz ? quizDraftFrom(lesson.quiz) : null,
      })),
  }));
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^https?\/\//i.test(trimmed))
    return trimmed.replace(/^https?/i, "https:");
  return `https://${trimmed}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function lessonHasContent(lesson: LessonDraft) {
  return Boolean(
    lesson.title.trim() ||
    lesson.slides.length ||
    lesson.video ||
    lesson.youtubeUrl.trim() ||
    lesson.quiz,
  );
}

// Removing a quiz that has anything in it asks first, since saving the course
// then deletes it along with learners' results.
function quizHasContent(quiz: QuizDraft) {
  return Boolean(
    quiz.id ||
    quiz.questions.some(
      (question) =>
        question.questionText.trim() ||
        question.explanation.trim() ||
        question.choices.some((choice) => choice.text.trim()),
    ),
  );
}

const lessonQuizName = (lesson: LessonDraft) => `Lesson "${lesson.title.trim()}" quiz`;

function lessonHasBadLink(lesson: LessonDraft) {
  const link = lesson.youtubeUrl.trim();
  return Boolean(link) && !YOUTUBE_LINK.test(link);
}

function FormStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="form-step">
      <span className="form-step-number">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function FileField({
  label,
  hint,
  accept,
  multiple = false,
  replacing = false,
  onFiles,
  children,
}: {
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  replacing?: boolean;
  onFiles: (files: File[]) => Promise<void>;
  children?: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const takeFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      await onFiles(multiple ? files : files.slice(0, 1));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    void takeFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="file-field">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="field-name">{label}</span>
        <input
          className="file-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            // Clearing the input lets staff pick the same file again after a failure.
            event.target.value = "";
            void takeFiles(files);
          }}
        />
        <span
          className={`file-drop${dragging ? " dragging" : ""}${uploading ? " uploading" : ""}`}
        >
          <span className="file-drop-icon">
            <FormIcon name="upload" />
          </span>
          <span>
            {uploading ? (
              "Uploading..."
            ) : (
              <>
                Drag {replacing ? "a new file" : multiple ? "files" : "a file"}{" "}
                here or <u>browse</u>
              </>
            )}
          </span>
          <small>{hint}</small>
        </span>
      </label>
      {children}
    </div>
  );
}

function FileRow({
  file,
  onRemove,
}: {
  file: CourseResource;
  onRemove: () => void;
}) {
  return (
    <div className="file-row">
      <FormIcon name="file" />
      <a href={file.url} target="_blank" rel="noreferrer">
        {file.name}
      </a>
      <RemoveButton label={`Remove ${file.name}`} onClick={onRemove}>
        <FormIcon name="close" size={16} />
      </RemoveButton>
    </div>
  );
}

function CoursePreview({
  title,
  description,
  difficulty,
  category,
  instructor,
  image,
  usesSampleImage,
  sectionCount,
  lessonCount,
  fileCount,
}: {
  title: string;
  description: string;
  difficulty: string;
  category: string;
  instructor: string;
  image: string;
  usesSampleImage: boolean;
  sectionCount: number;
  lessonCount: number;
  fileCount: number;
}) {
  return (
    <section className="form-preview">
      <span className="eyebrow">LEARNER PREVIEW</span>
      <article className="course-card">
        <div className="course-image">
          {image ? (
            <img src={image} alt="" />
          ) : (
            <div className="form-cover-empty">Course image</div>
          )}
          <span className="badge">{difficulty}</span>
        </div>
        <div className="course-body">
          <span className="category">{category || "Category"}</span>
          <h3>{title.trim() || "Your course title"}</h3>
          <p>
            {description.trim() ||
              "A short description of what learners will achieve."}
          </p>
          <div className="course-meta">
            <span>
              <FormIcon name="user" size={15} />
              {instructor.trim() || DEFAULT_INSTRUCTOR}
            </span>
            <span>
              <FormIcon name="book" size={15} />
              {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
            </span>
          </div>
        </div>
      </article>
      {usesSampleImage && (
        <small className="form-preview-note">
          This picture is used until you add a course image.
        </small>
      )}
      <div className="form-summary">
        <span>
          <b>{sectionCount}</b> {sectionCount === 1 ? "section" : "sections"}
        </span>
        <span>
          <b>{lessonCount}</b> {lessonCount === 1 ? "lesson" : "lessons"}
        </span>
        <span>
          <b>{fileCount}</b> {fileCount === 1 ? "file" : "files"}
        </span>
      </div>
    </section>
  );
}

export function CourseBuilderPage({
  courses,
  onNavigate,
  onSaveCourse,
  editingCourse,
}: StaffPagesProps) {
  const [title, setTitle] = useState(editingCourse?.title ?? "");
  const [description, setDescription] = useState(editingCourse?.desc ?? "");
  const [difficulty, setDifficulty] = useState(
    editingCourse?.level ?? "Beginner",
  );
  const [category, setCategory] = useState(editingCourse?.category ?? "");
  const [duration, setDuration] = useState(editingCourse?.duration ?? "");
  const [instructor, setInstructor] = useState(editingCourse?.instructor ?? "");
  const [instructorImage, setInstructorImage] = useState(
    editingCourse?.instructorImage ?? "",
  );
  const [courseImage, setCourseImage] = useState(editingCourse?.image ?? "");
  const [learningPoints, setLearningPoints] = useState<string[]>(
    editingCourse?.objectives.length ? editingCourse.objectives : [""],
  );
  const [sections, setSections] = useState<SectionDraft[]>(() =>
    editingCourse ? draftsFromCourse(editingCourse) : [emptySection()],
  );
  const [finalExam, setFinalExam] = useState<FinalExamDraft | null>(() =>
    editingCourse?.finalExam ? finalExamDraftFrom(editingCourse.finalExam) : null,
  );
  const [saving, setSaving] = useState<false | "draft" | "published">(false);
  const [uploadsInProgress, setUploadsInProgress] = useState(0);
  const [error, setError] = useState("");
  const [showProblems, setShowProblems] = useState(false);

  const allLessons = sections.flatMap((section) => section.lessons);
  const titledLessons = allLessons.filter((lesson) => lesson.title.trim());
  const fileCount =
    allLessons.reduce(
      (count, lesson) => count + lesson.slides.length + (lesson.video ? 1 : 0),
      0,
    ) +
    (courseImage ? 1 : 0) +
    (instructorImage ? 1 : 0);
  const categories = [
    ...new Set([
      ...CATEGORY_NAMES,
      ...(editingCourse?.category ? [editingCourse.category] : []),
    ]),
  ];
  const sampleImage =
    courses.find((course) => course.image && course.id !== editingCourse?.id)
      ?.image ?? "";
  const coverImage = courseImage || sampleImage;

  const findProblem = () => {
    if (!title.trim()) return "Add a course title before saving.";
    if (!category) return "Choose a category before saving.";
    if (
      sections.some(
        (section) =>
          !section.title.trim() && section.lessons.some(lessonHasContent),
      )
    ) {
      return "Give every section that has lessons a title before saving.";
    }
    if (
      allLessons.some(
        (lesson) => !lesson.title.trim() && lessonHasContent(lesson),
      )
    ) {
      return "Give every lesson that has files, a video or a quiz a title before saving.";
    }
    if (allLessons.some(lessonHasBadLink)) {
      return "Use a full YouTube link for each lesson video, like https://www.youtube.com/watch?v=...";
    }
    for (const lesson of allLessons) {
      const problem = lesson.quiz && quizProblem(lesson.quiz, lessonQuizName(lesson));
      if (problem) return problem;
    }
    if (finalExam) {
      return passMarkProblem(finalExam.passMark) || quizProblem(finalExam, "The final exam");
    }
    return "";
  };
  const message = error || (showProblems ? findProblem() : "");

  const uploadFiles = async (
    files: File[],
    kind: UploadKind,
    maxBytes: number,
    label: string,
  ) => {
    if (files.some((file) => file.size > maxBytes)) {
      setError(
        `${label} is too large. Choose a file up to ${maxBytes / MEGABYTE} MB.`,
      );
      return null;
    }
    setError("");
    setUploadsInProgress((count) => count + 1);
    try {
      return await Promise.all(files.map((file) => uploadFile(file, kind)));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
      return null;
    } finally {
      setUploadsInProgress((count) => count - 1);
    }
  };

  const updateSection = (sectionId: number, update: Partial<SectionDraft>) =>
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, ...update } : section,
      ),
    );
  const updateLesson = (
    lessonId: number,
    update: (lesson: LessonDraft) => Partial<LessonDraft>,
  ) =>
    setSections((current) =>
      current.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, ...update(lesson) } : lesson,
        ),
      })),
    );
  const addLesson = (sectionId: number) =>
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, lessons: [...section.lessons, emptyLesson()] }
          : section,
      ),
    );
  const removeLesson = (lesson: LessonDraft) => {
    if (
      lessonHasContent(lesson) &&
      !window.confirm(
        lesson.quiz
          ? "Remove this lesson, its files and its quiz from the course? Learners' results for the quiz are deleted when you save the course."
          : "Remove this lesson and its files from the course?",
      )
    ) {
      return;
    }
    setSections((current) =>
      current.map((section) => ({
        ...section,
        lessons: section.lessons.filter((item) => item.id !== lesson.id),
      })),
    );
  };
  const confirmQuizRemoval = (quiz: QuizDraft, what: string) =>
    !quizHasContent(quiz) ||
    window.confirm(
      `Remove ${what}? Its questions, and learners' results for it, are deleted when you save the course.`,
    );
  const changeLessonQuiz = (lessonId: number, change: QuizChange) =>
    updateLesson(lessonId, (lesson) => ({
      quiz: lesson.quiz && change(lesson.quiz),
    }));
  const removeLessonQuiz = (lesson: LessonDraft) => {
    if (lesson.quiz && confirmQuizRemoval(lesson.quiz, "this lesson's quiz")) {
      updateLesson(lesson.id, () => ({ quiz: null }));
    }
  };
  const removeFinalExam = () => {
    if (finalExam && confirmQuizRemoval(finalExam, "the final exam")) setFinalExam(null);
  };
  const removeSection = (section: SectionDraft) => {
    const hasContent =
      section.title.trim() || section.lessons.some(lessonHasContent);
    if (
      hasContent &&
      !window.confirm(
        "Remove this section and all of its lessons from the course?",
      )
    ) {
      return;
    }
    setSections((current) => current.filter((item) => item.id !== section.id));
  };

  const buildCourse = (): StaffCourse => {
    const lessonTitles = titledLessons.map((lesson) => lesson.title.trim());
    return {
      title: title.trim(),
      desc: description.trim(),
      level: difficulty,
      lessons: lessonTitles.length,
      duration: duration.trim() || "Self-paced",
      instructor: instructor.trim() || DEFAULT_INSTRUCTOR,
      instructorImage: instructorImage || undefined,
      image: coverImage,
      category,
      objectives: learningPoints.map((point) => point.trim()).filter(Boolean),
      sections: sections.map((section) => section.title.trim()).filter(Boolean),
      sampleLessons: lessonTitles.slice(0, 3),
      lessonContent: sections.flatMap((section) =>
        section.lessons
          .filter((lesson) => lesson.title.trim())
          .map((lesson) => ({
            title: lesson.title.trim(),
            section: section.title.trim(),
            slides: lesson.slides,
            video: lesson.video,
            youtubeUrl: lesson.youtubeUrl.trim()
              ? normalizeLink(lesson.youtubeUrl)
              : undefined,
            // null removes a quiz the lesson had before.
            quiz: lesson.quiz ? quizFromDraft(lesson.quiz) : null,
          })),
      ),
      finalExam: finalExam ? finalExamFromDraft(finalExam) : null,
    };
  };

  const isLive = editingCourse?.status === "published";

  // A draft is visible to staff only; publishing puts the course in front of learners.
  const saveCourse = async (status: "draft" | "published") => {
    setError("");
    if (findProblem()) {
      setShowProblems(true);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".course-form .invalid")?.focus(),
      );
      return;
    }
    setSaving(status);
    try {
      await onSaveCourse({ ...buildCourse(), status });
    } catch (saveError) {
      console.error("Unable to save course.", saveError);
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaffShell active="builder" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">COURSE BUILDER</span>
          <h1>{editingCourse ? "Edit course" : "Create a course"}</h1>
          <p>
            {!editingCourse
              ? "Save a draft to keep working privately, or publish when it is ready for learners."
              : isLive
                ? "This course is live. Saving changes updates what learners see."
                : "This course is a draft. Only staff can see it until you publish it."}
          </p>
        </div>
        <StaffButton variant="outline" onClick={() => onNavigate("admin")}>
          Back to courses
        </StaffButton>
      </div>

      <div className="course-form">
        <div className="course-form-main">
          <section className="panel form-card">
            <FormStep
              number={1}
              title="Course details"
              description="This is how the course appears to learners."
            />
            <div className="form-fields">
              <Field label="Course title" required>
                <input
                  className={
                    showProblems && !title.trim() ? "invalid" : undefined
                  }
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Advanced Flight Tuning"
                  required
                />
              </Field>
              <Field label="Short description">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What practical outcome will learners achieve?"
                  rows={3}
                />
              </Field>
              <div className="form-row">
                <Field label="Category" required>
                  <select
                    className={
                      showProblems && !category ? "invalid" : undefined
                    }
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Choose a category
                    </option>
                    {categories.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value)}
                  >
                    {DIFFICULTIES.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Duration" hint="Leave blank for Self-paced">
                  <input
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    placeholder="e.g. 2h 45m"
                  />
                </Field>
              </div>
              <Field
                label="Course instructor"
                hint={`Leave blank to show ${DEFAULT_INSTRUCTOR}`}
              >
                <input
                  value={instructor}
                  onChange={(event) => setInstructor(event.target.value)}
                  placeholder="e.g. Daniel Mensah"
                />
              </Field>
              <div className="form-row two">
                <FileField
                  label="Course image"
                  hint={IMAGE_HINT}
                  accept={IMAGE_TYPES}
                  replacing={Boolean(courseImage)}
                  onFiles={async (files) => {
                    const uploaded = await uploadFiles(
                      files,
                      "course-image",
                      MAX_IMAGE_BYTES,
                      "Course image",
                    );
                    if (uploaded) setCourseImage(uploaded[0].url);
                  }}
                >
                  {courseImage && (
                    <div className="image-preview">
                      <img src={courseImage} alt="Course image preview" />
                      <RemoveButton onClick={() => setCourseImage("")}>
                        Remove image
                      </RemoveButton>
                    </div>
                  )}
                </FileField>
                <FileField
                  label="Instructor photo"
                  hint={IMAGE_HINT}
                  accept={IMAGE_TYPES}
                  replacing={Boolean(instructorImage)}
                  onFiles={async (files) => {
                    const uploaded = await uploadFiles(
                      files,
                      "instructor-image",
                      MAX_IMAGE_BYTES,
                      "Instructor photo",
                    );
                    if (uploaded) setInstructorImage(uploaded[0].url);
                  }}
                >
                  {instructorImage && (
                    <div className="image-preview round">
                      <img
                        src={instructorImage}
                        alt="Instructor photo preview"
                      />
                      <RemoveButton onClick={() => setInstructorImage("")}>
                        Remove photo
                      </RemoveButton>
                    </div>
                  )}
                </FileField>
              </div>
            </div>
          </section>

          <section className="panel form-card">
            <FormStep
              number={2}
              title="What learners will achieve"
              description="List the practical outcomes as clear points."
            />
            <div className="form-outcomes">
              {learningPoints.map((point, index) => (
                <div className="form-outcome" key={index}>
                  <span className="form-outcome-mark">
                    <FormIcon name="check" size={15} />
                  </span>
                  <input
                    aria-label={`Outcome ${index + 1}`}
                    value={point}
                    onChange={(event) =>
                      setLearningPoints((points) =>
                        points.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item,
                        ),
                      )
                    }
                    placeholder="e.g. Configure a safe RC aircraft power system"
                  />
                  {learningPoints.length > 1 && (
                    <RemoveButton
                      label={`Remove outcome ${index + 1}`}
                      onClick={() =>
                        setLearningPoints((points) =>
                          points.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <FormIcon name="close" size={16} />
                    </RemoveButton>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="form-add"
                onClick={() => setLearningPoints((points) => [...points, ""])}
              >
                + Add outcome
              </button>
            </div>
          </section>

          <section className="panel form-card">
            <FormStep
              number={3}
              title="Sections and lessons"
              description="Organize the lessons and attach what learners need."
            />
            <div className="form-curriculum">
              {sections.map((section, sectionIndex) => (
                <div className="curriculum-builder-section" key={section.id}>
                  <div className="form-group-head">
                    <span className="badge">SECTION {sectionIndex + 1}</span>
                    <RemoveButton onClick={() => removeSection(section)}>
                      Remove section
                    </RemoveButton>
                  </div>
                  <Field label={`Section ${sectionIndex + 1} title`} required>
                    <input
                      className={
                        showProblems &&
                        !section.title.trim() &&
                        section.lessons.some(lessonHasContent)
                          ? "invalid"
                          : undefined
                      }
                      value={section.title}
                      onChange={(event) =>
                        updateSection(section.id, { title: event.target.value })
                      }
                      placeholder="e.g. Electronics and control systems"
                    />
                  </Field>
                  {section.lessons.map((lesson, lessonIndex) => (
                    <div className="lesson-builder-card" key={lesson.id}>
                      <div className="form-group-head">
                        <b>Lesson {lessonIndex + 1}</b>
                        <RemoveButton onClick={() => removeLesson(lesson)}>
                          Remove lesson
                        </RemoveButton>
                      </div>
                      <Field label={`Lesson ${lessonIndex + 1} title`} required>
                        <input
                          className={
                            showProblems &&
                            !lesson.title.trim() &&
                            lessonHasContent(lesson)
                              ? "invalid"
                              : undefined
                          }
                          value={lesson.title}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateLesson(lesson.id, () => ({ title: value }));
                          }}
                          placeholder="e.g. Binding your transmitter"
                        />
                      </Field>
                      <div className="form-row two">
                        <FileField
                          label="Slides"
                          hint="PDF, PPT, PPTX or Keynote, up to 20 MB each"
                          accept=".pdf,.ppt,.pptx,.key"
                          multiple
                          onFiles={async (files) => {
                            const uploaded = await uploadFiles(
                              files,
                              "slide",
                              MAX_SLIDE_BYTES,
                              "Slide file",
                            );
                            if (uploaded) {
                              updateLesson(lesson.id, (current) => ({
                                slides: [...current.slides, ...uploaded],
                              }));
                            }
                          }}
                        >
                          {lesson.slides.map((slide, slideIndex) => (
                            <FileRow
                              key={slide.url}
                              file={slide}
                              onRemove={() =>
                                updateLesson(lesson.id, (current) => ({
                                  slides: current.slides.filter(
                                    (_, index) => index !== slideIndex,
                                  ),
                                }))
                              }
                            />
                          ))}
                        </FileField>
                        <FileField
                          label="Short video preview"
                          hint="MP4 plays best, up to 50 MB"
                          accept=".mp4,.webm,.mov"
                          replacing={Boolean(lesson.video)}
                          onFiles={async (files) => {
                            const uploaded = await uploadFiles(
                              files,
                              "video",
                              MAX_VIDEO_BYTES,
                              "Video preview",
                            );
                            if (uploaded)
                              updateLesson(lesson.id, () => ({
                                video: uploaded[0],
                              }));
                          }}
                        >
                          {lesson.video && (
                            <>
                              <video
                                className="form-video"
                                controls
                                preload="metadata"
                                src={lesson.video.url}
                              />
                              <FileRow
                                file={lesson.video}
                                onRemove={() =>
                                  updateLesson(lesson.id, () => ({
                                    video: undefined,
                                  }))
                                }
                              />
                            </>
                          )}
                        </FileField>
                      </div>
                      <Field
                        label="Full video on YouTube"
                        hint="Learners watch the short preview first, then open this link for the full lesson."
                      >
                        <input
                          className={
                            showProblems && lessonHasBadLink(lesson)
                              ? "invalid"
                              : undefined
                          }
                          type="url"
                          value={lesson.youtubeUrl}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateLesson(lesson.id, () => ({
                              youtubeUrl: value,
                            }));
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </Field>
                      {lesson.quiz ? (
                        <div className="lesson-quiz">
                          <div className="form-group-head">
                            <b>Lesson quiz</b>
                            <RemoveButton onClick={() => removeLessonQuiz(lesson)}>
                              Remove quiz
                            </RemoveButton>
                          </div>
                          <small className="quiz-hint">
                            Learners take it after this lesson and can retake it as
                            often as they like.
                          </small>
                          <QuizEditor
                            quiz={lesson.quiz}
                            showProblems={showProblems}
                            onChange={(change) => changeLessonQuiz(lesson.id, change)}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="form-add"
                          onClick={() =>
                            updateLesson(lesson.id, () => ({ quiz: emptyQuiz() }))
                          }
                        >
                          + Add a quiz to this lesson
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="form-add"
                    onClick={() => addLesson(section.id)}
                  >
                    + Add lesson to section
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="form-add strong"
                onClick={() =>
                  setSections((current) => [...current, emptySection()])
                }
              >
                + Add section
              </button>
            </div>
          </section>

          <section className="panel form-card">
            <FormStep
              number={4}
              title="Final exam"
              description="Learners take it at the end of the course. They get three attempts and must reach the pass mark to complete the course."
            />
            {finalExam ? (
              <div className="form-fields">
                <div className="final-exam-head">
                  <Field
                    label="Pass mark (%)"
                    required
                    hint="The lowest score that passes, from 1 to 100."
                  >
                    <input
                      className={
                        showProblems && passMarkProblem(finalExam.passMark)
                          ? "invalid"
                          : undefined
                      }
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      step={1}
                      value={finalExam.passMark}
                      onChange={(event) => {
                        const value = event.target.value;
                        setFinalExam((current) => current && { ...current, passMark: value });
                      }}
                    />
                  </Field>
                  <RemoveButton onClick={removeFinalExam}>Remove final exam</RemoveButton>
                </div>
                <QuizEditor
                  quiz={finalExam}
                  showProblems={showProblems}
                  onChange={(change) =>
                    setFinalExam((current) => current && { ...current, ...change(current) })
                  }
                />
              </div>
            ) : (
              <div className="final-exam-empty">
                <p>This course has no final exam yet.</p>
                <button
                  type="button"
                  className="form-add strong"
                  onClick={() => setFinalExam(emptyFinalExam())}
                >
                  + Add a final exam
                </button>
              </div>
            )}
          </section>

          <div className="form-savebar">
            <div className="form-savebar-status">
              {message ? (
                <span className="form-error" role="alert">
                  {message}
                </span>
              ) : uploadsInProgress > 0 ? (
                <span role="status">
                  Uploading files. You can save when they finish.
                </span>
              ) : (
                <span>
                  {title.trim() && category
                    ? "Ready to save"
                    : "Fields marked * are required"}
                </span>
              )}
            </div>
            <div className="form-savebar-actions">
              <StaffButton
                variant="outline"
                disabled={Boolean(saving) || uploadsInProgress > 0}
                onClick={() => void saveCourse("draft")}
              >
                {saving === "draft" ? "Saving..." : isLive ? "Move to drafts" : "Save as draft"}
              </StaffButton>
              <StaffButton
                disabled={Boolean(saving) || uploadsInProgress > 0}
                onClick={() => void saveCourse("published")}
              >
                {saving === "published"
                  ? isLive
                    ? "Saving..."
                    : "Publishing..."
                  : isLive
                    ? "Save changes"
                    : "Publish course"}
              </StaffButton>
            </div>
          </div>
        </div>

        <aside className="form-aside">
          <CoursePreview
            title={title}
            description={description}
            difficulty={difficulty}
            category={category}
            instructor={instructor}
            image={coverImage}
            usesSampleImage={!courseImage && Boolean(coverImage)}
            sectionCount={sections.length}
            lessonCount={titledLessons.length}
            fileCount={fileCount}
          />
          {!editingCourse && courses.length > 0 && (
            <section className="panel form-templates">
              <h3>Start from an existing course</h3>
              <p>Copies its title and description into this form.</p>
              {courses.slice(0, 3).map((course) => (
                <button
                  type="button"
                  className="form-template"
                  key={course.title}
                  onClick={() => {
                    setTitle(`${course.title} Workshop`);
                    setDescription(course.desc);
                  }}
                >
                  {course.image && <img src={course.image} alt="" />}
                  <span>
                    <b>{course.title}</b>
                    <small>Use as template</small>
                  </span>
                </button>
              ))}
            </section>
          )}
        </aside>
      </div>
    </StaffShell>
  );
}
