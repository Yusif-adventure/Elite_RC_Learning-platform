import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { loadAttemptHistory, loadFinalExam, submitAttempt } from "./quizApi";
import { allAnswered, withAttempt, type Answers, type AttemptHistory, type LearnerFinalExam } from "./quizState";

type Certificate = { certificate_identifier: string; issued_at: string };
type State = { loading: boolean; exam: LearnerFinalExam | null; history: AttemptHistory | null; error: string };

export function FinalExamPanel({
  courseId,
  courseTitle,
  instructor,
  learnerName,
  learnerId,
  complete,
  staff,
}: {
  courseId: string;
  courseTitle: string;
  instructor: string;
  learnerName: string;
  learnerId?: string;
  complete: boolean;
  staff: boolean;
}) {
  const [state, setState] = useState<State>({ loading: true, exam: null, history: null, error: "" });
  const [answers, setAnswers] = useState<Answers>({});
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; attemptsRemaining: number | null } | null>(null);

  useEffect(() => {
    let active = true;
    if (!learnerId || (!complete && !staff)) {
      setState({ loading: false, exam: null, history: null, error: "" });
      return () => { active = false; };
    }
    void (async () => {
      try {
        const exam = await loadFinalExam(courseId);
        if (!active) return;
        if (!exam) {
          setState({ loading: false, exam: null, history: null, error: "" });
          return;
        }
        const [history, certificateResponse] = await Promise.all([
          loadAttemptHistory(exam.id),
          supabase.from("certificates").select("certificate_identifier, issued_at").eq("course_id", courseId).maybeSingle(),
        ]);
        if (!active) return;
        setCertificate(certificateResponse.error ? null : certificateResponse.data);
        setState({ loading: false, exam, history, error: "" });
      } catch (error) {
        if (active) setState({ loading: false, exam: null, history: null, error: error instanceof Error ? error.message : "The final exam could not be loaded." });
      }
    })();
    return () => { active = false; };
  }, [courseId, learnerId, complete, staff]);

  const submit = async () => {
    if (!state.exam || !state.history || !allAnswered(state.exam, answers)) return;
    setSubmitting(true);
    setState((current) => ({ ...current, error: "" }));
    try {
      const submitted = await submitAttempt(state.exam.id, answers);
      setResult({ score: submitted.attempt.score, passed: submitted.passed, attemptsRemaining: submitted.attemptsRemaining });
      setState((current) => current.history
        ? { ...current, history: withAttempt(current.history, submitted) }
        : current);
      if (submitted.certificate) setCertificate(submitted.certificate);
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Your exam could not be submitted." }));
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = state.history?.attemptsRemaining ?? 3;
  const passed = state.history?.attempts.some((attempt) => attempt.passed) || false;
  const closed = remaining <= 0 || passed;

  return (
    <section className="content-card final-exam-panel" aria-labelledby="final-exam-title">
      <h2 id="final-exam-title">Final exam</h2>
      {!learnerId ? <p>Sign in and complete all course lessons to unlock the final exam.</p>
        : !complete && !staff ? <p>Complete all course lessons to unlock the final exam.</p>
        : state.loading ? <p aria-busy="true">Loading the final exam…</p>
        : state.error && !state.exam ? <p role="alert">{state.error}</p>
        : !state.exam ? <p>No final exam is available for this course yet.</p>
        : <>
          <p>Pass mark: {state.exam.passMark}%. Attempts remaining: {remaining} of 3.</p>
          {certificate && <div className="certificate-print">
            <aside className="certificate-side">
              <div className="certificate-brand"><span className="certificate-brand-mark" aria-hidden="true">✦</span><span><b>ELITE RC</b><small>COMMUNITY LEARNING HUB</small></span></div>
              <div className="certificate-heading"><p>CERTIFICATE</p><h2>OF ACHIEVEMENT</h2></div>
            </aside>
            <div className="certificate-medal-wrap" aria-hidden="true"><i /><i /><div className="certificate-medal"><span>✦</span><b>AWARDED<br />WITH HONOUR</b></div></div>
            <div className="certificate-main">
              <div className="certificate-topline"><span>PROUDLY PRESENTED TO</span><span>COURSE COMPLETION</span></div>
              <h3 className="certificate-recipient">{learnerName}</h3><div className="certificate-rule"><i /></div>
              <p className="certificate-intro">in recognition of successfully completing</p><h4 className="certificate-course">{courseTitle}</h4>
              <p className="certificate-copy">and passing the final examination.</p>
              <div className="certificate-bottom"><div><span>ISSUED</span><b>{new Date(certificate.issued_at).toLocaleDateString()}</b></div><div className="certificate-signature"><i /><span>{instructor}</span><small>Course Instructor</small></div><div className="certificate-id"><span>CERTIFICATE ID</span><b>{certificate.certificate_identifier}</b></div></div>
              <button className="btn outline certificate-download" onClick={() => window.print()}>Download / print certificate</button>
            </div>
          </div>}
          {result && <p role="status">Score: {result.score}% · {result.passed ? "Passed" : "Not passed"}. Attempts remaining: {result.attemptsRemaining}.</p>}
          {closed ? <p role="status">{passed ? "You passed. The course is complete and your certificate has been issued." : "All three attempts have been used. The final exam is closed."}</p>
            : <>
              {state.exam.questions.map((question, index) => <fieldset key={question.id} style={{ margin: "20px 0", border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
                <legend><b>{index + 1}. {question.questionText}</b></legend>
                {question.choices.map((choice) => <label key={choice.id} style={{ display: "block", minHeight: 44, padding: 8 }}><input type="radio" name={`final-${question.id}`} checked={answers[question.id] === choice.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.id }))} /> {choice.text}</label>)}
              </fieldset>)}
              {state.error && <p role="alert">{state.error}</p>}
              <button className="btn primary" disabled={submitting || !allAnswered(state.exam, answers)} onClick={() => void submit()}>{submitting ? "Submitting…" : "Submit final exam"}</button>
            </>}
        </>}
    </section>
  );
}
