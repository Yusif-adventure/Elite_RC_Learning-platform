# Production rollback runbook

Use this runbook when a release-blocking issue appears after deployment.

## 1. Rollback triggers

Rollback immediately if any of these is true:

1. Members cannot sign in.
2. Shared course catalog fails for most users.
3. Learners cannot open lessons/resources.
4. Staff cannot create/edit/delete courses.
5. Security issue discovered (unauthorized staff access bypass).

## 2. Roles

Fill these before release:

- Incident lead:
- Backend rollback owner:
- Frontend rollback owner:
- Validation owner:
- Member communication owner:

## 3. Pre-record required IDs

Before release, record:

- Current backend deployment ID:
- Last known good backend deployment ID:
- Current frontend deployment ID:
- Last known good frontend deployment ID:

## 4. Rollback procedure

1. Announce incident in team channel with timestamp.
2. Pause new non-critical changes.
3. Roll back frontend to last known good deployment.
4. Roll back backend to last known good deployment.
5. Confirm environment variables are still correct after rollback.
6. Run validation checks in section 5.
7. Announce status update to members.

## 5. Post-rollback validation

1. GET /health returns HTTP 200.
2. GET /api/courses returns HTTP 200 with courses.
3. Member can sign in and open at least one lesson resource.
4. Staff can sign in and open staff workspace.
5. Staff write endpoint protection still works for non-staff users.

## 6. Member communication template

Subject: Temporary service issue - Elite RC Learning Hub

Message:

We detected an issue in the latest release and have rolled back to the previous stable version. Access is being restored now. If you still see issues, refresh your browser and sign in again. We will share another update once monitoring confirms stability.

## 7. Recovery completion checklist

- Incident timeline documented: [ ]
- Root cause captured: [ ]
- Follow-up fix owner assigned: [ ]
- Next safe re-release window decided: [ ]
