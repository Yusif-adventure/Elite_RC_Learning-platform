# Elite RC Learning Hub

Elite RC Learning Hub is a practical online learning platform for RC pilots,
makers, and engineers. Learners can explore courses, review curricula, and
open lesson resources. Staff and instructors can create, edit, and delete
courses through a dedicated workspace.

## Current status

The project currently contains:

- A React and Vite frontend in [`frontend/`](./frontend/)
- An Express backend scaffold in [`backend/`](./backend/)
- A Supabase connection/status check in the backend
- Shared course data through the backend and Supabase
- A production frontend build that completes successfully

Courses, lessons, and uploaded files are stored in Supabase and reached through
the backend, so every browser sees the same courses. Members sign in with
Supabase Auth. Only staff accounts can create, edit, or delete courses or
upload files: the backend checks every such request (see
[Staff access](#staff-access)).

## Friday shared-pilot release plan

The target is a shared member pilot for Friday, November 6. Members should be
able to use the platform from different devices while we continue improving
the product.

### Friday MVP scope

The following capabilities must work before release:

1. Members can open the deployed site from different devices.
2. The course catalog and course content are shared rather than
   browser-specific.
3. Learners can browse courses, open course details, select the correct lesson,
   open slides and resources, watch previews, and open YouTube lessons.
4. Staff access is protected.
5. The site works on mobile and desktop.
6. Production deployment, error handling, and rollback instructions are ready.

Advanced profile editing, detailed progress tracking, staff dashboard
improvements, upload optimization, analytics, notifications, and course draft
workflows should not expand the Friday scope unless the core release is
already stable.

### Current launch blockers

- Production deployment configuration is not complete.
- Staff accounts must be granted in Supabase before launch (see
  [Staff access](#staff-access)).

### Week-of-release focus

#### Sunday - Decide and prepare

- Freeze the Friday MVP scope.
- Confirm the Supabase project and production credentials.
- Prepare the initial course content members should see.
- Prepare a launch checklist and test accounts.

#### Monday - Build shared course data

- Create Supabase tables for courses, sections, lessons, objectives, and
  resources.
- Add the initial course data.
- Add API endpoints for reading and managing courses.
- Add storage buckets for images, slides, and video previews.

#### Tuesday - Connect the frontend

- Replace `localStorage` as the primary course source.
- Add loading and error states.
- Make staff create, edit, and delete actions use the backend.
- Verify that a course created in one browser appears in another browser.

#### Wednesday - Add access control and test

- Add real Supabase authentication for members.
- Protect staff and instructor access.
- Test the complete learner path with real content.
- Test mobile layout, broken links, missing images, and invalid uploads.

#### Thursday - Prepare production

- Deploy the backend and frontend.
- Configure production environment variables and CORS.
- Test from a clean browser and a second device.
- Fix only release-blocking issues.
- Prepare member instructions and a rollback plan.

#### Friday - Release

- Run a final smoke test.
- Publish the release announcement.
- Monitor errors and member feedback.
- Record improvements for the next release instead of expanding Friday's
  scope.

## Assessment implementation plan

The assessment and certification work should be delivered in the following
daily phases. Each phase should be completed and tested before moving to the
next one.

### Day 1 - Confirm the assessment design

- Confirm the learner, instructor, staff, and certificate workflows.
- Confirm the lesson quiz rules, including unlimited retakes.
- Confirm the final-exam rules, including the pass mark and maximum of three
  attempts.
- Decide which course requirements must be completed before certification.
- Define the question, answer choice, quiz, exam attempt, certificate, and
  course-completion data fields.
- Define the permissions and data-protection rules for answer keys and
  assessment submissions.

### Day 2 - Build the database and backend foundation

- Add Supabase tables for quizzes, questions, answer choices, lesson
  assessments, final exams, assessment attempts, course completion, and
  certificates.
- Add indexes, relationships, and row-level security policies.
- Add backend endpoints for instructors to create, edit, reorder, and delete
  questions and assessments.
- Add learner endpoints for loading an assessment and submitting an attempt.
- Calculate scores on the backend.
- Enforce authorization, the three-attempt final-exam limit, and duplicate
  certificate protection on the backend.

### Day 3 - Build instructor assessment tools

- Add quiz management to the course and lesson builder.
- Allow instructors to create and edit multiple-choice questions.
- Allow instructors to add, edit, remove, and reorder answer choices.
- Allow instructors to select one correct answer and add an explanation.
- Add final-exam configuration, including the pass mark.
- Add validation for incomplete questions, missing correct answers, and invalid
  pass marks.
- Show clear save and validation errors.

### Day 4 - Build the learner quiz experience

- Display a lesson quiz from the relevant lesson page.
- Allow learners to select answers and submit a quiz.
- Show the score and question-by-question correct or incorrect feedback after
  submission.
- Show the correct answer and explanation after submission.
- Allow learners to retake lesson quizzes.
- Save and display quiz attempts and results across browsers and devices.
- Prevent learners from seeing answer keys before submission.

### Day 5 - Build final exams and certification

- Display the final exam when the learner has completed the required course
  content.
- Show the score, pass/fail result, and remaining attempts after submission.
- Enforce the three-attempt maximum and prevent further attempts after passing.
- Mark the course as complete when all requirements are met and the learner
  passes the final exam.
- Generate one certificate with a unique certificate identifier.
- Add certificate viewing, downloading, and staff verification.

### Day 6 - Test, secure, and release

- Test instructor creation, editing, deletion, ordering, and permissions.
- Test learner quiz submissions, retakes, scoring, and feedback.
- Test final-exam pass, fail, remaining-attempt, and all-attempts-used cases.
- Test failed submissions to confirm they do not consume an attempt.
- Test answer-key protection and row-level security.
- Test course completion and certificate generation across refreshes and
  multiple devices.
- Run frontend and backend test suites, fix release-blocking issues, and
  prepare the assessment release notes.

### Recommended fallback

Do not release the current browser-only course storage as a shared member
platform. If Supabase integration cannot be completed by Tuesday, launch with
preloaded, read-only shared courses and defer staff course editing until the
next release.

## Features

### Learner experience

- View the landing page and featured courses
- Browse and filter the course catalog
- Open a course details page
- View:
  - Course title
  - Description
  - Difficulty
  - Course image
  - Instructor name and profile image
  - Learning objectives
  - Sections and lessons
- Start a lesson from its overview page, which lists what the lesson includes
- Open uploaded slide resources
- Watch an uploaded short video preview
- Open the full lesson video on YouTube
- Move to the next or previous lesson
- Mark lessons complete, see progress on each course, and continue where they
  left off (needs [`supabase/003_lesson_progress.sql`](./supabase/003_lesson_progress.sql))
- See every started course on **My learning**
- Change their name and password on the profile page
- Use the browser's Back button, refresh, and share links: every page has its
  own address, such as `/courses/<id>/lessons/2`

### Instructor and staff experience

- Sign in with a staff account to land in the Staff Workspace, or open it from
  the **Staff Workspace** link, which only staff see
- View course assignments and course management screens
- Create a course with:
  - Course title
  - Description
  - Difficulty
  - Category
  - Duration
  - Instructor name
  - Instructor image
  - Course image
  - Learning objectives
- Create multiple sections in one course
- Add multiple lessons under each section
- Add lesson slides
- Add a short video preview
- Add a full YouTube video URL
- Edit an existing course
- Delete an existing course with confirmation
- Save courses to the shared database

## User requirements

The following requirements capture the product decisions made during
development.

### Course creation

1. Instructors must have a dedicated page or workspace.
2. The workspace must not put all instructor and staff logic in one file.
3. An instructor must be able to create a course.
4. A course must support a title, description, difficulty, instructor, course
   image, and instructor image.
5. A course must include a list of practical learning outcomes.
6. A saved course must appear on the public homepage and course catalog.
7. Course data must remain available after a browser refresh in the current
   prototype.

### Curriculum structure

1. A course must contain multiple sections.
2. Each section must support multiple different lessons.
3. A learner selecting a lesson must be taken to the selected lesson, not
   always to the first lesson.
4. The learner must see a lesson overview before starting the lesson content.
5. Selecting **Start lesson** must reveal the resources for that lesson.

### Lesson resources

1. A lesson must support slide uploads.
2. Uploaded slides must be openable or downloadable by learners.
3. A lesson must support a short video preview.
4. The short preview should play in the lesson page when the browser supports
   the uploaded format.
5. A lesson must support one full-video YouTube URL.
6. The YouTube URL must open as a valid external URL.
7. A separate generic lesson-links field is not required.
8. Short preview videos should be compressed MP4 files with H.264 video and
   AAC audio when possible.

### Course management

1. Instructors or staff must be able to edit an existing course.
2. Editing must preserve the course's sections, lessons, and resources unless
   the instructor changes them.
3. Instructors or staff must be able to delete a course.
4. Deletion must ask for confirmation before removing the course.
5. Save failures must be shown clearly instead of failing silently.

### Media and storage

1. Files are uploaded through the backend, which stores them in Supabase
   Storage.
2. Upload limits, checked in the browser and on the backend:
   - Video previews: 50 MB, the largest single file the Supabase project accepts
   - Course and instructor images: 10 MB
   - Slide files: 20 MB
3. Large media files must be stored in object/blob storage rather than browser
   local storage or a relational database record.
4. The database should store media metadata and URLs, not large base64 files.

### Learner assessments and certification

The platform must support knowledge checks after lessons and a final
certification exam at the end of a course.

#### Lesson quizzes

1. Instructors must be able to create a quiz and attach it to a lesson while
   creating or editing a course.
2. A lesson quiz must support multiple-choice questions.
3. Each question must include:
   - The question text
   - A list of answer choices
   - Exactly one correct answer
   - Optional feedback or an explanation for the correct answer
4. Instructors must be able to add, edit, remove, and reorder questions and
   answer choices.
5. Learners must be shown the quiz after completing or reaching the relevant
   lesson.
6. Learners must submit their selected answers and receive a score.
7. After submission, the learner must be able to see:
   - Which answers were correct
   - Which answers were incorrect
   - The correct answer for each missed question
   - Any instructor-provided explanation
8. Learners must be allowed to retake a lesson quiz without an attempt limit,
   unless a future course configuration adds one.
9. The system must save each learner's quiz attempts, score, answers, and
   submission time so progress can be displayed consistently across devices.
10. A learner must not be able to change submitted answers or access the answer
    key before submitting the quiz.

#### Final course examination

1. Instructors must be able to create a final exam for a course using
   multiple-choice questions.
2. The final exam must support the same question, answer-choice, correct-answer,
   explanation, editing, and ordering capabilities as lesson quizzes.
3. Instructors must be able to configure the final exam's pass mark as a
   percentage. The course must define a clear default pass mark if the
   instructor does not change it.
4. Learners must receive a score and pass/fail result after each submitted
   attempt.
5. Learners must have a maximum of three final-exam attempts per course.
6. The system must show the learner how many final-exam attempts remain.
7. A learner who fails all three attempts must not receive a certificate and
   must see a clear message explaining the result and any available next step.
8. A learner who meets or exceeds the pass mark must be marked as having passed
   the course, and further final-exam attempts must not be required.
9. Final-exam attempts must be stored with the selected answers, score,
   pass/fail result, attempt number, and submission time.
10. The final-exam answer key and explanations must be protected until the
    learner submits the attempt.

#### Course completion and certificates

1. A certificate must be issued only when the learner has completed the
   course requirements and passed the final exam.
2. The certificate must identify the learner, course, instructor or provider,
   completion date, and a unique certificate identifier.
3. A learner must be able to view and download their certificate after passing.
4. The learner's course completion and certificate status must remain available
   after signing out, refreshing the browser, or using another device.
5. Staff must be able to verify a certificate identifier and confirm whether it
   is valid.
6. Certificate issuance must be recorded so that refreshing the page or
   revisiting a completed course cannot create duplicate certificates.

#### Assessment administration and reliability

1. Only authorized instructors or staff may create or change quizzes, final
   exams, answer keys, pass marks, and certificate settings.
2. Learners may read and submit assessments only for courses they can access.
3. The backend must calculate scores and enforce the three-attempt final-exam
   limit; these rules must not depend only on browser code.
4. Save and submission failures must be shown clearly, and a failed submission
   must not consume an attempt.
5. Assessment data must be stored in the shared database rather than only in
   browser local storage.

## Project structure

```text
src/
├── frontend/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── features/
│       └── staff/
│           └── StaffPages.tsx
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── supabase/
│   └── 001_shared_course_data.sql
└── README.md
```

### Important frontend files

- [`frontend/App.tsx`](./frontend/App.tsx): public pages, navigation,
  course state, and lesson rendering.
- [`frontend/routes.ts`](./frontend/routes.ts): the address of every page.
- [`frontend/categories.ts`](./frontend/categories.ts): the one list of course
  categories used by the home page, the catalog, and the course builder.
- [`frontend/progress.ts`](./frontend/progress.ts) and
  [`progressApi.ts`](./frontend/progressApi.ts): working out and saving lesson
  progress.
- [`frontend/features/staff/courseApi.ts`](./frontend/features/staff/courseApi.ts):
  requests that save courses and upload files.
- [`frontend/features/staff/StaffPages.tsx`](./frontend/features/staff/StaffPages.tsx):
  staff workspace, instructor workspace, and course management actions.
- [`frontend/features/staff/CourseBuilderPage.tsx`](./frontend/features/staff/CourseBuilderPage.tsx)
  and [`courseBuilder.css`](./frontend/features/staff/courseBuilder.css):
  the form for creating and editing courses, including file uploads.
- [`frontend/index.css`](./frontend/index.css): application layout and visual
  styling.

### Backend files

- [`backend/server.js`](./backend/server.js): Express server, health endpoint,
  Supabase status endpoint, and course CRUD endpoints.
- [`backend/.env.example`](./backend/.env.example): required environment
  variable names.
- [`supabase/001_shared_course_data.sql`](./supabase/001_shared_course_data.sql):
  database tables, seed courses, indexes, and storage buckets.
- [`supabase/002_staff_access.sql`](./supabase/002_staff_access.sql):
  row-level security, and how to grant or remove staff access.
- [`supabase/003_lesson_progress.sql`](./supabase/003_lesson_progress.sql):
  the table of completed lessons, which each member can only see and change for
  themselves.
- [`supabase/004_assessments.sql`](./supabase/004_assessments.sql): quizzes,
  questions, answer choices, assessment attempts, final exams, course
  completion, certificates, indexes, and assessment row-level security.

## Running the project

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server runs on:

```text
http://localhost:5173
```

To create a production build:

```powershell
npm run build
```

To run the frontend tests (Node 22.18 or later runs them directly):

```powershell
npm test
```

Every page has its own address, such as `/courses/<id>`. When the built site is
hosted, the host must answer any address that is not a file with `index.html`,
or opening a shared link or refreshing a page shows the host's "not found"
page. Most hosts call this a single-page app or SPA rewrite: for example a
`_redirects` file with `/* /index.html 200` on Netlify, or a rewrite of
`/(.*)` to `/index.html` in `vercel.json` on Vercel.

### Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Set the Supabase values in `backend/.env` before using the database status
endpoint:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FRONTEND_ORIGIN_PATTERNS=https://*.vercel.app,https://*.onrender.com
```

`FRONTEND_ORIGIN` is the preferred setting for one frontend URL. Use
`FRONTEND_ORIGINS` only when you must allow multiple frontend origins. If both
are set, both are allowed. The backend no longer falls back to `*`.
Use `FRONTEND_ORIGIN_PATTERNS` when you need controlled wildcard matching for
preview domains (for example `https://*.vercel.app`).

For Render Blueprint deployments, use [`render.yaml`](./render.yaml), which
enables auto-deploy and pull request previews for the backend service.

`SUPABASE_SERVICE_ROLE_KEY` lets the backend save courses and store uploaded
files, because row-level security refuses writes from the anon key. It has full
access to the Supabase project, so keep it only in the backend's environment and
never put it in the frontend, a chat, or Git. Without it, courses can still be
read, but saving and uploads return a clear error.

The frontend needs `frontend/.env`, created from
[`frontend/.env.example`](./frontend/.env.example), or it will not load. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the same project URL and
anon key as the backend, and `VITE_API_URL` to the backend URL
(`http://localhost:5000` for local development). Never put the service role key
in the frontend.

The backend exposes:

- `GET /health`
- `GET /api/status`
- `GET /api/courses`
- `GET /api/courses/:id`
- `POST /api/courses` (staff only)
- `PUT /api/courses/:id` (staff only)
- `DELETE /api/courses/:id` (staff only)
- `GET /api/lessons/:lessonId/assessment` (signed-in learner)
- `GET /api/courses/:courseId/final-exam` (signed-in learner)
- `POST /api/lessons/:lessonId/assessment` (staff or instructor)
- `POST /api/courses/:courseId/final-exam` (staff or instructor)
- `PUT /api/courses/:courseId/final-exam` (staff or instructor)
- `PUT /api/quizzes/:quizId` (staff or instructor)
- `POST /api/quizzes/:quizId/questions` (staff or instructor)
- `PUT /api/questions/:questionId` (staff or instructor)
- `DELETE /api/questions/:questionId` (staff or instructor)
- `PUT /api/quizzes/:quizId/questions/reorder` (staff or instructor)
- `DELETE /api/quizzes/:quizId` (staff or instructor)
- `POST /api/quizzes/:quizId/attempts` (signed-in learner)
- `GET /api/staff/certificates/:identifier` (staff or instructor)
- `POST /api/uploads` (staff only)

Staff-only endpoints need an `Authorization: Bearer <access token>` header
from a signed-in Supabase session. The frontend sends it automatically. Without
a sign-in they answer `401`; with a member's sign-in they answer `403`.

#### Quizzes in the course builder

The course builder saves lesson quizzes and the final exam together with the
course, through `POST /api/courses` and `PUT /api/courses/:id`. Each entry in
`lessonContent` may carry a `quiz`, and the course may carry a `finalExam` with
a `passMark`. The staff reads (`GET /api/staff/courses` and the save responses)
return them with their answer keys; the public course reads never do.

- Saving a course recreates its lessons, so the backend links each quiz to its
  lesson's new row again. A quiz, question, or answer choice sent with its `id`
  is edited in place, which keeps learners' attempts and saved answers.
- `quiz: null` or `finalExam: null` removes it, and deletes learners' attempts
  at it. Leaving the field out keeps what is saved, so an older page cannot
  remove quizzes by accident.
- Every question needs text, at least two answer choices with text, and exactly
  one correct answer. The pass mark is a whole percentage from 1 to 100, and is
  70 when left out. These rules also apply to the separate final exam routes.
- If `supabase/004_assessments.sql` has not been run, courses still load and
  save, and saving one with a quiz explains which file to run.

### Thursday release runbooks

- [Production checklist](./docs/release/2026-11-06-thursday-production-checklist.md)
- [Member pilot instructions](./docs/release/member-pilot-instructions.md)
- [Rollback runbook](./docs/release/rollback-runbook.md)

### Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run [`supabase/001_shared_course_data.sql`](./supabase/001_shared_course_data.sql).
4. Run [`supabase/002_staff_access.sql`](./supabase/002_staff_access.sql).
5. Run [`supabase/003_lesson_progress.sql`](./supabase/003_lesson_progress.sql).
   Until it is run, the app still works but does not save lesson progress, and
   **My learning** says progress tracking is not switched on yet.
6. Run [`supabase/004_assessments.sql`](./supabase/004_assessments.sql) to
   enable quizzes, final exams, attempts, completion, and certificates.
7. Copy the project URL, anon key, and service role key into `backend/.env`,
   and the URL and anon key into `frontend/.env`.
8. Start the backend and verify `GET http://localhost:5000/api/status`.
9. Make at least one staff account (see [Staff access](#staff-access)).

The first migration creates normalized course, objective, section, lesson, and
resource tables. It also seeds two courses and creates public-read storage
buckets for course images, instructor images, and lesson resources. The second
turns on row-level security so the anon key, which every browser has, can read
published courses but cannot change anything. The third stores which lessons
each member has completed. The browser reads and writes it directly with the
member's own sign-in, and row-level security keeps every member to their own
rows. Lessons are identified by section and title, because saving a course
replaces its lessons, so renaming a lesson resets its progress. The fourth
creates assessment content and attempt records; answer keys are available only
to the backend service role, which calculates scores and enforces final-exam
limits before returning feedback to learners.

### Staff access

Staff are marked with `"role": "staff"` in a Supabase user's `app_metadata`.
Members cannot edit `app_metadata` themselves. (They can edit
`user_metadata`, so that is never trusted.) For now one staff role covers both
staff and instructors, and staff can manage every course.

To make someone staff:

1. They sign up in the app with their email address.
2. In the Supabase SQL Editor, run:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "staff"}'::jsonb
   where email = 'person@example.com';
   ```

3. They sign out and sign back in. Their browser only learns about the new role
   on a fresh sign-in, but the backend sees it immediately.

[`supabase/002_staff_access.sql`](./supabase/002_staff_access.sql) also shows
how to list staff and how to remove staff access.

Hiding the staff pages in the browser is only for clarity. The protection is
the backend, which checks the sign-in with Supabase before every create, edit,
delete, or upload, and records which staff member created each course in
`courses.created_by`.

## Planned database integration

The next backend phase should:

1. Create a `courses` table in Supabase.
2. Create related tables for sections, lessons, objectives, and resources.
3. Create Supabase Storage buckets for:
   - Course images
   - Instructor images
   - Slide files
   - Video previews
4. Replace frontend local-storage writes with API requests.
5. Add authenticated instructor and staff permissions.
6. Add upload progress, file validation, and server-side file-size limits.
7. Add course publishing and draft states.
8. Add update and delete API endpoints.
9. Keep only storage URLs and file metadata in database records.

## Remaining work

The following work is still required before the application is ready for
production use.

### Authentication and authorization

Done: Supabase email/password sign-up, sign-in, email verification, password
reset, sign-out, and session persistence; staff-only pages; backend checks that
only staff can upload, create, update, or delete course content.

Still to do:

- Separate instructor and staff administrator roles, so instructors can edit
  only courses they own (`courses.created_by` is already recorded).
- A staff screen for granting staff access, instead of the SQL in
  [Staff access](#staff-access).

### Backend and database integration

- Connect the frontend course catalog to `GET /api/courses`.
- Add backend endpoints for:
  - Creating courses
  - Reading a single course
  - Updating courses
  - Deleting courses
  - Creating and updating sections
  - Creating and updating lessons
  - Managing lesson resources
- Create database migrations or SQL scripts for the required tables.
- Add foreign keys between courses, sections, lessons, and resources.
- Add ownership fields such as `created_by` and `instructor_id`.
- Add timestamps such as `created_at` and `updated_at`.
- Add draft, published, and archived course states.
- Replace browser local-storage persistence with API persistence.
- Keep a temporary migration path for existing browser-local courses if
  needed.

### File and video storage

- Create Supabase Storage or Azure Blob Storage buckets.
- Upload images, slides, and video previews to object storage.
- Store only file URLs, names, types, and sizes in the database.
- Add server-side file type and file-size validation.
- Add upload progress and cancellation.
- Add safe file-name handling and unique storage paths.
- Configure access policies for private instructor resources.
- Generate signed URLs where resources should not be public.
- Add video processing or transcoding for browser-compatible playback.
- Support video files over 50 MB, which is the Supabase project's limit today.

### Course publishing workflow

- Add a course draft state while an instructor is still editing.
- Add a publish action after required fields are complete.
- Validate that published courses have:
  - A title
  - Description
  - Instructor
  - Course image
  - At least one section
  - At least one lesson
- Allow staff to unpublish or archive courses.
- Show published courses publicly and keep drafts private.
- Add a preview mode before publishing.

### Learner accounts and progress

Done: completed lessons saved per member, course completion percentage,
continue where you left off, real profile data, and changing name and
password.

Still to do:

- Add completion certificates or achievements if required.
- Allow members to add a profile image and change their email address.

### Instructor profile management

- Create a separate instructor profile record.
- Store instructor biography, profile image, and contact/display details.
- Reuse one instructor profile across multiple courses.
- Show an instructor profile page with their published courses.
- Allow instructors to update their own profile.

### Validation, error handling, and security

- Add frontend form validation for all required course fields.
- Add backend validation for every request body and uploaded file.
- Add consistent API error responses.
- Add loading, retry, and empty states for API requests.
- Add rate limiting to authentication and write endpoints.
- Configure production CORS instead of allowing every origin.
- Keep secrets in environment variables and never commit `.env` files.
- Add Row Level Security policies in Supabase.
- Sanitize or safely render user-provided text.
- Validate external YouTube URLs before saving them.
- Add logging and monitoring for failed uploads and API errors.
- Review dependencies and keep them updated.

### Testing

- Add unit tests for course and lesson data transformations.
- Add component tests for the course builder.
- Add tests for authentication and role permissions.
- Add API tests for course CRUD operations.
- Add upload validation tests.
- Add end-to-end tests for:
  - Learner sign-up and sign-in
  - Instructor course creation
  - Course editing and deletion
  - Course publishing
  - Lesson resource playback
  - Learner progress tracking
- Test the application in Edge, Chrome, and mobile layouts.
- Test large-file failures and interrupted uploads.

### User experience and accessibility

- Add clear loading indicators for saves and uploads.
- Disable save actions while a request is in progress.
- Add success notifications after create, update, publish, and delete actions.
- Add accessible labels and keyboard navigation throughout the application.
- Improve mobile layouts for the staff workspace and lesson pages.
- Add confirmation dialogs for destructive actions.
- Add an error page for unavailable courses and expired resources.
- Add responsive video controls and captions where available.

### Deployment and operations

- Configure production frontend hosting.
- Deploy the backend API.
- Provision the production database and object storage.
- Configure environment variables for development, staging, and production.
- Configure a custom domain and HTTPS.
- Add database backups and restore procedures.
- Add monitoring, health checks, and alerting.
- Add a CI pipeline that runs builds, tests, and security checks.
- Add staging deployment before production release.
- Keep deployment, member, and rollback runbooks up to date.

## Media storage model

The recommended production relationship is:

```text
Database
├── course title and description
├── difficulty and instructor information
├── learning objectives
├── sections and lessons
└── media URLs and metadata

Object/blob storage
├── instructor images
├── course images
├── slide files
└── short video previews
```

This removes the browser-local 5 MB video limitation and allows larger files
based on the configured storage and upload policies.

## Validation

The frontend has been validated with:

```powershell
npm run build
```

The backend has automated tests that run against an in-memory stand-in for
Supabase, so they never touch a real database:

```powershell
cd backend
npm test
```

The frontend has unit tests for page addresses, categories, and progress
(`cd frontend` then `npm test`). Pages themselves are checked with the
production build and browser testing of the learner and staff flows.

On November 3, these were checked in Edge against the real Supabase project, at
1366px, 390px, and 360px widths:

- Learner path: home, catalog, course page, choosing a lesson in a later
  section, lesson overview, starting the lesson, slides, video preview, and
  YouTube link.
- No page scrolls sideways at any of the three widths.
- Every course image, instructor photo, slide, video, and YouTube link in the
  live courses responds.
- Pages show a placeholder instead of a broken image when an image is missing
  or its link fails.
- A member can sign in but sees no staff links, and the backend refuses the
  member's course changes with `403`.
- Staff land in the Staff Workspace after signing in, see their own name, and
  can sign out.
- Wrong file types, empty files, and oversized files are refused with a clear
  message, and nothing reaches storage.

These were also checked in Edge on the same day after the page and progress
work:

- Opening a course or lesson link directly, Back, Forward, and refresh all keep
  the right page; unknown courses, lessons, and addresses show a clear "not
  found" page.
- Home page category tiles open the catalog filtered to that category, and
  empty categories say "Coming soon".
- Next and Previous lesson, and the last lesson's Finish course.
- With progress on: Complete & continue, the course page's progress bar and
  Continue learning, the dashboard, **My learning**, and Mark as not done. These
  ran with the progress table simulated in the browser, because
  `003_lesson_progress.sql` had not been run yet; check them again for real once
  it has.
- With progress off (the real database at the time): no errors, and the pages
  fall back to their earlier content.
- Signing in from a lesson returns to that lesson.
- Changing name and password, then signing in with the new password.
