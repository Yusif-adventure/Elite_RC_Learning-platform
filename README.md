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
- Browser-local course persistence in the frontend
- A production frontend build that completes successfully

Course data is currently saved in the browser under the
`elite-rc-courses` local-storage key. The backend is prepared for the later
database integration, but the frontend is not yet using it as its primary
course store.

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
- Start a lesson from its overview page
- Open uploaded slide resources
- Watch an uploaded short video preview
- Open the full lesson video on YouTube
- View learning progress and profile screens

### Instructor and staff experience

- Enter the Instructor Workspace from the sign-in screen
- View course assignments and course management screens
- Create a course with:
  - Course title
  - Description
  - Difficulty
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
- Save courses to browser storage

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

1. The current browser-only prototype must protect users from exceeding
   browser storage limits.
2. Current upload guidance limits:
   - Video previews: less than 5 MB
   - Course and instructor images: less than 3 MB
3. When a real backend is connected, large media files must be stored in
   object/blob storage rather than browser local storage or a relational
   database record.
4. The database should store media metadata and URLs, not large base64 files.

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
└── README.md
```

### Important frontend files

- [`frontend/App.tsx`](./frontend/App.tsx): public pages, navigation,
  course state, lesson rendering, and local-storage persistence.
- [`frontend/features/staff/StaffPages.tsx`](./frontend/features/staff/StaffPages.tsx):
  staff workspace, instructor workspace, course builder, file uploads, and
  course management actions.
- [`frontend/index.css`](./frontend/index.css): application layout and visual
  styling.

### Backend files

- [`backend/server.js`](./backend/server.js): Express server, health endpoint,
  Supabase status endpoint, and course listing endpoint.
- [`backend/.env.example`](./backend/.env.example): required environment
  variable names.

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
PORT=5000
```

The backend exposes:

- `GET /health`
- `GET /api/status`
- `GET /api/courses`

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

- Replace the current prototype sign-in screen with real authentication.
- Add Supabase Auth or another managed authentication provider.
- Support email/password sign-up and sign-in.
- Add email verification and password reset.
- Add sign-out and session persistence.
- Protect instructor and staff routes from unauthenticated users.
- Add role-based access control for:
  - Learners
  - Instructors
  - Staff administrators
- Ensure instructors can edit only courses they own unless they are staff
  administrators.
- Ensure only authorized users can upload, update, or delete course content.
- Add protected backend endpoints that validate the authenticated user rather
  than trusting data from the browser.

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
- Support larger video files after moving away from browser local storage.

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

- Associate learner progress with authenticated users.
- Save completed lessons to the database.
- Track course enrollment.
- Track course completion percentage.
- Add resume-learning behavior.
- Add completion certificates or achievements if required.
- Replace the current placeholder profile data with the authenticated user's
  profile.
- Allow users to update their name, profile image, and account details.

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
- Document the production deployment and rollback process.

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

There are currently no repository-level automated frontend tests. The main
validation is the production build and manual browser testing of the learner
and staff flows.
