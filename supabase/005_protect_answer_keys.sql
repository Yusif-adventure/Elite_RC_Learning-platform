-- Keeps quiz answer keys and explanations out of browsers, and leaves scoring
-- to the backend. Run after 004. Safe to run more than once.
--
-- 004 let anyone holding the public anon key read answer_choices, including
-- is_correct, and questions, including explanations, for published quizzes.
-- It also let signed-in members insert their own attempts with any score.
--
-- Learners load quizzes and submit attempts through the backend, which uses
-- the service role key. That key is not affected by anything below.

-- Questions and answer choices are only read by the backend, which hides the
-- answer key and explanations until a learner has submitted.
drop policy if exists "Published answer choices are readable" on public.answer_choices;
drop policy if exists "Published quiz questions are readable" on public.questions;
revoke all on public.answer_choices from anon, authenticated;
revoke all on public.questions from anon, authenticated;

-- Members can still read their own attempts, but only the backend records
-- them, so scores and the three-attempt final exam limit cannot be bypassed.
drop policy if exists "Members submit their assessment attempts" on public.assessment_attempts;
revoke insert, update, delete on public.assessment_attempts from anon, authenticated;
