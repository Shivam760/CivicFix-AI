"""
CivicFix AI — Agentic AI Module.

Provides AI-assisted analysis for civic-issue reporting:
- Input validation and prompt injection defenses
- Category suggestion and missing-information detection
- Verified civic authority directory lookup
- Structured complaint drafting
- Human-in-the-loop workflow orchestration
"""

from ai.authority_lookup import DEMONSTRATION_AUTHORITY_DIRECTORY, lookup_authority
from ai.classification import suggest_category
from ai.complaint_builder import (
    DeterministicTemplateDraftingProvider,
    DraftingProvider,
    MissingCredentialsError,
    ModelConnectionError,
    ModelError,
    ModelMalformedOutputError,
    ModelMissingFieldError,
    ModelRateLimitError,
    ModelTimeoutError,
    ModelUnexpectedTypeError,
    MockLLMDraftingProvider,
    build_complaint,
    validate_model_draft_output,
)
from ai.observability import (
    clear_event_log,
    get_recorded_events,
    record_workflow_event,
    register_event_observer,
    unregister_event_observer,
)
from ai.security import (
    detect_prompt_injection,
    format_safe_llm_prompt,
    mask_pii,
    sanitize_log_metadata,
)
from ai.api_router import ai_router
from ai.graph_workflow import CivicWorkflowGraphState, analyze_report_graph
from ai.schemas import VisionAnalysisResult
from ai.validation import detect_missing_information, validate_report
from ai.vision import (
    SUPPORTED_IMAGE_MIMES,
    MockVisionProvider,
    VisionProvider,
    analyze_evidence_attachments,
    detect_text_vision_conflict,
)
from ai.evaluation import (
    STANDARD_EVALUATION_SCENARIOS,
    EvaluationScenario,
    generate_markdown_evaluation_report,
    run_evaluation_suite,
)
from ai.workflow import analyze_report

__version__ = "0.1.0"

__all__ = [
    "validate_report",
    "detect_missing_information",
    "suggest_category",
    "lookup_authority",
    "DEMONSTRATION_AUTHORITY_DIRECTORY",
    "build_complaint",
    "DraftingProvider",
    "DeterministicTemplateDraftingProvider",
    "MockLLMDraftingProvider",
    "analyze_report",
    "analyze_report_graph",
    "CivicWorkflowGraphState",
    "ai_router",
    "detect_prompt_injection",
    "format_safe_llm_prompt",
    "mask_pii",
    "sanitize_log_metadata",
    "record_workflow_event",
    "register_event_observer",
    "unregister_event_observer",
    "get_recorded_events",
    "clear_event_log",
    "ModelError",
    "ModelTimeoutError",
    "ModelConnectionError",
    "ModelRateLimitError",
    "MissingCredentialsError",
    "ModelMalformedOutputError",
    "ModelMissingFieldError",
    "ModelUnexpectedTypeError",
    "validate_model_draft_output",
    "VisionProvider",
    "MockVisionProvider",
    "analyze_evidence_attachments",
    "detect_text_vision_conflict",
    "VisionAnalysisResult",
    "SUPPORTED_IMAGE_MIMES",
    "EvaluationScenario",
    "STANDARD_EVALUATION_SCENARIOS",
    "run_evaluation_suite",
    "generate_markdown_evaluation_report",
]
