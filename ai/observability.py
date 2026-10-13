"""
ai/observability.py

Workflow observability, privacy-preserving event logging, and backend callback integration.

Principles:
1. Auditable Life-Cycle Events:
   - Tracks: Workflow Started -> Validation Completed -> Missing Info Identified
     -> Category Suggestion Completed -> Authority Lookup Completed -> Draft Completed
     -> Workflow Completed / Failed.
2. Privacy Preservation:
   - Diagnostic metadata is scrubbed using sanitize_log_metadata().
   - Raw citizen descriptions, names, phone numbers, or emails are NEVER logged.
3. Decoupled Backend Integration:
   - Provides a callback registry (`register_event_observer`) allowing the backend lead
     to wire events directly into their `agent_runs` table or audit database without
     requiring database schema mutations in this AI module.
4. Testable In-Memory Event Buffer:
   - Retains recent events for test assertions and diagnostics.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Callable, Dict, List, Optional

from ai.schemas import WorkflowEvent, WorkflowEventName, WorkflowStep
from ai.security import sanitize_log_metadata

logger = logging.getLogger("civicfix_ai.observability")

# Callback type for backend observer (e.g. agent_runs integration)
ObserverCallback = Callable[[WorkflowEvent], None]

_OBSERVERS: List[ObserverCallback] = []
_IN_MEMORY_EVENT_LOG: List[WorkflowEvent] = []


def register_event_observer(callback: ObserverCallback) -> None:
    """
    Registers a callback function to receive workflow events.
    Enables the FastAPI backend lead to bridge AI workflow events to the
    PostgreSQL `agent_runs` table without direct coupling.
    """
    if callback not in _OBSERVERS:
        _OBSERVERS.append(callback)


def unregister_event_observer(callback: ObserverCallback) -> None:
    """Removes a previously registered callback."""
    if callback in _OBSERVERS:
        _OBSERVERS.remove(callback)


def clear_event_log() -> None:
    """Clears the in-memory event buffer (useful between tests)."""
    global _IN_MEMORY_EVENT_LOG
    _IN_MEMORY_EVENT_LOG.clear()


def get_recorded_events(report_id: Optional[str] = None) -> List[WorkflowEvent]:
    """Returns a list of recorded events, optionally filtered by report_id."""
    if report_id is None:
        return list(_IN_MEMORY_EVENT_LOG)
    return [e for e in _IN_MEMORY_EVENT_LOG if e.report_id == report_id]


def record_workflow_event(
    event_name: WorkflowEventName,
    report_id: Optional[str] = None,
    step: Optional[WorkflowStep] = None,
    status: str = "success",
    error_code: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> WorkflowEvent:
    """
    Records an observable workflow event with non-PII diagnostic metadata.

    Args:
        event_name: Standard WorkflowEventName enum.
        report_id: Unique report ID if available.
        step: Associated WorkflowStep stage.
        status: 'success', 'warning', or 'failed'.
        error_code: Machine-readable error code if failed.
        metadata: Optional dictionary with diagnostic context (automatically scrubbed).

    Returns:
        The validated WorkflowEvent instance.
    """
    clean_meta = sanitize_log_metadata(metadata or {})
    timestamp_str = datetime.now(timezone.utc).isoformat()

    event = WorkflowEvent(
        event_name=event_name,
        report_id=report_id,
        timestamp=timestamp_str,
        step=step,
        status=status,
        error_code=error_code,
        metadata=clean_meta,
    )

    # In-memory buffer
    _IN_MEMORY_EVENT_LOG.append(event)

    # Standard safe logger (No PII)
    log_msg = (
        f"[WORKFLOW_EVENT] name={event.event_name.value} "
        f"report_id={event.report_id or 'none'} "
        f"step={event.step.value if event.step else 'none'} "
        f"status={event.status} error_code={event.error_code or 'none'} "
        f"meta={clean_meta}"
    )
    if status == "failed":
        logger.error(log_msg)
    elif status == "warning":
        logger.warning(log_msg)
    else:
        logger.info(log_msg)

    # Notify backend observers
    for observer in _OBSERVERS:
        try:
            observer(event)
        except Exception as exc:
            logger.exception(f"Observer callback failed during event {event.event_name.value}: {exc}")

    return event
