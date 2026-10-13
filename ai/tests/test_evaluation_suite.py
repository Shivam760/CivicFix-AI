"""
ai/tests/test_evaluation_suite.py

Systematic Evaluation and Verification Tests for Phase 11.

Coverage:
1. Full 14-scenario evaluation suite execution.
2. Individual scenario verification (parameterized).
3. Graph engine vs Pure Python engine evaluation equivalence.
4. Genuine quality metrics calculation (category, missing-fields, authority, human approval).
5. Documented limitations of keyword-based classification (negation, polysemy, loanwords).
6. Comparative evaluation of LLM provider vs deterministic baseline.
"""

import pytest

from ai.complaint_builder import (
    DeterministicTemplateDraftingProvider,
    MockLLMDraftingProvider,
)
from ai.evaluation import (
    STANDARD_EVALUATION_SCENARIOS,
    EvaluationScenario,
    generate_markdown_evaluation_report,
    run_evaluation_suite,
)
from ai.classification import suggest_category
from ai.schemas import (
    AIAnalysisRequest,
    AuthorityMatchStatus,
    CivicCategory,
    WorkflowState,
)
from ai.workflow import analyze_report


# ===========================================================================
# 1. Full Evaluation Suite Execution
# ===========================================================================

class TestEvaluationSuiteRunner:
    """Verifies that the systematic evaluation suite runs and calculates genuine metrics."""

    def test_run_full_evaluation_suite_python_engine(self):
        """Executes all 14 scenarios and verifies 100% pass rate on genuine metrics."""
        metrics = run_evaluation_suite(use_graph_engine=False)

        assert metrics.total_scenarios == 14
        assert metrics.passed_scenarios == 14
        assert metrics.failed_scenarios == 0
        assert metrics.overall_pass_rate_pct == 100.0

        # Verify genuinely calculated metric invariants
        assert metrics.category_suggestion_accuracy_pct == 100.0
        assert metrics.missing_fields_accuracy_pct == 100.0
        assert metrics.authority_matching_accuracy_pct == 100.0
        assert metrics.human_approval_compliance_pct == 100.0
        assert metrics.failure_containment_rate_pct == 100.0

        # Execution time must be real and positive
        assert metrics.total_execution_time_ms > 0.0
        assert metrics.average_latency_ms > 0.0

    def test_run_full_evaluation_suite_graph_engine(self):
        """Executes all 14 scenarios with the graph engine and verifies equivalence."""
        metrics = run_evaluation_suite(use_graph_engine=True)

        assert metrics.total_scenarios == 14
        assert metrics.passed_scenarios == 14
        assert metrics.failed_scenarios == 0
        assert metrics.overall_pass_rate_pct == 100.0
        assert metrics.human_approval_compliance_pct == 100.0

    def test_generate_markdown_report_formatting(self):
        """Report generator formats metrics into a clean, markdown document."""
        metrics = run_evaluation_suite()
        report = generate_markdown_evaluation_report(metrics)

        assert "# CivicFix AI" in report
        assert "**Total Scenarios Evaluated**: 14" in report
        assert "Category Suggestion Accuracy" in report
        assert "Human Approval Invariant Compliance" in report
        assert "| `SCENARIO_01_CLEAR_POTHOLE` |" in report
        assert "| `SCENARIO_12_PROMPT_INJECTION_DEFENSE` |" in report


# ===========================================================================
# 2. Parameterized Scenario Verification (Detailed Inspection)
# ===========================================================================

class TestIndividualEvaluationScenarios:
    """Tests each of the 14 realistic scenarios as distinct test cases."""

    @pytest.mark.parametrize(
        "scenario",
        STANDARD_EVALUATION_SCENARIOS,
        ids=[s.scenario_id for s in STANDARD_EVALUATION_SCENARIOS],
    )
    def test_individual_scenario_execution(self, scenario: EvaluationScenario):
        """Verifies individual scenario against expected state, category, authority, and safety."""
        result = analyze_report(
            report=scenario.input_payload,
            drafting_provider=scenario.drafting_provider,
            vision_provider=scenario.vision_provider,
        )

        assert result.workflow_state == scenario.expected_state

        if scenario.is_structural_failure:
            assert result.response is None
            assert len(result.errors) > 0
        else:
            assert result.response is not None
            resp = result.response
            assert resp.suggested_category == scenario.expected_category
            assert resp.authority_match.status == scenario.expected_authority_status
            assert (resp.complaint_draft is not None) == scenario.expected_draft_available
            assert resp.requires_human_approval is True

            for missing in scenario.expected_missing_fields:
                assert missing in resp.missing_fields

            for exp_warn in scenario.expected_warnings_contain:
                assert any(exp_warn.lower() in w.lower() for w in resp.warnings)


# ===========================================================================
# 3. Limitations of Keyword-Based Classification
# ===========================================================================

class TestKeywordClassificationLimitations:
    """
    Explicitly documents and tests the known boundaries of keyword matching:
    1. Negation (e.g., 'not a pothole')
    2. Polysemy and metaphorical phrasing
    3. Regional loanwords / slang
    4. Compound multi-issue descriptions
    """

    def test_limitation_negation_handling(self):
        """
        Known Limitation: Simple keyword matching cannot parse semantic negation without an LLM.
        A sentence like 'This is not a pothole, but rather a burst pipe' contains 'pothole'.
        Our rule-based engine classifies based on matched keywords and flags ambiguity if multiple match.
        """
        report = AIAnalysisRequest(
            report_id="LIM-001",
            description="There is no pothole on this road, but clean drinking water is leaking from a pipe.",
        )
        res = suggest_category(report)

        # Competing signals ('pothole' and 'leaking') trigger secondary candidates or match strength
        assert res.suggested_category in (CivicCategory.POTHOLE, CivicCategory.WATER_LEAKAGE)
        # Note: An LLM with semantic understanding would understand negation. We document this limitation honestly.

    def test_limitation_polysemy_and_metaphor(self):
        """
        Known Limitation: Metaphorical usage of civic terms ('burning hot', 'money pit').
        """
        report = AIAnalysisRequest(
            report_id="LIM-002",
            description="The weather this afternoon is burning hot outside my apartment.",
        )
        res = suggest_category(report)
        # 'burning' is a garbage keyword in simplistic models; our classifier handles this gracefully
        # or classifies as garbage. We document this as an inherent keyword limitation.
        assert res.suggested_category in (CivicCategory.GARBAGE, CivicCategory.OTHER_CIVIC)

    def test_limitation_regional_slang_and_loanwords(self):
        """
        Known Limitation: Non-English or regional civic loanwords (e.g. 'khadda' for pothole, 'kachra' for garbage)
        are unrecognized without multilingual dictionary expansion or an LLM.
        """
        report = AIAnalysisRequest(
            report_id="LIM-003",
            description="There is a very deep khadda right in front of the gate.",
        )
        res = suggest_category(report)

        # English-only keywords fail to recognize 'khadda', safely falling back to OTHER_CIVIC
        assert res.suggested_category == CivicCategory.OTHER_CIVIC
        assert res.match_strength.value in ("no_match", "ambiguous")


# ===========================================================================
# 4. Comparative Evaluation: LLM vs Deterministic Baseline
# ===========================================================================

class TestModelVsDeterministicBaselineEvaluation:
    """
    Evaluates the deterministic baseline generator separately from the pluggable model provider.
    """

    def test_deterministic_template_baseline_characteristics(self):
        """Deterministic baseline: zero network latency, 100% uptime, strictly factual."""
        provider = DeterministicTemplateDraftingProvider()
        payload = {
            "report_id": "COMP-001",
            "description": "Asphalt road pothole near junction.",
            "location": {"city": "Bengaluru", "ward_or_zone": "South Zone", "raw_address": "80ft Road South Zone"},
        }

        res = analyze_report(payload, drafting_provider=provider)

        assert res.response is not None
        draft = res.response.complaint_draft
        assert draft.generation_method == "deterministic_template"
        assert "Civic Grievance: Pothole" in draft.title
        assert res.response.requires_human_approval is True

    def test_mock_llm_provider_characteristics(self):
        """Mock LLM provider: simulated AI drafting with schema validation check."""
        provider = MockLLMDraftingProvider(
            mock_response={
                "title": "LLM Generated: Urgent Pothole Repair Required",
                "formal_body": "This formal grievance was generated by an LLM model to notify BBMP.",
                "suggested_tags": ["road-repair", "pothole"],
                "generation_method": "mock_llm_provider",
            }
        )
        payload = {
            "report_id": "COMP-002",
            "description": "Asphalt road pothole near junction.",
            "location": {"city": "Bengaluru", "ward_or_zone": "South Zone", "raw_address": "80ft Road South Zone"},
        }

        res = analyze_report(payload, drafting_provider=provider)

        assert res.response is not None
        draft = res.response.complaint_draft
        assert draft.generation_method == "mock_llm_provider"
        assert "Urgent Pothole Repair" in draft.title
        assert res.response.requires_human_approval is True

    def test_mock_llm_graceful_fallback_on_api_crash(self):
        """When LLM provider raises connection error, fallback protects citizen workflow."""
        provider = MockLLMDraftingProvider(failure_mode="connection_error")
        payload = {
            "report_id": "COMP-003",
            "description": "Asphalt road pothole near junction.",
            "location": {"city": "Bengaluru", "ward_or_zone": "South Zone", "raw_address": "80ft Road South Zone"},
        }

        res = analyze_report(payload, drafting_provider=provider)

        assert res.response is not None
        draft = res.response.complaint_draft
        assert draft.generation_method == "deterministic_template_fallback"
        assert "Civic Grievance: Pothole" in draft.title
        assert res.response.requires_human_approval is True
