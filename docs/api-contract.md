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
- `422 Unprocessable Entity`: Request validation failed.
- `500 Internal Server Error`: Unexpected server error.
- `502 Bad Gateway`: The AI workflow or submission integration returned a failure.
- `503 Service Unavailable`: Required external service is unavailable.

## 3. Authentication

### POST /api/v1/auth/register

Create a citizen account.

Request:

    {
      "name": "Aarav Sharma",
      "email": "aarav@example.com",
      "password": "example-password"
    }

Success: `201 Created`

Response:

    {
      "id": "UUID",
      "name": "Aarav Sharma",
      "email": "aarav@example.com",
      "created_at": "2026-10-14T10:00:00Z"
    }

Validation:

- `name`: required, 1–100 characters after trimming surrounding spaces.
- `email`: required, a valid email address, at most 255 characters.
- `password`: required, 8–128 characters.

Errors:

- `409 Conflict` with code `EMAIL_TAKEN`: an account with this email already exists (compared ignoring letter case).
- `422 Unprocessable Entity`: a field fails validation.

Passwords must never appear in API responses or logs. They are stored only as Argon2 hashes.

### POST /api/v1/auth/login

Request:

    {
      "email": "aarav@example.com",
      "password": "example-password"
    }

Success: `200 OK`

Response:

    {
      "access_token": "example-token",
      "token_type": "bearer"
    }

Invalid credentials: `401 Unauthorized` with code `INVALID_CREDENTIALS`. A wrong password and an unknown email return the same response, so the API does not reveal which emails have accounts. Email is matched ignoring letter case.

Tokens:

- The access token is a JWT signed with HS256 using `SECRET_KEY` from `backend/.env`.
- It expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60). There are no refresh tokens; the citizen logs in again.
- Send it on protected endpoints as `Authorization: Bearer <access_token>`.
- A missing token returns `401` with code `NOT_AUTHENTICATED`. An invalid or expired token, or one whose user no longer exists, returns `401` with code `INVALID_TOKEN`.

### GET /api/v1/auth/me

Return the logged-in user. Requires a token.

Success: `200 OK`

Response: the same shape as the register response.

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
      "created_at": "2026-10-14T10:00:00Z",
      "updated_at": "2026-10-14T10:00:00Z"
    }

- `status` is one of: reported, under_review, in_progress, resolved, closed.
- `submission_status` is one of: not_submitted, pending, confirmed, failed, unknown.
- `approved_draft_id` and `approved_at` are set only while a valid approval exists.
- `external_reference` and `submitted_at` are set only after a confirmed submission.

### Locked reports

A report is **locked** while its `submission_status` is `pending`, `confirmed`, or `unknown`. A locked report cannot be changed by these endpoints, which return `409 Conflict`:

- `PATCH /api/v1/reports/{report_id}`
- `POST /api/v1/reports/{report_id}/drafts`
- `POST /api/v1/reports/{report_id}/analyze` (because analysis creates a new draft)
- `POST /api/v1/reports/{report_id}/approve`

This keeps the stored report, drafts, and approval identical to what was sent to the authority.

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

List reports belonging to the authenticated user.

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

Retrieve one report owned by the authenticated user.

Success: `200 OK`

Response: a Report object.

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
- `409 Conflict` with code `REPORT_LOCKED`: `submission_status` is pending, confirmed, or unknown.
- `409 Conflict` with code `NO_VALID_APPROVAL`: No approval, or the approved draft is not the latest draft.
- `503 Service Unavailable` with code `SUBMISSION_UNAVAILABLE`: No integration is configured.
- `502 Bad Gateway` with code `SUBMISSION_FAILED`: The integration reported a failure. The `failed` status and event are saved.

If the integration crashes or returns an unusable result (for example, "confirmed" without a reference), the outcome is recorded as `unknown`, because the backend cannot tell whether the authority received the complaint. This locks the report and prevents a blind retry from sending a duplicate.

The report row is locked (`SELECT ... FOR UPDATE`) during the request, so two simultaneous requests cannot both submit.

A successful API response must not falsely imply that an external authority received the complaint. The MVP has no submission integration, so this endpoint returns `503 Service Unavailable` until one is configured.

## 8. Report events

### GET /api/v1/reports/{report_id}/events

Retrieve the report's event history, oldest first.

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

## 10. Future work

- Evidence uploads are postponed. Endpoints will be added when the evidence table (database-schema.md section 11) is implemented.
- Detailed jurisdiction matching for authorities.
- Retry behavior for failed submissions.

## 11. Implementation notes

- The frontend uses these interfaces, or local mocks with exactly the same shapes.
- The AI workflow must return structured output matching ai-contract.md section 3.
- The backend remains responsible for validation, permissions, persistence, approval checks, and truthful submission status.
- When the contract changes, update this document, database-schema.md, and ai-contract.md together.
