import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyFinalExam,
  emptyQuestion,
  emptyQuiz,
  finalExamDraftFrom,
  finalExamFromDraft,
  markCorrect,
  moveItem,
  passMarkProblem,
  questionProblem,
  quizDraftFrom,
  quizFromDraft,
  quizProblem,
  withoutAssessments,
  type QuestionDraft,
  type SavedQuiz,
} from "../features/staff/quizDrafts.ts";

const saved: SavedQuiz = {
  id: "quiz1",
  title: "Knowledge check",
  questions: [
    {
      id: "q1",
      questionText: "Which control keeps the aircraft level?",
      explanation: "The ailerons control roll.",
      choices: [
        { id: "c1", text: "Ailerons", isCorrect: true },
        { id: "c2", text: "Landing gear", isCorrect: false },
      ],
    },
    {
      id: "q2",
      questionText: "What powers a brushless motor?",
      explanation: null,
      choices: [
        { id: "c3", text: "A servo", isCorrect: false },
        { id: "c4", text: "An ESC", isCorrect: true },
      ],
    },
  ],
};

function question(overrides: Partial<QuestionDraft> = {}): QuestionDraft {
  return {
    ...emptyQuestion(),
    questionText: "Which control keeps the aircraft level?",
    choices: [
      { key: 1, text: "Ailerons", isCorrect: true },
      { key: 2, text: "Landing gear", isCorrect: false },
    ],
    ...overrides,
  };
}

test("a saved quiz goes back to the server unchanged, ids included, after a round trip through the builder", () => {
  const draft = quizDraftFrom(saved);

  assert.deepEqual(quizFromDraft(draft), {
    ...saved,
    questions: saved.questions.map((item) => ({ ...item, explanation: item.explanation ?? "" })),
  });
});

test("every question and choice in a draft gets its own key for the page to track", () => {
  const draft = quizDraftFrom(saved);
  const keys = draft.questions.flatMap((item) => [item.key, ...item.choices.map((choice) => choice.key)]);

  assert.equal(new Set(keys).size, keys.length);
});

test("the server gets trimmed text from the builder", () => {
  const draft = quizDraftFrom(saved);
  draft.questions[0].questionText = "  Which control rolls the aircraft?  ";
  draft.questions[0].explanation = "  ";
  draft.questions[0].choices[1].text = " Rudder ";

  const sent = quizFromDraft(draft);

  assert.equal(sent.questions[0].questionText, "Which control rolls the aircraft?");
  assert.equal(sent.questions[0].explanation, "");
  assert.equal(sent.questions[0].choices[1].text, "Rudder");
});

test("a new quiz starts with one question that has two empty answer choices", () => {
  const quiz = emptyQuiz();

  assert.equal(quiz.questions.length, 1);
  assert.equal(quiz.questions[0].choices.length, 2);
  assert.equal(quiz.questions[0].choices.some((choice) => choice.isCorrect), false);
});

test("a new final exam starts at the default 70% pass mark", () => {
  assert.equal(emptyFinalExam().passMark, "70");
});

test("the final exam pass mark goes to the server as a number and comes back as text", () => {
  const draft = finalExamDraftFrom({ ...saved, passMark: 80 });

  assert.equal(draft.passMark, "80");
  assert.equal(finalExamFromDraft({ ...draft, passMark: " 65 " }).passMark, 65);
});

test("a complete question has no problem", () => {
  assert.equal(questionProblem(question()), "");
});

test("a question without text asks for the question", () => {
  assert.match(questionProblem(question({ questionText: "  " })), /write the question/i);
});

test("a question needs at least two answer choices", () => {
  const [onlyChoice] = question().choices;

  assert.match(questionProblem(question({ choices: [onlyChoice] })), /two answer choices/i);
});

test("an empty answer choice must be filled in or removed", () => {
  const choices = [...question().choices, { key: 3, text: " ", isCorrect: false }];

  assert.match(questionProblem(question({ choices })), /every answer choice/i);
});

test("a question without a correct answer asks for one", () => {
  const choices = question().choices.map((choice) => ({ ...choice, isCorrect: false }));

  assert.match(questionProblem(question({ choices })), /correct answer/i);
});

test("a quiz problem names the quiz and the question number", () => {
  const draft = quizDraftFrom(saved);
  draft.questions[1].choices = draft.questions[1].choices.map((choice) => ({ ...choice, isCorrect: false }));

  const problem = quizProblem(draft, 'Lesson "Welcome" quiz');

  assert.match(problem, /^Lesson "Welcome" quiz, question 2: /);
  assert.match(problem, /correct answer/i);
});

test("a quiz with no questions asks for a question or removing the quiz", () => {
  assert.match(quizProblem({ questions: [] }, "The final exam"), /^The final exam needs at least one question/);
});

test("a complete quiz has no problem", () => {
  assert.equal(quizProblem(quizDraftFrom(saved), "The final exam"), "");
});

test("a pass mark must be a whole number from 1 to 100", () => {
  for (const good of ["1", "70", " 100 "]) assert.equal(passMarkProblem(good), "", good);
  for (const bad of ["", "0", "101", "72.5", "-5", "seventy"]) {
    assert.match(passMarkProblem(bad), /pass mark/i, bad);
  }
});

test("choosing the correct answer clears any other correct answer", () => {
  const updated = markCorrect(question(), 2);

  assert.deepEqual(
    updated.choices.map((choice) => choice.isCorrect),
    [false, true],
  );
});

test("moving an item swaps it with its neighbour and stays put at either end", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 1, 1), ["a", "c", "b"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 0, -1), ["a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 2, 1), ["a", "b", "c"]);
});

test("the learner course list keeps lessons but drops quizzes and the final exam", () => {
  const course = {
    title: "Flight Basics",
    finalExam: { ...saved, passMark: 70 },
    lessonContent: [{ title: "Welcome", section: "Setup", slides: [], quiz: saved }],
  };

  const publicCourse = withoutAssessments(course);

  assert.equal("finalExam" in publicCourse, false);
  assert.deepEqual(publicCourse.lessonContent, [{ title: "Welcome", section: "Setup", slides: [] }]);
  assert.equal(JSON.stringify(publicCourse).includes("isCorrect"), false);
});
