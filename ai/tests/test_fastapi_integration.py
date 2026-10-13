"""
ai/tests/test_fastapi_integration.py

FastAPI Integration and End-to-End HTTP Contract Tests for Phase 9.

Verifies:
1. Module health and directory inspection endpoints.
2. Successful report intake and complaint drafting (HTTP 200).
3. Guided incomplete reports with missing fields (HTTP 200 with needs_more_info).
4. Unverified/ambiguous authority routing (HTTP 200 with needs_authority_review).
5. Structural validation rejection (HTTP 422 with detailed errors).
6. Graph state machine engine toggle via query parameter.
7. Mandatory human approval invariant across all HTTP responses.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from ai.api_router import ai_router
from ai.schemas import AuthorityMatchStatus, CivicCategory, WorkflowState

app = FastAPI(title="CivicFix AI Test Application")
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Analysis"])

client = TestClient(app)


# ===========================================================================
# 1. Health & Directory Endpoints
# ===========================================================================

class TestSystemEndpoints:
    """Verifies health check and directory inspection endpoints."""

    def test_get_ai_health(self):
        """GET /api/v1/ai/health returns 200 with active module status."""
        response = client.get("/api/v1/ai/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["module"] == "civicfix-ai-engine"
        assert data["active_directory_records"] >= 5
        assert data["human_approval_required"] is True

    def test_get_demonstration_authorities(self):
        """GET /api/v1/ai/authorities returns list of demonstration authorities."""
        response = client.get("/api/v1/ai/authorities")
        assert response.status_code == 200
        records = response.json()
        assert isinstance(records, list)
        assert len(records) >= 5
        # Verify first record schema
        first = records[0]
        assert "authority_id" in first
        assert "authority_name" in first
        assert "is_demo_fixture" in first
        assert first["is_demo_fixture"] is True


# ===========================================================================
# 2. Report Intake & Analysis Endpoint Tests
# ===========================================================================

class TestAnalyzeReportEndpoint:
    """Verifies POST /api/v1/ai/analyze-report contract and status code mappings."""

    def test_complete_report_returns_200_draft_ready(self):
        """Scenario: Complete pothole report returns 200 with DRAFT_READY status."""
        payload = {
            "report_id": "API-TEST-001",
            "description": "Massive pothole in outer lane damaging vehicle suspensions.",
            "location": {
                "city": "Bengaluru",
                "raw_address": "Outer Ring Road near South Zone flyover",
                "ward_or_zone": "South Zone",
            },
        }

        response = client.post("/api/v1/ai/analyze-report", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["report_id"] == "API-TEST-001"
        assert data["suggested_category"] == CivicCategory.POTHOLE.value
        assert data["workflow_state"] == WorkflowState.DRAFT_READY.value
        assert data["authority_match"]["status"] == AuthorityMatchStatus.VERIFIED_MATCH.value
        assert data["authority_match"]["authority_id"] == "DEMO_BBMP_ROAD_SOUTH"
        assert data["requires_human_approval"] is True
        assert "Pothole" in data["complaint_draft"]["title"]
        assert len(data["complaint_draft"]["formal_body"]) > 50

    def test_incomplete_report_returns_200_needs_more_info(self):
        """Scenario: Report missing location returns 200 with clarification questions."""
        payload = {
            "report_id": "API-TEST-002",
            "description": "Garbage heap piling up and emitting foul odor.",
        }

        response = client.post("/api/v1/ai/analyze-report", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["workflow_state"] == WorkflowState.NEEDS_MORE_INFO.value
        assert "location.city" in data["missing_fields"]
        assert len(data["clarification_questions"]) > 0
        assert data["authority_match"]["status"] == AuthorityMatchStatus.NO_VERIFIED_MATCH.value
        assert data["requires_human_approval"] is True

    def test_ambiguous_authority_returns_200_needs_authority_review(self):
        """Scenario: Pothole in Bengaluru without zone detail preserves ambiguity."""
        payload = {
            "report_id": "API-TEST-003",
            "description": "Crater in tarmac damaging vehicle rims.",
            "location": {"city": "Bengaluru", "raw_address": "Ring Road junction"},
        }

        response = client.post("/api/v1/ai/analyze-report", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["workflow_state"] == WorkflowState.NEEDS_AUTHORITY_REVIEW.value
        assert data["authority_match"]["status"] == AuthorityMatchStatus.AMBIGUOUS_MATCH.value
        assert len(data["authority_match"]["plausible_alternatives"]) >= 2
        assert data["requires_human_approval"] is True

    def test_unsupported_city_returns_200_unverified_authority(self):
        """Scenario: Valid report in unlisted city returns NO_VERIFIED_MATCH without hallucinating."""
        payload = {
            "report_id": "API-TEST-004",
            "description": "Broken streetlight making the entire road completely dark.",
            "location": {"city": "Kolkata", "raw_address": "Park Street"},
        }

        response = client.post("/api/v1/ai/analyze-report", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["workflow_state"] == WorkflowState.NEEDS_AUTHORITY_REVIEW.value
        assert data["authority_match"]["status"] == AuthorityMatchStatus.NO_VERIFIED_MATCH.value
        assert data["authority_match"]["authority_id"] is None
        assert data["requires_human_approval"] is True

    def test_structural_failure_returns_422(self):
        """Scenario: Whitespace description is rejected with HTTP 422."""
        payload = {"report_id": "API-TEST-005", "description": "    "}

        response = client.post("/api/v1/ai/analyze-report", json=payload)
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_extra_forbidden_fields_rejected_with_422(self):
        """Scenario: Undeclared fields rejected under ConfigDict(extra='forbid')."""
        payload = {
            "description": "Water pipe leak on corner.",
            "unknown_injected_field": "exploit_value",
        }

        response = client.post("/api/v1/ai/analyze-report", json=payload)
        assert response.status_code == 422

    def test_graph_engine_query_parameter(self):
        """Scenario: Passing use_graph_engine=true executes via graph state machine."""
        payload = {
            "report_id": "API-GRAPH-001",
            "description": "Overflowing public garbage bin on commercial street.",
            "location": {"city": "Bengaluru", "raw_address": "Commercial Street"},
        }

        response = client.post("/api/v1/ai/analyze-report?use_graph_engine=true", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["suggested_category"] == CivicCategory.GARBAGE.value
        assert data["workflow_state"] == WorkflowState.DRAFT_READY.value
        assert data["authority_match"]["status"] == AuthorityMatchStatus.VERIFIED_MATCH.value
        assert data["requires_human_approval"] is True

    def test_enable_vision_analysis_query_parameter(self):
        """Scenario: Passing enable_vision_analysis=true executes visual inspection on attachments."""
        payload = {
            "report_id": "API-VISION-001",
            "description": "Deep asphalt pothole damaging tyres and rims.",
            "location": {"city": "Bengaluru", "raw_address": "Koramangala 80ft Road", "ward_or_zone": "South Zone"},
            "evidence_metadata": [
                {"attachment_id": "api-att-1", "filename": "crater.jpg", "file_type": "image/jpeg"}
            ],
        }

        response = client.post("/api/v1/ai/analyze-report?enable_vision_analysis=true", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["workflow_state"] == WorkflowState.DRAFT_READY.value
        assert data["visual_analysis"] is not None
        assert len(data["visual_analysis"]) == 1
        assert data["visual_analysis"][0]["attachment_id"] == "api-att-1"
        assert data["visual_analysis"][0]["is_simulated"] is True
        assert data["visual_analysis"][0]["is_clear"] is True
        assert data["requires_human_approval"] is True
