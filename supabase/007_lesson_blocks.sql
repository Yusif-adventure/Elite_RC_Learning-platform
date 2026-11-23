-- Lesson blocks: text, images, YouTube, PDFs, videos, HTML and arrange-the-lines
-- activities that an instructor stacks to build a lesson. Run after 006.
-- Safe to run more than once.
--
-- Existing lessons get an empty list, so they look exactly as before. Until
-- this file is run, the backend keeps reading and saving lessons without
-- blocks, and refuses only a save that adds blocks.

alter table public.course_lessons
  add column if not exists blocks jsonb not null default '[]'::jsonb;

alter table public.course_lessons
  drop constraint if exists course_lessons_blocks_is_list;
alter table public.course_lessons
  add constraint course_lessons_blocks_is_list check (jsonb_typeof(blocks) = 'array');

-- Blocks are read with their lesson, so the existing lesson policies cover
-- them: anyone can read the lessons of published courses, and only the
-- backend writes.
