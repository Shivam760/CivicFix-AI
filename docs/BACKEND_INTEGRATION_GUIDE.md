# CivicFix AI — FastAPI Backend Integration Guide

> **Target Audience**: Backend Developer & Team Lead  
> **Author**: Agentic AI Developer  
> **Git Feature Branch**: `feature/ai-analysis-workflow`  
> **Status**: Ready for Integration  
> **Module Version**: `0.1.0`

---

## 1. Overview & Architectural Boundaries

The CivicFix AI module operates as an intelligent intake and drafting assistant. It takes raw, untrusted citizen reports and performs validation, prompt-injection defense, issue categorization, missing-information detection, verified civic authority lookup, and structured complaint drafting.

### Strict Separation of Responsibilities

| Domain / Task | Owner | AI Module Boundary |
|---|---|---|
| **HTTP Routing & API Gateway** | Backend Lead | AI exposes ready-to-mount FastAPI `APIRouter` ([`ai.api_router`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/api_router.py)). |
| **Authentication & User Roles** | Backend Lead | **Zero Auth in AI**. The backend must enforce citizen identity, JWT tokens, and rate limits prior to invoking AI endpoints. |
| **Database Access & Storage** | Backend Lead | **Zero Direct DB Access**. AI does not connect to PostgreSQL or execute SQL queries. |
| **Complaint External Submission** | Backend Lead | **Zero Autonomous Submission**. The AI module prepares drafts for review only. External transmission to government portals is triggered by the backend only after explicit citizen approval. |
| **Agent Runs Audit Table** | Backend Lead | AI provides an event observer hook (`register_event_observer`) allowing the backend to write to `agent_runs` without AI touching database models. |

---

## 2. Quick Integration (2 Minutes)

Mount the AI router directly into your existing FastAPI application:

```python
# In your main FastAPI application (e.g. app/main.py or backend/main.py):
from fastapi import FastAPI
from ai.api_router import ai_router

app = FastAPI(title="CivicFix AI Backend", version="1.0.0")

# Mount AI router under /api/v1/ai
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Analysis"])
```

### Alternatively: Calling as a Pure Python Function

If you prefer to call the AI workflow directly from an internal service or Celery/background task:

```python
from ai import analyze_report, AIAnalysisRequest

# Accepts dict or AIAnalysisRequest instance:
result = analyze_report({
    "report_id": "REP-2026-001",
    "description": "Massive crater on outer ring road damaging car suspensions.",
    "location": {
        "city": "Bengaluru",
        "raw_address": "Outer Ring Road near South Zone flyover",
        "ward_or_zone": "South Zone"
    }
})

if result.workflow_state == "invalid_input":
    print("Errors:", result.errors)
else:
    print("Suggested Category:", result.response.suggested_category)
    print("Draft Title:", result.response.complaint_draft.title)
    print("Authority:", result.response.authority_match.authority_name)
    print("Human Approval Required:", result.response.requires_human_approval) # Always True
```

---

## 3. Input & Output Contract Reference

### 3.1 Input Contract (`AIAnalysisRequest`)

| Field | Type | Required? | Constraints | Description |
|---|---|---|---|---|
| `report_id` | `str` | Optional | Max 100 chars | Correlation ID from backend/DB (UUID or string). Echoed in response. |
| `description` | `str` | **Mandatory** | 10 to 5,000 chars | Free-text citizen report. Stripped of control characters/null bytes. |
| `category` | `str` | Optional | Max 50 chars | Citizen's pre-selected category hint (e.g. `"pothole"`, `"garbage"`). |
| `location` | `LocationInput` | Optional | Object | Geographic details: `raw_address`, `landmark`, `city`, `ward_or_zone`, `latitude` (-90 to 90), `longitude` (-180 to 180). |
| `evidence_metadata`| `List[EvidenceMetadata]`| Optional | Array of objects | File metadata only: `attachment_id`, `file_type`, `filename`, `url`, `file_size_bytes`, `user_caption`. *(Note: AI does not treat filenames as proof of visual content)*. |

### 3.2 Output Contract (`AIAnalysisResponse`)

| Field | Type | Description |
|---|---|---|
| `report_id` | `str \| null` | Echoed correlation identifier. |
| `original_category` | `str \| null` | Preserves the citizen's original input category for audit comparison. |
| `suggested_category` | `CivicCategory` | AI-classified category: `pothole`, `garbage`, `street_lighting`, `water_leakage`, `drainage_sewage`, `road_hazard`, `other_civic`, or `unknown`. |
| `confidence` | `float \| null` | Strictly `None` for deterministic rule engine. Never fabricated. |
| `urgency` | `UrgencyLevel` | `low`, `medium`, `high`, or `critical`. |
| `is_hazard` | `bool` | `True` if acute danger detected (live wires, deep open manholes, cave-ins). |
| `missing_fields` | `List[str]` | Missing fields preventing complete processing (e.g. `["location.city"]`). |
| `clarification_questions`| `List[str]` | Targeted follow-up prompts for the citizen to clarify missing details. |
| `authority_match` | `AuthorityMatchResult`| Matched civic authority from directory: `status` (`verified_match`, `ambiguous_match`, `no_verified_match`), `authority_id`, `authority_name`, `department`, `jurisdiction`, `official_portal_url`, `official_reporting_url`, `plausible_alternatives`, `verification_date`. |
| `complaint_draft` | `ComplaintDraft` | Structured draft: `title`, `formal_body`, `key_facts`, `suggested_tags`, `generation_method`, `disclaimer`, `missing_confirmations`. |
| `warnings` | `List[str]` | Advisory warnings (category discrepancy, unverified authority, acute danger). |
| `requires_human_approval`| `bool` | **Strict Invariant: Always `True`**. Prohibits automated external submission. |
| `visual_analysis` | `List[VisionAnalysisResult] \| null` | Structured visual defect analysis when `enable_vision_analysis=true`: `attachment_id`, `detected_category`, `visual_observations`, `is_clear`, `uncertainty_rationale`, `confidence`, `model_provider`, `is_simulated`. |
| `workflow_state` | `WorkflowState` | Execution state: `draft_ready`, `needs_more_info`, `needs_authority_review`. |
| `execution_trace` | `List[str]` | Stage-by-stage audit trail. |

---

## 4. HTTP Status Codes & Error Handling

| Scenario | HTTP Status Code | Response Structure | Backend Action |
|---|---|---|---|
| **Complete Valid Report** | `200 OK` | `AIAnalysisResponse` (`workflow_state: "draft_ready"`) | Display draft to citizen on React frontend for review. |
| **Incomplete Report (Missing Location)** | `200 OK` | `AIAnalysisResponse` (`workflow_state: "needs_more_info"`) | Display clarification questions to citizen to gather missing fields. |
| **Unverified / Ambiguous Authority** | `200 OK` | `AIAnalysisResponse` (`workflow_state: "needs_authority_review"`) | Present draft with authority alternatives for citizen/admin routing. |
| **Structural Validation Failure** | `422 Unprocessable Entity` | `{"detail": "...", "errors": [...]}` | Reject invalid input (empty text, out-of-bounds coords) with field errors. |
| **Internal Engine Failure** | `500 Internal Server Error` | `{"detail": "...", "workflow_state": "analysis_failed"}` | Alert admin; fallback to manual complaint form. |

---

## 5. Concrete JSON Payloads & Examples

### Example 1: Standard Intake Request (`POST /api/v1/ai/analyze-report`)

```json
{
  "report_id": "REP-2026-BLR-001",
  "description": "Massive pothole in outer lane damaging vehicle rims and causing severe two-wheeler skids.",
  "category": "road damage",
  "location": {
    "raw_address": "Outer Ring Road near South Zone flyover",
    "landmark": "Near Metro Pillar 142",
    "city": "Bengaluru",
    "ward_or_zone": "South Zone",
    "latitude": 12.9250,
    "longitude": 77.6350
  },
  "evidence_metadata": [
    {
      "attachment_id": "att-001",
      "file_type": "image/jpeg",
      "filename": "pothole_crater.jpg",
      "file_size_bytes": 2450120,
      "user_caption": "Photo of deep road crater"
    }
  ]
}
```

### Example 2: Successful Response (`200 OK` — `draft_ready`)

```json
{
  "report_id": "REP-2026-BLR-001",
  "original_category": "road damage",
  "suggested_category": "pothole",
  "confidence": null,
  "urgency": "high",
  "is_hazard": true,
  "missing_fields": [],
  "clarification_questions": [],
  "authority_match": {
    "status": "verified_match",
    "authority_id": "DEMO_BBMP_ROAD_SOUTH",
    "authority_name": "Bruhat Bengaluru Mahanagara Palike",
    "department": "Road Infrastructure Division (South Zone)",
    "jurisdiction": "Bengaluru (South Zone)",
    "official_portal_url": "https://bbmp.karnataka.gov.in",
    "official_reporting_url": "https://bbmp.karnataka.gov.in/grievance",
    "plausible_alternatives": [],
    "source_reference": "BBMP Ward Jurisdictions Charter 2026 (Demo Fixture)",
    "verification_date": "2026-01-15",
    "is_demo_fixture": true,
    "notes": "Verified jurisdiction for municipal roads in Bengaluru South Zone."
  },
  "complaint_draft": {
    "title": "Civic Grievance: Pothole Reported at Near Metro Pillar 142",
    "formal_body": "To: Road Infrastructure Division (South Zone), Bruhat Bengaluru Mahanagara Palike\nJurisdiction: Bengaluru (South Zone)\n\nSubject: Formal Civic Issue Report\n\n1. REPORTED ISSUE DETAILS\nCitizen Description: \"Massive pothole in outer lane damaging vehicle rims and causing severe two-wheeler skids.\"\nCategorized Issue: Pothole\n\n2. LOCATION INFORMATION\nLocation: Outer Ring Road near South Zone flyover, near Near Metro Pillar 142, (South Zone), Bengaluru, [GPS: 12.9250, 77.6350]\n\n3. EVIDENCE ATTACHMENTS\nSubmitted Media: 1 media attachment(s) submitted by citizen. (Note: File metadata attached; content is unverified by automated systems).\n\nRequest: Please inspect the reported site and initiate necessary civic maintenance or repair.\n\n[Draft prepared by CivicFix AI for citizen review. Explicit approval required before submission.]",
    "key_facts": [
      "Issue Type: Pothole",
      "Citizen Statement: \"Massive pothole in outer lane damaging vehicle rims and causing severe two-wheeler skids.\"",
      "Location: Outer Ring Road near South Zone flyover, near Near Metro Pillar 142, (South Zone), Bengaluru, [GPS: 12.9250, 77.6350]",
      "Authority Status: verified_match",
      "Evidence Count: 1"
    ],
    "suggested_tags": [
      "pothole",
      "civic-complaint",
      "bengaluru",
      "demo_bbmp_road_south"
    ],
    "generation_method": "deterministic_template",
    "disclaimer": "AI-generated draft for citizen review. Review and edit before external submission.",
    "missing_confirmations": []
  },
  "warnings": [
    "High urgency: Acute safety hazard or accident risk detected in report."
  ],
  "requires_human_approval": true,
  "workflow_state": "draft_ready",
  "execution_trace": [
    "[validation] success=True: Input validated successfully (status: valid).",
    "[classification] success=True: Category suggested: 'pothole' (match_strength: strong_match).",
    "[missing_info_detection] success=True: Location complete: True, Description actionable: True, Missing fields: [].",
    "[authority_lookup] success=True: Verified match: Bruhat Bengaluru Mahanagara Palike (Road Infrastructure Division (South Zone)).",
    "[complaint_drafting] success=True: Draft generated using deterministic_template."
  ]
}
```

### Example 3: Incomplete Report Response (`200 OK` — `needs_more_info`)

```json
{
  "report_id": "REP-2026-BLR-002",
  "original_category": null,
  "suggested_category": "garbage",
  "confidence": null,
  "urgency": "medium",
  "is_hazard": false,
  "missing_fields": [
    "location.city",
    "location.raw_address"
  ],
  "clarification_questions": [
    "Which city and street or landmark is this issue located near?"
  ],
  "authority_match": {
    "status": "no_verified_match",
    "authority_id": null,
    "authority_name": null,
    "department": null,
    "jurisdiction": null,
    "official_portal_url": null,
    "official_reporting_url": null,
    "plausible_alternatives": [],
    "source_reference": null,
    "verification_date": null,
    "is_demo_fixture": false,
    "notes": "Insufficient location information provided to match against directory."
  },
  "complaint_draft": {
    "title": "Civic Grievance: Garbage (Location Clarification Required)",
    "formal_body": "To: Concerned Municipal Authority\n[NOTE: Responsible civic authority has NOT been verified. Manual assignment required.]\n\nSubject: Formal Civic Issue Report\n\n1. REPORTED ISSUE DETAILS\nCitizen Description: \"Garbage dump overflowing outside public gate.\"\nCategorized Issue: Garbage\n\n2. LOCATION INFORMATION\nLocation: Location not specified by citizen\n\n3. EVIDENCE ATTACHMENTS\nSubmitted Media: None provided.\n\n4. PENDING CITIZEN CLARIFICATIONS\nThe following information was not provided in the original report and should be confirmed before municipal submission:\n- Location City\n- Location Raw Address\n\nRequest: Please inspect the reported site and initiate necessary civic maintenance or repair.\n\n[Draft prepared by CivicFix AI for citizen review. Explicit approval required before submission.]",
    "key_facts": [
      "Issue Type: Garbage",
      "Citizen Statement: \"Garbage dump overflowing outside public gate.\"",
      "Location: Location not specified by citizen",
      "Authority Status: no_verified_match",
      "Evidence Count: 0"
    ],
    "suggested_tags": [
      "garbage",
      "civic-complaint"
    ],
    "generation_method": "deterministic_template",
    "disclaimer": "AI-generated draft for citizen review. Review and edit before external submission.",
    "missing_confirmations": [
      "Assign responsible civic authority",
      "Provide Location City",
      "Provide Location Raw Address"
    ]
  },
  "warnings": [
    "Insufficient location information provided to match against directory."
  ],
  "requires_human_approval": true,
  "workflow_state": "needs_more_info",
  "execution_trace": [
    "[validation] success=True: Input validated successfully (status: partially_valid).",
    "[classification] success=True: Category suggested: 'garbage' (match_strength: strong_match).",
    "[missing_info_detection] success=True: Location complete: False, Description actionable: True, Missing fields: ['location.city', 'location.raw_address'].",
    "[authority_lookup] success=False: Authority lookup gated: insufficient location details in report.",
    "[complaint_drafting] success=True: Draft generated using deterministic_template."
  ]
}
```

### Example 4: Unverified / Unsupported City (`200 OK` — `needs_authority_review`)

```json
{
  "report_id": "REP-2026-MYS-001",
  "original_category": null,
  "suggested_category": "garbage",
  "confidence": null,
  "urgency": "medium",
  "is_hazard": false,
  "missing_fields": [],
  "clarification_questions": [],
  "authority_match": {
    "status": "no_verified_match",
    "authority_id": null,
    "authority_name": null,
    "department": null,
    "jurisdiction": null,
    "official_portal_url": null,
    "official_reporting_url": null,
    "plausible_alternatives": [],
    "source_reference": null,
    "verification_date": null,
    "is_demo_fixture": false,
    "notes": "No verified authority records in directory for category 'garbage' in city 'Mysuru'."
  },
  "complaint_draft": {
    "title": "Civic Grievance: Garbage Reported at Palace Gate",
    "formal_body": "To: Concerned Municipal Authority\n[NOTE: Responsible civic authority has NOT been verified. Manual assignment required.]\n\nSubject: Formal Civic Issue Report\n\n1. REPORTED ISSUE DETAILS\nCitizen Description: \"Garbage dump overflowing outside public park near Palace Gate.\"\nCategorized Issue: Garbage\n\n2. LOCATION INFORMATION\nLocation: Palace Gate, Mysuru\n\n3. EVIDENCE ATTACHMENTS\nSubmitted Media: None provided.\n\nRequest: Please inspect the reported site and initiate necessary civic maintenance or repair.\n\n[Draft prepared by CivicFix AI for citizen review. Explicit approval required before submission.]",
    "key_facts": [
      "Issue Type: Garbage",
      "Citizen Statement: \"Garbage dump overflowing outside public park near Palace Gate.\"",
      "Location: Palace Gate, Mysuru",
      "Authority Status: no_verified_match",
      "Evidence Count: 0"
    ],
    "suggested_tags": [
      "garbage",
      "civic-complaint",
      "mysuru"
    ],
    "generation_method": "deterministic_template",
    "disclaimer": "AI-generated draft for citizen review. Review and edit before external submission.",
    "missing_confirmations": [
      "Assign responsible civic authority"
    ]
  },
  "warnings": [
    "No verified authority records in directory for category 'garbage' in city 'Mysuru'."
  ],
  "requires_human_approval": true,
  "workflow_state": "needs_authority_review",
  "execution_trace": [
    "[validation] success=True: Input validated successfully (status: valid).",
    "[classification] success=True: Category suggested: 'garbage' (match_strength: strong_match).",
    "[missing_info_detection] success=True: Location complete: True, Description actionable: True, Missing fields: [].",
    "[authority_lookup] success=False: No verified authority matched: No verified authority records in directory for category 'garbage' in city 'Mysuru'.",
    "[complaint_drafting] success=True: Draft generated using deterministic_template."
  ]
}
```

### Example 5: Structural Validation Failure (`422 Unprocessable Entity`)

```json
{
  "detail": "Report validation failed: input violates structural constraints or safety bounds.",
  "workflow_state": "invalid_input",
  "errors": [
    {
      "field": "description",
      "code": "EMPTY_VALUE",
      "message": "Description cannot be empty or whitespace-only."
    }
  ],
  "warnings": []
}
```

### Example 6: Multimodal Analysis with Image Vision Extension (`POST /api/v1/ai/analyze-report?enable_vision_analysis=true`)

When `enable_vision_analysis=true` and image attachments are present, the AI returns structured visual observations and flags multimodal discrepancies:

```json
{
  "report_id": "REP-VISION-001",
  "original_category": null,
  "suggested_category": "pothole",
  "confidence": null,
  "urgency": "high",
  "is_hazard": false,
  "missing_fields": [],
  "clarification_questions": [],
  "authority_match": {
    "status": "verified_match",
    "authority_id": "DEMO_BBMP_ROAD_SOUTH",
    "authority_name": "Bruhat Bengaluru Mahanagara Palike",
    "department": "Road Infrastructure Division (South Zone)",
    "jurisdiction": "Bengaluru (South Zone)",
    "official_portal_url": "https://bbmp.gov.in",
    "official_reporting_url": "https://sahaaya.bbmp.gov.in",
    "verification_date": "2026-01-15",
    "is_demo_fixture": true
  },
  "complaint_draft": {
    "title": "Civic Grievance: Pothole Reported at Koramangala 80ft Road",
    "formal_body": "To: Road Infrastructure Division (South Zone), Bruhat Bengaluru Mahanagara Palike...",
    "key_facts": [
      "Issue Type: Pothole",
      "Location: Koramangala 80ft Road, Bengaluru",
      "Evidence Count: 1"
    ],
    "suggested_tags": ["pothole", "road-infrastructure"],
    "generation_method": "deterministic_template",
    "disclaimer": "AI-generated draft for citizen review. Review and edit before external submission.",
    "missing_confirmations": []
  },
  "warnings": [
    "Multimodal discrepancy detected: Citizen report text indicates 'Street Lighting', but image analysis (Attachment ID: att-1) features 'Pothole'. Both findings are preserved; citizen review required."
  ],
  "requires_human_approval": true,
  "visual_analysis": [
    {
      "attachment_id": "att-1",
      "detected_category": "pothole",
      "visual_observations": [
        "Surface depression visible on asphalt pavement",
        "Disrupted road surface with exposed gravel aggregate"
      ],
      "is_clear": true,
      "uncertainty_rationale": null,
      "confidence": 0.88,
      "model_provider": "mock_vision_adapter",
      "is_simulated": true,
      "notes": "SIMULATION DISCLOSURE: Generated by MockVisionProvider for demonstration/testing."
    }
  ],
  "workflow_state": "draft_ready",
  "execution_trace": [
    "[validation] success=True: Input validated successfully (status: valid).",
    "[classification] success=True: Category suggested: 'pothole' (match_strength: strong_match).",
    "[vision_analysis] success=True: Analyzed 1 visual evidence attachment(s) (conflict: True).",
    "[missing_info_detection] success=True: Location complete: True, Description actionable: True, Missing fields: [].",
    "[authority_lookup] success=True: Verified match: Bruhat Bengaluru Mahanagara Palike (Road Infrastructure Division (South Zone)).",
    "[complaint_drafting] success=True: Draft generated using deterministic_template."
  ]
}
```

---

## 6. Audit Trail Logging (`agent_runs` Observer Hook)

To record workflow execution events into your PostgreSQL `agent_runs` table without direct coupling to AI code, register a listener callback at startup:

```python
from ai.observability import register_event_observer, WorkflowEvent

def log_to_agent_runs_db(event: WorkflowEvent):
    """
    Called automatically on each stage completion:
    - WORKFLOW_STARTED, VALIDATION_COMPLETED, MISSING_INFO_IDENTIFIED,
      CATEGORY_SUGGESTION_COMPLETED, AUTHORITY_LOOKUP_COMPLETED,
      DRAFT_GENERATION_COMPLETED, WORKFLOW_COMPLETED, WORKFLOW_FAILED.
    """
    # Insert event into your PostgreSQL table:
    # db.execute(
    #     "INSERT INTO agent_runs (report_id, event_name, step, status, error_code, metadata, timestamp) "
    #     "VALUES (:report_id, :event_name, :step, :status, :error_code, :metadata, :timestamp)",
    #     {
    #         "report_id": event.report_id,
    #         "event_name": event.event_name.value,
    #         "step": event.step.value if event.step else None,
    #         "status": event.status,
    #         "error_code": event.error_code,
    #         "metadata": event.metadata, # Scrubbed non-PII diagnostic metadata
    #         "timestamp": event.timestamp,
    #     }
    # )
    pass

# Register callback once on application startup
register_event_observer(log_to_agent_runs_db)
```

---

## 7. Next Steps & Team Coordination

1. **Mount Router**: Import and include `ai_router` in the main FastAPI application.
2. **Review Field Limits**: Verify that your frontend form length limits match the AI constraints (`description`: 10 to 5,000 characters; `raw_address`: max 500 characters).
3. **Database Population**: When ready, supply production PostgreSQL authority records to `lookup_authority(..., directory=db_records)` to replace `DEMONSTRATION_AUTHORITY_DIRECTORY`.
