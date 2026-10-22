# CivicFix AI — System Architecture

## 1. Project Overview

CivicFix AI is a civic-issue reporting and tracking platform. Citizens can report problems such as potholes, garbage accumulation, and broken streetlights.

The platform uses AI to suggest issue categories, identify missing information, match suitable authorities from a maintained directory, and draft complaints for citizen review.

AI-generated suggestions are not verified facts. Citizens must approve complaint drafts before any external submission.

## 2. Technology Stack

- Frontend: React + Vite
- Backend: Python + FastAPI, with Pydantic for validation
- Database: PostgreSQL 18
- ORM: SQLAlchemy 2.x with psycopg 3; Alembic for migrations (planned)
- AI workflow: Python functions and an LLM API
- Testing: Pytest and API testing tools
- Version control: Git and GitHub

## 3. Main Components

### Frontend

Responsible for registration and login screens, report creation, report dashboards, report details, AI suggestions, draft editing, approval controls, and event timelines.

### Backend API

Responsible for authentication, authorization, request validation, report management, database operations, AI workflow coordination, draft versioning, approval, submission-state tracking, and event history.

### PostgreSQL Database

Stores users, reports, complaint drafts, authorities, report events, AI analysis runs, and evidence metadata.

### File Storage

Stores evidence photos in a private Supabase Storage bucket. Only the backend holds the storage credentials; the frontend downloads photos through the API, which checks access first. The provider is chosen with the `STORAGE_PROVIDER` setting (`supabase`, or `local` for development without internet); tests use an in-memory fake.

### AI Workflow

Receives report information and the verified authorities from the directory, and returns structured suggestions: a category, missing-field information, an authority match, and a complaint draft.

AI outputs must be distinguishable from verified information. Authority records must come from the maintained directory, not unsupported AI claims.

## 4. Request Flow

1. A citizen creates a report through the frontend.
2. The frontend sends the report to the FastAPI backend.
3. The backend validates the request, stores the report in PostgreSQL, and records an event.
4. The citizen requests AI analysis.
5. The backend sends the report and the verified authorities from the directory to the AI workflow, validates the output, and stores the analysis run and a new complaint draft version.
6. The citizen reviews the suggestions, may edit the draft (each edit creates a new version), and approves the latest version.
7. An external submission is attempted only when a valid approval is recorded and an authorized integration is configured. Without an integration, the backend reports that submission is unavailable.
8. Officials move the report through its statuses. To claim a repair, an official uploads an after-repair photo and moves the report to awaiting verification.
9. The report's owner and residents whose saved home location is nearby vote "fixed" or "still broken". Enough "fixed" votes make the report resolved; "still broken" sends it back to the officials. Resolved means residents confirmed the repair, not that it is proven.
10. The platform records each important action and its outcome as report events.

## 5. Project Setup

CivicFix AI is built by a single developer. The frontend, backend, and AI workflow are components of one system, not separate team roles.

Design documents:

- architecture.md — this overview
- database-schema.md — tables, constraints, and approval rules
- api-contract.md — HTTP endpoints and responses
- ai-contract.md — AI workflow input and output

## 6. Important Rules

- Keep secrets out of source control.
- Use feature branches and pull requests; never commit directly to main.
- Keep database-schema.md, api-contract.md, and ai-contract.md consistent, and update them together.
- Enforce report ownership and permissions on the backend.
- Never claim an external complaint was submitted or resolved without reliable confirmation.
- Approval applies to one specific draft version; any new draft or report edit invalidates it.
- Reports are locked once a submission is pending, confirmed, or unknown.
- Closed reports are final: never deleted, and their content can't change.
- Keep a record of important status changes and AI analysis runs.
- Do not treat an AI suggestion as a verified fact.
- A report becomes resolved only through residents' verification votes, never by an official's claim alone.
- Users' home locations are private: used only to find nearby repairs and nearby issues, never shown to others.
- Reports are private until their owner shares them with residents within 2 km; the owner's name is hidden from everyone (officials too) unless they choose to show it.

## 7. MVP Scope

The first version will focus on report creation and tracking, a seeded authority directory (each record marked verified or unverified), AI-assisted analysis, versioned complaint drafts, citizen approval, and transparent event history.

Citizens can attach photos to their reports. Detailed jurisdiction rules are postponed.

External complaint submission depends on the availability of a real, authorized integration. Without one, the application must clearly indicate that external submission is unavailable.
