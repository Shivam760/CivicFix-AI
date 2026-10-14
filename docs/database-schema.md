# CivicFix AI — Database Schema

**Database:** PostgreSQL  
**ORM:** SQLAlchemy 2.0  
**Status:** Initial proposal — align with the API contract before implementation

## 1. General conventions

- Primary keys use UUIDs.
- Timestamps use timezone-aware PostgreSQL timestamps and are stored in UTC.
- Foreign keys enforce relationships between records.
- Email addresses must be unique.
- Passwords are stored only as secure password hashes.
- Report ownership is enforced by the backend on every protected request.
- Important workflow changes are recorded in `complaint_events`.
- AI results are stored separately from citizen-provided report data.

## 2. users

Stores citizen account information.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(100) | Required |
| email | VARCHAR(255) | Required, unique |
| password_hash | VARCHAR(255) | Required |
| created_at | TIMESTAMPTZ | Required |
| updated_at | TIMESTAMPTZ | Required |

## 3. complaints

Stores civic reports.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Required, foreign key to users.id |
| title | VARCHAR(200) | Required |
| description | TEXT | Required |
| category | VARCHAR(50) | Nullable until known |
| status | VARCHAR(30) | Required, default reported |
| location_text | VARCHAR(500) | Optional |
| latitude | DOUBLE PRECISION | Optional, range -90 to 90 |
| longitude | DOUBLE PRECISION | Optional, range -180 to 180 |
| authority_id | UUID | Optional, foreign key to authorities.id |
| approved_draft | TEXT | Optional |
| approved_at | TIMESTAMPTZ | Optional |
| approved_by_user_id | UUID | Optional, foreign key to users.id |
| approved_analysis_run_id | UUID | Optional, foreign key to agent_runs.id |
| submission_status | VARCHAR(30) | Required, default not_submitted |
| external_reference | VARCHAR(255) | Optional |
| submitted_at | TIMESTAMPTZ | Optional |
| created_at | TIMESTAMPTZ | Required |
| updated_at | TIMESTAMPTZ | Required |

Initial report statuses:

- reported
- under_review
- in_progress
- resolved
- closed

Submission status must be tracked separately from the civic report status. An attempted external submission does not mean that the authority received or resolved the complaint.

## 4. evidence

Stores metadata for files attached to complaints. The actual files should be stored in file storage, not directly inside PostgreSQL for this MVP.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| complaint_id | UUID | Required, foreign key to complaints.id |
| file_name | VARCHAR(255) | Required |
| storage_key | VARCHAR(500) | Required |
| content_type | VARCHAR(100) | Required |
| file_size_bytes | BIGINT | Required, positive |
| uploaded_at | TIMESTAMPTZ | Required |

File uploads must be validated for size and allowed content types.

## 5. authorities

Stores the maintained authority directory.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(200) | Required |
| region | VARCHAR(200) | Required |
| contact_url | VARCHAR(500) | Optional |
| verification_status | VARCHAR(30) | Required |
| last_verified_at | TIMESTAMPTZ | Optional |
| created_at | TIMESTAMPTZ | Required |
| updated_at | TIMESTAMPTZ | Required |

Authority records must not be labeled verified without supporting verification. Supported issue categories and jurisdiction rules must be defined consistently with the AI workflow.

## 6. complaint_events

Records important changes in a complaint's lifecycle.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| complaint_id | UUID | Required, foreign key to complaints.id |
| actor_user_id | UUID | Optional, foreign key to users.id |
| event_type | VARCHAR(50) | Required |
| description | TEXT | Required |
| event_metadata | JSONB | Optional |
| created_at | TIMESTAMPTZ | Required |

Examples of event types:

- report_created
- report_updated
- status_changed
- ai_analysis_completed
- complaint_approved
- submission_requested
- submission_confirmed
- submission_failed

Events should be append-only through normal application operations. Sensitive credentials and unnecessary personal information must never be placed in event metadata.

## 7. agent_runs

Stores AI analysis attempts and their results.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| complaint_id | UUID | Required, foreign key to complaints.id |
| status | VARCHAR(30) | Required |
| input_snapshot | JSONB | Optional |
| result | JSONB | Optional |
| error_message | TEXT | Optional |
| model_name | VARCHAR(100) | Optional |
| started_at | TIMESTAMPTZ | Required |
| completed_at | TIMESTAMPTZ | Optional |

Suggested run statuses:

- pending
- running
- completed
- failed

Each run is a separate attempt, preserving earlier results for debugging and evaluation. Do not store API keys or hidden chain-of-thought in these records.

## 8. Indexes and constraints

Proposed indexes:

- users.email — unique index
- complaints.user_id
- complaints.status
- complaints.category
- complaints.created_at
- evidence.complaint_id
- complaint_events.complaint_id and created_at
- agent_runs.complaint_id and started_at
- complaints.authority_id

Additional rules:

- Validate latitude and longitude ranges.
- Ensure required text fields are not blank.
- Use foreign keys with deliberate deletion behavior.
- Prevent unauthorized access to another user's complaints and evidence.
- Consider database-level constraints for status values.
- Use transactions when a status change and its event must be recorded together.

## 9. Items to finalize before implementation

- Exact complaint status lifecycle.
- Whether category values are enums or constrained strings.
- How authority categories and jurisdiction are represented.
- How citizen approval is linked to a specific AI draft version.
- External submission status, confirmation identifiers, and retry behavior.
- Whether soft deletion is required for user accounts or reports.
- Data retention and file-storage policies.

Approval applies to a specific complaint draft version and AI analysis run. Editing the draft invalidates the previous approval. The backend must verify approval before submission and mark a submission as confirmed only when the authorized integration provides reliable confirmation. Every submission attempt and its outcome must be recorded in complaint_events.