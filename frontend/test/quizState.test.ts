import assert from "node:assert/strict";
import { test } from "node:test";
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
  type Attempt,
  type LearnerQuiz,
  type ReviewItem,
} from "../features/quiz/quizState.ts";

const quiz: LearnerQuiz = {
  id: "quiz1",
  title: "Knowledge check",
  questions: [
    {
      id: "q1",
      questionText: "Which control keeps the aircraft level?",
      position: 0,
      choices: [
        { id: "c1", text: "Ailerons", position: 0 },
        { id: "c2", text: "Landing gear", position: 1 },
      ],
    },
    {
      id: "q2",
      questionText: "What powers a brushless motor?",
      position: 1,
      choices: [
        { id: "c3", text: "A servo", position: 0 },
        { id: "c4", text: "An ESC", position: 1 },
      ],
    },
  ],
};

function attempt(number: number, score: number): Attempt {
  return { id: `a${number}`, attempt_number: number, score, passed: true, submitted_at: "2026-11-13T08:00:00Z" };
}

const review: ReviewItem[] = [
  { questionId: "q1", selectedChoiceId: "c1", correctChoiceId: "c1", correct: true, explanation: null },
  { questionId: "q2", selectedChoiceId: "c3", correctChoiceId: "c4", correct: false, explanation: "ESCs drive them." },
];

test("a quiz can only be submitted once every question has an answer", () => {
  assert.equal(allAnswered(quiz, {}), false);
  assert.equal(allAnswered(quiz, { q1: "c1" }), false);
  assert.equal(firstUnanswered(quiz, { q1: "c1" })?.id, "q2");
  assert.equal(allAnswered(quiz, { q1: "c1", q2: "c4" }), true);
  assert.equal(firstUnanswered(quiz, { q1: "c1", q2: "c4" }), undefined);
});

test("an answer that is not one of the question's choices does not count", () => {
  assert.equal(answeredCount(quiz, { q1: "c3", q2: "c4" }), 1);
});

test("scores show at most one decimal place", () => {
  assert.equal(formatScore(70), "70%");
  assert.equal(formatScore(66.67), "66.7%");
  assert.equal(formatScore(100), "100%");
});

test("the best score is the highest of all attempts", () => {
  assert.equal(bestScore([]), null);
  assert.equal(bestScore([attempt(2, 40), attempt(1, 90)]), 90);
});

test("a new attempt goes to the top of the history with its review", () => {
  const history = { attempts: [attempt(1, 40)], attemptsRemaining: null, review: null };
  const updated = withAttempt(history, { attempt: attempt(2, 50), attemptsRemaining: null, passed: true, review });
  assert.deepEqual(updated.attempts.map((item) => item.attempt_number), [2, 1]);
  assert.equal(updated.review, review);
});

test("each choice is marked as the learner's answer, the correct answer, or neither", () => {
  assert.equal(choiceOutcome("c1", review[0]), "picked-correct");
  assert.equal(choiceOutcome("c2", review[0]), "other");
  assert.equal(choiceOutcome("c3", review[1]), "picked-wrong");
  assert.equal(choiceOutcome("c4", review[1]), "missed-correct");
  assert.equal(correctCount(review), 1);
});

test("the review follows the quiz order and skips questions it has no answer for", () => {
  const changed: LearnerQuiz = {
    ...quiz,
    questions: [quiz.questions[1], { ...quiz.questions[0], id: "new" }],
  };
  const marked = reviewedQuestions(changed, review);
  assert.deepEqual(marked.map(({ question, number }) => [question.id, number]), [["q2", 1]]);
  assert.equal(marked[0].item.explanation, "ESCs drive them.");
});
