import { Field, FormIcon, RemoveButton } from "./formParts";
import {
  emptyChoice,
  emptyQuestion,
  markCorrect,
  moveItem,
  questionProblem,
  type ChoiceDraft,
  type QuestionDraft,
  type QuizDraft,
} from "./quizDrafts";

// Changes are passed up as updates to the latest quiz, so quick edits in a row
// never undo each other.
export type QuizChange = (quiz: QuizDraft) => QuizDraft;

const letter = (index: number) => String.fromCharCode(65 + index);

function MoveButtons({
  label,
  isFirst,
  isLast,
  onMove,
}: {
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (offset: -1 | 1) => void;
}) {
  return (
    <span className="quiz-move">
      <button
        type="button"
        aria-label={`Move ${label} up`}
        title="Move up"
        disabled={isFirst}
        onClick={() => onMove(-1)}
      >
        <FormIcon name="up" size={16} />
      </button>
      <button
        type="button"
        aria-label={`Move ${label} down`}
        title="Move down"
        disabled={isLast}
        onClick={() => onMove(1)}
      >
        <FormIcon name="down" size={16} />
      </button>
    </span>
  );
}

function ChoiceRow({
  choice,
  index,
  count,
  question,
  questionNumber,
  showProblems,
  onChange,
}: {
  choice: ChoiceDraft;
  index: number;
  count: number;
  question: QuestionDraft;
  questionNumber: number;
  showProblems: boolean;
  onChange: (update: (question: QuestionDraft) => QuestionDraft) => void;
}) {
  const name = `answer ${letter(index)} of question ${questionNumber}`;
  const noCorrectAnswer = !question.choices.some((item) => item.isCorrect);
  const updateChoice = (update: Partial<ChoiceDraft>) =>
    onChange((current) => ({
      ...current,
      choices: current.choices.map((item) =>
        item.key === choice.key ? { ...item, ...update } : item,
      ),
    }));

  return (
    <div className={`quiz-choice${choice.isCorrect ? " correct" : ""}`}>
      <input
        type="radio"
        name={`correct-answer-${question.key}`}
        aria-label={`Mark answer ${letter(index)} as correct`}
        className={showProblems && noCorrectAnswer ? "invalid" : undefined}
        checked={choice.isCorrect}
        onChange={() => onChange((current) => markCorrect(current, choice.key))}
      />
      <span className="quiz-choice-letter" aria-hidden="true">
        {letter(index)}
      </span>
      <input
        aria-label={`Answer ${letter(index)}`}
        className={showProblems && !choice.text.trim() ? "invalid" : undefined}
        value={choice.text}
        onChange={(event) => updateChoice({ text: event.target.value })}
        placeholder={`Answer ${letter(index)}`}
      />
      <MoveButtons
        label={name}
        isFirst={index === 0}
        isLast={index === count - 1}
        onMove={(offset) =>
          onChange((current) => {
            const at = current.choices.findIndex((item) => item.key === choice.key);
            return { ...current, choices: moveItem(current.choices, at, offset) };
          })
        }
      />
      <RemoveButton
        label={`Remove ${name}`}
        onClick={() =>
          onChange((current) => ({
            ...current,
            choices: current.choices.filter((item) => item.key !== choice.key),
          }))
        }
      >
        <FormIcon name="close" size={16} />
      </RemoveButton>
    </div>
  );
}

function QuestionCard({
  question,
  number,
  count,
  showProblems,
  onChange,
  onMove,
  onRemove,
}: {
  question: QuestionDraft;
  number: number;
  count: number;
  showProblems: boolean;
  onChange: (update: (question: QuestionDraft) => QuestionDraft) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) {
  const problem = showProblems ? questionProblem(question) : "";

  return (
    <section
      className={`quiz-question${problem ? " has-problem" : ""}`}
      aria-label={`Question ${number}`}
    >
      <div className="form-group-head">
        <b>Question {number}</b>
        <span className="quiz-question-actions">
          <MoveButtons
            label={`question ${number}`}
            isFirst={number === 1}
            isLast={number === count}
            onMove={onMove}
          />
          <RemoveButton onClick={onRemove}>Remove question</RemoveButton>
        </span>
      </div>
      <Field label="Question" required>
        <textarea
          className={showProblems && !question.questionText.trim() ? "invalid" : undefined}
          rows={2}
          value={question.questionText}
          onChange={(event) => {
            const value = event.target.value;
            onChange((current) => ({ ...current, questionText: value }));
          }}
          placeholder="e.g. Which control surface makes the aircraft roll?"
        />
      </Field>
      <div className="quiz-choices" role="group" aria-label={`Answer choices for question ${number}`}>
        <span className="field-name">
          Answer choices<i aria-hidden="true"> *</i>
        </span>
        <small className="quiz-hint">Select the circle next to the correct answer.</small>
        {question.choices.map((choice, index) => (
          <ChoiceRow
            key={choice.key}
            choice={choice}
            index={index}
            count={question.choices.length}
            question={question}
            questionNumber={number}
            showProblems={showProblems}
            onChange={onChange}
          />
        ))}
        <button
          type="button"
          className="form-add"
          onClick={() =>
            onChange((current) => ({ ...current, choices: [...current.choices, emptyChoice()] }))
          }
        >
          + Add answer choice
        </button>
      </div>
      <Field
        label="Explanation (optional)"
        hint="Learners see this after they submit, next to the correct answer."
      >
        <textarea
          rows={2}
          value={question.explanation}
          onChange={(event) => {
            const value = event.target.value;
            onChange((current) => ({ ...current, explanation: value }));
          }}
          placeholder="e.g. The ailerons tilt the wings, which rolls the aircraft."
        />
      </Field>
      {problem && <p className="quiz-problem">{problem}</p>}
    </section>
  );
}

export function QuizEditor({
  quiz,
  showProblems,
  onChange,
}: {
  quiz: QuizDraft;
  showProblems: boolean;
  onChange: (change: QuizChange) => void;
}) {
  const updateQuestion = (key: number, update: (question: QuestionDraft) => QuestionDraft) =>
    onChange((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.key === key ? update(question) : question,
      ),
    }));

  return (
    <div className="quiz-editor">
      {quiz.questions.map((question, index) => (
        <QuestionCard
          key={question.key}
          question={question}
          number={index + 1}
          count={quiz.questions.length}
          showProblems={showProblems}
          onChange={(update) => updateQuestion(question.key, update)}
          onMove={(offset) =>
            onChange((current) => {
              const at = current.questions.findIndex((item) => item.key === question.key);
              return { ...current, questions: moveItem(current.questions, at, offset) };
            })
          }
          onRemove={() =>
            onChange((current) => ({
              ...current,
              questions: current.questions.filter((item) => item.key !== question.key),
            }))
          }
        />
      ))}
      {showProblems && !quiz.questions.length && (
        <p className="quiz-problem">Add at least one question, or remove this quiz.</p>
      )}
      <button
        type="button"
        className="form-add"
        onClick={() =>
          onChange((current) => ({ ...current, questions: [...current.questions, emptyQuestion()] }))
        }
      >
        + Add question
      </button>
    </div>
  );
}
