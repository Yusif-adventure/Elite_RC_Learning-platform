-- Assessments, final exams, attempts, completion, and certificates.
-- Run after 001, 002, and 003. Safe to run more than once.

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  explanation text,
  position integer not null default 0
);

create table if not exists public.answer_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  choice_text text not null,
  is_correct boolean not null default false,
  position integer not null default 0
);

create table if not exists public.lesson_assessments (
  lesson_id uuid primary key references public.course_lessons(id) on delete cascade,
  quiz_id uuid not null unique references public.quizzes(id) on delete cascade
);

create table if not exists public.final_exams (
  course_id uuid primary key references public.courses(id) on delete cascade,
  quiz_id uuid not null unique references public.quizzes(id) on delete cascade,
  pass_mark numeric(5,2) not null default 70
    check (pass_mark >= 0 and pass_mark <= 100)
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('lesson', 'final')),
  attempt_number integer not null check (attempt_number > 0),
  answers jsonb not null default '{}'::jsonb,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  passed boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (user_id, quiz_id, attempt_number)
);

create table if not exists public.course_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_identifier text not null unique default upper(encode(gen_random_bytes(8), 'hex')),
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists questions_quiz_id_idx
  on public.questions(quiz_id, position);
create index if not exists answer_choices_question_id_idx
  on public.answer_choices(question_id, position);
create index if not exists assessment_attempts_user_quiz_idx
  on public.assessment_attempts(user_id, quiz_id, attempt_number);
create index if not exists assessment_attempts_quiz_idx
  on public.assessment_attempts(quiz_id, submitted_at);
create index if not exists course_completions_user_idx
  on public.course_completions(user_id, completed_at);
create index if not exists certificates_user_idx
  on public.certificates(user_id, issued_at);

drop trigger if exists quizzes_set_updated_at on public.quizzes;
create trigger quizzes_set_updated_at
before update on public.quizzes
for each row execute function public.set_updated_at();

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.answer_choices enable row level security;
alter table public.lesson_assessments enable row level security;
alter table public.final_exams enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.course_completions enable row level security;
alter table public.certificates enable row level security;

grant select on public.quizzes, public.questions, public.lesson_assessments,
  public.final_exams to anon, authenticated;
grant select, insert on public.assessment_attempts to authenticated;
grant select on public.course_completions, public.certificates to authenticated;

drop policy if exists "Published lesson quizzes are readable" on public.quizzes;
create policy "Published lesson quizzes are readable"
on public.quizzes for select
using (
  exists (
    select 1 from public.lesson_assessments la
    join public.course_lessons l on l.id = la.lesson_id
    join public.course_sections s on s.id = l.section_id
    join public.courses c on c.id = s.course_id
    where la.quiz_id = quizzes.id and c.status = 'published'
  )
  or exists (select 1 from public.final_exams fe where fe.quiz_id = quizzes.id)
);

drop policy if exists "Published quiz questions are readable" on public.questions;
create policy "Published quiz questions are readable"
on public.questions for select
using (exists (select 1 from public.quizzes q where q.id = quiz_id));

drop policy if exists "Published answer choices are readable" on public.answer_choices;
create policy "Published answer choices are readable"
on public.answer_choices for select
using (exists (select 1 from public.questions q where q.id = question_id));

drop policy if exists "Published lesson assessments are readable" on public.lesson_assessments;
create policy "Published lesson assessments are readable"
on public.lesson_assessments for select
using (exists (
  select 1 from public.course_lessons l
  join public.course_sections s on s.id = l.section_id
  join public.courses c on c.id = s.course_id
  where l.id = lesson_id and c.status = 'published'
));

drop policy if exists "Published final exams are readable" on public.final_exams;
create policy "Published final exams are readable"
on public.final_exams for select
using (exists (
  select 1 from public.courses c
  where c.id = course_id and c.status = 'published'
));

drop policy if exists "Members see their assessment attempts" on public.assessment_attempts;
create policy "Members see their assessment attempts"
on public.assessment_attempts for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members submit their assessment attempts" on public.assessment_attempts;
create policy "Members submit their assessment attempts"
on public.assessment_attempts for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Members see their completions" on public.course_completions;
create policy "Members see their completions"
on public.course_completions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members see their certificates" on public.certificates;
create policy "Members see their certificates"
on public.certificates for select
to authenticated
using ((select auth.uid()) = user_id);
