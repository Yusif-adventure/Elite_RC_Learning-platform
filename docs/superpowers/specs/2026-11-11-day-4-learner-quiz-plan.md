# Day 4 – Learner quiz experience: readiness check and build plan

Date: 2026-11-11
Branch: `Dev-branch` (checked at `e5b0e8d Add assessment backend foundation`)

## Verdict

Day 4 is **not started**. One earlier phase is missing and two Day 2 defects
would break the learner experience. Fix the items under "Blockers" first, then
follow the build plan below.

## What the earlier days delivered

| Day | Status | Evidence |
| --- | --- | --- |
| 1 – Design | Partly done | The rules are written in `README.md` ("Learner assessments and certification"). The agreed numbers are not enforced anywhere: 10–25 questions per lesson quiz, 50 questions per final exam, and an 80% pass mark. |
| 2 – Database and backend | Done, with defects | `supabase/004_assessments.sql` and the assessment routes in `backend/server.js` (lines 746–1060) |
| 3 – Instructor tools | **Not done** | There is no assessment code in `frontend/`. `CourseBuilderPage.tsx` has no quiz editor, so staff cannot create a quiz without calling the API directly. |

## Blockers (must be resolved before Day 4)

1. **Day 3 instructor UI is missing.** Learners can only take a quiz that an
   instructor created, and Day 4 cannot be tested end to end without one.
   Day 3 must ship first, or the team must agree to seed quizzes through the
   API for testing only.

2. **Saving a course deletes its lesson quizzes.** `PUT /api/courses/:id` calls
   `replaceChildren`, which deletes and re-inserts every section and lesson.
   `lesson_assessments.lesson_id` references `course_lessons(id) on delete
   cascade`, so every lesson quiz is detached the next time a course is saved.
   The attempts survive, but they point at a quiz that no longer belongs to any
   lesson. Options, in order of preference:
   - Update lessons in place by id instead of deleting and re-inserting them.
     This is the right fix, and it also lets lesson progress move off the
     `[section, title]` key in `frontend/progress.ts`.
   - Or, at minimum, read the `lesson_assessments` rows before the replace and
     re-attach them by `(section title, lesson title)` afterwards. This is the
     same matching rule that `lessonKey()` already uses for progress.

3. **The learner GET leaks explanations before submission.** `publicQuiz()`
   always includes `explanation`, and `GET /api/lessons/:lessonId/assessment`
   returns it to learners. Explanations usually give the answer away. The
   learner view must remove `explanation`, while `includeAnswers` and the
   staff editor keep it. The `questions` RLS policy also lets any client read
   `explanation` straight from Supabase. Either revoke column access
   (`revoke select (explanation) on public.questions from anon, authenticated`)
   or move explanations into a table that only the service role can read.

## Smaller Day 2 gaps that Day 4 touches

These do not block the build, but the Day 4 work should fix them because it
uses the same code:

- **No way to read past attempts.** Day 4 requires results to show up on any
  browser or device. Add `GET /api/quizzes/:quizId/attempts`, which returns the
  member's attempts, newest first: `id, attempt_number, score, passed,
  submitted_at`. Add an optional `?review=latest` that rebuilds the review for
  the newest attempt on the server, using the same shape as the POST response.
  The answer key must stay on the backend.
- **Editing a quiz breaks the review of old attempts.** `saveQuizQuestions`
  deletes every question and creates new ids, so the `answers` JSON in older
  attempts points at ids that no longer exist. For Day 4, reviews should skip
  questions they cannot match and show the stored score. The long-term fix is
  to update questions in place (this belongs with the Day 3 editor).
- **Learner GET does not check that the course is published.** It reads with
  `supabaseAdmin`, which bypasses RLS. Check that the lesson's course is
  `published` (staff may skip this check).
- **Day 1 numbers are not enforced.** `validateQuiz` should take the
  assessment type: lesson quizzes need 10–25 questions, final exams need exactly
  50, and the final-exam pass mark should default to 80 instead of 70. This is
  Day 3/Day 5 territory, but the learner UI should not hard-code question
  counts.
- **A failed save could still count as an attempt.** The attempt row is
  inserted before the certificate work. If the certificate step fails, the
  member gets a 500 response but the attempt is already counted. This matters
  for final exams on Day 5 and is tested on Day 6.

## Day 4 build plan (once the blockers are cleared)

### Backend

1. Remove `explanation` from the learner `GET` response and add the published
   course check.
2. Add `GET /api/quizzes/:quizId/attempts` with `?review=latest`. Add tests to
   `backend/test/server.test.js` that cover:
   - the learner GET has no `isCorrect` or `explanation` fields
   - a member only sees their own attempts
   - the review is only returned for an attempt the member has submitted
3. Add a lesson quiz lookup so the lesson page can tell whether a quiz exists.
   The page knows lessons by index and `lessonKey`, not by database id, so
   either:
   - `toCourse()` returns `lesson.id` and `lesson.quizId` (preferred, because it
     saves a request per lesson), or
   - the frontend calls `GET /api/lessons/:lessonId/assessment` and treats 404
     as "no quiz".

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

1. `Keep lesson quizzes when a course is saved` (blocker 2)
2. `Hide explanations until a quiz is submitted` (blocker 3 and the published
   check)
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
    (for example a Postgres function called through `rpc`)
  - enforce 50 questions and the 80% default pass mark
