# CivicFix AI — System Architecture

## 1. Project Overview

CivicFix AI is a civic-issue reporting and tracking platform. Citizens can report problems such as potholes, garbage accumulation, and broken streetlights.

The platform uses AI to suggest issue categories, identify missing information, look up suitable authorities, and draft complaints for citizen review.

AI-generated suggestions are not verified facts. Citizens must approve complaint drafts before any external submission.

## 2. Technology Stack

- Frontend: React + Vite
- Backend: Python + FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy
- AI workflow: Python functions and an LLM API
- Testing: Pytest and API testing tools
- Version control: Git and GitHub

## 3. Main Components

### Frontend

Responsible for registration and login screens, report creation, report dashboards, report details, AI suggestions, approval controls, and event timelines.

### Backend API

Responsible for authentication, authorization, request validation, report management, database operations, AI workflow coordination, approval, submission-state tracking, and event history.

### PostgreSQL Database

Stores users, complaints, evidence metadata, authorities, complaint events, and AI analysis runs.

### AI Workflow

Receives report information and returns structured suggestions, missing-field information, authority lookup results, and a complaint draft.

AI outputs must be distinguishable from verified information. Authority records must come from a maintained directory, not unsupported AI claims.

## 4. Request Flow

1. A citizen submits a report through the frontend.
2. The frontend sends the report to the FastAPI backend.
3. The backend validates the request and stores the report in PostgreSQL.
4. The citizen requests AI analysis.
5. The backend coordinates the AI workflow and stores the analysis result.
6. The citizen reviews and approves the proposed complaint.
7. An external submission is attempted only when an authorized integration is configured and the required approval is recorded.
8. The platform records the outcome of the operation and relevant report events.

## 5. Team Responsibilities

- Team leader / Backend developer: API, database, authentication, validation, permissions, event history, testing, and integration.
- Frontend developer: React UI, forms, dashboards, API integration, and approval experience.
- AI developer: classification, missing-field detection, authority matching, complaint drafting, and AI evaluation.

## 6. Important Rules

- Keep secrets out of source control.
- Use feature branches and pull requests.
- Keep API contracts consistent across the team.
- Enforce report ownership and permissions on the backend.
- Never claim an external complaint was submitted or resolved without reliable confirmation.
- Keep a record of important status changes and AI analysis runs.
- Do not treat an AI suggestion as a verified fact.

## 7. MVP Scope

The first version will focus on report creation and tracking, a verified authority directory, AI-assisted analysis, citizen approval, and transparent event history.

External complaint submission depends on the availability of a real, authorized integration. Without one, the application must clearly indicate that external submission is unavailable.