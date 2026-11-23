import { QuizText } from "../../RichText";
import { blockProblem, type LessonBlock } from "../lesson/blocks";
import { LessonBlocks } from "../lesson/LessonBlocks";
import { LessonResources } from "../lesson/LessonResources";
import type { CourseResource } from "./StaffPages";
import type { QuizDraft } from "./quizDrafts";

// The lesson as learners will see it once they press Start lesson, built
// from the same pieces as the real lesson page. Unfinished blocks are left
// out, as they would stop the course from saving.
export function LessonPreview({
  courseTitle,
  section,
  lessonNumber,
  title,
  blocks,
  slides,
  video,
  youtubeUrl,
  quiz,
}: {
  courseTitle: string;
  section: string;
  lessonNumber: number;
  title: string;
  blocks: LessonBlock[];
  slides: CourseResource[];
  video?: CourseResource;
  youtubeUrl: string;
  quiz: QuizDraft | null;
}) {
  const ready = blocks.filter((block) => !blockProblem(block));
  const unfinished = blocks.length - ready.length;
  const hasResources = Boolean(slides.length || video || youtubeUrl.trim());
  const questions = (quiz?.questions ?? []).filter((question) => question.questionText.trim());

  return (
    <div className="lesson-content lesson-preview">
      <span className="eyebrow">
        {(section.trim() || "SECTION").toUpperCase()} · LESSON {lessonNumber}
      </span>
      <h1>{title.trim() || "Untitled lesson"}</h1>
      <p className="lead">Work through the resources below at your own pace.</p>
      {unfinished > 0 && (
        <p className="lesson-preview-note" role="status">
          {unfinished} unfinished {unfinished === 1 ? "block is" : "blocks are"} hidden from this preview until{" "}
          {unfinished === 1 ? "it is" : "they are"} filled in.
        </p>
      )}
      {ready.length > 0 && (
        <article className="content-card lesson-blocks-card">
          <LessonBlocks blocks={ready} />
        </article>
      )}
      {(hasResources || ready.length === 0) && (
        <article className="content-card">
          <h2>Lesson resources</h2>
          <LessonResources slides={slides} video={video} youtubeUrl={youtubeUrl.trim() || undefined} />
          {!hasResources && <p>The instructor has not added files or videos to this lesson yet.</p>}
        </article>
      )}
      {questions.length > 0 && (
        <article className="content-card lesson-preview-quiz">
          <h2>Lesson quiz</h2>
          <p className="lesson-preview-note">
            Learners take this after the lesson. Correct answers are marked here for you only.
          </p>
          <ol>
            {questions.map((question) => (
              <li key={question.key}>
                <p className="lesson-preview-question">
                  <QuizText text={question.questionText} />
                </p>
                <ul>
                  {question.choices
                    .filter((choice) => choice.text.trim())
                    .map((choice) => (
                      <li key={choice.key} className={choice.isCorrect ? "is-correct" : undefined}>
                        <QuizText text={choice.text} />
                        {choice.isCorrect && <em> ✓ Correct answer</em>}
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ol>
        </article>
      )}
    </div>
  );
}
