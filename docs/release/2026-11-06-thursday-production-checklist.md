# Thursday production checklist (2026-11-06)

This checklist is for the Friday shared-member pilot release.

For exact operator command steps, use:
- `docs/release/thursday-manual-execution.md`

## 1. Scope freeze

1. Confirm this release includes only Friday MVP scope.
2. Confirm non-blocking improvements are deferred.
3. Write owner name and timestamp here:
   - Owner:
   - Time:

## 2. Required production values

Record final values before deployment.

- Frontend URL:
- Backend URL:
- Supabase project ref:
- Staff test account email:
- Member test account email:

## 3. Backend deployment

1. Set backend environment variables:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - PORT
   - FRONTEND_ORIGIN (preferred, single origin)
   - FRONTEND_ORIGINS (optional, comma-separated allowlist)
2. Ensure FRONTEND_ORIGIN or FRONTEND_ORIGINS is set to production frontend origin(s). Do not use wildcard.
3. Deploy backend.
4. Verify health endpoint:
   - GET <BACKEND_URL>/health
   - Expect HTTP 200 and service response.
5. Verify course endpoint:
   - GET <BACKEND_URL>/api/courses
   - Expect HTTP 200 and array payload.

## 4. Frontend deployment

1. Set frontend environment variables:
   - VITE_API_URL=<BACKEND_URL>
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
2. Build frontend:
   - cd frontend
   - npm run build
3. Deploy frontend.
4. Confirm SPA rewrites are configured for route refreshes.

## 5. Clean-browser smoke test

Use an incognito window or brand-new browser profile.

### Member path

1. Open frontend URL.
2. Sign in as member.
3. Open catalog.
4. Open a course detail page.
5. Open a lesson that is not the first lesson.
6. Open slide/resource links.
7. Open YouTube lesson link.
8. Confirm no blocking errors.

### Staff path

1. Sign in as staff account.
2. Open staff workspace.
3. Create a test course named: TEST - DO NOT KEEP.
4. Add one section and one lesson.
5. Upload one slide and one image.
6. Save course.
7. Edit course title.
8. Delete course.
9. Confirm all actions succeed.

## 6. Second-device smoke test

1. Open the site on a different device/network.
2. Confirm sign in works.
3. Confirm shared catalog matches first device.
4. Create a temporary course on device A and verify visible on device B after refresh.
5. Delete temporary course.

## 7. Access-control verification

1. Sign in with non-staff member account.
2. Attempt staff page access.
3. Confirm blocked from staff pages.
4. Confirm course creation/update/delete requests are rejected.

## 8. Release-blocker triage rules

Fix now only if issue breaks one of:

- Sign in / session.
- Shared course loading.
- Learner path (course -> lesson -> resources).
- Staff content management.
- Cross-device consistency.
- Rollback ability.

All other issues go into post-release backlog.

## 9. Sign-off

- Backend deployed: [ ]
- Frontend deployed: [ ]
- Clean-browser test passed: [ ]
- Second-device test passed: [ ]
- Access control verified: [ ]
- Member instructions published: [ ]
- Rollback plan published: [ ]

Final approver:
Date/time:
