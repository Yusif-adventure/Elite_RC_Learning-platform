-- Reusable lesson block templates. An instructor writes HTML, CSS and
-- JavaScript once, with {{placeholders}} for the parts that change, saves it
-- as a template, and fills in the placeholders each time it is used.
-- Run after 007. Safe to run more than once.
--
-- A lesson keeps its own copy of the template's code, so changing or
-- deleting a template never changes a lesson that already uses it.

create table if not exists public.lesson_block_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  html text not null,
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists lesson_block_templates_set_updated_at on public.lesson_block_templates;
create trigger lesson_block_templates_set_updated_at
before update on public.lesson_block_templates
for each row execute function public.set_updated_at();

-- Only the backend reads and writes templates, for staff and instructors.
alter table public.lesson_block_templates enable row level security;
revoke all on public.lesson_block_templates from anon, authenticated;
