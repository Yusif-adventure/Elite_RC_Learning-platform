// Shapes the backend sends learners, and the small rules the quiz page uses.
// Before submitting, a learner's quiz has no answer key and no explanations.

export type LearnerChoice = { id: string; text: string; position: number };
export type LearnerQuestion = {
  id: string;
  questionText: string;
  position: number;
  choices: LearnerChoice[];
};
export type LearnerQuiz = { id: string; title: string; questions: LearnerQuestion[] };
export type LearnerFinalExam = LearnerQuiz & { passMark: number };

export type Attempt = {
  id: string;
  attempt_number: number;
  score: number;
  passed: boolean;
  submitted_at: string;
};

export type ReviewItem = {
  questionId: string;
  selectedChoiceId: string;
  correctChoiceId: string;
  correct: boolean;
  explanation: string | null;
};

export type AttemptResult = {
  attempt: Attempt;
  attemptsRemaining: number | null;
  passed: boolean;
  review: ReviewItem[];
  certificate?: { id: string; certificate_identifier: string; issued_at: string } | null;
};

export type AttemptHistory = {
  attempts: Attempt[];
  attemptsRemaining: number | null;
  review: ReviewItem[] | null;
};

export type Answers = Record<string, string>;

export function answeredCount(quiz: LearnerQuiz, answers: Answers) {
  return quiz.questions.filter((question) =>
    question.choices.some((choice) => choice.id === answers[question.id]),
  ).length;
}

// The backend refuses a submission that skips a question.
export function allAnswered(quiz: LearnerQuiz, answers: Answers) {
  return answeredCount(quiz, answers) === quiz.questions.length;
}

export function firstUnanswered(quiz: LearnerQuiz, answers: Answers) {
  return quiz.questions.find((question) => !question.choices.some((choice) => choice.id === answers[question.id]));
}

// Scores arrive with up to two decimals, e.g. 66.67. Show at most one.
export function formatScore(score: number) {
  return `${Math.round(score * 10) / 10}%`;
}

export function bestScore(attempts: Attempt[]) {
  return attempts.length ? Math.max(...attempts.map((attempt) => Number(attempt.score))) : null;
}

// Puts a newly submitted attempt at the top of the history, as the server would.
export function withAttempt(history: AttemptHistory, result: AttemptResult): AttemptHistory {
  return {
    attempts: [result.attempt, ...history.attempts.filter((attempt) => attempt.id !== result.attempt.id)],
    attemptsRemaining: result.attemptsRemaining,
    review: result.review,
  };
}

export type ReviewedQuestion = {
  question: LearnerQuestion;
  number: number;
  item: ReviewItem;
};

// Matches the review to the quiz as it is now. A question removed since the
// attempt, or added after it, has nothing to show and is left out.
export function reviewedQuestions(quiz: LearnerQuiz, review: ReviewItem[]): ReviewedQuestion[] {
  const byQuestion = new Map(review.map((item) => [item.questionId, item]));
  return quiz.questions.flatMap((question, index) => {
    const item = byQuestion.get(question.id);
    return item ? [{ question, number: index + 1, item }] : [];
  });
}

export type ChoiceOutcome = "picked-correct" | "picked-wrong" | "missed-correct" | "other";

export function choiceOutcome(choiceId: string, item: ReviewItem): ChoiceOutcome {
  const picked = choiceId === item.selectedChoiceId;
  const correct = choiceId === item.correctChoiceId;
  if (picked && correct) return "picked-correct";
  if (picked) return "picked-wrong";
  if (correct) return "missed-correct";
  return "other";
}

export function correctCount(review: ReviewItem[]) {
  return review.filter((item) => item.correct).length;
}
