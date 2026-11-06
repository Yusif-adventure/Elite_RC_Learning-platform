# Thursday manual execution (operator runbook)

This runbook covers only Thursday tasks that must be executed by a human operator.

## Preconditions

You need:

- A production frontend host account.
- A production backend host account.
- A Supabase project with migrations already applied.
- Two test users:
  - one member account
  - one staff account (role in app_metadata)

## Step 1: Prepare production values

Fill these values first and do not continue until all are known.

- FRONTEND_URL=
- BACKEND_URL=
- SUPABASE_URL=
- SUPABASE_ANON_KEY=
- SUPABASE_SERVICE_ROLE_KEY=

## Step 2: Build and verify locally before deploy

Run these commands exactly from repository root:

```powershell
Push-Location backend
npm ci
npm test
Pop-Location

Push-Location frontend
npm ci
npm run build
Pop-Location
```

Pass condition:

- backend tests are all passing
- frontend build finishes with no error

## Step 3: Deploy backend (manual host action)

Render-specific setup for this repository:

1. In Render, click **New +** -> **Blueprint**.
2. Select this GitHub repository.
3. Confirm Render detects `render.yaml` at repository root.
4. In the service preview, confirm:
  - Service name: `elite-rc-backend`
  - Root directory: `backend`
  - Build command: `npm ci`
  - Start command: `npm start`
  - Auto-deploy: enabled
  - Pull request previews: enabled
5. Click **Apply**.

After first apply, open Render service settings and set environment variables.

In your backend host, set these environment variables exactly:

- SUPABASE_URL=$SUPABASE_URL
- SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
- PORT=5000 (or host-provided port env mapping)
- FRONTEND_ORIGIN=$FRONTEND_URL

For Vercel preview deployments, also set:

- FRONTEND_ORIGIN_PATTERNS=https://*.vercel.app

Optional only if multiple frontend origins are truly required:

- FRONTEND_ORIGINS=https://one.example.com,https://two.example.com

Do not set wildcard CORS.

After deployment, verify backend from terminal:

```powershell
curl "$env:BACKEND_URL/health"
curl "$env:BACKEND_URL/api/courses"
```

Pass condition:

- /health returns JSON with status ok
- /api/courses returns JSON with courses array

## Step 4: Deploy frontend (manual host action)

Vercel-specific setup for this repository:

1. In Vercel, create a new project from this repository.
2. Set **Root Directory** to `frontend`.
3. Keep build command as `npm run build`.
4. Keep output directory as `dist`.
5. Confirm `frontend/vercel.json` is included so all routes rewrite to `index.html`.
6. Enable automatic deployments on push and PR preview deployments in Vercel project settings.

In your frontend host, set these environment variables exactly:

- VITE_API_URL=$BACKEND_URL
- VITE_SUPABASE_URL=$SUPABASE_URL
- VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

Ensure SPA rewrite is enabled so deep links resolve to index.html.

After deploy, open:

- $FRONTEND_URL
- $FRONTEND_URL/courses

Pass condition:

- both URLs load the React app, not a host 404 page

## Step 5: Clean-browser smoke test

Use incognito or a fresh profile.

Member flow:

1. Sign in as member.
2. Open Explore Courses.
3. Open any course.
4. Open a non-first lesson.
5. Open one slide/resource link.
6. Open one YouTube lesson link.

Staff flow:

1. Sign in as staff.
2. Open staff workspace.
3. Create course named TEST - DO NOT KEEP.
4. Add 1 section and 1 lesson.
5. Upload 1 image and 1 slide.
6. Save.
7. Edit title.
8. Delete course.

Pass condition:

- all actions succeed with no blocking errors

## Step 6: Second-device verification

On device B (different device, preferably different network):

1. Open $FRONTEND_URL.
2. Sign in as member.
3. Confirm catalog loads.

Cross-device check:

1. On device A (staff), create temporary course named TEST - CROSS DEVICE.
2. On device B, refresh Explore Courses.
3. Confirm TEST - CROSS DEVICE appears.
4. On device A, delete TEST - CROSS DEVICE.
5. On device B, refresh and confirm removal.

Pass condition:

- created and deleted changes are reflected across devices after refresh

## Step 7: Access-control verification

With non-staff member account:

1. Open staff route directly in browser.
2. Attempt to perform create/update/delete from UI if visible.

Pass condition:

- staff area is blocked
- write operations are rejected for non-staff

## Step 8: Release-blocker decision

Treat as blocker only if one of these fails:

- sign in/session
- course loading
- lesson/resource path
- staff management
- cross-device consistency
- rollback readiness

If blocker exists, do not release. Roll back using rollback runbook.

## Step 9: Publish member instructions and rollback plan

Before Friday release announcement:

1. Fill support contact fields in docs/release/member-pilot-instructions.md.
2. Fill roles and deployment IDs in docs/release/rollback-runbook.md.
3. Share both docs with team.

## Step 10: Sign-off record

Record these final states:

- Backend deployed: yes/no
- Frontend deployed: yes/no
- Clean-browser test passed: yes/no
- Second-device test passed: yes/no
- Access control verified: yes/no
- Member instructions published: yes/no
- Rollback plan published: yes/no
- Approver name:
- Timestamp:

## Render + Vercel preview verification

1. Open a new branch and commit a harmless change in `backend/`.
2. Push branch and open a GitHub pull request.
3. Confirm Render creates a preview backend deployment automatically.
4. Confirm Vercel creates a preview frontend deployment automatically.
5. Open Vercel preview URL and verify the frontend can call Render preview backend URL.
6. Merge the pull request.
7. Confirm Render production service auto-deploys from the default branch commit.
