"""
ai/tests/test_graph_equivalence.py

Equivalence and Behavioral Consistency Tests for Phase 8.

Verifies that the graph state machine (analyze_report_graph) produces
equivalent, reliable, and compliant results when compared with the
established Python workflow (analyze_report) across representative scenarios.
"""

import pytest

from ai.complaint_builder import MockLLMDraftingProvider
from ai.graph_workflow import analyze_report_graph
from ai.schemas import AuthorityMatchStatus, CivicCategory, WorkflowState
from ai.workflow import analyze_report


class TestGraphWorkflowEquivalence:
    """Verifies 100% equivalence between analyze_report and analyze_report_graph."""

    def test_complete_valid_report_equivalence(self):
        """Scenario: Complete pothole report in Bengaluru."""
        payload = {
            "report_id": "EQ-001",
            "description": "Deep crater on outer ring road damaging car tires and rims.",
            "location": {
                "city": "Bengaluru",
                "raw_address": "Outer Ring Road near South Zone flyover",
                "ward_or_zone": "South Zone",
            },
        }

        pure_res = analyze_report(payload)
        graph_res = analyze_report_graph(payload)

        assert pure_res.workflow_state == graph_res.workflow_state == WorkflowState.DRAFT_READY
        assert pure_res.response is not None and graph_res.response is not None
        assert pure_res.response.suggested_category == graph_res.response.suggested_category == CivicCategory.POTHOLE
        assert pure_res.response.authority_match.status == graph_res.response.authority_match.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert pure_res.response.authority_match.authority_id == graph_res.response.authority_match.authority_id == "DEMO_BBMP_ROAD_SOUTH"
        assert pure_res.response.requires_human_approval == graph_res.response.requires_human_approval is True
        assert pure_res.response.complaint_draft.title == graph_res.response.complaint_draft.title

    def test_missing_location_equivalence(self):
        """Scenario: Report missing location coordinates and address."""
        payload = {
            "report_id": "EQ-002",
            "description": "Large garbage heap burning near market area.",
        }

        pure_res = analyze_report(payload)
        graph_res = analyze_report_graph(payload)

        assert pure_res.workflow_state == graph_res.workflow_state == WorkflowState.NEEDS_MORE_INFO
        assert pure_res.response is not None and graph_res.response is not None
        assert pure_res.response.missing_fields == graph_res.response.missing_fields
        assert pure_res.response.authority_match.status == graph_res.response.authority_match.status == AuthorityMatchStatus.NO_VERIFIED_MATCH
        assert pure_res.response.requires_human_approval == graph_res.response.requires_human_approval is True

    def test_ambiguous_authority_equivalence(self):
        """Scenario: Road defect in Bengaluru with no zone details."""
        payload = {
            "report_id": "EQ-003",
            "description": "Crater in tarmac causing traffic jam.",
            "location": {"city": "Bengaluru", "raw_address": "Main Ring Road junction"},
        }

        pure_res = analyze_report(payload)
        graph_res = analyze_report_graph(payload)

        assert pure_res.workflow_state == graph_res.workflow_state == WorkflowState.NEEDS_AUTHORITY_REVIEW
        assert pure_res.response is not None and graph_res.response is not None
        assert pure_res.response.authority_match.status == graph_res.response.authority_match.status == AuthorityMatchStatus.AMBIGUOUS_MATCH
        assert len(pure_res.response.authority_match.plausible_alternatives) == len(graph_res.response.authority_match.plausible_alternatives)

    def test_unsupported_category_equivalence(self):
        """Scenario: Noise complaint falls back to OTHER_CIVIC."""
        payload = {
            "report_id": "EQ-004",
            "description": "Loud blaring construction noise late at night next to apartments.",
            "location": {"city": "Bengaluru", "raw_address": "MG Road"},
        }

        pure_res = analyze_report(payload)
        graph_res = analyze_report_graph(payload)

        assert pure_res.workflow_state == graph_res.workflow_state == WorkflowState.NEEDS_AUTHORITY_REVIEW
        assert pure_res.response is not None and graph_res.response is not None
        assert pure_res.response.suggested_category == graph_res.response.suggested_category == CivicCategory.OTHER_CIVIC
        assert pure_res.response.authority_match.status == graph_res.response.authority_match.status == AuthorityMatchStatus.NO_VERIFIED_MATCH

    def test_invalid_input_safe_halt_equivalence(self):
        """Scenario: Empty / whitespace description halts immediately."""
        payload = {"report_id": "EQ-005", "description": "    "}

        pure_res = analyze_report(payload)
        graph_res = analyze_report_graph(payload)

        assert pure_res.workflow_state == graph_res.workflow_state == WorkflowState.INVALID_INPUT
        assert pure_res.response is None and graph_res.response is None
        pure_err_codes = [e.code for e in pure_res.errors]
        graph_err_codes = [e.code for e in graph_res.errors]
        assert pure_err_codes == graph_err_codes

    def test_hazard_detection_equivalence(self):
        """Scenario: Live wire hazard raises urgency tier."""
        payload = {
            "report_id": "EQ-006",
            "description": "Live electric wire hanging dangerously over flooded street after storm.",
            "location": {"city": "Bengaluru", "raw_address": "Indiranagar 100ft Road"},
        }

        pure_res = analyze_report(payload)
        graph_res = analyze_report_graph(payload)

        assert pure_res.response is not None and graph_res.response is not None
        assert pure_res.response.is_hazard == graph_res.response.is_hazard is True
        assert pure_res.response.urgency == graph_res.response.urgency

    def test_model_failure_fallback_equivalence(self):
        """Scenario: External LLM provider fails; both workflows cleanly fallback."""
        failing_provider = MockLLMDraftingProvider(should_fail=True)
        payload = {
            "report_id": "EQ-007",
            "description": "Broken streetlight making the corner dark and unsafe.",
            "location": {"city": "Bengaluru", "raw_address": "Koramangala 8th Block"},
        }

        pure_res = analyze_report(payload, drafting_provider=failing_provider)
        graph_res = analyze_report_graph(payload, drafting_provider=failing_provider)

        assert pure_res.workflow_state == graph_res.workflow_state == WorkflowState.DRAFT_READY
        assert pure_res.response.complaint_draft.generation_method == graph_res.response.complaint_draft.generation_method == "deterministic_template_fallback"
        assert pure_res.response.requires_human_approval == graph_res.response.requires_human_approval is True
