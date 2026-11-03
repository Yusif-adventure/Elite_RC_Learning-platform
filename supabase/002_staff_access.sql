-- Staff access and read-only public access to courses.
-- Safe to run more than once.

-- 1. Row-level security
-- The browser holds the anon key, so the database itself must refuse writes
-- from it. With row-level security on and only read policies below, the anon
-- key and signed-in members can read published courses but change nothing.
-- The backend writes with the service role key, which bypasses these rules,
-- and only after it has checked that the request comes from a staff account.

alter table public.courses enable row level security;
alter table public.course_objectives enable row level security;
alter table public.course_sections enable row level security;
alter table public.course_lessons enable row level security;
alter table public.lesson_resources enable row level security;

drop policy if exists "Published courses are public" on public.courses;
create policy "Published courses are public"
on public.courses for select
using (status = 'published');

drop policy if exists "Objectives of published courses are public" on public.course_objectives;
create policy "Objectives of published courses are public"
on public.course_objectives for select
using (exists (
  select 1 from public.courses c
  where c.id = course_id and c.status = 'published'
));

drop policy if exists "Sections of published courses are public" on public.course_sections;
create policy "Sections of published courses are public"
on public.course_sections for select
using (exists (
  select 1 from public.courses c
  where c.id = course_id and c.status = 'published'
));

drop policy if exists "Lessons of published courses are public" on public.course_lessons;
create policy "Lessons of published courses are public"
on public.course_lessons for select
using (exists (
  select 1 from public.course_sections s
  join public.courses c on c.id = s.course_id
  where s.id = section_id and c.status = 'published'
));

drop policy if exists "Resources of published courses are public" on public.lesson_resources;
create policy "Resources of published courses are public"
on public.lesson_resources for select
using (exists (
  select 1 from public.course_lessons l
  join public.course_sections s on s.id = l.section_id
  join public.courses c on c.id = s.course_id
  where l.id = lesson_id and c.status = 'published'
));

-- 2. Making someone staff
-- Staff are marked with "role": "staff" in app_metadata. Members cannot edit
-- app_metadata themselves, unlike user_metadata, which they can.
-- The person must sign up in the app first. Then run this in the Supabase
-- SQL Editor with their email address, and ask them to sign out and back in.
--
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "staff"}'::jsonb
-- where email = 'person@example.com';
--
-- To see who is staff:
--
-- select email from auth.users where raw_app_meta_data ->> 'role' = 'staff';
--
-- To remove staff access:
--
-- update auth.users
-- set raw_app_meta_data = raw_app_meta_data - 'role'
-- where email = 'person@example.com';
