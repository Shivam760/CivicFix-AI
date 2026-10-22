# CivicFix AI — API Contract

**Status:** Aligned with database-schema.md and ai-contract.md  
**Base URL:** `http://localhost:8000`  
**API prefix:** `/api/v1`  
**Content type:** `application/json`, unless otherwise specified

## 1. General conventions

- Resource IDs are UUIDs.
- Timestamps use ISO 8601 format in UTC.
- Authentication uses bearer tokens after login.
- Protected endpoints require a valid authenticated user.
- Users can access only their own reports. Another user's report is treated as not found.
- AI-generated content must be labeled as a suggestion.
- API errors use a consistent JSON structure.
- External complaint submission must never be represented as successful without confirmation from a real authorized integration.
- Allowed values for categories and statuses are defined in database-schema.md.

## 2. Common error format

Example:

    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "The request contains invalid fields.",
        "details": [
          {
            "field": "title",
            "message": "Title is required."
          }
        ]
      }
    }

Common HTTP status codes:

- `400 Bad Request`: Invalid operation or request state.
- `401 Unauthorized`: Missing or invalid authentication.
- `403 Forbidden`: Authenticated user lacks permission.
- `404 Not Found`: Resource does not exist or is not accessible.
- `409 Conflict`: Operation conflicts with the current resource state.
- `413 Content Too Large`: An uploaded file exceeds the size limit.
- `415 Unsupported Media Type`: An uploaded file is not an allowed type.
- `422 Unprocessable Entity`: Request validation failed.
- `500 Internal Server Error`: Unexpected server error.
- `502 Bad Gateway`: The AI workflow or submission integration returned a failure.
- `503 Service Unavailable`: Required external service is unavailable.

## 3. Authentication

### POST /api/v1/auth/register

Create a citizen account, or apply for an official account.

Request (citizen):

    {
      "name": "Aarav Sharma",
      "email": "aarav@example.com",
      "password": "example-password"
    }

Request (official):

    {
      "name": "Meera Iyer",
      "email": "meera@example.com",
      "password": "example-password",
      "account_type": "official",
      "official_department": "Municipal Corporation, Roads",
      "official_job_title": "Junior Engineer"
    }

Success: `201 Created`

Response (the User object, also returned by `GET /api/v1/auth/me`):

    {
      "id": "UUID",
      "name": "Aarav Sharma",
      "email": "aarav@example.com",
      "role": "citizen",
      "approval_status": "approved",
      "official_department": null,
      "official_job_title": null,
      "applied_at": null,
      "reviewed_at": null,
      "review_note": null,
      "home_latitude": null,
      "home_longitude": null,
      "created_at": "2026-10-14T10:00:00Z"
    }

- `home_latitude` and `home_longitude` are the user's own saved home location, or null (see `PUT /api/v1/auth/me/home-location`). They appear only in the user's own account responses.
- `role` is `citizen`, `official`, or `admin`. `account_type` chooses `citizen` (the default) or `official`; an admin account cannot be created through the API (database-schema.md section 3). Any `role` sent in the request is ignored.
- A citizen is `approved` at once. An official starts `pending`, with `applied_at` set, and can do nothing until an admin approves them (section 13).
- Registration does not log the user in.

Validation:

- `name`: required, 1–100 characters after trimming surrounding spaces.
- `email`: required, a valid email address, at most 255 characters.
- `password`: required, 8–128 characters.
- `account_type`: `citizen` or `official`.
- `official_department` (2–150 characters) and `official_job_title` (2–100 characters), after trimming: required for an official; must be left out for a citizen.

Errors:

- `409 Conflict` with code `EMAIL_TAKEN`: an account with this email already exists (compared ignoring letter case).
- `422 Unprocessable Entity`: a field fails validation.

Passwords must never appear in API responses or logs. They are stored only as Argon2 hashes.

### POST /api/v1/auth/login

Request:

    {
      "email": "aarav@example.com",
      "password": "example-password",
      "account_type": "citizen"
    }

Success: `200 OK`

Response:

    {
      "access_token": "example-token",
      "token_type": "bearer"
    }

Invalid credentials: `401 Unauthorized` with code `INVALID_CREDENTIALS`. A wrong password and an unknown email return the same response, so the API does not reveal which emails have accounts. Email is matched ignoring letter case.

`account_type` is optional: `citizen` or `official`, the choice on the sign-in page. When it is sent and the password is correct, the account must match, or the response is `403 Forbidden` with code `WRONG_ACCOUNT_TYPE` (message: "This is a citizen account" or "This is an official account"). Admins sign in with `official`. When it is left out, any account may sign in.

Pending and rejected officials can sign in: their token works only for their own account (`GET /api/v1/auth/me`, `PATCH /api/v1/auth/me`, `PUT /api/v1/auth/me/password`) and `PUT /api/v1/auth/me/official-application`, so they can see their status and the admin's note.

Tokens:

- The access token is a JWT signed with HS256 using `SECRET_KEY` from `backend/.env`.
- It expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60). There are no refresh tokens; the citizen logs in again.
- Send it on protected endpoints as `Authorization: Bearer <access_token>`.
- A missing token returns `401` with code `NOT_AUTHENTICATED`. An invalid or expired token, or one whose user no longer exists, returns `401` with code `INVALID_TOKEN`.

Who can use which endpoints (checked on every request, after the token):

- Citizens and approved officials: every endpoint in sections 3–12, with the rules written there.
- Every account, approved or not: its own account (`GET /api/v1/auth/me`, `PATCH /api/v1/auth/me`, `PUT /api/v1/auth/me/password`).
- Pending or rejected officials: also `PUT /api/v1/auth/me/official-application`. Everything else returns `403 Forbidden` with code `ACCOUNT_NOT_APPROVED`.
- Admins: also section 13. Everything else returns `403 Forbidden` with code `ADMIN_ACCOUNT`.
- Section 13 returns `403 Forbidden` with code `ADMIN_ONLY` to everyone but admins.

### GET /api/v1/auth/me

Return the logged-in user. Requires a token. Works for every account, including pending and rejected officials.

Success: `200 OK`

Response: the User object (see the register response).

### PATCH /api/v1/auth/me

Change the logged-in user's own profile. Works for every account. For now only the name can change; the email, role, approval, and an official's department and job title cannot be changed here.

Request:

    {
      "name": "Aarav S. Sharma"
    }

- `name`: required, 1–100 characters after trimming surrounding spaces (as at registration).
- Any other field returns `422`.

Success: `200 OK` with the User object. Reports keep showing the current name wherever the owner chose to show it.

Errors:

- `422 Unprocessable Entity`: A field fails validation, or an unknown field was sent.

### PUT /api/v1/auth/me/password

Change the logged-in user's password. Works for every account. The current password is required, so someone at an unlocked computer cannot take over the account.

Request:

    {
      "current_password": "old-password",
      "new_password": "new-password-2"
    }

- `new_password`: required, 8–128 characters (as at registration), and different from the current one.

Success: `204 No Content`. The new password is stored as an Argon2 hash.

Errors:

- `400 Bad Request` with code `CURRENT_PASSWORD_INCORRECT`: The current password is wrong. (Not `401`: the user is still signed in.)
- `400 Bad Request` with code `PASSWORD_UNCHANGED`: The new password is the same as the current one.
- `422 Unprocessable Entity`: A field fails validation.

Limitation: tokens issued before the change keep working until they expire (at most `ACCESS_TOKEN_EXPIRE_MINUTES`). Signing out other sessions would need a `password_changed_at` column checked against the token's issue time (section 14).

### PUT /api/v1/auth/me/official-application

Change the logged-in official's application and send it again, for example after a rejection. Only for officials who are `pending` or `rejected`.

Request:

    {
      "official_department": "Municipal Corporation, Roads",
      "official_job_title": "Assistant Engineer"
    }

- Both fields are required, with the register rules.

Success: `200 OK` with the User object: `approval_status` is `pending`, `applied_at` is now, and `review_note`, `reviewed_at` are cleared.

Errors:

- `403 Forbidden` with code `NOT_AN_OFFICIAL`: The account is not an official account.
- `409 Conflict` with code `ALREADY_APPROVED`: The official is already approved.
- `422 Unprocessable Entity`: A field fails validation.

### PUT /api/v1/auth/me/home-location

Save the logged-in user's home location. It is used only to find nearby repairs the user may verify (section 11) and is never shown to other users.

Request:

    {
      "latitude": 30.7,
      "longitude": 76.8
    }

- Both fields are required; `latitude` between -90 and 90, `longitude` between -180 and 180.

Success: `200 OK`

Response: the user, in the same shape as `GET /api/v1/auth/me`.

Errors:

- `422 Unprocessable Entity`: A field is missing or out of range.

### DELETE /api/v1/auth/me/home-location

Remove the saved home location. The user then sees no nearby repairs (they can still verify their own reports).

Success: `200 OK`

Response: the user, with `home_latitude` and `home_longitude` set to null.

## 4. Reports

### Report object

Every endpoint that returns a report uses this shape:

    {
      "id": "UUID",
      "title": "Pothole near the market",
      "description": "A large pothole is making the road unsafe.",
      "category": "road_damage",
      "status": "reported",
      "location_text": "Near the main market",
      "latitude": 30.7,
      "longitude": 76.8,
      "authority_id": null,
      "submission_status": "not_submitted",
      "approved_draft_id": null,
      "approved_at": null,
      "external_reference": null,
      "submitted_at": null,
      "shared_at": null,
      "show_name": false,
      "reporter_name": null,
      "support_count": 0,
      "created_at": "2026-10-14T10:00:00Z",
      "updated_at": "2026-10-14T10:00:00Z"
    }

- `status` is one of: reported, under_review, in_progress, awaiting_verification, resolved, closed. `awaiting_verification` means an official reported the repair and residents are checking it; `resolved` means residents confirmed it (section 11), which is not proof.
- `submission_status` is one of: not_submitted, pending, confirmed, failed, unknown.
- `approved_draft_id` and `approved_at` are set only while a valid approval exists.
- `external_reference` and `submitted_at` are set only after a confirmed submission.
- `shared_at` is set while the owner shares the report with nearby residents (section 12), else null. `show_name` is the owner's choice to show their name; it is false (anonymous) by default.
- `reporter_name` is the owner's name when `show_name` is true, else null, for everyone including officials. Clients show null as "Anonymous resident".
- `support_count` is how many residents said "Me too" (section 12).

### Locked reports

A report is **locked** while its `submission_status` is `pending`, `confirmed`, or `unknown`. A locked report cannot be changed by these endpoints, which return `409 Conflict`:

- `PATCH /api/v1/reports/{report_id}`
- `POST /api/v1/reports/{report_id}/drafts`
- `POST /api/v1/reports/{report_id}/analyze` (because analysis creates a new draft)
- `POST /api/v1/reports/{report_id}/approve`
- `POST /api/v1/reports/{report_id}/evidence`

This keeps the stored report, drafts, and approval identical to what was sent to the authority.

### Closed reports

A report whose `status` is `closed` is final: no status change leads out of it. The same five endpoints, and `POST /api/v1/reports/{report_id}/submit`, return `409 Conflict` with code `REPORT_CLOSED` for a closed report. Nothing is changed or recorded, and the AI and the integration are not called.

- This is checked before the lock, so a report that is both closed and locked returns `REPORT_CLOSED`.
- Reading a closed report, its events, drafts, and evidence still works.
- Unsharing a closed report is still allowed; sharing it is not (section 12).
- Status changes, repair photos, and votes are already refused by their own rules.

### POST /api/v1/reports

Create a civic report.

Request:

    {
      "title": "Pothole near the market",
      "description": "A large pothole is making the road unsafe.",
      "category": "road_damage",
      "location_text": "Near the main market",
      "latitude": 30.7,
      "longitude": 76.8
    }

Validation:

- `title`: required, not blank, at most 200 characters.
- `description`: required, not blank.
- `category`: optional; one of the categories in database-schema.md section 2. `unknown` is not accepted.
- `location_text`: optional, at most 500 characters.
- `latitude`: optional, between -90 and 90.
- `longitude`: optional, between -180 and 180.

Success: `201 Created`

Response: a Report object. Records a `report_created` event.

### GET /api/v1/reports

List reports. A citizen sees their own reports; an official sees all reports.

Query parameters:

- `status`: Filter by report status.
- `category`: Filter by issue category.
- `page`: Page number, starting at 1.
- `page_size`: Number of results per page, default 20.

Success: `200 OK`

Response:

    {
      "items": [],
      "page": 1,
      "page_size": 20,
      "total": 0
    }

Each item is a Report object.

### GET /api/v1/reports/{report_id}

Retrieve one report: the citizen's own, or any report for an official.

Success: `200 OK`

Response: a Report object.

Officials may read any report, its event history, and its evidence photos, change its status, and upload after-repair photos. They cannot edit a report, see or create its drafts, approve, analyze, submit, or upload the citizen's report photos; those endpoints return `404` for a report the official does not own.

### POST /api/v1/reports/{report_id}/status

Change the report's status.

Request:

    {
      "status": "under_review",
      "note": "Crew scheduled for Monday."
    }

- `status`: required, one of the report statuses.
- `note`: optional, at most 500 characters. It is added to the event description, which is shown in the report's history.

Allowed changes (`closed` is final):

| From | To |
|---|---|
| reported | under_review, closed |
| under_review | in_progress, closed |
| in_progress | awaiting_verification (repair claimed), closed |
| awaiting_verification | in_progress (claim withdrawn) |
| resolved | in_progress (reopened), closed |

`resolved` is not in the "To" column: only residents' votes move a report there (section 11). An official cannot close a report while it awaits verification, so the vote cannot be skipped. The votes can also send it back to `in_progress`.

Who may change it:

- An official may make any allowed change on any report.
- The report's owner may only close it while it is `reported` or `under_review` (withdrawing it before work starts).

Repair photo required: moving from `in_progress` to `awaiting_verification` needs at least one after-repair photo uploaded during the current repair round, that is, since the report last entered `in_progress` (see `POST /api/v1/reports/{report_id}/repair-photos`). After a reopen, a new photo is needed.

Success: `200 OK`

Response: the updated Report object. Records a `report_status_changed` event.

The submission lock does not apply: the status tracks the authority's work, which continues after submission.

Errors:

- `404 Not Found` with code `REPORT_NOT_FOUND`: The report does not exist or is not accessible.
- `403 Forbidden` with code `STATUS_CHANGE_FORBIDDEN`: The user may see the report but not make this change.
- `409 Conflict` with code `INVALID_STATUS_TRANSITION`: The change is not in the table above, including setting the current status again.
- `409 Conflict` with code `REPAIR_PHOTO_REQUIRED`: Moving to `awaiting_verification` without a repair photo from the current repair round.
- `422 Unprocessable Entity`: Unknown status, missing status, or a note that is too long.

### PUT /api/v1/reports/{report_id}/sharing

Share the report with residents whose home is within 2 km, or stop sharing it, and choose whether the owner's name is shown. Owner only.

Request:

    {
      "shared": true,
      "show_name": false
    }

- `shared`: required, boolean.
- `show_name`: required, boolean. Also applies to officials: when false they see no name either.

Success: `200 OK` with the Report object. Records a `report_sharing_changed` event (metadata: `shared`, `show_name`) when something changed; sending the current values changes nothing. Sharing again does not reset `shared_at`. Not affected by the submission lock.

Errors:

- `404 Not Found` with code `REPORT_NOT_FOUND`: The report does not exist or the user is not its owner (also for officials).
- `409 Conflict` with code `LOCATION_REQUIRED`: Sharing a report without latitude and longitude.
- `409 Conflict` with code `REPORT_CLOSED`: Sharing a closed report. Unsharing is always allowed.
- `422 Unprocessable Entity`: Missing or unknown fields.

### PATCH /api/v1/reports/{report_id}

Update permitted report fields.

Request example:

    {
      "description": "Updated description with additional details."
    }

Permitted fields: `title`, `description`, `category`, `location_text`, `latitude`, `longitude`, `authority_id`. The validation rules from POST apply.

- `authority_id` must be the ID of a verified authority, or null to clear it. Any other value returns `422 Unprocessable Entity`.

Success: `200 OK`

Response: the updated Report object.

- Status, ownership, approval, and submission fields cannot be changed through PATCH.
- Records a `report_updated` event.
- Changing `title`, `description`, `location_text`, `latitude`, `longitude`, or `authority_id` invalidates any existing approval and records an `approval_invalidated` event (see database-schema.md section 6).

Errors:

- `404 Not Found`: The report does not exist or is not accessible.
- `409 Conflict`: The report is locked (see "Locked reports").
- `409 Conflict` with code `REPORT_CLOSED`: The report is closed (see "Closed reports").
- `422 Unprocessable Entity`: A field fails validation, including an `authority_id` that is not a verified authority.

## 5. AI analysis

### POST /api/v1/reports/{report_id}/analyze

Request AI analysis for a report. No request body.

Success: `200 OK` for a completed analysis. If processing later becomes asynchronous, this will return `202 Accepted` with a run ID and processing status.

Response:

    {
      "run_id": "UUID",
      "report_id": "UUID",
      "status": "completed",
      "started_at": "2026-10-14T10:05:00Z",
      "completed_at": "2026-10-14T10:05:04Z",
      "draft": {
        "id": "UUID",
        "version": 1
      },
      "result": {
        "report_id": "UUID",
        "suggested_category": {
          "value": "road_damage",
          "confidence": 0.94,
          "reason": "The report describes a pothole."
        },
        "missing_fields": [
          {
            "field": "exact_location",
            "reason": "The report provides only a general landmark.",
            "question": "Can you provide a more precise location?"
          }
        ],
        "authority_suggestion": {
          "authority_id": null,
          "reason": "No matching verified authority was identified."
        },
        "complaint_draft": {
          "text": "Draft complaint text for citizen review.",
          "requires_approval": true
        },
        "warnings": [],
        "model_metadata": {
          "model_name": null,
          "prompt_version": "v1"
        }
      }
    }

- `result` is the validated AI output, unchanged. Its schema is defined in ai-contract.md section 3.
- `draft` identifies the complaint draft created from `result.complaint_draft`.
- The values above are illustrative. Confidence is not a guarantee of correctness.
- An `authority_id` always refers to a record in the authority directory. The frontend reads the authority's name and verification status from the directory, not from the AI.
- The suggested category and authority are saved to the report only when the citizen sends them through PATCH.

On success, the backend:

- stores the run in `agent_runs` with status `completed`
- inserts a new complaint draft with source `ai`
- records `ai_analysis_completed` and `draft_created` events
- invalidates any existing approval and records an `approval_invalidated` event

Errors:

- `404 Not Found`: The report does not exist or is not accessible.
- `409 Conflict`: The report is locked (see "Locked reports"). No run is started.
- `409 Conflict` with code `REPORT_CLOSED`: The report is closed (see "Closed reports"). No run is started.
- `502 Bad Gateway` with code `AI_ANALYSIS_FAILED`: The AI workflow failed or returned invalid output. The run is stored with status `failed` and an `ai_analysis_failed` event is recorded. No draft is created.
- `503 Service Unavailable` with code `AI_UNAVAILABLE`:
  - `AI_PROVIDER` names no known analyzer, or its settings are missing. No run is started.
  - The AI service is temporarily unavailable (quota or rate limit reached, or overloaded). The run is stored with status `failed` and an `ai_analysis_failed` event is recorded. The client may try again later.

A failed run's `error_message` holds only a safe summary, such as `Gemini returned 429 RESOURCE_EXHAUSTED`: never report text, the AI service's full error text, or keys.

### GET /api/v1/reports/{report_id}/analysis

Retrieve the latest analysis: the completed run with the most recent `completed_at`.

Success: `200 OK`

Response: the same shape as the analyze response.

If no completed analysis exists, return `404 Not Found` with code `ANALYSIS_NOT_FOUND`. A failed run never replaces the latest completed one.

## 6. Complaint drafts

### Draft object

    {
      "id": "UUID",
      "report_id": "UUID",
      "version": 2,
      "text": "The complaint text.",
      "source": "citizen",
      "agent_run_id": null,
      "created_at": "2026-10-14T10:10:00Z"
    }

- `source` is `ai` or `citizen`. Drafts with source `ai` must be shown as AI-generated.
- Drafts are never modified. Each edit creates a new version.

### POST /api/v1/reports/{report_id}/drafts

Save a citizen edit as a new draft version.

Request:

    {
      "text": "The complaint text after the citizen's edits."
    }

Validation: `text` is required and not blank.

Success: `201 Created`

Response: the new Draft object, with source `citizen` and version equal to the report's highest version plus 1.

Records a `draft_edited` event. Invalidates any existing approval and records an `approval_invalidated` event.

Errors:

- `404 Not Found`: The report does not exist or is not accessible.
- `409 Conflict` with code `REPORT_CLOSED`: The report is closed (see "Closed reports").
- `409 Conflict` with code `REPORT_LOCKED`: The report is locked (see "Locked reports").
- `409 Conflict` with code `DRAFT_VERSION_CONFLICT`: Another draft was saved at the same moment. Reload the drafts and try again.

### GET /api/v1/reports/{report_id}/drafts

List all draft versions for a report, newest first.

Success: `200 OK`

Response:

    {
      "items": []
    }

Each item is a Draft object. The first item is the latest draft.

## 7. Citizen approval and external submission

### POST /api/v1/reports/{report_id}/approve

Approve one specific draft.

Request:

    {
      "draft_id": "UUID"
    }

Success: `200 OK`

Response: the updated Report object, with `approved_draft_id` and `approved_at` set.

Records a `draft_approved` event.

Errors:

- `404 Not Found`: The report does not exist or is not accessible.
- `409 Conflict` with code `DRAFT_NOT_LATEST`: The draft does not exist, belongs to another report, or is not this report's latest draft.
- `409 Conflict` with code `REPORT_CLOSED`: The report is closed (see "Closed reports").
- `409 Conflict` with code `REPORT_LOCKED`: The report is locked (see "Locked reports").

Approving the draft that is already approved returns `200 OK` and records no new event.

### POST /api/v1/reports/{report_id}/submit

Request an external complaint submission. No request body.

The backend verifies that a valid approval exists and that `approved_draft_id` still points to the latest draft. It also requires a configured, authorized submission integration.

A submission may be requested only when `submission_status` is `not_submitted` or `failed`. Retry behavior for failed submissions is still to be decided; until then, `failed` is the only status that allows another attempt.

Outcomes:

| HTTP status | Meaning | submission_status | Event |
|---|---|---|---|
| `200 OK` | The integration confirmed receipt | confirmed | submission_confirmed |
| `202 Accepted` | Accepted for processing, not yet confirmed | pending | submission_requested |
| `202 Accepted` | Outcome could not be determined | unknown | submission_unknown |
| `409 Conflict` | No valid approval, or submission_status is pending, confirmed, or unknown | unchanged | none |
| `502 Bad Gateway` | The integration reported a failure | failed | submission_failed |
| `503 Service Unavailable` | No authorized submission integration is configured | unchanged | none |

Successful responses return the updated Report object.

Error codes, in the order the backend checks them:

- `404 Not Found` with code `REPORT_NOT_FOUND`: The report does not exist or is not accessible.
- `409 Conflict` with code `REPORT_CLOSED`: The report is closed (see "Closed reports").
- `409 Conflict` with code `REPORT_LOCKED`: `submission_status` is pending, confirmed, or unknown.
- `409 Conflict` with code `NO_VALID_APPROVAL`: No approval, or the approved draft is not the latest draft.
- `503 Service Unavailable` with code `SUBMISSION_UNAVAILABLE`: No integration is configured.
- `502 Bad Gateway` with code `SUBMISSION_FAILED`: The integration reported a failure. The `failed` status and event are saved.

If the integration crashes or returns an unusable result (for example, "confirmed" without a reference), the outcome is recorded as `unknown`, because the backend cannot tell whether the authority received the complaint. This locks the report and prevents a blind retry from sending a duplicate.

The report row is locked (`SELECT ... FOR UPDATE`) during the request, so two simultaneous requests cannot both submit.

A successful API response must not falsely imply that an external authority received the complaint. The MVP has no submission integration, so this endpoint returns `503 Service Unavailable` until one is configured.

## 8. Report events

### GET /api/v1/reports/{report_id}/events

Retrieve the report's event history, oldest first. Available to the report's owner and to officials.

Success: `200 OK`

Response:

    {
      "items": [
        {
          "id": "UUID",
          "event_type": "report_created",
          "description": "Report created.",
          "actor_user_id": "UUID",
          "created_at": "2026-10-14T10:00:00Z"
        }
      ]
    }

Event types are listed in database-schema.md section 8. `event_metadata` is not returned.

## 9. Authorities

Authority records are loaded into the database by a seed script. The MVP has no endpoints to create, edit, or delete authorities.

### GET /api/v1/authorities

List authorities from the maintained directory.

Query parameters:

- `category`: Return authorities whose `supported_categories` include this category.
- `region`: Return authorities whose region matches this text exactly.

Success: `200 OK`

Response:

    {
      "items": [
        {
          "id": "UUID",
          "name": "Example Municipal Authority",
          "supported_categories": ["road_damage", "garbage"],
          "region": "Example region",
          "contact_url": null,
          "verification_status": "verified"
        }
      ]
    }

- `verification_status` is `verified` or `unverified`.
- Example data is illustrative only. Records must be verified before being labeled as verified.

## 10. Evidence

Photos attached to a report. Storage and upload rules are in database-schema.md section 11.

### Evidence object

    {
      "id": "UUID",
      "report_id": "UUID",
      "kind": "report_photo",
      "file_name": "pothole.jpg",
      "content_type": "image/jpeg",
      "file_size_bytes": 482133,
      "description": "The pothole seen from the bus stop.",
      "uploaded_by_user_id": "UUID",
      "uploaded_at": "2026-10-17T10:00:00Z"
    }

- `kind` is `report_photo` (the citizen's photo of the problem) or `repair_photo` (an official's after-repair photo). A repair photo is the official's claim, not proof that the problem is fixed.
- There is no public file URL. The file is downloaded through the `/file` endpoint below.

### POST /api/v1/reports/{report_id}/evidence

Attach a photo to the citizen's own report.

Request: `multipart/form-data` with these fields:

- `file`: required, a JPEG, PNG, or WebP image of at most 5 MB.
- `description`: optional, at most 500 characters.

Success: `201 Created`

Response: the new Evidence object, with `kind` set to `report_photo`. Records an `evidence_added` event.

- Image metadata (including GPS location) is removed before the file is stored, so `file_size_bytes` may differ from the uploaded size.
- Adding a photo does not invalidate an approval, because a submission sends only the approved draft text.

Errors:

- `404 Not Found` with code `REPORT_NOT_FOUND`: The report does not exist or is not the user's own.
- `409 Conflict` with code `REPORT_CLOSED`: The report is closed (see "Closed reports").
- `409 Conflict` with code `REPORT_LOCKED`: The report is locked (see "Locked reports").
- `409 Conflict` with code `EVIDENCE_LIMIT_REACHED`: The report already has 5 photos.
- `413 Content Too Large` with code `FILE_TOO_LARGE`: The file is larger than 5 MB.
- `415 Unsupported Media Type` with code `UNSUPPORTED_FILE_TYPE`: The file is not a valid JPEG, PNG, or WebP image.
- `422 Unprocessable Entity`: The file is missing, or the description is too long.
- `503 Service Unavailable` with code `STORAGE_UNAVAILABLE`: The file could not be saved. Nothing is recorded; try again.

### POST /api/v1/reports/{report_id}/repair-photos

Attach an after-repair photo. Officials only, while the report is `in_progress`. Then the official moves the report to `awaiting_verification` with `POST /api/v1/reports/{report_id}/status`, and nearby residents check the repair (section 11).

Request: `multipart/form-data` with the same fields and file rules as `POST /api/v1/reports/{report_id}/evidence`.

Success: `201 Created`

Response: the new Evidence object, with `kind` set to `repair_photo`. Records an `evidence_added` event.

- The submission lock does not apply, as with status changes.
- At most 5 repair photos per repair round. A round starts each time the report enters `in_progress`, so a reopened report can get new photos.
- Image metadata is removed, as for report photos.

Errors:

- `404 Not Found` with code `REPORT_NOT_FOUND`: The report does not exist or is not accessible.
- `403 Forbidden` with code `REPAIR_PHOTO_FORBIDDEN`: The user is not an official (for example, the report's owner).
- `409 Conflict` with code `REPORT_NOT_IN_PROGRESS`: The report's status is not `in_progress`.
- `409 Conflict` with code `EVIDENCE_LIMIT_REACHED`: 5 repair photos were already added in this round.
- `413`, `415`, `422`, and `503` as for `POST /api/v1/reports/{report_id}/evidence`.

### GET /api/v1/reports/{report_id}/evidence

List the report's evidence (both kinds), oldest first. Available to the report's owner and to officials.

Success: `200 OK`

Response:

    {
      "items": []
    }

Each item is an Evidence object.

Errors:

- `404 Not Found` with code `REPORT_NOT_FOUND`: The report does not exist or is not accessible.

### GET /api/v1/reports/{report_id}/evidence/{evidence_id}/file

Download one photo. Available to the report's owner and to officials.

Success: `200 OK`. The body is the image itself (not JSON), with the evidence's `content_type` as the `Content-Type` header and `Cache-Control: private`.

Because this endpoint needs the `Authorization` header, a plain `<img src>` cannot load it. The frontend fetches the file with the header and displays it through an object URL (`URL.createObjectURL`).

Errors:

- `404 Not Found` with code `REPORT_NOT_FOUND`: The report does not exist or is not accessible.
- `404 Not Found` with code `EVIDENCE_NOT_FOUND`: No evidence with this ID belongs to the report.
- `503 Service Unavailable` with code `STORAGE_UNAVAILABLE`: The file could not be read from storage.

## 11. Repair verification

After an official claims a repair (status `awaiting_verification`), residents check it. The report's owner and citizens whose saved home location is within 2 km of the report vote `fixed` or `still_broken`. The rules and limits are in database-schema.md section 12. In short:

- One vote per person per verification round; a vote cannot be changed.
- The owner's `still_broken` vote, or 2 `still_broken` votes, sends the report back to `in_progress`.
- Otherwise 2 `fixed` votes make it `resolved`. The owner's vote counts as one.
- A report without latitude and longitude can only be verified by its owner, so the owner's single vote decides it (`fixed` makes it `resolved`).
- Officials cannot vote. All `/verifications` endpoints return `403 Forbidden` with code `VERIFICATION_FORBIDDEN` for officials.

Neighbours see only what they need to check the repair. They do not see who reported the problem, the drafts, the event history, or anyone's home location. A report is available through these endpoints only while it is `awaiting_verification` and the user may verify it; otherwise the response is `404 Not Found` with code `REPORT_NOT_FOUND`.

### Verification request object

    {
      "report_id": "UUID",
      "title": "Pothole near the market",
      "description": "A large pothole is making the road unsafe.",
      "category": "road_damage",
      "location_text": "Near the main market",
      "latitude": 30.7,
      "longitude": 76.8,
      "distance_km": 0.8,
      "is_own_report": false,
      "awaiting_since": "2026-10-18T09:00:00Z",
      "my_vote": null,
      "evidence": [
        {
          "id": "UUID",
          "kind": "repair_photo",
          "content_type": "image/jpeg",
          "description": "Pothole filled with asphalt.",
          "uploaded_at": "2026-10-18T08:55:00Z"
        }
      ]
    }

- `distance_km` is the distance between the report and the user's home, rounded to 0.1 km, or null when either location is missing (possible only for the user's own report).
- `awaiting_since` is when the official claimed the repair.
- `my_vote` is `fixed`, `still_broken`, or null if the user has not voted in this round.
- `evidence` lists the report's photos of both kinds, oldest first, without uploader IDs or file names. Photos are downloaded through the `/file` endpoint below.
- Vote counts are not shown, so earlier votes do not influence the next voter.

### GET /api/v1/verifications

List the repairs the user may verify (their own reports and nearby ones), oldest claim first, including ones they already voted on in this round.

Success: `200 OK`

Response:

    {
      "items": []
    }

Each item is a Verification request object.

### GET /api/v1/verifications/{report_id}

One Verification request object.

Errors:

- `404 Not Found` with code `REPORT_NOT_FOUND`: see above.

### GET /api/v1/verifications/{report_id}/evidence/{evidence_id}/file

Download one of the report's photos, with the same response and errors as `GET /api/v1/reports/{report_id}/evidence/{evidence_id}/file`.

### POST /api/v1/verifications/{report_id}/votes

Vote on the claimed repair.

Request:

    {
      "verdict": "fixed"
    }

- `verdict`: required, `fixed` or `still_broken`.

Success: `201 Created`

Response:

    {
      "verdict": "fixed",
      "report_status": "awaiting_verification"
    }

`report_status` is the report's status after this vote (`awaiting_verification`, `resolved`, or `in_progress`). Records a `verification_vote_recorded` event. If the vote decides the outcome, it also records a `report_status_changed` event with no actor.

Errors:

- `404 Not Found` with code `REPORT_NOT_FOUND`: see above.
- `409 Conflict` with code `ALREADY_VOTED`: The user already voted in this round.
- `422 Unprocessable Entity`: Missing or unknown verdict.

## 12. Nearby issues

Residents see problems their neighbours reported, and can say "Me too". A report appears on a user's Nearby issues page only while all of these hold (otherwise the endpoints below return `404 Not Found` with code `REPORT_NOT_FOUND`):

- its owner shares it (`PUT /api/v1/reports/{report_id}/sharing`, section 4);
- it is not `closed`;
- it belongs to someone else (owners see their reports under `GET /api/v1/reports`);
- the user's saved home location is within 2 km of the report (great-circle distance).

Officials already see every report, so all `/nearby` endpoints return `403 Forbidden` with code `NEARBY_FORBIDDEN` for them.

Residents see only what helps them recognise the problem: no owner ID, drafts, AI output, approval or submission fields, status-change notes, repair photos, or anyone's home location. The reporter's name only when the owner chose to show it.

### Nearby report object

    {
      "report_id": "UUID",
      "title": "Pothole near the market",
      "description": "A large pothole is making the road unsafe.",
      "category": "road_damage",
      "status": "under_review",
      "location_text": "Near the main market",
      "latitude": 30.7,
      "longitude": 76.8,
      "distance_km": 0.8,
      "reporter_name": null,
      "created_at": "2026-10-14T10:00:00Z",
      "updated_at": "2026-10-15T09:00:00Z",
      "support_count": 2,
      "my_support": false,
      "can_support": true,
      "status_history": [
        { "status": "reported", "at": "2026-10-14T10:00:00Z" },
        { "status": "under_review", "at": "2026-10-15T09:00:00Z" }
      ],
      "photos": [
        {
          "id": "UUID",
          "content_type": "image/jpeg",
          "description": "The hole is about one metre wide.",
          "uploaded_at": "2026-10-14T10:01:00Z"
        }
      ]
    }

- `distance_km` is the distance between the report and the user's home, rounded to 0.1 km. In `GET /api/v1/nearby/around` it is the distance from the given point instead, rounded to 0.001 km.
- `reporter_name` is null when the reporter is anonymous.
- `my_support` is true if the user said "Me too".
- `can_support` is true if the user may say "Me too", which needs the report on their Nearby issues page. It can only be false in `GET /api/v1/nearby/around`.
- `status_history` starts with `reported` at `created_at`, followed by each status change in order, with only the new status and its time.
- `photos` lists the report's `report_photo` evidence, oldest first, without uploader IDs or file names.

### GET /api/v1/nearby

List the user's nearby issues, nearest first.

Success: `200 OK`

    {
      "items": []
    }

Each item is a Nearby report object.

Errors:

- `409 Conflict` with code `HOME_LOCATION_REQUIRED`: The user has not saved a home location.

### GET /api/v1/nearby/around

"Already reported?" check while creating a report: other people's shared, non-closed reports within 200 m of a point, nearest first. Needs no home location. It shows nothing more than a user could see by saving a home near that point.

Query parameters:

- `latitude`: required, -90 to 90.
- `longitude`: required, -180 to 180.

Success: `200 OK`, with `{"items": [...]}` of Nearby report objects (distance from the point).

Errors:

- `403 Forbidden` with code `NEARBY_FORBIDDEN`: The user is an official.
- `422 Unprocessable Entity`: Missing or out-of-range coordinates.

### GET /api/v1/nearby/{report_id}

One Nearby report object.

### GET /api/v1/nearby/{report_id}/photos/{evidence_id}/file

Download one of the report's problem photos, with the same response as `GET /api/v1/reports/{report_id}/evidence/{evidence_id}/file`. Repair photos and other reports' photos return `404 Not Found` with code `EVIDENCE_NOT_FOUND`.

### POST /api/v1/nearby/{report_id}/support

Say "Me too": the user sees this problem too. One per person per report.

Success: `201 Created`

    {
      "support_count": 3,
      "my_support": true
    }

Errors:

- `409 Conflict` with code `ALREADY_SUPPORTED`: The user already said "Me too".

### DELETE /api/v1/nearby/{report_id}/support

Take back the user's "Me too". Taking back one that does not exist is not an error.

Success: `200 OK`, with the same body as above (`my_support` false).

## 13. Official approval (admins)

Admins decide who may act as an official. The app cannot check that an applicant works for an authority: the admin confirms it outside the app before approving (database-schema.md section 3). All endpoints here are for admins only (`403 ADMIN_ONLY` for others).

### Official account object

    {
      "id": "UUID",
      "name": "Meera Iyer",
      "email": "meera@example.com",
      "approval_status": "pending",
      "official_department": "Municipal Corporation, Roads",
      "official_job_title": "Junior Engineer",
      "applied_at": "2026-10-22T10:00:00Z",
      "reviewed_at": null,
      "reviewed_by_name": null,
      "review_note": null,
      "created_at": "2026-10-22T10:00:00Z"
    }

- `official_department`, `official_job_title`, and `applied_at` are null for officials made with the `set_role` script.
- No home location, password, or report data is included.

### GET /api/v1/admin/officials

List official accounts.

Query parameters:

- `approval_status`: optional, `pending`, `approved`, or `rejected`. Without it, all officials are listed.

Success: `200 OK` with `{"items": [...]}` of Official account objects: pending first (oldest application first, so nobody waits longest), then the rest by name.

### POST /api/v1/admin/officials/{user_id}/approve

Approve a pending or rejected official. They can then use the official endpoints.

Request (optional body):

    {
      "note": "Confirmed by phone with the Roads department."
    }

- `note`: optional, at most 500 characters; stored as `review_note` (null when left out).

Success: `200 OK` with the Official account object. Sets `approval_status` to `approved`, `reviewed_at` to now, and `reviewed_by_name` to this admin. Approving an approved official changes nothing.

### POST /api/v1/admin/officials/{user_id}/reject

Reject a pending application, or take back an approved official's access. The account is kept; the official sees the note and may send the application again.

Request:

    {
      "note": "We could not confirm your job with the department."
    }

- `note`: required, 1–500 characters after trimming, so the official knows why.

Success: `200 OK` with the Official account object (`approval_status` `rejected`). Rejecting a rejected official replaces the note.

Errors for both:

- `404 Not Found` with code `OFFICIAL_NOT_FOUND`: No official account has this ID.
- `422 Unprocessable Entity`: The note fails validation.

## 14. Future work

- Expiry for repairs that get too few verification votes.
- Deleting evidence uploaded by mistake.
- Detailed jurisdiction matching for authorities.
- Retry behavior for failed submissions.
- Signing out other sessions after a password change (`password_changed_at`), and changing the email.

## 15. Implementation notes

- The frontend uses these interfaces, or local mocks with exactly the same shapes.
- The AI workflow must return structured output matching ai-contract.md section 3.
- The backend remains responsible for validation, permissions, persistence, approval checks, and truthful submission status.
- When the contract changes, update this document, database-schema.md, and ai-contract.md together.
