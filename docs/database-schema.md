# CivicFix AI — Database Schema

**Database:** PostgreSQL  
**ORM:** SQLAlchemy 2.0  
**Status:** Aligned with api-contract.md and ai-contract.md — ready for model implementation

## 1. General conventions

- Primary keys use UUIDs.
- Timestamps use timezone-aware PostgreSQL timestamps and are stored in UTC.
- Foreign keys enforce relationships between records.
- Email addresses must be unique, ignoring letter case.
- Passwords are stored only as secure password hashes.
- Report ownership is enforced by the backend on every protected request.
- Important workflow changes are recorded in `report_events`.
- AI results are stored separately from citizen-provided report data.
- Fixed value lists (categories and statuses) are stored as constrained strings and enforced with CHECK constraints.

Naming: a **report** is the civic issue a citizen records. A **complaint draft** is the text that may be sent to an authority about that report.

## 2. Issue categories

This is the single source of truth for category values:

- road_damage
- garbage
- streetlight
- other

`reports.category` may be null, meaning the category has not been set. The AI may answer `unknown`; that value is never stored as a report's category. An AI-suggested category is stored on the report only after the citizen accepts it.

## 3. users

Stores citizen account information.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(100) | Required |
| email | VARCHAR(255) | Required, unique ignoring letter case |
| password_hash | VARCHAR(255) | Required |
| created_at | TIMESTAMPTZ | Required |
| updated_at | TIMESTAMPTZ | Required |

Email uniqueness ignores letter case: `Aarav@example.com` and `aarav@example.com` cannot both exist. It is enforced by a unique index on `lower(email)`. The email is stored as entered, and login looks it up case-insensitively.

## 4. reports

Stores civic reports.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Required, foreign key to users.id |
| title | VARCHAR(200) | Required |
| description | TEXT | Required |
| category | VARCHAR(50) | Optional, one of the values in section 2 |
| status | VARCHAR(30) | Required, default reported |
| location_text | VARCHAR(500) | Optional |
| latitude | DOUBLE PRECISION | Optional, range -90 to 90 |
| longitude | DOUBLE PRECISION | Optional, range -180 to 180 |
| authority_id | UUID | Optional, foreign key to authorities.id; must reference a verified authority (checked by the backend) |
| approved_draft_id | UUID | Optional, foreign key to complaint_drafts.id |
| approved_at | TIMESTAMPTZ | Optional |
| approved_by_user_id | UUID | Optional, foreign key to users.id |
| submission_status | VARCHAR(30) | Required, default not_submitted |
| external_reference | VARCHAR(255) | Optional, set only from a confirmed integration response |
| submitted_at | TIMESTAMPTZ | Optional, set only when submission is confirmed |
| created_at | TIMESTAMPTZ | Required |
| updated_at | TIMESTAMPTZ | Required |

Report statuses:

- reported
- under_review
- in_progress
- resolved
- closed

Submission statuses:

- not_submitted — no submission has been requested
- pending — submission requested, outcome not yet known
- confirmed — the authorized integration reliably confirmed receipt
- failed — the integration reported a failure
- unknown — the outcome could not be determined

Submission status is tracked separately from the report status. An attempted external submission does not mean that the authority received or resolved the complaint. The backend never generates an `external_reference` itself.

## 5. complaint_drafts

Stores every version of a report's complaint draft. Rows are only inserted, never updated.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| report_id | UUID | Required, foreign key to reports.id |
| version | INTEGER | Required, starts at 1, unique together with report_id |
| text | TEXT | Required, not blank |
| source | VARCHAR(20) | Required, one of: ai, citizen |
| agent_run_id | UUID | Foreign key to agent_runs.id; required when source is ai, null when source is citizen |
| created_at | TIMESTAMPTZ | Required |

- Each completed AI analysis inserts a new draft with source `ai`.
- Each citizen edit inserts a new draft with source `citizen`.
- The new draft's version is the report's highest existing version plus 1.
- The **latest draft** is the one with the highest version for that report.

## 6. Approval rules

- A citizen approves one specific draft, which must be the report's latest draft at the time of approval. The backend stores its ID in `reports.approved_draft_id`, along with `approved_at` and `approved_by_user_id`, and records a `draft_approved` event.
- The approved draft must belong to the same report. The backend checks this.
- The three approval columns are filled only while the approval is valid. Otherwise all three are null.
- Each of these actions invalidates an existing approval:
  - creating a new draft version (from the AI or the citizen)
  - editing the report's title, description, location, or `authority_id`, because the draft was written from those fields and for that authority
- When an approval is invalidated, the backend clears the three approval columns and records an `approval_invalidated` event in the same transaction.
- Before any submission, the backend verifies that the approval columns are filled and, as a second safety check, that `approved_draft_id` still points to the report's latest draft.
- A report is **locked** while its `submission_status` is pending, confirmed, or unknown. While locked, the backend does not edit the report, create new drafts (from the AI or the citizen), or record an approval. See "Locked reports" in api-contract.md section 4.

## 7. authorities

Stores the maintained authority directory.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(200) | Required |
| region | VARCHAR(200) | Required |
| supported_categories | VARCHAR(50)[] | Required, default empty array; each value from section 2 |
| contact_url | VARCHAR(500) | Optional |
| verification_status | VARCHAR(30) | Required, one of: verified, unverified; default unverified |
| last_verified_at | TIMESTAMPTZ | Optional |
| created_at | TIMESTAMPTZ | Required |
| updated_at | TIMESTAMPTZ | Required |

- Authority records must not be labeled verified without supporting verification.
- For the MVP, authorities are matched by plain text on `region` and by `supported_categories`.
- Detailed jurisdiction rules are future work.

## 8. report_events

Records important changes in a report's lifecycle.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| report_id | UUID | Required, foreign key to reports.id |
| actor_user_id | UUID | Optional, foreign key to users.id |
| event_type | VARCHAR(50) | Required |
| description | TEXT | Required |
| event_metadata | JSONB | Optional |
| created_at | TIMESTAMPTZ | Required |

Event types:

- report_created
- report_updated
- report_status_changed
- ai_analysis_completed
- ai_analysis_failed
- draft_created
- draft_edited
- draft_approved
- approval_invalidated
- submission_requested
- submission_confirmed
- submission_failed
- submission_unknown

Events should be append-only through normal application operations. Sensitive credentials and unnecessary personal information must never be placed in event metadata.

## 9. agent_runs

Stores AI analysis attempts and their results.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| report_id | UUID | Required, foreign key to reports.id |
| status | VARCHAR(30) | Required |
| input_snapshot | JSONB | Optional |
| result | JSONB | Optional, validated AI output (see ai-contract.md) |
| error_message | TEXT | Optional, controlled error only |
| model_name | VARCHAR(100) | Optional |
| prompt_version | VARCHAR(50) | Optional |
| started_at | TIMESTAMPTZ | Required |
| completed_at | TIMESTAMPTZ | Optional |

Run statuses:

- pending
- running
- completed
- failed

- Each run is a separate attempt, preserving earlier results for debugging and evaluation.
- The **latest analysis** is the completed run with the most recent `completed_at`.
- Only output that passes schema validation is stored in `result`.
- Do not store API keys or hidden chain-of-thought in these records.

## 10. Indexes and constraints

Indexes:

- lower(users.email) — unique index, named uq_users_email_lower (case-insensitive email uniqueness)
- reports.user_id
- reports.status
- reports.category
- reports.created_at
- reports.authority_id
- complaint_drafts.report_id and version — unique index
- report_events.report_id and created_at
- agent_runs.report_id and started_at

CHECK constraints:

- reports.category is null or one of the values in section 2.
- reports.status, reports.submission_status, authorities.verification_status, complaint_drafts.source, and agent_runs.status use their listed values.
- complaint_drafts.agent_run_id is not null when source is ai, and null when source is citizen.
- reports.approved_draft_id, reports.approved_at, and reports.approved_by_user_id are either all null or all set.
- reports.external_reference and reports.submitted_at are null unless submission_status is confirmed.
- authorities.supported_categories contains only values from section 2 (no null elements).
- authorities.verification_status is verified only when last_verified_at is set.
- complaint_drafts.version is at least 1.
- Latitude is between -90 and 90; longitude is between -180 and 180.
- Required text fields are not blank.

Additional rules:

- All foreign keys use ON DELETE RESTRICT: a row that other rows reference cannot be deleted, so history is never removed silently. The MVP has no delete operations; revisit this together with the soft-deletion decision.
- Prevent unauthorized access to another user's reports.
- Use transactions when a change and its event must be recorded together.

## 11. Future work: evidence (postponed)

Evidence uploads are not part of the MVP. This table is the planned design and is not included in the initial migrations.

| Column | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| report_id | UUID | Required, foreign key to reports.id |
| file_name | VARCHAR(255) | Required |
| storage_key | VARCHAR(500) | Required |
| content_type | VARCHAR(100) | Required |
| file_size_bytes | BIGINT | Required, positive |
| description | TEXT | Optional, citizen-provided; used as `evidence_descriptions` in the AI input |
| uploaded_at | TIMESTAMPTZ | Required |

- Files will be stored in file storage, not inside PostgreSQL.
- Uploads must be validated for size and allowed content types.
- Index on evidence.report_id.
- Until this is built, the AI input sends an empty `evidence_descriptions` list.

## 12. Items to finalize later

- Allowed transitions between report statuses, and who may change them.
- External submission retry behavior.
- Whether soft deletion is required for user accounts or reports.
- Data retention and file-storage policies.
