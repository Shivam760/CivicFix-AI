# CivicFix AI — API Contract

**Status:** Initial proposal — team agreement required  
**Base URL:** `http://localhost:8000`  
**API prefix:** `/api/v1`  
**Content type:** `application/json`, unless otherwise specified

## 1. General conventions

- Resource IDs are UUIDs.
- Timestamps use ISO 8601 format in UTC.
- Authentication uses bearer tokens after login.
- Protected endpoints require a valid authenticated user.
- Users can access only their own reports unless an explicitly authorized role permits otherwise.
- AI-generated content must be labeled as a suggestion.
- API errors use a consistent JSON structure.
- External complaint submission must never be represented as successful without confirmation from a real authorized integration.

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

Passwords must never appear in API responses or logs.

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

Invalid credentials: `401 Unauthorized`

The token format and expiry policy must be agreed before implementation.

## 4. Reports

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

The category and coordinates may be optional when information is unavailable. Exact validation rules must be finalized with the frontend team.

Success: `201 Created`

Response:

    {
      "id": "UUID",
      "title": "Pothole near the market",
      "description": "A large pothole is making the road unsafe.",
      "category": "road_damage",
      "status": "reported",
      "location_text": "Near the main market",
      "latitude": 30.7,
      "longitude": 76.8,
      "created_at": "2026-10-14T10:00:00Z",
      "updated_at": "2026-10-14T10:00:00Z"
    }

### GET /api/v1/reports

List reports belonging to the authenticated user.

Proposed query parameters:

- `status`: Filter by report status.
- `category`: Filter by issue category.
- `page`: Page number, starting at 1.
- `page_size`: Number of results per page.

Success: `200 OK`

Response:

    {
      "items": [],
      "page": 1,
      "page_size": 20,
      "total": 0
    }

### GET /api/v1/reports/{report_id}

Retrieve one report owned by the authenticated user.

Success: `200 OK`

Response: A single report object, including its ID, title, description, category, status, location, and timestamps.

### PATCH /api/v1/reports/{report_id}

Update permitted report fields.

Request example:

    {
      "description": "Updated description with additional details."
    }

Success: `200 OK`

Only explicitly permitted fields may be updated. Changes to sensitive workflow fields, ownership, and status must use authorized operations rather than unrestricted updates.

## 5. AI analysis

### POST /api/v1/reports/{report_id}/analyze

Request AI analysis for a report.

Request:

    {
      "include_complaint_draft": true
    }

Success: `200 OK` for a completed analysis. If processing becomes asynchronous, use `202 Accepted` and return a run ID and processing status.

Proposed response:

    {
      "run_id": "UUID",
      "report_id": "UUID",
      "status": "completed",
      "suggestions": {
        "category": {
          "value": "road_damage",
          "confidence": 0.94
        },
        "missing_fields": [],
        "authority": {
          "authority_id": null,
          "suggested_name": null,
          "verification_status": "unverified"
        },
        "complaint_draft": {
          "text": "Draft complaint text...",
          "requires_citizen_approval": true
        }
      },
      "created_at": "2026-10-14T10:05:00Z"
    }

The confidence value is an illustrative example, not a guarantee of correctness. Authority suggestions must be matched against the maintained authority directory. Unverified suggestions must be labeled clearly.

### GET /api/v1/reports/{report_id}/analysis

Retrieve the latest available analysis for a report.

Success: `200 OK`

If analysis does not exist, return `404 Not Found`.

## 6. Citizen approval and external submission

### POST /api/v1/reports/{report_id}/approve

Approve the current complaint draft.

Request:

    {
      "approved": true,
      "draft_text": "The final complaint text reviewed by the citizen."
    }

Success: `200 OK`

The backend must record the approved draft, approver, timestamp, and associated AI analysis run. Editing a draft after approval invalidates the previous approval.

### POST /api/v1/reports/{report_id}/submit

Request an external complaint submission.

Request:

    {
      "approval_confirmed": true
    }

The backend must verify the stored approval and require a configured, authorized submission integration.

Possible outcomes:

- `200 OK`: An integration confirms successful submission.
- `202 Accepted`: Submission has been accepted for processing but is not yet confirmed.
- `409 Conflict`: The report has not been approved or is in an invalid state.
- `503 Service Unavailable`: No authorized submission integration is available.

A successful API response must not falsely imply that an external authority received the complaint. Track pending, confirmed, failed, and unknown outcomes explicitly.

## 7. Report events

### GET /api/v1/reports/{report_id}/events

Retrieve the report's event history.

Success: `200 OK`

Response:

    {
      "items": [
        {
          "id": "UUID",
          "event_type": "report_created",
          "description": "Report created.",
          "created_at": "2026-10-14T10:00:00Z"
        }
      ]
    }

Events should record important actions, including report creation, status changes, AI analysis, approval, and external submission outcomes.

## 8. Authorities

### GET /api/v1/authorities

List authorities from the maintained directory.

Proposed query parameters:

- `category`: Filter by supported issue category.
- `region`: Filter by jurisdiction or region.

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

Example data is illustrative only. Production authority records must be verified before being labeled as verified.

## 9. Implementation notes

- The frontend must use these interfaces or explicitly agreed mock equivalents.
- The AI workflow must return structured output matching the agreed analysis schema.
- The backend remains responsible for validation, permissions, persistence, approval checks, and truthful submission status.
- Any contract changes must be communicated to all teammates and reviewed before implementation.
- This document is a proposal until the team agrees on the final contract.