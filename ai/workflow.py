"""
ai/workflow.py

End-to-end Python workflow orchestrator for CivicFix AI.

Technical & Reliability Principles:
-----------------------------------
1. Deterministic Multi-Step Pipeline:
   - Coordinates: Input Validation -> Category Suggestion -> Missing-Info Detection
     -> Verified Authority Lookup -> Structured Complaint Drafting.
   - Built with ordinary, testable Python functions (no LangGraph or LLM agent dependency).
2. Predictable State Machine:
   - Evaluates input quality at each stage and stops or alters flow predictably.
   - States:
     * INVALID_INPUT: Structural validation failed (empty text, out-of-bounds coords). Stopped.
     * NEEDS_MORE_INFO: Analyzable report, but missing location or specific facts.
     * NEEDS_AUTHORITY_REVIEW: Analysis complete and draft ready, but authority is unverified or ambiguous.
     * DRAFT_READY: Analysis complete, authority verified, draft ready for citizen review.
     * ANALYSIS_FAILED: Unexpected internal error encountered.
3. Zero Submission Invariant:
   - Prepares analysis and drafts for citizen review ONLY.
   - Never submits complaints or bypasses citizen confirmation (requires_human_approval=True).
4. Auditable Step Tracing:
   - Records execution steps and rationale in step_traces without logging sensitive personal data.
"""

import logging
from typing import Any, Dict, List, Optional, Union

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
    UrgencyLevel,
    ValidationIssue,
    ValidationStatus,
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

logger = logging.getLogger(__name__)

# Keywords that indicate acute bodily hazard or urgent public danger
ACUTE_HAZARD_KEYWORDS: List[str] = [
    "accident",
    "accidents",
    "live wire",
    "electric wire",
    "exposed wire",
    "open manhole",
    "manhole open",
    "injury",
    "injured",
    "collapse",
    "cave in",
    "skid",
    "skidded",
    "slipped",
    "fire",
    "flood",
    "gushing water",
]


def _assess_urgency_and_hazard(
    description: str,
    category: CivicCategory,
) -> tuple[UrgencyLevel, bool]:
    """
    Evaluates report urgency level and acute public hazard flag based on factual keywords.
    """
    desc_lower = description.lower()
    is_hazard = False
    urgency = UrgencyLevel.MEDIUM

    # Check for direct acute hazard keywords
    for kw in ACUTE_HAZARD_KEYWORDS:
        if kw in desc_lower:
            is_hazard = True
            break

    # Certain categories intrinsically carry elevated urgency
    if category == CivicCategory.ROAD_HAZARD:
        is_hazard = True
        urgency = UrgencyLevel.HIGH
    elif category == CivicCategory.DRAINAGE_SEWAGE:
        urgency = UrgencyLevel.HIGH if is_hazard else UrgencyLevel.MEDIUM
    elif category == CivicCategory.POTHOLE and is_hazard:
        urgency = UrgencyLevel.HIGH
    elif category == CivicCategory.WATER_LEAKAGE and is_hazard:
        urgency = UrgencyLevel.HIGH

    if is_hazard and ("live wire" in desc_lower or "collapse" in desc_lower):
        urgency = UrgencyLevel.CRITICAL

    return urgency, is_hazard


def analyze_report(
    report: Union[AIAnalysisRequest, Dict[str, Any], Any],
    strict_categories: bool = False,
    drafting_provider: Optional[DraftingProvider] = None,
    authority_directory: Optional[List[AuthorityDirectoryRecord]] = None,
    vision_provider: Optional[VisionProvider] = None,
) -> WorkflowResult:
    """
    Executes the complete CivicFix AI analysis workflow on an incoming report.

    Pipeline Steps:
    1. Input Validation: Inspects structural integrity and character bounds.
       Stops safely if input is INVALID.
    2. Category Suggestion: Deterministically classifies the issue category.
       Identifies citizen category conflicts.
    2b. Visual Evidence Analysis (Optional): Analyzes uploaded image attachments
        if a vision provider is configured. Surfaces multimodal discrepancies.
    3. Missing-Information Detection: Identifies missing geographic/description details.
    4. Authority Directory Lookup: Searches verified authority directory.
       Gated by location sufficiency; preserves ambiguity when multiple bodies overlap.
    5. Complaint Drafting: Formulates factual draft with non-vision evidence disclaimers.
    6. State Resolution: Sets workflow state and packages AIAnalysisResponse.

    Args:
        report: Input report payload as dictionary or AIAnalysisRequest.
        strict_categories: If True, unsupported category triggers validation error.
        drafting_provider: Swappable DraftingProvider (defaults to deterministic template).
        authority_directory: Controlled authority directory (defaults to DEMONSTRATION_AUTHORITY_DIRECTORY).
        vision_provider: Optional VisionProvider for inspecting attached photographic evidence.

    Returns:
        WorkflowResult containing final workflow_state, AIAnalysisResponse, step_traces, and errors.
    """
    traces: List[WorkflowStepTrace] = []
    all_warnings: List[str] = []

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
        metadata={"has_report_id": bool(raw_report_id)},
    )

    try:
        # -------------------------------------------------------------------
        # Step 1: Input Validation
        # -------------------------------------------------------------------
        val_result = validate_report(report, strict_categories=strict_categories)

        if not val_result.is_valid:
            traces.append(
                WorkflowStepTrace(
                    step=WorkflowStep.VALIDATION,
                    success=False,
                    details=f"Validation rejected input with {len(val_result.errors)} error(s).",
                )
            )
            record_workflow_event(
                event_name=WorkflowEventName.VALIDATION_COMPLETED,
                report_id=raw_report_id,
                step=WorkflowStep.VALIDATION,
                status="failed",
                error_code="VALIDATION_FAILED",
                metadata={"error_count": len(val_result.errors)},
            )
            record_workflow_event(
                event_name=WorkflowEventName.WORKFLOW_FAILED,
                report_id=raw_report_id,
                status="failed",
                error_code="VALIDATION_FAILED",
                metadata={"error_count": len(val_result.errors)},
            )
            return WorkflowResult(
                workflow_state=WorkflowState.INVALID_INPUT,
                response=None,
                step_traces=traces,
                errors=val_result.errors,
                warnings=[w.message for w in val_result.warnings],
            )

        traces.append(
            WorkflowStepTrace(
                step=WorkflowStep.VALIDATION,
                success=True,
                details=f"Input validated successfully (status: {val_result.status.value}).",
            )
        )
        if val_result.warnings:
            all_warnings.extend(w.message for w in val_result.warnings)

        sanitized_req: AIAnalysisRequest = val_result.sanitized_report  # type: ignore

        record_workflow_event(
            event_name=WorkflowEventName.VALIDATION_COMPLETED,
            report_id=sanitized_req.report_id,
            step=WorkflowStep.VALIDATION,
            status="success",
            metadata={"validation_status": val_result.status.value},
        )

        # -------------------------------------------------------------------
        # Step 2: Issue Categorization
        # -------------------------------------------------------------------
        cat_result: CategorySuggestionResult = suggest_category(sanitized_req)
        traces.append(
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
            all_warnings.append(cat_result.conflict_rationale)

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

        # -------------------------------------------------------------------
        # Step 2b: Optional Visual Evidence Analysis
        # -------------------------------------------------------------------
        visual_analysis_results: Optional[List[VisionAnalysisResult]] = None
        if vision_provider is not None and sanitized_req.evidence_metadata:
            vis_results, vis_warnings = analyze_evidence_attachments(
                evidence_list=sanitized_req.evidence_metadata,
                provider=vision_provider,
            )
            visual_analysis_results = vis_results
            if vis_warnings:
                all_warnings.extend(vis_warnings)

            has_vis_conflict, vis_conflict_rationale = detect_text_vision_conflict(
                text_category=cat_result.suggested_category,
                visual_results=vis_results,
            )
            if has_vis_conflict and vis_conflict_rationale:
                all_warnings.append(vis_conflict_rationale)

            traces.append(
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

        # -------------------------------------------------------------------
        # Step 3: Missing-Information Detection
        # -------------------------------------------------------------------
        missing_info: MissingInfoResult = (
            val_result.missing_info
            if val_result.missing_info is not None
            else detect_missing_information(sanitized_req)
        )
        traces.append(
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

        # -------------------------------------------------------------------
        # Step 4: Verified Authority Directory Lookup
        # -------------------------------------------------------------------
        auth_match: AuthorityMatchResult
        if not missing_info.is_location_complete:
            # Location is insufficient for authority matching; do not guess!
            auth_match = lookup_authority(
                category=cat_result.suggested_category,
                location=sanitized_req.location,
                directory=authority_directory,
            )
            traces.append(
                WorkflowStepTrace(
                    step=WorkflowStep.AUTHORITY_LOOKUP,
                    success=False,
                    details="Authority lookup gated: insufficient location details in report.",
                )
            )
            if auth_match.notes:
                all_warnings.append(auth_match.notes)
        else:
            auth_match = lookup_authority(
                category=cat_result.suggested_category,
                location=sanitized_req.location,
                directory=authority_directory,
            )
            if auth_match.status == AuthorityMatchStatus.VERIFIED_MATCH:
                traces.append(
                    WorkflowStepTrace(
                        step=WorkflowStep.AUTHORITY_LOOKUP,
                        success=True,
                        details=f"Verified match: {auth_match.authority_name} ({auth_match.department}).",
                    )
                )
            elif auth_match.status == AuthorityMatchStatus.AMBIGUOUS_MATCH:
                traces.append(
                    WorkflowStepTrace(
                        step=WorkflowStep.AUTHORITY_LOOKUP,
                        success=False,
                        details=f"Ambiguous match across {len(auth_match.plausible_alternatives)} authorities.",
                    )
                )
                if auth_match.notes:
                    all_warnings.append(auth_match.notes)
            else:
                traces.append(
                    WorkflowStepTrace(
                        step=WorkflowStep.AUTHORITY_LOOKUP,
                        success=False,
                        details=f"No verified authority matched: {auth_match.notes}",
                    )
                )
                if auth_match.notes:
                    all_warnings.append(auth_match.notes)

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

        # -------------------------------------------------------------------
        # Step 5: Structured Complaint Drafting
        # -------------------------------------------------------------------
        complaint_draft: ComplaintDraft = build_complaint(
            report=sanitized_req,
            analysis=cat_result,
            authority_match=auth_match,
            provider=drafting_provider,
        )
        traces.append(
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

        # -------------------------------------------------------------------
        # Step 6: Urgency & Hazard Evaluation
        # -------------------------------------------------------------------
        urgency, is_hazard = _assess_urgency_and_hazard(
            description=sanitized_req.description,
            category=cat_result.suggested_category,
        )
        if is_hazard:
            all_warnings.append("High urgency: Acute safety hazard or accident risk detected in report.")

        # -------------------------------------------------------------------
        # Step 7: Resolve Final Workflow State
        # -------------------------------------------------------------------
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

        # -------------------------------------------------------------------
        # Step 8: Package Standard AIAnalysisResponse
        # -------------------------------------------------------------------
        execution_trace_strings = [
            f"[{t.step.value}] success={t.success}: {t.details}"
            for t in traces
        ]

        response_payload = AIAnalysisResponse(
            report_id=sanitized_req.report_id,
            original_category=sanitized_req.category,
            suggested_category=cat_result.suggested_category,
            confidence=cat_result.confidence,  # None
            urgency=urgency,
            is_hazard=is_hazard,
            missing_fields=missing_info.missing_fields,
            clarification_questions=missing_info.clarification_questions,
            authority_match=auth_match,
            complaint_draft=complaint_draft,
            warnings=all_warnings,
            requires_human_approval=True,  # Safety invariant!
            visual_analysis=visual_analysis_results,
            workflow_state=final_state,
            execution_trace=execution_trace_strings,
        )

        record_workflow_event(
            event_name=WorkflowEventName.WORKFLOW_COMPLETED,
            report_id=sanitized_req.report_id,
            status="success",
            metadata={"final_state": final_state.value},
        )

        return WorkflowResult(
            workflow_state=final_state,
            response=response_payload,
            step_traces=traces,
            errors=[],
            warnings=all_warnings,
        )

    except Exception as exc:
        logger.exception(f"Unhandled exception during AI report analysis: {exc}")
        record_workflow_event(
            event_name=WorkflowEventName.WORKFLOW_FAILED,
            report_id=raw_report_id,
            status="failed",
            error_code="UNHANDLED_EXCEPTION",
            metadata={"error_type": type(exc).__name__},
        )
        traces.append(
            WorkflowStepTrace(
                step=WorkflowStep.VALIDATION,
                success=False,
                details=f"Workflow failed due to internal exception: {type(exc).__name__}: {str(exc)}",
            )
        )
        return WorkflowResult(
            workflow_state=WorkflowState.ANALYSIS_FAILED,
            response=None,
            step_traces=traces,
            errors=[
                ValidationIssue(
                    field="workflow",
                    code="INTERNAL_WORKFLOW_FAILURE",
                    message=f"Internal analysis failure: {type(exc).__name__}: {str(exc)}",
                )
            ],
            warnings=all_warnings,
        )
