// Lesson quizzes and the final exam as the course builder edits them, and the
// checks they must pass before a course is saved. The backend applies the same
// rules, so these only give instructors clearer messages sooner.

export const DEFAULT_PASS_MARK = 70;

// As the backend sends and receives them. Staff reads include the answer key.
export type SavedChoice = { id?: string; text: string; isCorrect: boolean };
export type SavedQuestion = {
  id?: string;
  questionText: string;
  explanation?: string | null;
  choices: SavedChoice[];
};
export type SavedQuiz = { id?: string; title?: string; questions: SavedQuestion[] };
export type SavedFinalExam = SavedQuiz & { passMark: number };

// Each question and choice has a key so the page can keep track of it while
// it moves; ids only exist once the server has saved it.
export type ChoiceDraft = { key: number; id?: string; text: string; isCorrect: boolean };
export type QuestionDraft = {
  key: number;
  id?: string;
  questionText: string;
  explanation: string;
  choices: ChoiceDraft[];
};
export type QuizDraft = { id?: string; title?: string; questions: QuestionDraft[] };
// The pass mark is kept as typed, so a half-typed number is not lost.
export type FinalExamDraft = QuizDraft & { passMark: string };

let lastKey = 0;
const nextKey = () => {
  lastKey += 1;
  return lastKey;
};

export function emptyChoice(): ChoiceDraft {
  return { key: nextKey(), text: "", isCorrect: false };
}

export function emptyQuestion(): QuestionDraft {
  return { key: nextKey(), questionText: "", explanation: "", choices: [emptyChoice(), emptyChoice()] };
}

export function emptyQuiz(): QuizDraft {
  return { questions: [emptyQuestion()] };
}

export function emptyFinalExam(): FinalExamDraft {
  return { ...emptyQuiz(), passMark: String(DEFAULT_PASS_MARK) };
}

export function quizDraftFrom(saved: SavedQuiz): QuizDraft {
  return {
    id: saved.id,
    title: saved.title,
    questions: saved.questions.map((question) => ({
      key: nextKey(),
      id: question.id,
      questionText: question.questionText,
      explanation: question.explanation ?? "",
      choices: question.choices.map((choice) => ({
        key: nextKey(),
        id: choice.id,
        text: choice.text,
        isCorrect: choice.isCorrect,
      })),
    })),
  };
}

export function finalExamDraftFrom(saved: SavedFinalExam): FinalExamDraft {
  return { ...quizDraftFrom(saved), passMark: String(saved.passMark) };
}

export function quizFromDraft(draft: QuizDraft): SavedQuiz {
  return {
    id: draft.id,
    title: draft.title,
    questions: draft.questions.map((question) => ({
      id: question.id,
      questionText: question.questionText.trim(),
      explanation: question.explanation.trim(),
      choices: question.choices.map((choice) => ({
        id: choice.id,
        text: choice.text.trim(),
        isCorrect: choice.isCorrect,
      })),
    })),
  };
}

export function finalExamFromDraft(draft: FinalExamDraft): SavedFinalExam {
  return { ...quizFromDraft(draft), passMark: Number(draft.passMark.trim()) };
}

// What is wrong with one question, in words for the instructor, or "".
export function questionProblem(question: QuestionDraft) {
  if (!question.questionText.trim()) return "Write the question.";
  if (question.choices.length < 2) return "Add at least two answer choices.";
  if (question.choices.some((choice) => !choice.text.trim())) {
    return "Fill in every answer choice, or remove the empty ones.";
  }
  if (!question.choices.some((choice) => choice.isCorrect)) return "Choose the correct answer.";
  return "";
}

// The first problem in a quiz, naming it, e.g. 'Lesson "Welcome" quiz'.
export function quizProblem(draft: QuizDraft, name: string) {
  if (!draft.questions.length) return `${name} needs at least one question. Add a question or remove it.`;
  for (const [index, question] of draft.questions.entries()) {
    const problem = questionProblem(question);
    if (problem) return `${name}, question ${index + 1}: ${problem}`;
  }
  return "";
}

// A pass mark of 0 would let everyone pass.
export function passMarkProblem(passMark: string) {
  const value = passMark.trim();
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 100
    ? ""
    : "Set the final exam pass mark to a whole number from 1 to 100.";
}

// Each question has exactly one correct answer.
export function markCorrect(question: QuestionDraft, choiceKey: number): QuestionDraft {
  return {
    ...question,
    choices: question.choices.map((choice) => ({ ...choice, isCorrect: choice.key === choiceKey })),
  };
}

export function moveItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const moved = [...items];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

type WithAssessments = {
  finalExam?: unknown;
  lessonContent?: ({ quiz?: unknown } & Record<string, unknown>)[];
};

// Staff reads carry answer keys; learner pages get the course without them.
export function withoutAssessments<T extends WithAssessments>(course: T): Omit<T, "finalExam"> {
  const { finalExam: _finalExam, ...rest } = course;
  if (!course.lessonContent) return rest;
  return {
    ...rest,
    lessonContent: course.lessonContent.map(({ quiz: _quiz, ...lesson }) => lesson),
  };
}
