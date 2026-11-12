# Day 4 – Learner quiz experience: readiness check and build plan

Date: 2026-11-11
Branch: `Dev-branch` (checked at `e5b0e8d Add assessment backend foundation`)

## Verdict

Updated 2026-11-12. The Day 2 defects below are fixed on `Dev-branch`. Day 4
is still **waiting on Day 3**: neither `origin` nor any fork has instructor
quiz tools. `origin/Dev-branch` still ends at `e5b0e8d`, and there are no
other branches or open pull requests. Day 4 starts once the Day 3 work is
pushed.

## What the earlier days delivered

| Day | Status | Evidence |
| --- | --- | --- |
| 1 – Design | Done | The rules are written in `README.md`, and the backend now enforces them (see "Assessment rules the backend enforces"). |
| 2 – Database and backend | Done | `supabase/004_assessments.sql`, `supabase/005_assessment_fixes.sql` and the assessment routes in `backend/server.js` |
| 3 – Instructor tools | **Not pushed** | There is no assessment code in `frontend/`. `CourseBuilderPage.tsx` has no quiz editor. |

## Fixed on 2026-11-12

- **Saving a course detached its lesson quizzes.** `replaceChildren` now
  reads each quiz's lesson before the save and attaches it again afterwards,
  including when a failed save is rolled back. A lesson that sends `quizId`
  back keeps its quiz after being renamed.
- **The answer key was readable straight from Supabase.** By default
  Supabase grants `anon` and `authenticated` access to every public table, so
  the 004 policy on `answer_choices` exposed `is_correct`. 005 removes that
  policy and the grants. It also hides `questions.explanation` from clients,
  stops members inserting their own attempts, and hides final-exam quizzes in
  draft courses.
- **The learner GET returned explanations.** Explanations now arrive only in
  the attempt review. Staff get the answer key and explanations.
- **Learner routes ignored course status.** Members get 404 for assessments
  in draft courses, and can't submit to them either.
- **Editing a quiz gave every question a new id.** Questions and choices sent
  back with their `id` are now updated in place.
- **Day 1 numbers were not enforced.** Lesson quizzes now need 10–25
  questions and final exams need exactly 50. The default pass mark is 80%.
  Adding or deleting a single question respects the same limits.
- **A failed certificate step still used up an attempt.** The attempt and
  completion are now removed and the member gets a 500 response.
- Lessons in course responses now carry `id`. The frontend type also has an
  optional `quizId`, which Day 3 should send back.

## Still open for Day 4

- **No way to read past attempts.** Results must show up on any browser or
  device. Add `GET /api/quizzes/:quizId/attempts`, which returns the member's
  attempts, newest first: `id, attempt_number, score, passed, submitted_at`.
  Add `?review=latest`, which rebuilds the review for the newest attempt on the
  server. Reviews must skip any question that was deleted since the attempt,
  and show the stored score. Members can also read their own rows directly
  through RLS, but the review needs the answer key, so it has to come from the
  backend.
- **Run `005_assessment_fixes.sql` on Supabase.** It has not been applied to
  any environment yet.

## Day 4 build plan (once the blockers are cleared)

### Backend

1. (Done on 2026-11-12: explanations hidden, published check added.)
2. Add `GET /api/quizzes/:quizId/attempts` with `?review=latest`. Add tests to
   `backend/test/server.test.js` that cover:
   - the learner GET has no `isCorrect` or `explanation` fields
   - a member only sees their own attempts
   - the review is only returned for an attempt the member has submitted
3. Lesson lookup: `toCourse()` now returns `lesson.id`. The lesson page calls
   `GET /api/lessons/:lessonId/assessment` for the current lesson and treats
   404 as "no quiz". `quizId` was left out of course responses on purpose,
   because reading it would make every course read depend on 004 having been
   run.

### Frontend

New feature folder `frontend/features/quiz/`:

- `quizApi.ts`: `loadLessonQuiz(lessonId)`, `submitAttempt(quizId, answers)`
  and `loadAttempts(quizId, { review })`. They use the same bearer token
  pattern as `features/staff/courseApi.ts`.
- `LessonQuiz.tsx`: a single component with four states:
  - **Intro**: the title, the question count, "Unlimited retakes", and the best
    and latest score if there are earlier attempts
  - **Answering**: every question on one page, one radio group per question,
    and a count of answered questions
  - **Submitting**: the button is disabled and answers are locked
  - **Result**: the score, then each question marked correct or incorrect, the
    member's choice, the correct choice, and the explanation, followed by a
    "Retake quiz" button
  - The submit button stays disabled until every question has an answer. This
    matches the backend 400 response, "Answer every question before
    submitting".
  - Answers are kept in component state only. A refresh loses an unsubmitted
    quiz on purpose, because nothing is saved before submission.
- `quiz.css`: uses the existing tokens from `frontend/index.css` (`--navy`,
  `--blue`, `--sky`, `--line`, `--green`, `--red`, `--muted`, DM Sans). The
  quiz panel replaces the existing `.future` placeholder block style used on
  the lesson page. Style rules:
  - Correct and incorrect states use a full 1px border plus an icon (`check` /
    `x` from the existing `Icon` set) and a text label ("Your answer",
    "Correct answer"). Do not use coloured left-edge borders or tinted
    one-sided cards. Colour is never the only signal.
  - Corner radii and spacing match the `.resource` card style (10px, 1px
    `--line` border, white background).
  - The layout works on phones: choices stack full width, and touch targets are
    at least 44px.
- `Lesson` in `App.tsx` (line ~1400): render `<LessonQuiz>` below the lesson
  body and above `.lesson-nav` when the lesson has a quiz and a member is
  signed in.
- `ProgressPage`: optionally show the latest quiz score for each lesson. This
  is cheap once `loadAttempts` exists.

### Tests

- `frontend/test/quiz.test.ts`: pure helpers, such as
  `allAnswered(quiz, answers)`, `bestScore(attempts)`, and mapping the review
  onto questions when ids are missing.
- Backend tests listed above.
- Manual: take a quiz in one browser, open the lesson in a second browser
  signed in as the same member, and confirm the latest result and its review
  appear there. Check that the answer key is absent from the GET response in
  DevTools.

### Commits (planned)

1. Done: `Keep answer keys and scores out of reach of the browser`
2. Done: `Enforce the agreed assessment rules and keep quizzes when courses change`
3. `Add learner quiz attempt history endpoint`
4. `Show lesson quizzes on the lesson page`
5. `Show quiz results and retakes across devices`

## Hand-off to Day 5

Day 5 can reuse the following:

- `quizApi.ts` already submits to the same `POST /api/quizzes/:id/attempts`
  that final exams use. The response already includes `attemptsRemaining`,
  `passed` and `certificate`.
- `LessonQuiz.tsx` should split the question list and the result review into
  `QuizQuestions` and `QuizReview`. A `FinalExam` component can then add
  attempts remaining, the pass/fail result and the lockout around them.
- The attempts endpoint already returns `passed` and `attempt_number`, which is
  enough for "2 of 3 attempts used" and "Passed – exam closed".
- Open items for Day 5:
  - define "completed required content" (all lessons marked done? all lesson
    quizzes attempted?)
  - make the attempt insert and the certificate issue a single transaction
    (for example a Postgres function called through `rpc`). Today a failure is
    undone by deleting the attempt, which is good enough but not atomic.
