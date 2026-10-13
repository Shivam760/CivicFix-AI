"""
ai/graph_workflow.py

Graph-Based State Machine Orchestrator for CivicFix AI.

Evaluates and demonstrates graph-structured workflow execution:
- Typed Graph State (`CivicWorkflowGraphState`)
- Modular processing nodes reusing pure Python domain functions
- Explicit conditional routing edges
- Zero-external-dependency graph runner with 1-to-1 LangGraph compatibility
- 100% equivalence with ordinary `analyze_report()` pipeline
"""

import logging
from typing import Any, Callable, Dict, List, Optional, Tuple, TypedDict, Union

from ai.authority_lookup import DEMONSTRATION_AUTHORITY_DIRECTORY, lookup_authority
from ai.classification import suggest_category
from ai.complaint_builder import DraftingProvider, build_complaint
from ai.observability import record_workflow_event
from ai.schemas import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AuthorityDirectoryRecord,
    AuthorityMatchResult,
    AuthorityMatchStatus,
    CategorySuggestionResult,
    CivicCategory,
    ComplaintDraft,
    MissingInfoResult,
    ReportValidationResult,
    UrgencyLevel,
    ValidationIssue,
    VisionAnalysisResult,
    WorkflowEventName,
    WorkflowResult,
    WorkflowState,
    WorkflowStep,
    WorkflowStepTrace,
)
from ai.validation import detect_missing_information, validate_report
from ai.vision import (
    VisionProvider,
    analyze_evidence_attachments,
    detect_text_vision_conflict,
)
from ai.workflow import _assess_urgency_and_hazard

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Typed Graph State (LangGraph-Compatible TypedDict)
# ---------------------------------------------------------------------------

class CivicWorkflowGraphState(TypedDict, total=False):
    """
    Typed dictionary representing the shared state flowing across graph nodes.
    Compatible with LangGraph StateGraph schema definitions.
    """
    # Intake inputs
    raw_report: Union[AIAnalysisRequest, Dict[str, Any], Any]
    report_id: Optional[str]
    strict_categories: bool
    drafting_provider: Optional[DraftingProvider]
    authority_directory: Optional[List[AuthorityDirectoryRecord]]
    vision_provider: Optional[Any]

    # Stage artifacts
    val_result: Optional[ReportValidationResult]
    sanitized_req: Optional[AIAnalysisRequest]
    cat_result: Optional[CategorySuggestionResult]
    visual_results: Optional[List[VisionAnalysisResult]]
    missing_info: Optional[MissingInfoResult]
    auth_match: Optional[AuthorityMatchResult]
    complaint_draft: Optional[ComplaintDraft]
    urgency: UrgencyLevel
    is_hazard: bool
    final_state: WorkflowState

    # Audit & Tracking
    traces: List[WorkflowStepTrace]
    all_warnings: List[str]
    errors: List[ValidationIssue]
    response: Optional[AIAnalysisResponse]


# ---------------------------------------------------------------------------
# Graph Nodes (Reusing Pure Python Components)
# ---------------------------------------------------------------------------

def node_validate_input(state: CivicWorkflowGraphState) -> CivicWorkflowGraphState:
    """Node 1: Validates structural integrity and sanitizes raw report."""
    val_result = validate_report(
        state["raw_report"],
        strict_categories=state.get("strict_categories", False),
    )
    state["val_result"] = val_result

    if not val_result.is_valid:
        state["traces"].append(
            WorkflowStepTrace(
                step=WorkflowStep.VALIDATION,
                success=False,
                details=f"Validation rejected input with {len(val_result.errors)} error(s).",
            )
        )
        state["final_state"] = WorkflowState.INVALID_INPUT
        state["errors"] = list(val_result.errors)
        state["all_warnings"].extend(w.message for w in val_result.warnings)
        record_workflow_event(
            event_name=WorkflowEventName.VALIDATION_COMPLETED,
            report_id=state.get("report_id"),
            step=WorkflowStep.VALIDATION,
            status="failed",
            error_code="VALIDATION_FAILED",
            metadata={"error_count": len(val_result.errors)},
        )
        record_workflow_event(
            event_name=WorkflowEventName.WORKFLOW_FAILED,
            report_id=state.get("report_id"),
            status="failed",
            error_code="VALIDATION_FAILED",
            metadata={"error_count": len(val_result.errors)},
        )
        return state

    state["traces"].append(
        WorkflowStepTrace(
            step=WorkflowStep.VALIDATION,
            success=True,
            details=f"Input validated successfully (status: {val_result.status.value}).",
        )
    )
    state["all_warnings"].extend(w.message for w in val_result.warnings)
    sanitized_req: AIAnalysisRequest = val_result.sanitized_report  # type: ignore
    state["sanitized_req"] = sanitized_req
    state["report_id"] = sanitized_req.report_id

    record_workflow_event(
        event_name=WorkflowEventName.VALIDATION_COMPLETED,
        report_id=sanitized_req.report_id,
        step=WorkflowStep.VALIDATION,
        status="success",
        metadata={"validation_status": val_result.status.value},
    )
    return state


def node_suggest_category(state: CivicWorkflowGraphState) -> CivicWorkflowGraphState:
    """Node 2: Categorizes issue and detects citizen conflict."""
    sanitized_req = state["sanitized_req"]
    assert sanitized_req is not None

    cat_result = suggest_category(sanitized_req)
    state["cat_result"] = cat_result

    state["traces"].append(
        WorkflowStepTrace(
            step=WorkflowStep.CLASSIFICATION,
            success=True,
            details=(
                f"Category suggested: '{cat_result.suggested_category.value}' "
                f"(match_strength: {cat_result.match_strength.value})."
            ),
        )
    )
    if cat_result.has_category_conflict and cat_result.conflict_rationale:
        state["all_warnings"].append(cat_result.conflict_rationale)

    record_workflow_event(
        event_name=WorkflowEventName.CATEGORY_SUGGESTION_COMPLETED,
        report_id=sanitized_req.report_id,
        step=WorkflowStep.CLASSIFICATION,
        status="success",
        metadata={
            "suggested_category": cat_result.suggested_category.value,
            "match_strength": cat_result.match_strength.value,
            "has_conflict": cat_result.has_category_conflict,
        },
    )
    return state


def node_analyze_vision(state: CivicWorkflowGraphState) -> CivicWorkflowGraphState:
    """Node 2b: Analyzes optional photographic evidence attachments."""
    sanitized_req = state.get("sanitized_req")
    cat_result = state.get("cat_result")
    provider = state.get("vision_provider")

    if sanitized_req is not None and cat_result is not None and provider is not None and sanitized_req.evidence_metadata:
        vis_results, vis_warnings = analyze_evidence_attachments(
            evidence_list=sanitized_req.evidence_metadata,
            provider=provider,
        )
        state["visual_results"] = vis_results
        if vis_warnings:
            state["all_warnings"].extend(vis_warnings)

        has_vis_conflict, vis_conflict_rationale = detect_text_vision_conflict(
            text_category=cat_result.suggested_category,
            visual_results=vis_results,
        )
        if has_vis_conflict and vis_conflict_rationale:
            state["all_warnings"].append(vis_conflict_rationale)

        state["traces"].append(
            WorkflowStepTrace(
                step=WorkflowStep.VISION_ANALYSIS,
                success=True,
                details=f"Analyzed {len(vis_results)} visual evidence attachment(s) (conflict: {has_vis_conflict}).",
            )
        )
        record_workflow_event(
            event_name=WorkflowEventName.VISION_ANALYSIS_COMPLETED,
            report_id=sanitized_req.report_id,
            step=WorkflowStep.VISION_ANALYSIS,
            status="success",
            metadata={
                "attachment_count": len(vis_results),
                "has_conflict": has_vis_conflict,
            },
        )
    return state


def node_detect_missing_info(state: CivicWorkflowGraphState) -> CivicWorkflowGraphState:
    """Node 3: Detects location gaps and description detail completeness."""
    sanitized_req = state["sanitized_req"]
    assert sanitized_req is not None
    val_result = state.get("val_result")

    missing_info = (
        val_result.missing_info
        if val_result and val_result.missing_info is not None
        else detect_missing_information(sanitized_req)
    )
    state["missing_info"] = missing_info

    state["traces"].append(
        WorkflowStepTrace(
            step=WorkflowStep.MISSING_INFO_DETECTION,
            success=True,
            details=(
                f"Location complete: {missing_info.is_location_complete}, "
                f"Description actionable: {missing_info.is_description_actionable}, "
                f"Missing fields: {missing_info.missing_fields}."
            ),
        )
    )

    record_workflow_event(
        event_name=WorkflowEventName.MISSING_INFO_IDENTIFIED,
        report_id=sanitized_req.report_id,
        step=WorkflowStep.MISSING_INFO_DETECTION,
        status="success",
        metadata={
            "is_location_complete": missing_info.is_location_complete,
            "missing_fields_count": len(missing_info.missing_fields),
        },
    )
    return state


def node_lookup_authority(state: CivicWorkflowGraphState) -> CivicWorkflowGraphState:
    """Node 4: Queries verified authority directory with location gating."""
    sanitized_req = state["sanitized_req"]
    cat_result = state["cat_result"]
    missing_info = state["missing_info"]
    assert sanitized_req is not None and cat_result is not None and missing_info is not None

    directory = state.get("authority_directory")
    auth_match: AuthorityMatchResult

    if not missing_info.is_location_complete:
        auth_match = lookup_authority(
            category=cat_result.suggested_category,
            location=sanitized_req.location,
            directory=directory,
        )
        state["traces"].append(
            WorkflowStepTrace(
                step=WorkflowStep.AUTHORITY_LOOKUP,
                success=False,
                details="Authority lookup gated: insufficient location details in report.",
            )
        )
        if auth_match.notes:
            state["all_warnings"].append(auth_match.notes)
    else:
        auth_match = lookup_authority(
            category=cat_result.suggested_category,
            location=sanitized_req.location,
            directory=directory,
        )
        if auth_match.status == AuthorityMatchStatus.VERIFIED_MATCH:
            state["traces"].append(
                WorkflowStepTrace(
                    step=WorkflowStep.AUTHORITY_LOOKUP,
                    success=True,
                    details=f"Verified match: {auth_match.authority_name} ({auth_match.department}).",
                )
            )
        elif auth_match.status == AuthorityMatchStatus.AMBIGUOUS_MATCH:
            state["traces"].append(
                WorkflowStepTrace(
                    step=WorkflowStep.AUTHORITY_LOOKUP,
                    success=False,
                    details=f"Ambiguous match across {len(auth_match.plausible_alternatives)} authorities.",
                )
            )
            if auth_match.notes:
                state["all_warnings"].append(auth_match.notes)
        else:
            state["traces"].append(
                WorkflowStepTrace(
                    step=WorkflowStep.AUTHORITY_LOOKUP,
                    success=False,
                    details=f"No verified authority matched: {auth_match.notes}",
                )
            )
            if auth_match.notes:
                state["all_warnings"].append(auth_match.notes)

    state["auth_match"] = auth_match
    record_workflow_event(
        event_name=WorkflowEventName.AUTHORITY_LOOKUP_COMPLETED,
        report_id=sanitized_req.report_id,
        step=WorkflowStep.AUTHORITY_LOOKUP,
        status="success" if auth_match.status == AuthorityMatchStatus.VERIFIED_MATCH else "warning",
        metadata={
            "authority_status": auth_match.status.value,
            "authority_id": auth_match.authority_id,
            "is_ambiguous": auth_match.status == AuthorityMatchStatus.AMBIGUOUS_MATCH,
        },
    )
    return state


def node_draft_complaint(state: CivicWorkflowGraphState) -> CivicWorkflowGraphState:
    """Node 5: Assembles factual complaint draft via swappable provider."""
    sanitized_req = state["sanitized_req"]
    cat_result = state["cat_result"]
    auth_match = state["auth_match"]
    provider = state.get("drafting_provider")
    assert sanitized_req is not None and cat_result is not None and auth_match is not None

    complaint_draft = build_complaint(
        report=sanitized_req,
        analysis=cat_result,
        authority_match=auth_match,
        provider=provider,
    )
    state["complaint_draft"] = complaint_draft

    state["traces"].append(
        WorkflowStepTrace(
            step=WorkflowStep.COMPLAINT_DRAFTING,
            success=True,
            details=f"Draft generated using {complaint_draft.generation_method}.",
        )
    )

    record_workflow_event(
        event_name=WorkflowEventName.DRAFT_GENERATION_COMPLETED,
        report_id=sanitized_req.report_id,
        step=WorkflowStep.COMPLAINT_DRAFTING,
        status="success",
        metadata={"generation_method": complaint_draft.generation_method},
    )
    return state


def node_assess_urgency_and_state(state: CivicWorkflowGraphState) -> CivicWorkflowGraphState:
    """Node 6: Assesses hazards, calculates urgency tier, and resolves terminal state."""
    sanitized_req = state["sanitized_req"]
    cat_result = state["cat_result"]
    missing_info = state["missing_info"]
    auth_match = state["auth_match"]
    complaint_draft = state["complaint_draft"]
    assert (
        sanitized_req is not None
        and cat_result is not None
        and missing_info is not None
        and auth_match is not None
        and complaint_draft is not None
    )

    urgency, is_hazard = _assess_urgency_and_hazard(
        description=sanitized_req.description,
        category=cat_result.suggested_category,
    )
    state["urgency"] = urgency
    state["is_hazard"] = is_hazard
    if is_hazard:
        state["all_warnings"].append("High urgency: Acute safety hazard or accident risk detected in report.")

    # State Resolution Decision
    final_state: WorkflowState
    if missing_info.has_missing_info:
        final_state = WorkflowState.NEEDS_MORE_INFO
    elif auth_match.status in (
        AuthorityMatchStatus.NO_VERIFIED_MATCH,
        AuthorityMatchStatus.AMBIGUOUS_MATCH,
        AuthorityMatchStatus.LOOKUP_ERROR,
    ):
        final_state = WorkflowState.NEEDS_AUTHORITY_REVIEW
    else:
        final_state = WorkflowState.DRAFT_READY
    state["final_state"] = final_state

    # Package AIAnalysisResponse
    execution_trace_strings = [
        f"[{t.step.value}] success={t.success}: {t.details}"
        for t in state["traces"]
    ]

    response_payload = AIAnalysisResponse(
        report_id=sanitized_req.report_id,
        original_category=sanitized_req.category,
        suggested_category=cat_result.suggested_category,
        confidence=cat_result.confidence,
        urgency=urgency,
        is_hazard=is_hazard,
        missing_fields=missing_info.missing_fields,
        clarification_questions=missing_info.clarification_questions,
        authority_match=auth_match,
        complaint_draft=complaint_draft,
        warnings=state["all_warnings"],
        requires_human_approval=True,  # Safety invariant
        visual_analysis=state.get("visual_results"),
        workflow_state=final_state,
        execution_trace=execution_trace_strings,
    )
    state["response"] = response_payload

    record_workflow_event(
        event_name=WorkflowEventName.WORKFLOW_COMPLETED,
        report_id=sanitized_req.report_id,
        status="success",
        metadata={"final_state": final_state.value},
    )
    return state


# ---------------------------------------------------------------------------
# Conditional Edge Routers
# ---------------------------------------------------------------------------

def edge_route_after_validation(state: CivicWorkflowGraphState) -> str:
    """Conditional Edge: Halts if validation fails; continues to classification if valid."""
    val_result = state.get("val_result")
    if val_result and val_result.is_valid:
        return "continue_to_classification"
    return "halt_invalid"


# ---------------------------------------------------------------------------
# Graph Runner (Zero-Dependency State Machine)
# ---------------------------------------------------------------------------

def analyze_report_graph(
    report: Union[AIAnalysisRequest, Dict[str, Any], Any],
    strict_categories: bool = False,
    drafting_provider: Optional[DraftingProvider] = None,
    authority_directory: Optional[List[AuthorityDirectoryRecord]] = None,
    vision_provider: Optional[Any] = None,
) -> WorkflowResult:
    """
    Executes the report analysis workflow through explicit graph state transitions.

    Pipeline Graph:
    [START] -> node_validate_input
                 | (edge_route_after_validation)
                 +---> [halt_invalid] -> [END] (State: INVALID_INPUT)
                 +---> [continue] -> node_suggest_category
                                       |
                                       v
                                     node_analyze_vision (optional)
                                       |
                                       v
                                     node_detect_missing_info
                                       |
                                       v
                                     node_lookup_authority
                                       |
                                       v
                                     node_draft_complaint
                                       |
                                       v
                                     node_assess_urgency_and_state -> [END]

    Guarantees 100% equivalence with the pure-Python orchestrator analyze_report().
    """
    # Extract report_id safely before validation for early event tracking
    raw_report_id: Optional[str] = None
    if isinstance(report, AIAnalysisRequest):
        raw_report_id = report.report_id
    elif isinstance(report, dict):
        raw_report_id = report.get("report_id")

    record_workflow_event(
        event_name=WorkflowEventName.WORKFLOW_STARTED,
        report_id=raw_report_id,
        status="success",
        metadata={"has_report_id": bool(raw_report_id), "engine": "graph_state_machine"},
    )

    state: CivicWorkflowGraphState = {
        "raw_report": report,
        "report_id": raw_report_id,
        "strict_categories": strict_categories,
        "drafting_provider": drafting_provider,
        "authority_directory": authority_directory,
        "vision_provider": vision_provider,
        "visual_results": None,
        "traces": [],
        "all_warnings": [],
        "errors": [],
    }

    try:
        # Step 1: Validation
        state = node_validate_input(state)
        decision = edge_route_after_validation(state)

        if decision == "halt_invalid":
            return WorkflowResult(
                workflow_state=WorkflowState.INVALID_INPUT,
                response=None,
                step_traces=state["traces"],
                errors=state["errors"],
                warnings=state["all_warnings"],
            )

        # Step 2: Categorization
        state = node_suggest_category(state)

        # Step 2b: Visual Evidence Analysis (Optional)
        state = node_analyze_vision(state)

        # Step 3: Missing Info
        state = node_detect_missing_info(state)

        # Step 4: Authority Lookup
        state = node_lookup_authority(state)

        # Step 5: Complaint Drafting
        state = node_draft_complaint(state)

        # Step 6: Urgency & Final State Packaging
        state = node_assess_urgency_and_state(state)

        return WorkflowResult(
            workflow_state=state["final_state"],
            response=state["response"],
            step_traces=state["traces"],
            errors=[],
            warnings=state["all_warnings"],
        )

    except Exception as exc:
        logger.exception(f"Unhandled exception in graph workflow: {exc}")
        record_workflow_event(
            event_name=WorkflowEventName.WORKFLOW_FAILED,
            report_id=state.get("report_id"),
            status="failed",
            error_code="UNHANDLED_GRAPH_EXCEPTION",
            metadata={"error_type": type(exc).__name__},
        )
        state["traces"].append(
            WorkflowStepTrace(
                step=WorkflowStep.VALIDATION,
                success=False,
                details=f"Graph workflow failed due to internal exception: {type(exc).__name__}: {str(exc)}",
            )
        )
        return WorkflowResult(
            workflow_state=WorkflowState.ANALYSIS_FAILED,
            response=None,
            step_traces=state["traces"],
            errors=[
                ValidationIssue(
                    field="workflow",
                    code="INTERNAL_GRAPH_FAILURE",
                    message=f"Internal graph failure: {type(exc).__name__}: {str(exc)}",
                )
            ],
            warnings=state["all_warnings"],
        )
