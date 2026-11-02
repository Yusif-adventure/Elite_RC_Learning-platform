create extension if not exists "pgcrypto";

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text not null default '',
  difficulty text not null default 'Beginner',
  duration text not null default 'Self-paced',
  instructor text not null,
  instructor_image_url text,
  image_url text,
  category text not null default 'General',
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_objectives (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  objective text not null,
  position integer not null default 0
);

create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  unique (course_id, title)
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  youtube_url text,
  unique (section_id, title)
);

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  resource_type text not null check (resource_type in ('slide', 'video')),
  name text not null,
  storage_path text,
  url text not null,
  mime_type text,
  size_bytes bigint,
  position integer not null default 0
);

create index if not exists course_objectives_course_id_idx
  on public.course_objectives(course_id, position);
create index if not exists course_sections_course_id_idx
  on public.course_sections(course_id, position);
create index if not exists course_lessons_section_id_idx
  on public.course_lessons(section_id, position);
create index if not exists lesson_resources_lesson_id_idx
  on public.lesson_resources(lesson_id, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

insert into public.courses
  (title, description, difficulty, duration, instructor, image_url, category)
values
  (
    'Introduction to RC Planes',
    'Learn the parts, principles, and safe setup of your first radio-controlled aircraft.',
    'Beginner',
    '2h 45m',
    'Daniel Mensah',
    'https://images.unsplash.com/photo-1671966952010-d6befd39cdb2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600',
    'RC Planes'
  ),
  (
    'Transmitters & Receivers',
    'Master radio links, channels, binding, range checks, and failsafe configuration.',
    'Beginner',
    '1h 50m',
    'Sarah Owusu',
    'https://images.unsplash.com/photo-1614788888074-ccc3d721da27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1000',
    'Electronics'
  )
on conflict (title) do nothing;

insert into storage.buckets (id, name, public)
values
  ('course-images', 'course-images', true),
  ('instructor-images', 'instructor-images', true),
  ('lesson-resources', 'lesson-resources', true)
on conflict (id) do nothing;

drop policy if exists "Public course media read" on storage.objects;
create policy "Public course media read"
on storage.objects for select
using (bucket_id in ('course-images', 'instructor-images', 'lesson-resources'));

insert into public.course_objectives (course_id, objective, position)
select c.id, seed.objective, seed.position
from public.courses c
join (values
  ('Introduction to RC Planes', 'Identify the main parts of a radio-controlled aircraft', 0),
  ('Introduction to RC Planes', 'Explain the basic forces that keep an aircraft flying', 1),
  ('Introduction to RC Planes', 'Prepare for a safe first flight', 2),
  ('Transmitters & Receivers', 'Explain how a transmitter communicates with a receiver', 0),
  ('Transmitters & Receivers', 'Bind a transmitter and receiver', 1),
  ('Transmitters & Receivers', 'Perform a range check and configure failsafe', 2)
) as seed(course_title, objective, position) on seed.course_title = c.title
where not exists (
  select 1 from public.course_objectives o
  where o.course_id = c.id and o.objective = seed.objective
);

insert into public.course_sections (course_id, title, position)
select c.id, seed.section_title, seed.position
from public.courses c
join (values
  ('Introduction to RC Planes', 'Getting to Know RC Aircraft', 0),
  ('Introduction to RC Planes', 'Electronics & Control Systems', 1),
  ('Introduction to RC Planes', 'Preparing to Fly', 2),
  ('Transmitters & Receivers', 'Radio Control Basics', 0),
  ('Transmitters & Receivers', 'Transmitters & Channels', 1),
  ('Transmitters & Receivers', 'Binding and Setup', 2)
) as seed(course_title, section_title, position) on seed.course_title = c.title
on conflict (course_id, title) do nothing;

insert into public.course_lessons (section_id, title, position, youtube_url)
select s.id, seed.lesson_title, seed.position, seed.youtube_url
from public.course_sections s
join public.courses c on c.id = s.course_id
join (values
  ('Introduction to RC Planes', 'Getting to Know RC Aircraft', 'Welcome to the workshop', 0, null),
  ('Introduction to RC Planes', 'Getting to Know RC Aircraft', 'Anatomy of an RC Plane', 1, null),
  ('Introduction to RC Planes', 'Electronics & Control Systems', 'How an aircraft stays in the air', 0, null),
  ('Transmitters & Receivers', 'Radio Control Basics', 'Welcome to radio control', 0, null),
  ('Transmitters & Receivers', 'Transmitters & Channels', 'Understanding channels', 0, null),
  ('Transmitters & Receivers', 'Binding and Setup', 'Binding your receiver', 0, null)
) as seed(course_title, section_title, lesson_title, position, youtube_url)
  on seed.course_title = c.title and seed.section_title = s.title
on conflict (section_id, title) do nothing;
