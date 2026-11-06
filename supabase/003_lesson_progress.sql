-- Lesson progress: which lessons each member has marked complete.
-- Run after 001 and 002. Safe to run more than once.
--
-- The browser reads and writes this table directly with the member's own
-- sign-in. Row-level security below limits every member to their own rows,
-- so nobody can see or change anyone else's progress.
--
-- Lessons are identified by lesson_key, made from the section and lesson
-- title, because saving a course in the staff workspace replaces its lesson
-- rows. Renaming a lesson resets its progress; deleting a course removes it.

create table if not exists public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id, lesson_key)
);

alter table public.lesson_progress enable row level security;

grant select, insert, delete on public.lesson_progress to authenticated;

drop policy if exists "Members see their own progress" on public.lesson_progress;
create policy "Members see their own progress"
on public.lesson_progress for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members record their own progress" on public.lesson_progress;
create policy "Members record their own progress"
on public.lesson_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Members clear their own progress" on public.lesson_progress;
create policy "Members clear their own progress"
on public.lesson_progress for delete
to authenticated
using ((select auth.uid()) = user_id);
