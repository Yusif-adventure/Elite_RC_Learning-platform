-- Assessment rules that 004 and 005 leave open. Run after 005.
-- Safe to run more than once.

-- 1. The agreed final-exam pass mark is 80%.
alter table public.final_exams alter column pass_mark set default 80;

-- 2. Completions and certificates are only issued by the backend. Supabase
--    grants every public table to anon and authenticated by default, so take
--    the write rights away. Members can still read their own rows.
revoke insert, update, delete on public.course_completions, public.certificates from anon, authenticated;

-- 3. Final-exam quizzes were readable even for draft courses.
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
