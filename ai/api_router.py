"""
ai/api_router.py

FastAPI HTTP Adapter for CivicFix AI Analysis Module.

Provides a clean, modular router that the FastAPI backend developer can mount
directly into the main application:

    from fastapi import FastAPI
    from ai.api_router import ai_router

    app = FastAPI(title="CivicFix AI Backend")
    app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Analysis"])

Boundaries & Responsibilities:
------------------------------
- Input Validation: Handles AIAnalysisRequest parsing and sanitization.
- Stateless Analysis: Executes synchronously and returns AIAnalysisResponse.
- Zero Database Writes: Does not touch PostgreSQL or bypass backend auth.
- No External Submissions: Prepares draft complaints for citizen confirmation only.
- Error Containment: Maps workflow outcomes to appropriate HTTP status codes.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

from ai.authority_lookup import DEMONSTRATION_AUTHORITY_DIRECTORY
from ai.graph_workflow import analyze_report_graph
from ai.schemas import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AuthorityDirectoryRecord,
    ValidationIssue,
    WorkflowResult,
    WorkflowState,
)
from ai.vision import MockVisionProvider
from ai.workflow import analyze_report

logger = logging.getLogger("civicfix_ai.api")

ai_router = APIRouter()


@ai_router.get(
    "/health",
    summary="AI Module Health Check",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
)
def get_ai_health() -> Dict[str, Any]:
    """Returns AI module runtime status, version, and directory fixture count."""
    return {
        "status": "healthy",
        "module": "civicfix-ai-engine",
        "version": "0.1.0",
        "active_directory_records": len(DEMONSTRATION_AUTHORITY_DIRECTORY),
        "human_approval_required": True,
    }


@ai_router.get(
    "/authorities",
    summary="List Demonstration Authority Records",
    response_model=List[AuthorityDirectoryRecord],
    status_code=status.HTTP_200_OK,
)
def list_demonstration_authorities() -> List[AuthorityDirectoryRecord]:
    """
    Returns the demonstration civic authorities fixture currently configured.
    Enables frontend and backend developers to inspect supported cities and jurisdictions.
    """
    return DEMONSTRATION_AUTHORITY_DIRECTORY


@ai_router.post(
    "/analyze-report",
    summary="Analyze Citizen Report",
    response_model=AIAnalysisResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {
            "description": "Report analyzed successfully (Draft Ready, Needs More Info, or Needs Authority Review).",
            "model": AIAnalysisResponse,
        },
        422: {
            "description": "Report validation failed (structural error, empty text, or constraint violation).",
        },
        500: {
            "description": "Internal AI analysis engine failure.",
        },
    },
)
def analyze_civic_report(
    request_payload: AIAnalysisRequest,
    use_graph_engine: bool = Query(
        default=False,
        description="If True, executes via the Graph State Machine (analyze_report_graph); otherwise uses standard orchestrator.",
    ),
    strict_categories: bool = Query(
        default=False,
        description="If True, unlisted citizen categories trigger a validation error; if False, classified automatically.",
    ),
    enable_vision_analysis: bool = Query(
        default=False,
        description="If True and evidence_metadata is attached, inspects images using simulated vision provider.",
    ),
) -> Any:
    """
    Main intake endpoint for citizen civic issue reports.

    Execution Pipeline:
    1. Input Validation & Prompt Injection Defense.
    2. Deterministic Category Suggestion & Conflict Detection.
    2b. Visual Evidence Analysis (Optional, gated by enable_vision_analysis).
    3. Missing Information & Location Completeness Detection.
    4. Verified Civic Authority Lookup (Gated by location sufficiency).
    5. Factual Complaint Draft Synthesis with Fallback Protection.
    6. Terminal State Resolution & Non-PII Event Logging.

    Returns:
        AIAnalysisResponse containing structured draft, missing fields, authority match,
        and advisory warnings. Always requires citizen confirmation (`requires_human_approval = True`).
    """
    try:
        vision_prov = MockVisionProvider() if enable_vision_analysis else None

        # Select execution engine (Both are 100% equivalent)
        if use_graph_engine:
            result: WorkflowResult = analyze_report_graph(
                report=request_payload,
                strict_categories=strict_categories,
                vision_provider=vision_prov,
            )
        else:
            result: WorkflowResult = analyze_report(
                report=request_payload,
                strict_categories=strict_categories,
                vision_provider=vision_prov,
            )

        # Handle terminal state mappings to HTTP status codes
        if result.workflow_state == WorkflowState.INVALID_INPUT:
            error_details = [err.model_dump() for err in result.errors]
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "detail": "Report validation failed: input violates structural constraints or safety bounds.",
                    "workflow_state": result.workflow_state.value,
                    "errors": error_details,
                    "warnings": result.warnings,
                },
            )

        if result.workflow_state == WorkflowState.ANALYSIS_FAILED:
            error_details = [err.model_dump() for err in result.errors]
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "Internal AI analysis failure occurred.",
                    "workflow_state": result.workflow_state.value,
                    "errors": error_details,
                    "warnings": result.warnings,
                },
            )

        # Successful analysis (DRAFT_READY, NEEDS_MORE_INFO, or NEEDS_AUTHORITY_REVIEW)
        if result.response is not None:
            return result.response

        # Fallback safeguard
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected state: workflow completed without response payload.",
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Unhandled HTTP router exception in analyze_report: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": f"Internal server error: {type(exc).__name__}: {str(exc)}",
                "workflow_state": "analysis_failed",
            },
        )
