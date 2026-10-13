# CivicFix AI — AI Module Context & Specifications

## 1. Project Overview
CivicFix AI is an AI-assisted civic-issue reporting and tracking platform designed to empower citizens to report public infrastructure and municipal problems (such as potholes, overflowing garbage dumps, broken streetlights, and water pipeline leakages).

The AI module serves as an intelligent intake assistant: it takes unstructured, potentially incomplete, and untrusted citizen reports, validates and sanitizes them, categorizes the issue, determines whether critical information is missing, matches the issue to a verified civic authority directory, and generates a structured, formal complaint draft ready for citizen review and confirmation.

---

## 2. Team Structure & Boundaries

| Role | Member / Owner | Domain & Responsibilities |
|---|---|---|
| **Team Leader** | Backend Lead | FastAPI backend, PostgreSQL database, authentication, database schemas, and external routing. |
| **Frontend Developer** | Frontend Lead | React + Vite web application, user interface, citizen reporting forms, dashboard. |
| **Agentic AI Developer** | Me (User) | Core AI analysis pipeline, category classification, missing-information detection, verified authority matching, structured complaint drafting, and workflow orchestration. |

### Development Boundaries & Scope
- **Active Git Branch**: `feature/ai-analysis-workflow`
- **Isolation of Concerns**:
  - Work is strictly confined to the AI module (`ai/` directory and related tests/documentation).
  - Do not redesign or alter the frontend application.
  - Do not modify database schemas or PostgreSQL migrations independently.
  - Do not take ownership of core backend routing or authentication.
  - All contracts between the AI module and the FastAPI backend must be coordinated and agreed upon.
- **Safety & Authorization Rules**:
  - The AI module **never** directly submits complaints to government portals or external systems.
  - The AI module **never** accesses the database arbitrarily or bypasses backend authorization.
  - Citizen approval is mandatory before any downstream submission action can ever be queued.

---

## 3. AI Module Architecture

The AI module is placed in the `ai/` directory at the repository root. It follows an incremental, testable, and dependency-minimal design:

```
CivicFix-AI/
├── ai/
│   ├── __init__.py               # Package marker and public exports
│   ├── schemas.py               # Pydantic models & data contracts (inputs, outputs, states)
│   ├── validation.py            # Input validation, sanitization, prompt injection defenses
│   ├── classification.py        # Issue categorization & missing information analysis
│   ├── authority_lookup.py      # Verified authority matching against official directory
│   ├── complaint_builder.py     # Formal complaint draft generator with fallback handling
│   ├── workflow.py              # Stateful orchestration pipeline (pure Python)
│   ├── graph_workflow.py        # Graph state machine orchestrator (LangGraph-compatible)
│   ├── security.py              # Prompt injection scanning, PII masking, text sanitization
│   ├── observability.py         # Privacy-preserving event logging and diagnostic observers
│   ├── api_router.py            # FastAPI HTTP router for backend integration
│   ├── vision.py                # Optional image-understanding extension & multimodal conflict detection
│   ├── evaluation.py            # Systematic 14-scenario evaluation suite & benchmarking engine
│   ├── demo.py                  # Module demonstration entrypoint (python -m ai.demo)
│   └── tests/                   # Dedicated test suite for AI module (11 test modules, 174 tests)
│       ├── __init__.py
│       ├── test_schemas.py
│       ├── test_validation.py
│       ├── test_classification.py
│       ├── test_authority_lookup.py
│       ├── test_complaint_builder.py
│       ├── test_workflow.py
│       ├── test_reliability_security.py
│       ├── test_graph_equivalence.py
│       ├── test_fastapi_integration.py
│       ├── test_vision.py
│       └── test_evaluation_suite.py
├── docs/
│   ├── AI_SETUP_GUIDE.md        # Developer setup, environment vars, and testing instructions
│   ├── AI_CONTEXT.md            # This document: context, boundaries, architecture, contracts
│   ├── AI_WORKFLOW.md           # Step-by-step workflow specifications and state transitions
│   ├── AI_DEVELOPMENT_LOG.md   # Chronological development log, decisions, and test outputs
│   ├── BACKEND_INTEGRATION_GUIDE.md # 2-minute mount guide and JSON examples for FastAPI lead
│   └── api-contract.md          # Contract specifications and endpoint reference
├── demo_ai_workflow.py          # Standalone interactive CLI demonstration script
├── requirements.txt             # Python dependencies
└── README.md                    # Project README and quickstart
```

### Architectural Principles
1. **Python Functions First**: Build deterministic, well-typed, pure Python functions before introducing agentic abstractions.
2. **Minimal Dependencies**: Start with Python standard library and Pydantic v2. Avoid heavyweight frameworks until complex state management genuinely requires them.
3. **Strict Verification**: Authority data comes strictly from a verified, curated directory. Never invent or hallucinate government bodies, contact numbers, or URLs.
4. **Untrusted Input Treatment**: Citizen text and media metadata are treated as untrusted data subject to strict sanitization.
5. **No Blind Image Trust**: Evidence metadata represents file metadata only; filenames and URLs are never treated as proof of the image's contents.

---

## 4. Current Implementation Status

- **Phase 0 (Repository Setup & Project Context)**: COMPLETED.
- **Phase 1 (Input/Output Contract & Schemas)**: COMPLETED.
  - Initial Pydantic v2 schemas defined in [`ai/schemas.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/schemas.py).
  - 19 unit tests passing in [`ai/tests/test_schemas.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/tests/test_schemas.py).
  - Contract proposal documented below for backend review.
- **Phase 2 (Deterministic Report Validation & Missing Info Detection)**: COMPLETED.
  - Implemented deterministic validation engine and missing-info analysis in [`ai/validation.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/validation.py).
  - Added `ValidationStatus`, `ValidationIssue`, `MissingInfoResult`, and `ReportValidationResult` models.
  - 40 total unit tests passing in test suite across schemas and validation.
- **Phase 3 (Deterministic Category Suggestion & Conflict Detection)**: COMPLETED.
  - Implemented rule-based category classifier in [`ai/classification.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/classification.py).
  - Added `CategoryMatchStrength` and `CategorySuggestionResult` models.
  - Handled ambiguous cases, generic wording (e.g. "damaged object near road"), unsupported complaints, and citizen conflict detection.
  - 59 total unit tests passing across test suite.
- **Phase 4 (Verified Authority Directory Lookup)**: COMPLETED.
  - Implemented verified directory lookup engine in [`ai/authority_lookup.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/authority_lookup.py).
  - Defined `AuthorityDirectoryRecord` schema with explicit `is_demo_fixture` flagging.
  - Built clearly labeled demonstration directory fixture (`DEMONSTRATION_AUTHORITY_DIRECTORY`).
  - Added zone refinement, location sufficiency gating, ambiguity preservation, and zero-hallucination guarantees.
  - 72 total unit tests passing across test suite.
- **Phase 5 (Structured Complaint Draft Generation)**: COMPLETED.
  - Implemented complaint drafting engine in [`ai/complaint_builder.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/complaint_builder.py).
  - Built `DraftingProvider` interface, `DeterministicTemplateDraftingProvider`, and `MockLLMDraftingProvider`.
  - Added zero-fact-invention protections, non-vision evidence disclaimers, and graceful error fallback.
  - 81 total unit tests passing across entire test suite.
- **Phase 6 (Stateful Python Workflow Pipeline)**: COMPLETED.
  - Implemented `analyze_report()` pipeline in [`ai/workflow.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/workflow.py).
  - Orchestrated input validation, missing-info gating, category suggestion, authority lookup, complaint drafting, and urgency/hazard assessment.
  - Structured step tracing via `WorkflowStepTrace`, comprehensive error containment, and human approval invariance.
  - 91 total unit tests passing across entire test suite (10 dedicated workflow tests).
- **Phase 7 (Reliability, Security, and Workflow Tracking)**: COMPLETED.
  - Implemented prompt injection defenses and tag-breakout sanitization in [`ai/security.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/security.py).
  - Added model response validator (`validate_model_draft_output`) and explicit model failure exceptions (`ModelTimeoutError`, `ModelRateLimitError`, `ModelConnectionError`, `MissingCredentialsError`, `ModelMalformedOutputError`).
  - Implemented transient error retry logic with `execute_with_retry` and safe deterministic fallback labeled as `deterministic_template_fallback`.
  - Added privacy-preserving workflow observability (`ai/observability.py`) with PII redaction and `agent_runs` observer callbacks.
  - Enforced mandatory `requires_human_approval = True` schema validator (rejects bypass attempts).
  - 119 total unit tests passing across entire test suite (28 dedicated security & reliability tests).
- **Phase 8 (LangGraph Evaluation & Graph State Machine)**: COMPLETED.
  - Evaluated LangGraph across 6 architectural dimensions (state, conditional routing, human review, resumption, tracing, tools).
  - **Decision**: Deferred heavy `langgraph` library installation for production runtime to prevent adding 15+ third-party dependencies, LangSmith cloud telemetry, and version conflicts with the team's FastAPI setup.
  - Built a zero-dependency, 100% compatible Graph State Machine in [`ai/graph_workflow.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/graph_workflow.py) (`analyze_report_graph`) with typed state (`CivicWorkflowGraphState`), modular processing nodes, and conditional edges.
  - Verified 100% behavioral equivalence across all representative scenarios in [`ai/tests/test_graph_equivalence.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/tests/test_graph_equivalence.py).
  - 126 total unit tests passing across entire test suite.
- **Phase 9 (FastAPI Backend Integration & Coordination)**: COMPLETED.
  - Created modular FastAPI router in [`ai/api_router.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/api_router.py) exposing `/api/v1/ai/analyze-report`, `/api/v1/ai/health`, and `/api/v1/ai/authorities`.
  - Built comprehensive, self-contained integration guide in [`docs/BACKEND_INTEGRATION_GUIDE.md`](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md) and populated [`docs/api-contract.md`](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/api-contract.md).
  - Provided 5 concrete JSON examples matching actual runtime output (standard, incomplete, unverified, validation failure, fallback).
  - Documented strict separation of responsibilities: zero database direct access, zero auth duplication, zero external portal submission.
  - Added 10 automated HTTP endpoint integration tests in [`ai/tests/test_fastapi_integration.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/tests/test_fastapi_integration.py).
  - 136 total unit tests passing across entire test suite.
- **Phase 10 (Optional Image-Understanding Extension)**: COMPLETED.
  - Implemented pluggable `VisionProvider(Protocol)` and `MockVisionProvider` with honest simulation disclosure (`is_simulated = True`).
  - Added multimodal discrepancy detection (`detect_text_vision_conflict`): text and image disagreements are surfaced as warnings without overriding either source.
  - Enforced zero hallucination of physical dimensions (depth in cm, structural engineering risk).
  - Explicit uncertainty handling for blurry, dark, occluded, or unsupported media types (`is_clear = False`, `detected_category = CivicCategory.UNKNOWN`).
  - Integrated into `analyze_report()` and `analyze_report_graph()` with `enable_vision_analysis` query toggle in FastAPI router.
  - Added 15 unit and integration tests in [`ai/tests/test_vision.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/tests/test_vision.py).
  - 151 total unit tests passing across entire test suite (10 test modules).
- **Phase 11 (Evaluation Suite & Final Documentation)**: COMPLETED.
  - Created systematic 14-scenario evaluation engine in [`ai/evaluation.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/evaluation.py) measuring genuine, un-fabricated quality metrics.
  - Verified 100.0% scenario completion rate across normal, incomplete, ambiguous, adversarial, malformed, and failing reports.
  - Evaluated keyword-based classification limitations (negation, polysemy, loanwords) and compared LLM provider against deterministic baseline.
  - Built interactive CLI demonstration script in [`demo_ai_workflow.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/demo_ai_workflow.py) and [`ai/demo.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/demo.py).
  - Created developer onboarding guide [`docs/AI_SETUP_GUIDE.md`](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/AI_SETUP_GUIDE.md), `requirements.txt`, and full project `README.md`.
  - Added 23 automated evaluation tests in [`ai/tests/test_evaluation_suite.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/tests/test_evaluation_suite.py).
  - **174 total tests passing** across 11 test modules.
- **Phase 12 (Final Review, Git Commit, Push, and PR Preparation)**: COMPLETED.
  - Performed comprehensive safety, architectural, and security review across the entire codebase.
  - Confirmed 0 hardcoded credentials, 0 `.env` files tracked, 0 fabricated authorities, 0 unauthorized external submissions, and strict non-bypassable `requires_human_approval = True`.
  - Verified working tree hygiene on branch `feature/ai-analysis-workflow`.
  - Prepared descriptive git commit, remote branch push, and complete pull request description for team lead review.

---

## 5. Proposed Input / Output Contract

> [!IMPORTANT]
> **Status**: *Proposal Pending Team & Backend Lead Review*.
> The schemas below represent the AI developer's proposed contract for the `/api/v1/ai/analyze-report` endpoint.
> Since backend models have not yet been committed to the repository, this proposal provides the baseline for team alignment.

### 5.1 Contract Comparison & Governance Matrix

| Field | Status in Repository | Proposal Rationale | Team Decision Required? | Breaking Risk If Changed |
|---|---|---|---|---|
| `report_id` | **Proposed** (None in repo) | Echoed for trace correlation | Yes (format agreement: UUID vs string) | Medium |
| `description` | **Proposed** (None in repo) | Raw text from citizen report (mandatory) | Yes (character length limits: 1 to 5000) | High |
| `category` (input) | **Proposed** (None in repo) | Citizen's optional pre-selected category | Yes (string vs enum) | Low |
| `location` | **Proposed** (None in repo) | Structured geographic input | Yes (field breakdown: coordinates vs address) | Medium |
| `evidence_metadata` | **Proposed** (None in repo) | Uploaded attachment metadata (non-vision) | Yes (metadata fields: size, mime, URL) | Medium |
| `original_category` | **Proposed** (None in repo) | Preserves citizen category verbatim | Yes (auditing requirement) | Low |
| `suggested_category` | **Proposed** (None in repo) | AI's categorized classification | Yes (standardized enum values) | High |
| `confidence` | **Proposed** (None in repo) | Float [0.0, 1.0], None if uncalibrated | Yes (never invent fake numbers) | Low |
| `urgency` / `is_hazard` | **Proposed** (None in repo) | Severity rating & acute safety flag | Yes (triggers immediate citizen notification) | Medium |
| `missing_fields` | **Proposed** (None in repo) | Fields absent from citizen report | Yes (frontend form guidance) | Low |
| `clarification_questions` | **Proposed** (None in repo) | Dynamic follow-ups to fill missing fields | Yes (frontend prompt display) | Low |
| `authority_match` | **Proposed** (None in repo) | Verified directory result + status enum | Yes (strict 4-state status enum) | High |
| `complaint_draft` | **Proposed** (None in repo) | Title, formal body, tags, key facts | Yes (draft format for review) | Medium |
| `warnings` | **Proposed** (None in repo) | Advisory notices (accidents, multimodal discrepancy) | Yes (advisory display) | Low |
| `requires_human_approval`| **Proposed** (None in repo) | Safety invariant (defaults to `True`) | Mandatory invariant (cannot be bypassed) | High |
| `visual_analysis` | **Proposed** (None in repo) | Optional structured image observations | Yes (opt-in via vision provider) | Low |

---

### 5.2 Critical Data Interpretation Rules

1. **Evidence Metadata vs. Image Understanding**:
   - `evidence_metadata` stores only technical metadata: `attachment_id`, `file_type`, `filename`, `url`, `file_size_bytes`, and `user_caption`.
   - **Crucial Rule**: File names (e.g., `pothole_crater.jpg`) or URLs do **not** constitute proof of visual content. Image understanding must not be claimed unless an actual computer vision model is integrated.
2. **Category Separation**:
   - The citizen's input category (`category` in request) is preserved in `original_category` in the response.
   - The AI's classification is stored in `suggested_category`. This ensures transparency when the AI corrects or refines a citizen's initial selection.
3. **Authority Verification & Verification Date**:
   - `authority_match.status` explicitly differentiates:
     - `verified_match`: Found in an authenticated local directory.
     - `ambiguous_match`: Multiple civic bodies share jurisdiction.
     - `no_verified_match`: No directory record exists for the given location/category.
     - `lookup_error`: Directory query failure.
   - `verification_date`: Stored **only** if recorded in the directory record. Never hallucinate a verification date.
4. **Missing Information & Uncertainty**:
   - When location details or description clarity are lacking, the system flags specific fields in `missing_fields` and provides actionable guidance in `clarification_questions`.
   - `confidence` is explicitly `None` unless a calibrated, meaningful confidence metric is supported.

---

### 5.3 Realistic Example JSON Payloads

#### Example 1: Full Valid Report (Verified Match)

**Request (`AIAnalysisRequest`)**:
```json
{
  "report_id": "rep-98a7c2-2026",
  "description": "Deep pothole right after the 14th Cross junction on 80 Feet Road. Two scooters slipped here this morning during rain.",
  "category": "roads",
  "location": {
    "raw_address": "80 Feet Road, 14th Cross, Koramangala 4th Block",
    "landmark": "Near Sony World Signal, opposite Cafe Coffee Day",
    "latitude": 12.9344,
    "longitude": 77.6288,
    "city": "Bengaluru",
    "ward_or_zone": "South Zone, Ward 151"
  },
  "evidence_metadata": [
    {
      "attachment_id": "att-001",
      "file_type": "image/jpeg",
      "filename": "pothole_waterlogged.jpg",
      "url": "https://storage.civicfix.local/uploads/att-001.jpg",
      "file_size_bytes": 1420500,
      "user_caption": "Photo of the crater filled with water"
    }
  ]
}
```

**Response (`AIAnalysisResponse`)**:
```json
{
  "report_id": "rep-98a7c2-2026",
  "original_category": "roads",
  "suggested_category": "pothole",
  "confidence": null,
  "urgency": "high",
  "is_hazard": true,
  "missing_fields": [],
  "clarification_questions": [],
  "authority_match": {
    "status": "verified_match",
    "authority_id": "BBMP_ROAD_INFRA_SOUTH",
    "authority_name": "Bruhat Bengaluru Mahanagara Palike",
    "department": "Road Infrastructure Division (South Zone)",
    "jurisdiction": "Ward 151 (Koramangala), Bengaluru",
    "matched_category_or_area": "pothole / South Zone",
    "source_reference": "BBMP Official Ward Jurisdictions Directory 2026-Q1",
    "verification_date": "2026-01-15",
    "notes": "Verified municipal road department responsible for arterial and sub-arterial ward roads."
  },
  "complaint_draft": {
    "title": "Urgent: Dangerous Road Crater / Pothole on 80 Feet Road, Koramangala",
    "formal_body": "To the Executive Engineer, Road Infrastructure Division, BBMP:\n\nThis is a formal report regarding a severe pothole located on 80 Feet Road, 14th Cross, Koramangala 4th Block, opposite Cafe Coffee Day. The depression has caused multiple two-wheeler accidents and presents an ongoing hazard to commuters, particularly during wet weather. Immediate road patching and safety cordoning are requested.",
    "key_facts": [
      "Location: 80 Feet Road, 14th Cross, Koramangala 4th Block (opposite Cafe Coffee Day)",
      "Coordinates: 12.9344, 77.6288 (Ward 151)",
      "Hazard: Deep pothole causing vehicular skidding / two-wheeler accidents",
      "Evidence: 1 citizen photograph attached"
    ],
    "suggested_tags": [
      "pothole",
      "road-safety",
      "koramangala",
      "bbmp",
      "traffic-hazard"
    ]
  },
  "warnings": [
    "High urgency: Report notes two accidents already occurred. Escalation recommended."
  ],
  "requires_human_approval": true
}
```

#### Example 2: Minimal Report with Missing Location (Unverified Match)

**Request (`AIAnalysisRequest`)**:
```json
{
  "description": "Garbage has not been collected for a week near the corner store.",
  "category": null,
  "location": null,
  "evidence_metadata": null
}
```

**Response (`AIAnalysisResponse`)**:
```json
{
  "report_id": null,
  "original_category": null,
  "suggested_category": "garbage",
  "confidence": null,
  "urgency": "medium",
  "is_hazard": false,
  "missing_fields": [
    "location.raw_address",
    "location.city",
    "location.landmark"
  ],
  "clarification_questions": [
    "Could you specify the street address, city, or nearby landmark where the garbage is piling up?",
    "Is the garbage blocking pedestrian movement or public roads?"
  ],
  "authority_match": {
    "status": "no_verified_match",
    "authority_id": null,
    "authority_name": null,
    "department": null,
    "jurisdiction": null,
    "matched_category_or_area": null,
    "source_reference": null,
    "verification_date": null,
    "notes": "No verified authority can be established because geographic location details were omitted."
  },
  "complaint_draft": {
    "title": "Grievance: Uncollected Municipal Waste Accumulation",
    "formal_body": "To the Concerned Municipal Authority:\n\nThis complaint concerns continuous accumulation of uncollected municipal garbage over a one-week period. Prompt clearance and sanitation servicing are urgently requested once location details are confirmed.",
    "key_facts": [
      "Issue: Uncollected waste over a seven-day period",
      "Location: Vague / pending citizen clarification"
    ],
    "suggested_tags": [
      "garbage",
      "sanitation",
      "waste-collection"
    ]
  },
  "warnings": [
    "Location information is missing; report cannot be routed to a specific civic authority until clarified."
  ],
  "requires_human_approval": true
}
```

---

## 6. Testing & Execution Strategy

- **Test Runner**: `pytest`
- **Execution Command**:
  ```powershell
  pytest -v
  ```
- **Coverage**:
  - Valid and minimal request payloads (`ai/tests/test_schemas.py`).
  - Rejecting empty strings, whitespace-only descriptions, and negative file sizes.
  - Coordinate range validation (latitude $\in [-90, 90]$, longitude $\in [-180, 180]$).
  - Extra field forbidding (`extra='forbid'`).
  - Deterministic report validation (`ai/tests/test_validation.py`):
    - Full valid report parsing.
    - Partially valid report missing location ("pothole near my college") without silent rejection.
    - Description boundary enforcement (min 10 chars, max 5000 chars, actionable threshold 25 chars).
    - Lenient vs strict category validation modes.
    - Control character and null byte stripping.
    - Out-of-bounds geographic coordinate rejection.
  - Deterministic category suggestion (`ai/tests/test_classification.py`):
    - Clear classification for potholes, garbage, streetlights, water leakage, drainage, road hazards.
    - Ambiguous reports and generic phrasing (e.g. "damaged object near the road") do not produce false certainty.
    - Multiple competing categories flagged as ambiguous with secondary candidates.
    - Citizen category conflict detection and rationale preservation.
    - Fallback to `other_civic` for unsupported issues (noise, parking, pets).
    - Zero confidence fabrication invariant.
  - Verified authority lookup (`ai/tests/test_authority_lookup.py`):
    - Verified single matches for city-wide entities (solid waste, water supply, electricity/lighting).
    - Zone-specific municipal matching (BBMP South Zone for potholes with zone detail).
    - Ambiguous match preservation when zone/road type is unspecified (BBMP South vs BBMP Central vs State PWD).
    - Missing location gating (requires at least city before attempting match).
    - No-match explicit fallback for unsupported cities or non-specific categories.
    - Zero fabrication invariant: unrecorded dates and missing URLs preserved strictly as `None`.
    - Custom directory dependency injection for test isolation.
  - Complaint draft generation (`ai/tests/test_complaint_builder.py`):
    - Complete report drafting with verified authority.
    - Explicit unverified authority disclaimer when no match exists.
    - Ambiguity preservation across multiple plausible departments.
    - Location omission handling without fact invention.
    - Zero fact invention (no hallucinated dates, road names, injury claims).
    - Non-vision attachment metadata disclaimer.
    - Provider abstraction and graceful error fallback on model failure or malformed JSON.
  - Safety default: `requires_human_approval == True`.

---

## 7. Authority Directory Governance

### How Authority Records are Managed:
1. **Addition**: New authority records must be documented with an official source citation (e.g. government gazette notification, municipal corporation charter, or utility service charter).
2. **Verification**: An administrative human or backend reviewer checks the service area boundaries, jurisdiction zones, and complaint intake channel. `verification_date` is recorded as the ISO date of human review.
3. **Updating**: Changes to department names, contact numbers, or portal URLs must preserve previous records in audit logs. If an authority's status is unverified, `verification_date` is set to `None` and `is_verified` to `False`.
4. **PostgreSQL Integration**: In production, the FastAPI backend will query the PostgreSQL database. The AI module interacts through a read-only repository contract; the agent never executes arbitrary SQL or bypasses backend authorization.
5. **Testing Fixtures**: In development and CI, all mock entries carry `is_demo_fixture = True` and clear demonstration notices.

---

## 8. Implementation Status & Integration Handover

All 12 development phases are fully implemented, verified, and documented:
- **Test Suite Status**: 174 automated unit & integration tests passing in `0.88s`.
- **Systematic Evaluation**: 14/14 scenarios passing (100.0%) with live calculated metrics.
- **Git Branch**: `feature/ai-analysis-workflow` prepared for merge into `main`.
- **Backend Integration**: 2-minute mount instructions documented in [`docs/BACKEND_INTEGRATION_GUIDE.md`](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md).
- **Core Invariant**: Citizen review and human confirmation is mandatory (`requires_human_approval = True`) across all states. Zero autonomous external submissions.
