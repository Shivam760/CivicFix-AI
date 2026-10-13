"""
ai/tests/test_workflow.py

Comprehensive end-to-end unit tests for the CivicFix AI workflow orchestrator.
Tests cover complete reports, missing descriptions, missing locations, uncertain categories,
unverified authorities, ambiguous matches, model failure recovery, hazard detection,
and unhandled exception handling.
"""

from unittest.mock import patch
import pytest

from ai.complaint_builder import MockLLMDraftingProvider
from ai.schemas import (
    AIAnalysisRequest,
    AuthorityMatchStatus,
    CivicCategory,
    LocationInput,
    UrgencyLevel,
    WorkflowState,
    WorkflowStep,
)
from ai.workflow import analyze_report


class TestEndToEndWorkflowScenarios:
    """End-to-end tests for the public analyze_report entry point."""

    def test_complete_report_draft_ready(self):
        """Scenario: Complete data provided; resolves to DRAFT_READY with verified authority."""
        payload = {
            "report_id": "rep-full-001",
            "description": "Deep pothole right after 14th Cross junction causing vehicles to swerve.",
            "category": "roads",
            "location": {
                "raw_address": "80 Feet Road, 14th Cross",
                "city": "Bengaluru",
                "ward_or_zone": "South Zone",
            },
        }

        res = analyze_report(payload)
        assert res.workflow_state == WorkflowState.DRAFT_READY
        assert res.response is not None
        assert res.response.report_id == "rep-full-001"
        assert res.response.suggested_category == CivicCategory.POTHOLE
        assert res.response.authority_match.status == AuthorityMatchStatus.VERIFIED_MATCH
        assert res.response.authority_match.authority_id == "DEMO_BBMP_ROAD_SOUTH"
        assert res.response.requires_human_approval is True
        assert len(res.errors) == 0
        assert len(res.step_traces) == 5

    def test_missing_description_stops_safely(self):
        """Scenario: Missing or empty description stops immediately at INVALID_INPUT."""
        res = analyze_report({"report_id": "rep-invalid", "description": ""})
        assert res.workflow_state == WorkflowState.INVALID_INPUT
        assert res.response is None
        assert len(res.errors) > 0
        assert any(e.code == "EMPTY_VALUE" for e in res.errors)
        # Verify workflow stopped after validation: only 1 trace recorded
        assert len(res.step_traces) == 1
        assert res.step_traces[0].step == WorkflowStep.VALIDATION
        assert res.step_traces[0].success is False

    def test_missing_location_needs_more_info(self):
        """
        Scenario: 'There is a pothole near my college'
        Analyzable report with missing location resolves to NEEDS_MORE_INFO.
        """
        payload = {
            "description": "There is a massive pothole near my college entrance.",
        }

        res = analyze_report(payload)
        assert res.workflow_state == WorkflowState.NEEDS_MORE_INFO
        assert res.response is not None
        assert res.response.suggested_category == CivicCategory.POTHOLE
        assert len(res.response.missing_fields) > 0
        assert "location.city" in res.response.missing_fields
        assert len(res.response.clarification_questions) > 0
        assert res.response.authority_match.status == AuthorityMatchStatus.NO_VERIFIED_MATCH
        assert res.response.requires_human_approval is True

    def test_uncertain_unsupported_category_needs_authority_review(self):
        """Scenario: Unsupported complaint (e.g. noise) resolves to OTHER_CIVIC and NEEDS_AUTHORITY_REVIEW."""
        payload = {
            "description": "Excessive construction noise next door keeping everyone awake at night.",
            "location": {"city": "Bengaluru", "raw_address": "Indiranagar 100ft Road"},
        }

        res = analyze_report(payload)
        assert res.response is not None
        assert res.response.suggested_category == CivicCategory.OTHER_CIVIC
        assert res.workflow_state == WorkflowState.NEEDS_AUTHORITY_REVIEW
        assert res.response.authority_match.status == AuthorityMatchStatus.NO_VERIFIED_MATCH

    def test_no_verified_authority_for_unsupported_city(self):
        """Scenario: Supported issue (garbage) in unlisted city resolves to NEEDS_AUTHORITY_REVIEW."""
        payload = {
            "description": "Garbage dump overflowing outside public park for days.",
            "location": {"city": "Mysuru", "raw_address": "Near Palace Gate"},
        }

        res = analyze_report(payload)
        assert res.response is not None
        assert res.response.suggested_category == CivicCategory.GARBAGE
        assert res.workflow_state == WorkflowState.NEEDS_AUTHORITY_REVIEW
        assert res.response.authority_match.status == AuthorityMatchStatus.NO_VERIFIED_MATCH
        assert "No verified authority" in res.response.authority_match.notes

    def test_ambiguous_authority_match(self):
        """Scenario: Pothole in Bengaluru without zone detail resolves to AMBIGUOUS_MATCH and NEEDS_AUTHORITY_REVIEW."""
        payload = {
            "description": "Crater in the road damaging vehicle rims.",
            "location": {"city": "Bengaluru", "raw_address": "Outer Ring Road junction"},
        }

        res = analyze_report(payload)
        assert res.response is not None
        assert res.workflow_state == WorkflowState.NEEDS_AUTHORITY_REVIEW
        assert res.response.authority_match.status == AuthorityMatchStatus.AMBIGUOUS_MATCH
        assert len(res.response.authority_match.plausible_alternatives) >= 2

    def test_model_failure_recovers_gracefully(self):
        """Scenario: LLM provider throws error; workflow safely recovers with deterministic template."""
        payload = {
            "description": "Clean drinking water leaking from broken municipal pipe.",
            "location": {"city": "Bengaluru", "raw_address": "MG Road"},
        }
        failing_provider = MockLLMDraftingProvider(should_fail=True)

        res = analyze_report(payload, drafting_provider=failing_provider)
        assert res.response is not None
        assert res.response.complaint_draft.generation_method == "deterministic_template_fallback"
        assert res.workflow_state == WorkflowState.DRAFT_READY
        assert "Water Leakage" in res.response.complaint_draft.title

    def test_acute_hazard_detection(self):
        """Scenario: Report mentioning live wire and accident risk triggers elevated urgency and is_hazard=True."""
        payload = {
            "description": "Exposed live wire touching water puddle, scooter skidded and fell.",
            "location": {"city": "Bengaluru", "ward_or_zone": "South Zone"},
        }

        res = analyze_report(payload)
        assert res.response is not None
        assert res.response.is_hazard is True
        assert res.response.urgency in (UrgencyLevel.HIGH, UrgencyLevel.CRITICAL)
        assert any("hazard" in w.lower() for w in res.warnings)

    def test_unhandled_internal_exception_caught(self):
        """Scenario: Unhandled internal bug in component returns ANALYSIS_FAILED instead of crashing."""
        with patch("ai.workflow.suggest_category", side_effect=ZeroDivisionError("Simulated bug")):
            res = analyze_report({"description": "Valid complaint description text here."})
            assert res.workflow_state == WorkflowState.ANALYSIS_FAILED
            assert res.response is None
            assert len(res.errors) == 1
            assert res.errors[0].code == "INTERNAL_WORKFLOW_FAILURE"

    def test_step_trace_auditability(self):
        """Verify step traces contain correct stages and non-personal operational details."""
        payload = {
            "description": "Broken streetlight pole near the park gate.",
            "location": {"city": "Bengaluru"},
        }
        res = analyze_report(payload)
        steps_logged = [t.step for t in res.step_traces]
        assert WorkflowStep.VALIDATION in steps_logged
        assert WorkflowStep.CLASSIFICATION in steps_logged
        assert WorkflowStep.MISSING_INFO_DETECTION in steps_logged
        assert WorkflowStep.AUTHORITY_LOOKUP in steps_logged
        assert WorkflowStep.COMPLAINT_DRAFTING in steps_logged
        for t in res.step_traces:
            assert len(t.details) > 0
