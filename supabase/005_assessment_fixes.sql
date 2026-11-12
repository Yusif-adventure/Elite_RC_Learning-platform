-- Fixes to 004_assessments.sql found before the learner quiz work.
-- Run after 004. Safe to run more than once.
--
-- Members only reach quizzes through the backend, which removes the answer key
-- and explanations until an attempt is submitted and calculates every score.
-- These rules stop a member's sign-in token, or the public anon key, from
-- going around the backend.

-- 1. The agreed final-exam pass mark is 80%.
alter table public.final_exams alter column pass_mark set default 80;

-- 2. Answer choices hold the answer key (is_correct). Supabase grants every
--    public table to anon and authenticated by default, so the old read
--    policy let anyone read the key directly. With no policy and no grant,
--    only the backend's service role can read choices.
drop policy if exists "Published answer choices are readable" on public.answer_choices;
revoke all on public.answer_choices from anon, authenticated;

-- 3. Explanations usually give the answer away. Clients may read the other
--    question columns, but not the explanation.
revoke all on public.questions from anon, authenticated;
grant select (id, quiz_id, question_text, position) on public.questions to anon, authenticated;

-- 4. Scores are calculated by the backend. Members may read their own
--    attempts but not write them, or they could record any score they liked.
drop policy if exists "Members submit their assessment attempts" on public.assessment_attempts;
revoke insert, update, delete on public.assessment_attempts from anon, authenticated;

-- 5. Completions and certificates are only issued by the backend.
revoke insert, update, delete on public.course_completions, public.certificates from anon, authenticated;

-- 6. Final-exam quizzes were readable even for draft courses.
drop policy if exists "Published lesson quizzes are readable" on public.quizzes;
drop policy if exists "Published quizzes are readable" on public.quizzes;
create policy "Published quizzes are readable"
on public.quizzes for select
using (
  exists (
    select 1 from public.lesson_assessments la
    join public.course_lessons l on l.id = la.lesson_id
    join public.course_sections s on s.id = l.section_id
    join public.courses c on c.id = s.course_id
    where la.quiz_id = quizzes.id and c.status = 'published'
  )
  or exists (
    select 1 from public.final_exams fe
    join public.courses c on c.id = fe.course_id
    where fe.quiz_id = quizzes.id and c.status = 'published'
  )
);

-- Questions keep their policy from 004. It checks that the quiz exists, and
-- the quizzes policy above applies inside that check, so questions from draft
-- courses stay hidden as well.
