# CivicFix AI — API Contract & Specifications

> **Target Audience**: Full Team (Backend Lead, Frontend Lead, AI Developer)  
> **Source of Truth**: [`docs/BACKEND_INTEGRATION_GUIDE.md`](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md)  
> **Implementation**: [`ai/api_router.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/api_router.py)  
> **Pydantic Schemas**: [`ai/schemas.py`](file:///c:/Users/Asus/Downloads/CivicFix-AI/ai/schemas.py)

---

## 1. Endpoints Overview

| Method | Path | Summary | Success Status | Auth Required? |
|---|---|---|---|---|
| `GET` | `/api/v1/ai/health` | Health check & directory status | `200 OK` | Optional / Public |
| `GET` | `/api/v1/ai/authorities` | List demonstration authorities | `200 OK` | Optional / Public |
| `POST` | `/api/v1/ai/analyze-report` | Full AI analysis, categorization & drafting | `200 OK` | Yes (Enforced by Backend) |

---

## 2. Quick Links to Contract Details

- **Input Contract Schema (`AIAnalysisRequest`)**: See Section 3.1 of [Backend Integration Guide](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md#31-input-contract-aianalysisrequest).
- **Output Contract Schema (`AIAnalysisResponse`)**: See Section 3.2 of [Backend Integration Guide](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md#32-output-contract-aianalysisresponse).
- **Status Codes & Error Mappings**: See Section 4 of [Backend Integration Guide](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md#4-http-status-codes--error-handling).
- **Concrete JSON Examples (5 Realistic Scenarios)**: See Section 5 of [Backend Integration Guide](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md#5-concrete-json-payloads--examples).
- **Audit Trail Observer (`agent_runs`)**: See Section 6 of [Backend Integration Guide](file:///c:/Users/Asus/Downloads/CivicFix-AI/docs/BACKEND_INTEGRATION_GUIDE.md#6-audit-trail-logging-agent_runs-observer-hook).
