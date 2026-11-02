# Staff course saving: short design

Date: 2026-11-02. Status: approved. Base: `Dev-branch` at `7fcc192`.

## Why

Friday's pilot needs one shared course library. Courses already load from the
backend, but staff create, edit, and delete actions still only change the
current browser. A course saved today disappears on refresh and never reaches
other members.

## Goals

- Create, edit, and delete in the staff pages go through the backend, and
  `localStorage` is no longer used for courses.
- A course created in one browser appears in another browser after a refresh.
- Images, slides, and video previews are stored in Supabase Storage. The
  database keeps only their links.
- Save and upload problems show a clear message, and failed edits do not lose
  course content.
- Learners open the lesson they selected.

## Not in this work

- Sign-in or staff-only protection (Wednesday).
- Draft and publish screens, upload progress bars, and
  live updates without a refresh.

## Must not happen

- Real courses change during testing.
- A failed save silently loses a course's sections, lessons, or files.
- The Supabase secret key reaches the frontend, GitHub, or a chat.

## Approaches for file uploads

- **A. Through our backend (chosen by Eugene).** One place to check files and
  to protect on Wednesday. Large files are slower, so the backend sets limits.
- **B. Directly from the browser to Supabase.** Handles bigger files more
  easily, but uploads stay open to anyone until Wednesday and need more
  permission rules.
- **C. No uploads for Friday.** Least work, but staff lose a feature the course
  builder has today.

## Decisions

Backend (`backend/server.js`):

- Add an upload route that checks each file's size and type, gives it a unique
  name, stores it in the matching bucket, and returns its name and link.
- *My call:* uploads and saving use the Supabase secret (`service_role`) key, set
  as `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`. The first real test showed
  that row-level security refuses course writes from the anon key. Keeping the
  anon key read-only is safer than adding a write rule for it, because that key
  becomes public if Wednesday's sign-in uses it in the browser. Without the
  secret key, courses can still be read, but saving and uploads return a clear
  error. Eugene approved this use of the key, and the teammate is to be told.
- *My call:* limits are 10 MB for images, 20 MB for slides, and 50 MB for video
  previews. The first version kept the 3 MB and 5 MB limits from browser
  storage, which no longer apply. 50 MB is the largest single file the team's
  Supabase project accepts (tested 2026-11-02).
- Reject repeated section titles, repeated lesson titles within a section, and
  lessons with no matching section before any data changes.
- If an edit fails partway, put the previous sections and lessons back.
- Return clear JSON errors, including for a repeated course title and a file
  that is too large.

Frontend (`frontend/App.tsx`, `frontend/features/staff/StaffPages.tsx`):

- Courses carry their `id`. Edit and delete use the `id`, not the title.
- Saving becomes asynchronous. Save is disabled while a save or upload is
  running, and errors appear on the form.
- *My call:* files upload when they are selected, and the form keeps the
  returned link. If staff abandon the form, unused files stay in storage, which
  is acceptable for the pilot.
- *My call:* every save from the builder is published, and an edit keeps the
  course's current status. Without this, the backend's `draft` default hides the
  course from the list.
- Block saving a section that has lessons but no title, because those lessons
  are currently dropped.
- Lesson links match on section and title together. A section with no lessons
  shows a "coming soon" note instead of the invented "Part 1" lessons.
- If there are no courses, the empty screen offers a way into the staff
  workspace, so staff can add the first one.
- *Added at Eugene's request:* a few UI fixes. Small labels are at least 11px,
  text people read is at least 14px, and Edit and Delete sit side by side in the
  staff list.
- *Added at Eugene's request:* a redesigned course form with step cards, drag and
  drop, previews, a learner preview, and a save bar that stays on screen. Staff
  can now remove outcomes, sections, lessons, and files, and set a category and
  duration. *My call:* a category is required so a new course appears under the
  catalog filters, and a YouTube link must be a YouTube address.

## Testing on the team's database

- Create and edit only one course, named `TEST - do not use`. Never edit the
  real courses.
- Eugene approved deleting the test course. Delete nothing else.
- The first create was refused by row-level security, which led to saving with
  the secret key.
- The full test then passed on the team's database on 2026-11-02: upload, create,
  second-browser view, edit, cancelled delete, and delete. The real courses
  did not change.
- Those folders also hold real course files, so never clear a whole folder. The
  test files from these runs were removed individually.
- Run the two-browser test from a separate browser profile, with a refresh.

## Left to the builder

File layout, how the upload route receives files, and the exact messages.

## Open items

- Deleting a course, or removing or replacing a file in the form, does not remove
  the file from storage.
- A 50 MB file took about a minute to reach Supabase in testing, and the form
  shows only "Uploading..." with no progress bar. Node stops receiving a request
  after 5 minutes, so a very slow connection can fail on a large file.
- Big files also load slowly for learners. An 11 MB file took 16 to 145 seconds to
  download on the builder's connection, so previews should stay compressed.
- If the connection drops during an upload, the form shows "fetch failed", which
  is not a clear message.

## Handoff

- **Wednesday:** create, edit, delete, and upload routes are open and use the
  secret key, so protect them with sign-in. The team's project refuses anon
  writes to `courses`, but the SQL file does not turn on row-level security, so a
  new project built from it would not. Check every table before the anon key is
  used in the browser.
- **Thursday:** the backend host must accept 50 MB requests, which rules out
  hosts with smaller limits. Set `SUPABASE_SERVICE_ROLE_KEY` on the host.
