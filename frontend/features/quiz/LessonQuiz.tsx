import { useEffect, useRef, useState, type FormEvent } from "react";
import { loadAttemptHistory, loadLessonQuiz, submitAttempt } from "./quizApi";
import {
  allAnswered,
  answeredCount,
  bestScore,
  choiceOutcome,
  correctCount,
  firstUnanswered,
  formatScore,
  reviewedQuestions,
  withAttempt,
  type Answers,
  type AttemptHistory,
  type ChoiceOutcome,
  type LearnerQuiz,
} from "./quizState";
import "./quiz.css";

type Loaded =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "none" }
  | { status: "ready"; quiz: LearnerQuiz; history: AttemptHistory; historyError: string };

type View = "summary" | "answering" | "result";

const EMPTY_HISTORY: AttemptHistory = { attempts: [], attemptsRemaining: null, review: null };

function Mark({ kind }: { kind: "right" | "wrong" }) {
  return (
    <svg className="lesson-quiz-mark" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {kind === "right" ? (
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4.5 4.5l7 7m0-7l-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

const OUTCOME_LABEL: Record<ChoiceOutcome, string> = {
  "picked-correct": "Your answer, correct",
  "picked-wrong": "Your answer, incorrect",
  "missed-correct": "Correct answer",
  other: "",
};

function submittedOn(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// The quiz for one lesson: a summary of earlier results, the questions, and
// the marked answers after submitting. Results are read from the server, so
// they are the same on every browser and device.
export function LessonQuiz({
  lessonId,
  onMastery,
}: {
  lessonId: string;
  onMastery?: () => Promise<void> | void;
}) {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState<View>("summary");
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let current = true;
    setLoaded({ status: "loading" });
    (async () => {
      try {
        const quiz = await loadLessonQuiz(lessonId);
        if (!current) return;
        if (!quiz || !quiz.questions.length) {
          setLoaded({ status: "none" });
          return;
        }
        let history = EMPTY_HISTORY;
        let historyError = "";
        try {
          history = await loadAttemptHistory(quiz.id);
        } catch (error) {
          historyError = error instanceof Error ? error.message : "Your earlier results could not be loaded.";
        }
        if (current) {
          setLoaded({ status: "ready", quiz, history, historyError });
          if (history.attempts.some((attempt) => Number(attempt.score) === 100)) {
            void onMastery?.();
          }
        }
      } catch (error) {
        if (current) {
          setLoaded({
            status: "error",
            message: error instanceof Error ? error.message : "The quiz could not be loaded.",
          });
        }
      }
    })();
    return () => {
      current = false;
    };
  }, [lessonId, reloadKey]);

  useEffect(() => {
    if (view === "result") resultHeadingRef.current?.focus();
  }, [view]);

  if (loaded.status === "none") return null;

  if (loaded.status === "loading") {
    return (
      <section className="lesson-quiz-panel lesson-quiz-quiet" aria-busy="true">
        <p>Loading the lesson quiz...</p>
      </section>
    );
  }

  if (loaded.status === "error") {
    return (
      <section className="lesson-quiz-panel lesson-quiz-quiet">
        <p role="alert">{loaded.message}</p>
        <button type="button" className="btn outline" onClick={() => setReloadKey((key) => key + 1)}>
          <span>Try again</span>
        </button>
      </section>
    );
  }

  const { quiz, history, historyError } = loaded;
  const latest = history.attempts[0];
  const best = bestScore(history.attempts);
  const answered = answeredCount(quiz, answers);
  const total = quiz.questions.length;
  const titleId = `lesson-quiz-title-${quiz.id}`;

  const scrollToPanel = () => panelRef.current?.scrollIntoView({ block: "start" });

  const start = () => {
    setAnswers({});
    setSubmitError("");
    setShowMissing(false);
    setView("answering");
    scrollToPanel();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!allAnswered(quiz, answers)) {
      setShowMissing(true);
      const missing = firstUnanswered(quiz, answers);
      if (missing) document.getElementById(`lesson-quiz-q-${missing.id}`)?.scrollIntoView({ block: "center" });
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await submitAttempt(quiz.id, answers);
      setLoaded({ ...loaded, history: withAttempt(history, result), historyError: "" });
      if (result.passed && Number(result.attempt.score) === 100) {
        await onMastery?.();
      }
      setJustSubmitted(true);
      setView("result");
      scrollToPanel();
    } catch (error) {
      // A submission that fails is not saved, so the learner's answers stay.
      setSubmitError(error instanceof Error ? error.message : "Your answers could not be submitted. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <section className="lesson-quiz-panel" ref={panelRef} aria-labelledby={titleId}>
      <header className="lesson-quiz-head">
        <span className="eyebrow">LESSON QUIZ</span>
        <h2 id={titleId}>{quiz.title}</h2>
        <p className="lesson-quiz-meta">
          {total} {total === 1 ? "question" : "questions"} · Retake it as often as you like
        </p>
      </header>

      {view === "summary" && (
        <div className="lesson-quiz-summary">
          {latest ? (
            <dl className="lesson-quiz-stats">
              <div>
                <dt>Latest score</dt>
                <dd>{formatScore(latest.score)}</dd>
              </div>
              <div>
                <dt>Best score</dt>
                <dd>{best === null ? "-" : formatScore(best)}</dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>{history.attempts.length}</dd>
              </div>
            </dl>
          ) : (
            <p className="lesson-quiz-intro">
              Check what you learned in this lesson. Choose one answer for each question, then submit to
              see your score, the correct answers, and why they are correct.
            </p>
          )}
          {historyError && <p className="lesson-quiz-note">{historyError}</p>}
          <div className="lesson-quiz-actions">
            <button type="button" className="btn primary" onClick={start}>
              <span>{latest ? "Retake quiz" : "Start quiz"}</span>
            </button>
            {latest && history.review && (
              <button
                type="button"
                className="btn outline"
                onClick={() => {
                  setJustSubmitted(false);
                  setView("result");
                }}
              >
                <span>Review last attempt</span>
              </button>
            )}
          </div>
        </div>
      )}

      {view === "answering" && (
        <form className="lesson-quiz-form" onSubmit={(event) => void submit(event)} noValidate>
          <ol className="lesson-quiz-questions">
            {quiz.questions.map((question, index) => {
              const missing = showMissing && !question.choices.some((choice) => choice.id === answers[question.id]);
              return (
                <li key={question.id} id={`lesson-quiz-q-${question.id}`}>
                  <fieldset className={`lesson-quiz-question${missing ? " is-missing" : ""}`} disabled={submitting}>
                    <legend>
                      <span className="lesson-quiz-number">Question {index + 1}</span>
                      {question.questionText}
                    </legend>
                    <div className="lesson-quiz-choices">
                      {question.choices.map((choice) => {
                        const selected = answers[question.id] === choice.id;
                        return (
                          <label key={choice.id} className={`lesson-quiz-choice${selected ? " is-selected" : ""}`}>
                            <input
                              type="radio"
                              name={`lesson-quiz-${question.id}`}
                              value={choice.id}
                              checked={selected}
                              onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.id }))}
                            />
                            <span>{choice.text}</span>
                          </label>
                        );
                      })}
                    </div>
                    {missing && <p className="lesson-quiz-missing">Choose an answer for this question.</p>}
                  </fieldset>
                </li>
              );
            })}
          </ol>
          <div className="lesson-quiz-submitbar">
            <p aria-live="polite">
              <b>{answered}</b> of {total} answered
            </p>
            <div className="lesson-quiz-actions">
              <button type="button" className="btn outline" onClick={() => setView("summary")} disabled={submitting}>
                <span>Cancel</span>
              </button>
              <button type="submit" className="btn primary" disabled={submitting}>
                <span>{submitting ? "Submitting..." : "Submit answers"}</span>
              </button>
            </div>
          </div>
          {submitError && (
            <p role="alert" className="form-error lesson-quiz-submit-error">
              {submitError}
            </p>
          )}
        </form>
      )}

      {view === "result" && latest && (
        <div className="lesson-quiz-result">
          {(() => {
            const review = history.review ?? [];
            const marked = reviewedQuestions(quiz, review);
            const right = correctCount(review);
            return (
              <>
                <div className="lesson-quiz-score">
                  <div>
                    <h3 ref={resultHeadingRef} tabIndex={-1}>
                      {justSubmitted ? "Your result" : "Your last attempt"}
                    </h3>
                    <p>
                      {right} of {review.length} correct · Attempt {latest.attempt_number}
                      {submittedOn(latest.submitted_at) && ` · ${submittedOn(latest.submitted_at)}`}
                    </p>
                  </div>
                  <strong>{formatScore(latest.score)}</strong>
                </div>
                {marked.length === 0 ? (
                  <p className="lesson-quiz-note">
                    This quiz has changed since your last attempt, so there are no answers to review. Retake it
                    to see how you do now.
                  </p>
                ) : (
                  <ol className="lesson-quiz-questions">
                    {marked.map(({ question, number, item }) => (
                      <li key={question.id}>
                        <article className="lesson-quiz-question">
                          <p className={`lesson-quiz-verdict ${item.correct ? "is-right" : "is-wrong"}`}>
                            <Mark kind={item.correct ? "right" : "wrong"} />
                            {item.correct ? "Correct" : "Incorrect"}
                          </p>
                          <h4>
                            <span className="lesson-quiz-number">Question {number}</span>
                            {question.questionText}
                          </h4>
                          <ul className="lesson-quiz-choices">
                            {question.choices.map((choice) => {
                              const outcome = choiceOutcome(choice.id, item);
                              return (
                                <li key={choice.id} className={`lesson-quiz-choice outcome-${outcome}`}>
                                  {outcome === "picked-wrong" ? (
                                    <Mark kind="wrong" />
                                  ) : outcome === "other" ? (
                                    <span className="lesson-quiz-mark" aria-hidden="true" />
                                  ) : (
                                    <Mark kind="right" />
                                  )}
                                  <span>{choice.text}</span>
                                  {outcome !== "other" && <em>{OUTCOME_LABEL[outcome]}</em>}
                                </li>
                              );
                            })}
                          </ul>
                          {item.explanation && (
                            <p className="lesson-quiz-explanation">
                              <b>Why</b>
                              {item.explanation}
                            </p>
                          )}
                        </article>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="lesson-quiz-actions">
                  <button type="button" className="btn primary" onClick={start}>
                    <span>Retake quiz</span>
                  </button>
                  <button type="button" className="btn outline" onClick={() => setView("summary")}>
                    <span>Done</span>
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
}
