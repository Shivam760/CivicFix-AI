# CivicFix AI

# CivicFix AI 🚧

### AI-Powered Civic Issue Reporting, Repair Verification & Community Trust Platform

**Report problems. Track repairs. Verify progress together.**

CivicFix AI is an AI-assisted civic issue reporting and repair-verification platform. Residents can report issues such as potholes, garbage accumulation, and broken streetlights; track their status; and help verify whether a reported issue has actually been repaired. AI assists with report classification and complaint drafting, while repair evidence, community feedback, and authenticity risk signals support a more transparent verification process.

> **Project Type:** Full-Stack Web Application + Agentic AI  
> **Development Timeline:** 4–6 weeks (MVP)  
> **Team Size:** 3 Members  
> **Primary Stack:** React, FastAPI, PostgreSQL, Python, LLM API  
> **Project Status:** MVP in development

---

## 🔴 Problem Statement

Residents often face civic problems that are difficult to report, track, or verify. Even when an issue is reported, people may not know which authority is responsible or whether any action has been taken.

- **Scattered reporting:** Residents may not know where or how to report a pothole, garbage pile, or broken streetlight.
- **Unclear routing:** Reports can be difficult to direct to the relevant department or authority.
- **Limited status visibility:** Residents may not have a clear timeline showing what happened after a report was created.
- **Difficult repair verification:** An issue may be marked as fixed without an easy way for nearby residents to confirm the result.
- **Uncertain repair evidence:** An uploaded photo might be old, reused, unrelated to the reported location, edited, or AI-generated.
- **Limited community participation:** Residents living near an issue may be well placed to provide useful feedback, but often lack a structured way to do so.
- **Disconnected information:** Reports, repair photos, official updates, and community feedback may not be recorded in one transparent history.

These problems can reduce trust, make follow-up difficult, and leave residents uncertain about whether a reported issue has been resolved.

### Core Problem

**How can a civic reporting platform help residents report issues, track the response, and verify repair claims using evidence, AI-assisted checks, and community feedback?**

---

## 💡 Proposed Solution

CivicFix AI combines a civic issue reporting system with AI-assisted report preparation and a human-centered repair verification workflow.

Residents can create a report with a description, category, location, and optional photo. AI can suggest a category, identify missing information, and prepare a complaint draft. The system can look up a relevant authority from a verified directory when that information is available.

When an authorized official claims that an issue has been repaired, they can upload an after-repair photo and repair details. Nearby residents can then be notified through a configured notification service and asked to confirm whether the repair appears complete or report that the issue remains unresolved.

An AI-assisted image authenticity component can identify suspicious or inconclusive signals in the uploaded evidence. Its result is treated as a risk signal—not definitive proof that an image is real or fake. Conflicting or suspicious evidence can be referred for human review.

CivicFix AI is designed as a **transparency and decision-support platform**. AI suggestions do not replace official authority, and a photo or detector score alone should not automatically close a report.

---

## 🎯 Project Objectives

- Build a centralized platform for civic issue reporting and tracking.
- Help residents submit clearer reports using AI-assisted suggestions.
- Maintain a report timeline showing status changes and relevant events.
- Match reports to authorities using a maintained, verified directory where available.
- Allow authorized officials to submit repair claims and after-repair evidence.
- Enable nearby residents to provide structured repair-verification feedback.
- Assess uploaded repair images for possible manipulation, reuse, or AI-generation signals.
- Keep human review available when evidence is uncertain or conflicting.
- Enforce authentication, role-based access, and report ownership.
- Deliver a practical full-stack MVP within a 4–6 week development timeline.

---

## ✨ Key Features

### 1. Civic Issue Reporting

Residents can report issues such as:

- Potholes and damaged roads.
- Garbage accumulation.
- Broken streetlights.
- Other issue categories configured for the MVP.

A report may contain a description, category, location, and optional evidence. The platform should validate inputs and clearly show whether a report has been saved.

### 2. AI-Assisted Report Preparation

The AI workflow can help residents create clearer reports by:

- Suggesting an issue category.
- Identifying missing or unclear information.
- Asking for important details that may be needed to understand the issue.
- Drafting a concise, factual complaint.
- Showing suggestions for the resident to review and edit.

The AI must not invent facts, authority details, or submission results. A drafted complaint is not proof that an official complaint has been submitted.

### 3. Authority Directory and Routing Assistance

The platform can search a maintained authority directory to find a potentially relevant department or official contact.

- Prefer records from a verified data source.
- Show the basis or source of a match when available.
- Distinguish verified directory data from AI-generated suggestions.
- Return “no verified match” when the system cannot identify a reliable authority.
- Do not invent official contact information.

Actual complaint submission requires a real, authorized integration and explicit user approval.

### 4. Report Status and Event Timeline

Each report should have a clear history of relevant events, such as:

- Report created.
- Report details updated.
- AI analysis completed.
- Authority match recorded.
- Repair claimed.
- Repair evidence uploaded.
- Community verification received.
- Report placed under review or marked resolved by an authorized process.

The timeline should distinguish citizen updates, official claims, automated analysis, and verified outcomes.

### 5. Official Repair Claim and Photo Evidence

When an issue is believed to be repaired, an authorized official account can:

1. Open the relevant report.
2. Submit a repair note.
3. Upload an after-repair photo.
4. Provide repair time and other supported details.
5. Submit the claim for evidence checks and community verification.

The system should retain the relationship between the original report and the repair evidence. A repair claim should not be treated as independently verified simply because an official uploaded a photo.

### 6. Nearby Resident Notifications

Residents in the affected locality can be notified when a repair claim is ready for verification.

Potential notification channels include in-app notifications, email, or another configured service. The MVP can begin with in-app notifications or a simulated notification flow before integrating external delivery.

Locality matching should use an agreed geographic rule, such as a configured radius or locality boundary. Avoid exposing residents' precise locations unnecessarily.

### 7. Community Repair Verification

Nearby residents can review the repair evidence and provide feedback, such as:

- **Looks repaired:** The issue appears to have been fixed.
- **Still unresolved:** The problem remains or the repair appears incomplete.
- **Cannot verify:** The resident does not have enough information to decide.

The interface should explain the meaning of each response. The system can aggregate responses and show the verification state, but should account for conflicting reports, limited participation, and possible misuse.

Community feedback is useful evidence, not infallible proof. The backend should enforce eligibility rules and prevent repeated or unauthorized submissions according to the chosen policy.

### 8. AI-Assisted Image Authenticity Assessment

The feature is intended to identify potentially suspicious repair evidence and support further review—not to guarantee perfect AI-image or deepfake detection.

Possible checks include:

- **Duplicate-image detection:** Identify exact or near-duplicate photos that may have been reused across reports.
- **Metadata and provenance checks:** Inspect available timestamps, device metadata, or supported content credentials.
- **Context consistency:** Compare available evidence details with the report's location and repair timeline.
- **Model-based image analysis:** Use a tested detector to produce a risk assessment if a suitable model is available.
- **Human review:** Route suspicious, conflicting, or inconclusive evidence for review.

Important limitations:

- Missing metadata does not prove that an image is fake.
- Metadata can be removed or manipulated.
- AI detectors can produce false positives and false negatives.
- A detector score cannot establish who created an image or prove that a repair happened at the claimed location.
- A low-risk result does not prove authenticity.
- The platform should not automatically accuse an official of fraud based only on an AI result.

For the MVP, prioritize upload validation, duplicate-image checks, transparent evidence labels, community feedback, and a review path. Add a model-based detector after selecting and evaluating a suitable model.

### 9. Dashboards

**Resident Dashboard**

- Create and view civic reports.
- Track report status and event history.
- Review AI suggestions and complaint drafts.
- View repair claims and attached evidence.
- Receive relevant locality notifications when enabled.
- Submit repair-verification feedback.

**Authorized Official / Reviewer View** *(if included in the MVP)*

- View reports permitted by the assigned role.
- Update report status according to permissions.
- Submit repair claims and after-repair evidence.
- View authenticity risk signals and community feedback.
- Send disputed or suspicious evidence for review.

Role permissions must be enforced by the backend, not only by hiding buttons in the frontend.

---

## 🤖 Agentic AI System

### CivicFix AI Workflow

The AI workflow coordinates report analysis and evidence assessment. The first implementation should use clear Python functions and bounded steps; a framework such as LangGraph can be added if it helps manage state and branching.

### Report Analysis Workflow

1. **Input Validator:** Checks required report fields and accepted input formats.
2. **Issue Classifier:** Suggests a category from the configured issue types.
3. **Missing-Information Checker:** Identifies unclear or missing details.
4. **Authority Lookup:** Searches the verified directory for a suitable match.
5. **Complaint Drafter:** Creates a factual draft from the supplied report information.
6. **Approval Gate:** Lets the resident review and approve a draft before any supported external submission.
7. **Event Recorder:** Stores relevant analysis and report events through authorized backend operations.

### Repair Evidence Workflow

1. **Upload Validator:** Checks file type, size, and upload constraints.
2. **Duplicate Checker:** Looks for exact or near-duplicate images if implemented.
3. **Metadata / Provenance Checker:** Examines available signals without treating them as conclusive.
4. **Authenticity Assessor:** Runs a selected detector if available and returns a risk assessment.
5. **Community Verification:** Collects eligible resident feedback.
6. **Review Decision:** Presents evidence, signals, and feedback to the authorized process.
7. **Event Recorder:** Stores the evidence and status history.

These are logical workflow stages; they do not need to be separate autonomous agents.

### Example AI Report Input

```json
{
  "report_id": "CF-1001",
  "description": "A large pothole is present near the local bus stop.",
  "category": "pothole",
  "location": {
    "locality": "Example locality"
  }
}
```

The example is illustrative test data, not a real report.

### Example Report Analysis Output

```json
{
  "suggested_category": "pothole",
  "missing_fields": [],
  "authority_match_status": "not_checked",
  "complaint_draft": "Please inspect and repair the reported pothole near the bus stop.",
  "requires_resident_review": true
}
```

This is an illustrative response format. The final schema must be agreed with the backend and frontend developers.

### Example Image Assessment Output

```json
{
  "assessment": "needs_review",
  "risk_score": null,
  "signals": [
    "No reliable provenance information available"
  ],
  "human_review_required": true
}
```

The example does not mean the image is fake. It demonstrates how the system can communicate uncertainty. A numeric risk score should only be returned if the selected model defines and calibrates its meaning.

### AI Design Principles

- Use structured and validated outputs.
- Treat report text and uploaded content as untrusted input.
- Do not allow AI-generated text to bypass backend permissions.
- Do not invent authority records, image provenance, or repair outcomes.
- Separate an official's repair claim from independent verification.
- Keep uncertain detector results visible as uncertain.
- Require explicit approval for consequential external actions.

---

## 🛠 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | Responsive web application |
| Styling | CSS or a selected component/styling system | Layout and reusable UI |
| API communication | Fetch API or Axios | Frontend/backend communication |
| Backend | Python + FastAPI | REST API and business logic |
| Validation | Pydantic | Request and response validation |
| Database | PostgreSQL | Persistent relational data |
| ORM | SQLAlchemy or SQLModel | Database models and queries; choose one consistently |
| Migrations | Alembic, if selected | Versioned schema changes |
| Authentication | Secure token/session approach | Identity management |
| Authorization | Role-based and resource-level checks | Protect restricted actions |
| AI workflow | Python functions; optionally LangGraph | Structured AI analysis |
| Language model | Hosted LLM API, if configured | Category suggestions and complaint drafting |
| Image checks | Metadata/duplicate checks; optional evaluated detector | Evidence risk signals |
| Testing | Pytest and API testing tools | Backend and integration tests |
| API documentation | OpenAPI / Swagger UI | Endpoint documentation |
| Version control | Git + GitHub | Parallel collaboration |
| Deployment | Selected hosting services | Demo and application access |

### Recommended MVP Stack

**React + FastAPI + PostgreSQL + Python AI workflow + an LLM API where available.**

Keep the MVP small. Start with reliable reporting, event history, evidence upload, and community verification before adding complex agent frameworks or advanced image-forensics models.

---

## 🏗 System Architecture

```text
              ┌───────────────────────────┐
              │       React Frontend      │
              │ Resident / Official Views │
              └─────────────┬─────────────┘
                            │ HTTPS / REST
              ┌─────────────▼─────────────┐
              │       FastAPI Backend     │
              │ Auth, Permissions, Rules  │
              └──────┬────────┬───────────┘
                     │        │
           ┌─────────▼──┐  ┌──▼────────────────┐
           │ PostgreSQL│  │ AI / Evidence      │
           │ Reports,  │  │ Analysis Workflow  │
           │ Events,   │  │ Classification,    │
           │ Users     │  │ Drafting, Image     │
           └───────────┘  │ Risk Signals        │
                          └────────┬────────────┘
                                   │
                          ┌────────▼───────────┐
                          │ Review & Community │
                          │ Verification       │
                          └────────┬───────────┘
                                   │
                          ┌────────▼───────────┐
                          │ Locality Notices   │
                          │ when configured    │
                          └────────────────────┘
```

The frontend communicates with FastAPI. The backend validates identity, ownership, file uploads, permissions, and status transitions. AI components return structured suggestions or risk signals; authorized backend logic controls protected actions and final status changes.

---

## 🗄 Database Design

The proposed database uses PostgreSQL because reports, users, evidence, authorities, and event histories have clear relationships.

### Core Tables

| Table | Purpose | Example fields |
|---|---|---|
| `users` | Resident, official, and reviewer accounts | id, name, email, password_hash, role |
| `complaints` | Civic issue reports | id, user_id, description, category, location, status, created_at |
| `evidence` | Report and repair photos | id, complaint_id, uploader_id, evidence_type, storage_key, created_at |
| `authorities` | Maintained authority directory | id, name, jurisdiction, contact details, source, verified_at |
| `complaint_events` | Audit-friendly report timeline | id, complaint_id, actor_id, event_type, details, created_at |
| `agent_runs` | AI analysis records | id, complaint_id, run_type, result_json, created_at |
| `repair_verifications` | Community feedback on repair claims | id, complaint_id, resident_id, response, created_at |
| `notifications` *(optional)* | In-app notification records | id, user_id, complaint_id, type, read_at, created_at |

The final schema should be adjusted to match the actual MVP. Avoid storing unnecessary personal data or raw image contents directly in relational columns when controlled file storage is more suitable.

### Relationships

- A resident can create multiple complaints.
- A complaint can have multiple evidence files and timeline events.
- An authorized official can upload repair evidence for a complaint.
- A complaint can have multiple AI analysis runs.
- A complaint can receive multiple eligible community verification responses.
- Users can receive multiple notifications.
- Authority records should include source and verification information when available.

### Database Design Principles

- Use primary and foreign keys.
- Enforce valid relationships and ownership rules.
- Store password hashes, never plaintext passwords.
- Restrict access to sensitive evidence and personal information.
- Record important status changes as events.
- Avoid treating AI-generated results as verified official facts.
- Add indexes based on real query patterns.
- Use database migrations if the project adopts a migration tool.

---

## 🔌 Proposed API Design

These endpoints are a starting proposal. They must be finalized and tested before being described as implemented.

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a resident account |
| POST | `/api/v1/auth/login` | Authenticate a user |

### Reports

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/reports` | Create a civic report |
| GET | `/api/v1/reports` | List reports the user is authorized to view |
| GET | `/api/v1/reports/{id}` | Retrieve report details |
| PATCH | `/api/v1/reports/{id}` | Update permitted report fields |
| GET | `/api/v1/reports/{id}/events` | Retrieve report timeline |

### AI Analysis

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/reports/{id}/analyze` | Run AI-assisted report analysis |
| GET | `/api/v1/reports/{id}/analysis` | Retrieve available analysis results |
| GET | `/api/v1/authorities` | Search the configured authority directory |

### Repair Evidence and Verification

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/reports/{id}/repair-claims` | Submit a repair claim if authorized |
| POST | `/api/v1/reports/{id}/evidence` | Upload permitted report or repair evidence |
| GET | `/api/v1/reports/{id}/evidence` | Retrieve evidence the user is authorized to view |
| POST | `/api/v1/reports/{id}/verify-repair` | Submit eligible community feedback |
| GET | `/api/v1/reports/{id}/verifications` | Retrieve permitted verification summary |
| GET | `/api/v1/notifications` | Retrieve in-app notifications, if implemented |

The image assessment may run as part of the evidence-upload workflow or through a separate endpoint, depending on the implementation. Do not expose an endpoint that allows users to impersonate an official or arbitrarily mark a report resolved.

### API Design Standards

- Validate request bodies, query parameters, and file uploads.
- Enforce role and resource permissions on every protected action.
- Use consistent response and error formats.
- Return suitable HTTP status codes.
- Do not trust client-provided user IDs, roles, or evidence metadata.
- Document the agreed API contract in `docs/api-contract.md`.
- Ensure official submission or repair resolution is not claimed without confirmation from the appropriate authorized process.

---

## 👥 Team Responsibilities — 3 Members

### Member 1 — Team Leader, Backend & Database

- Design and maintain the PostgreSQL schema.
- Build FastAPI endpoints and validation schemas.
- Implement report creation, listing, details, and status history.
- Implement authentication, authorization, ownership, and file-upload safeguards.
- Integrate the AI workflow through an agreed interface.
- Enforce repair-claim, review, and status-transition rules.
- Coordinate API contracts, pull requests, integration tests, and project documentation.
- Coordinate deployment and final demo preparation.

### Member 2 — Frontend Development

- Build the React + Vite application.
- Develop the resident reporting form and dashboard.
- Build report details, status timeline, and evidence views.
- Create AI suggestion and complaint-review interfaces.
- Build repair verification screens for nearby residents.
- Develop official repair evidence upload UI if that role is included.
- Integrate backend endpoints after agreeing on request/response formats.
- Handle loading, error, empty, and success states and responsive layouts.

### Member 3 — Agentic AI & Image Evidence Analysis

- Define the AI input/output schema with the backend developer.
- Implement category suggestions and missing-field detection.
- Build factual complaint drafting.
- Integrate authority lookup using verified directory data.
- Implement a structured, bounded AI workflow.
- Prototype image metadata and duplicate-image checks.
- Evaluate a suitable image-authenticity detector if feasible.
- Return explicit uncertainty and review flags instead of unsupported real/fake claims.
- Test AI behavior against representative sample reports and images.

**All three members** should agree on the database schema, API contracts, AI response format, folder ownership, and Git workflow early. Each member should work on a separate feature branch and submit pull requests for review.

---

## 🔄 Project Workflow

1. A resident creates a civic issue report.
2. The backend validates the input and saves the report.
3. AI suggests a category, missing details, and a complaint draft.
4. The resident reviews and edits the draft.
5. The platform looks up a relevant authority from the maintained directory when available.
6. The report timeline records status changes and relevant events.
7. An authorized official claims the issue has been repaired and uploads after-repair evidence.
8. The backend validates the upload and runs the configured evidence checks.
9. Nearby residents are notified when the notification feature is configured.
10. Eligible residents submit repair-verification feedback.
11. The platform records community responses and AI risk signals.
12. Conflicting or suspicious evidence can be reviewed by an authorized person.
13. The report status is updated only through the defined, permission-checked process.

A repair photo, AI detector score, or single community response should not automatically be treated as conclusive proof of repair.

---

## 🔐 Security, Privacy & Trust

- Hash passwords using an established password-hashing approach.
- Enforce authentication and role-based/resource-level authorization in the backend.
- Restrict official-only repair claim actions.
- Validate upload size, file type, and file contents; do not trust file extensions alone.
- Store uploaded files safely and restrict access to evidence.
- Keep secrets and API keys out of source control.
- Avoid exposing residents' precise locations or personal details unnecessarily.
- Limit notification delivery to the intended locality and authorized recipients.
- Keep a history of evidence uploads, detector assessments, verification responses, and status changes.
- Treat image detector output as probabilistic, not as proof of fraud.
- Require explicit approval before any external complaint-submission action.
- Do not label a complaint as officially submitted or resolved unless the appropriate process confirms it.

---

## 💻 Installation and Setup

### Prerequisites

Install the tools needed for your development environment:

- Python version compatible with the backend dependencies.
- Node.js LTS and npm.
- PostgreSQL.
- Git.
- VS Code or another code editor.
- An LLM API key if the chosen AI provider requires one.

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd civicfix-ai
```

Replace the placeholder with the HTTPS URL from the repository's **Code** menu.

### 2. Backend Setup

Once the backend dependency file and application structure are committed, use the instructions in `backend/README.md` if present. A typical Windows PowerShell virtual-environment setup is:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the dependencies listed in the committed requirements file or project configuration. Configure your local environment variables and make sure PostgreSQL is running before starting the backend.

### 3. Frontend Setup

Once the React + Vite app exists:

```bash
cd frontend
npm install
npm run dev
```

Use the scripts defined in `frontend/package.json`.

### 4. Database Setup

Create the local PostgreSQL database using the name agreed by the team, for example `civicfix_db`. Configure the connection string in a local environment file and apply the schema or migrations defined by the project.

> These setup steps will be finalized as the actual application files and dependencies are committed. Do not assume a command works until the corresponding configuration exists.

---

## 🔑 Environment Variables

Keep credentials in local environment files excluded by `.gitignore`. Commit an `.env.example` with placeholder values only.

Example keys (the actual names depend on implementation):

```dotenv
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/civicfix_db
LLM_API_KEY=replace_with_your_local_key
```

Never commit real credentials, access tokens, or private evidence. If a secret is accidentally pushed, revoke or rotate it; removing it from the latest commit alone may not remove it from Git history.

---

## 📁 Project Structure

The repository is expected to evolve toward a structure like this:

```text
civicfix-ai/
├── frontend/
│   ├── src/
│   └── package.json
├── backend/
│   ├── app/
│   └── tests/
├── docs/
│   ├── architecture.md
│   ├── api-contract.md
│   └── database-schema.md
├── .env.example
├── .gitignore
└── README.md
```

The exact structure can change as implementation progresses. The backend developer owns backend/database files, the frontend developer owns frontend files, and the AI developer owns the AI module. Coordinate before editing shared files.

---

## 🌿 GitHub Collaboration Workflow

We use one shared GitHub repository and separate feature branches so all three members can work in parallel.

### Suggested Branches

- **Member 1 — Backend:** `feature/backend-reports-api`
- **Member 2 — Frontend:** `feature/frontend-dashboard`
- **Member 3 — AI:** `feature/ai-analysis-workflow`

### Create a Feature Branch

```bash
git switch main
git pull origin main
git switch -c feature/your-task-name
```

### Commit and Push Changes

```bash
git status
git add path/to/changed-files
git commit -m "feat: describe your change"
git push -u origin feature/your-task-name
```

### Pull Request Workflow

1. Push your feature branch to GitHub.
2. Open a pull request with `main` as the base branch.
3. Explain what changed and how you tested it.
4. Ask another teammate to review the changes when practical.
5. Fix requested changes and push follow-up commits to the same branch.
6. Merge only after the changes have been checked and relevant tests pass.
7. Update your local `main` before starting the next task.

Do not push unfinished work directly to `main`, commit `.env` files, or overwrite another member's work. Keep pull requests focused and coordinate API/schema changes before merging.

---


### MVP Priorities

1. Report creation and tracking.
2. Backend validation, database persistence, and access control.
3. AI category suggestions, missing-field detection, and complaint drafting.
4. Authority directory lookup with clear verification status.
5. Official repair claim and evidence upload flow.
6. Community verification and report event history.
7. Basic duplicate-image and metadata checks.
8. Tests, documentation, and a working demonstration.

Advanced deepfake detection, real government integrations, and multi-channel notifications should be treated as optional until the core workflow works. Do not claim any planned feature is operational before it has been implemented and tested.

---

## 📊 Expected Outcomes

CivicFix AI aims to provide:

- A clearer path for residents to report civic issues.
- Better visibility into report progress and event history.
- More structured complaint drafts and authority lookup assistance.
- A way for authorized officials to attach repair evidence.
- A channel for nearby residents to provide repair feedback.
- Additional evidence risk signals for identifying images that need review.
- A transparent record of claims, feedback, and status changes.

Evaluate the MVP using measurable criteria such as API test results, permission checks, report workflow completion, duplicate-image check behavior, quality of AI suggestions, and whether residents can understand the verification state.

Do not claim that the system prevents all fake images or guarantees repair quality.

---

## 🔮 Future Enhancements

- Locality-based push or email notifications.
- Map view and nearby issue discovery.
- More robust image provenance checks where supported.
- Evaluated model-based image-forensics detector.
- Admin/reviewer queue for disputed evidence.
- Authorized external complaint submission integrations.
- Multilingual reporting and accessibility improvements.
- Analytics for report resolution and community feedback.
- Better duplicate and near-duplicate image matching.

---

## 📌 Project Status

**Status:** MVP in development.

CivicFix AI is a college project exploring full-stack development, relational database design, REST APIs, AI-assisted reporting, and transparent repair verification.

Features should be marked as complete only after they have been implemented and tested in the repository. Until authorized integrations are available, the platform should not represent itself as an official government complaint portal.

---

## 👏 Conclusion

CivicFix AI aims to make civic issue reporting more transparent by combining AI-assisted report preparation with repair evidence and community participation.

By connecting reports, official repair claims, image risk signals, and nearby residents' feedback in a traceable workflow, CivicFix AI helps answer not only **“What issue was reported?”**, but also **“What evidence supports the repair claim, and how can the community help verify it?”**

**CivicFix AI — Report problems. Track repairs. Verify progress together.**
