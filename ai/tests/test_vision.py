"""
ai/tests/test_vision.py

Comprehensive Unit and Integration Tests for Phase 10:
Optional Image-Understanding Extension.

Coverage:
1. MockVisionProvider:
   - Clear image category inference (Pothole, Garbage).
   - Blurry/dark/unclear photo handling (is_clear=False, UNKNOWN category, confidence=None).
   - Unsupported media types (PDF, MP4, etc.) gracefully handled.
   - Honest simulation disclosure invariant (is_simulated=True).
2. Fault Tolerance & Safety:
   - Provider exceptions caught safely without crashing the report workflow.
   - Fallback analysis generated with explicit error rationale.
3. Multimodal Conflict Handling:
   - Text vs image category discrepancies surfaced as warnings.
   - Citizen text statements preserved alongside machine visual observations.
   - Zero hallucination of physical dimensions (depth in cm, structural load metrics).
4. End-to-End Workflow & Graph Integration:
   - analyze_report() with and without vision_provider.
   - analyze_report_graph() equivalence with pure Python workflow.
   - Invariant: requires_human_approval remains strictly True.
"""

import pytest

from ai.classification import suggest_category
from ai.graph_workflow import analyze_report_graph
from ai.schemas import (
    AIAnalysisRequest,
    CivicCategory,
    EvidenceMetadata,
    LocationInput,
    WorkflowState,
    WorkflowStep,
)
from ai.vision import (
    MockVisionProvider,
    VisionProvider,
    analyze_evidence_attachments,
    detect_text_vision_conflict,
)
from ai.workflow import analyze_report


# ===========================================================================
# 1. MockVisionProvider Unit Tests
# ===========================================================================

class TestMockVisionProvider:
    """Verifies behavior of MockVisionProvider and its safety invariants."""

    def test_clear_pothole_image_analysis(self):
        """A clear JPEG image of a pothole yields POTHOLE category and observations."""
        provider = MockVisionProvider(
            simulated_category=CivicCategory.POTHOLE,
            simulated_observations=[
                "Surface depression visible on asphalt pavement",
                "Disrupted road surface with exposed aggregate",
            ],
            is_clear=True,
        )
        evidence = EvidenceMetadata(
            attachment_id="att-001",
            filename="pothole_crater.jpg",
            file_type="image/jpeg",
        )

        res = provider.analyze_image(evidence)

        assert res.attachment_id == "att-001"
        assert res.detected_category == CivicCategory.POTHOLE
        assert res.is_clear is True
        assert len(res.visual_observations) == 2
        assert res.confidence == 0.88
        # Safety: Must disclose simulation
        assert res.is_simulated is True
        assert "SIMULATION DISCLOSURE" in (res.notes or "")

    def test_clear_garbage_image_analysis(self):
        """A clear WebP image of waste accumulation yields GARBAGE."""
        provider = MockVisionProvider(
            simulated_category=CivicCategory.GARBAGE,
            simulated_observations=["Uncollected solid waste pile on sidewalk"],
            is_clear=True,
        )
        evidence = EvidenceMetadata(
            attachment_id="att-002",
            filename="waste_pile.webp",
            file_type="image/webp",
        )

        res = provider.analyze_image(evidence)

        assert res.detected_category == CivicCategory.GARBAGE
        assert res.is_clear is True
        assert res.is_simulated is True

    def test_blurry_or_dark_image_handling(self):
        """An unclear, dark, or out-of-focus image yields UNKNOWN category and no fabricated confidence."""
        provider = MockVisionProvider(
            is_clear=False,
            uncertainty_rationale="Image is severely out of focus and underexposed; subject indistinguishable.",
        )
        evidence = EvidenceMetadata(
            attachment_id="att-003",
            filename="night_blur.jpg",
            file_type="image/jpeg",
        )

        res = provider.analyze_image(evidence)

        assert res.is_clear is False
        assert res.detected_category == CivicCategory.UNKNOWN
        assert res.confidence is None
        assert res.visual_observations == []
        assert "out of focus" in (res.uncertainty_rationale or "")
        assert res.is_simulated is True

    def test_unsupported_media_type_handling(self):
        """Non-photographic or unsupported media types (e.g. PDF) are rejected safely."""
        provider = MockVisionProvider()
        evidence = EvidenceMetadata(
            attachment_id="att-004",
            filename="complaint_document.pdf",
            file_type="application/pdf",
        )

        res = provider.analyze_image(evidence)

        assert res.is_clear is False
        assert res.detected_category == CivicCategory.UNKNOWN
        assert res.confidence is None
        assert "Unsupported media type" in (res.uncertainty_rationale or "")
        assert res.is_simulated is True

    def test_zero_hallucination_of_depth_measurements(self):
        """
        Safety Invariant: Computer vision analysis from 2D monocular photos must NEVER
        fabricate exact physical depths (e.g. 'depth: 14cm') or structural load risk.
        """
        provider = MockVisionProvider(
            simulated_category=CivicCategory.POTHOLE,
            simulated_observations=[
                "Visible asphalt depression",
                "Dark contrast indicating depth variance",
            ],
            is_clear=True,
        )
        evidence = EvidenceMetadata(
            attachment_id="att-005",
            filename="road_cavity.png",
            file_type="image/png",
        )

        res = provider.analyze_image(evidence)

        # Confirm observations do not fabricate uncalibrated cm/inch depth measurements
        for obs in res.visual_observations:
            obs_lower = obs.lower()
            assert "depth:" not in obs_lower
            assert " cm" not in obs_lower
            assert " mm" not in obs_lower
            assert " inches" not in obs_lower


# ===========================================================================
# 2. Batch Analysis & Fault Tolerance Tests
# ===========================================================================

class TestAnalyzeEvidenceAttachments:
    """Verifies batch evidence analysis and error containment."""

    def test_empty_or_none_evidence_handling(self):
        """Returns empty list when no evidence is supplied or provider is None."""
        provider = MockVisionProvider()
        results, warnings = analyze_evidence_attachments(None, provider)
        assert results == []
        assert warnings == []

        results2, warnings2 = analyze_evidence_attachments([], provider)
        assert results2 == []
        assert warnings2 == []

        evidence = [EvidenceMetadata(attachment_id="att-1", filename="f.jpg", file_type="image/jpeg")]
        results3, warnings3 = analyze_evidence_attachments(evidence, None)
        assert results3 == []
        assert warnings3 == []

    def test_batch_attachments_processing(self):
        """Processes multiple attachments of mixed quality."""
        provider = MockVisionProvider(
            simulated_category=CivicCategory.POTHOLE,
            is_clear=True,
        )
        attachments = [
            EvidenceMetadata(attachment_id="att-1", filename="pothole1.jpg", file_type="image/jpeg"),
            EvidenceMetadata(attachment_id="att-2", filename="doc.pdf", file_type="application/pdf"),
        ]

        results, warnings = analyze_evidence_attachments(attachments, provider)

        assert len(results) == 2
        assert results[0].detected_category == CivicCategory.POTHOLE
        assert results[0].is_clear is True
        assert results[1].detected_category == CivicCategory.UNKNOWN
        assert results[1].is_clear is False
        assert any("Unsupported media type" in w for w in warnings)

    def test_provider_exception_safe_containment(self):
        """When provider raises an unexpected runtime error, analysis contains it safely."""
        failing_provider = MockVisionProvider(should_fail=True)
        attachments = [
            EvidenceMetadata(attachment_id="att-err", filename="photo.jpg", file_type="image/jpeg"),
        ]

        results, warnings = analyze_evidence_attachments(attachments, failing_provider)

        assert len(results) == 1
        assert results[0].detected_category == CivicCategory.UNKNOWN
        assert results[0].is_clear is False
        assert results[0].model_provider == "fallback_error_handler"
        assert any("provider failure" in w for w in warnings)


# ===========================================================================
# 3. Multimodal Discrepancy & Conflict Detection Tests
# ===========================================================================

class TestMultimodalConflictDetection:
    """Verifies conflict detection when citizen text contradicts vision analysis."""

    def test_concordant_text_and_vision(self):
        """When text and image agree on POTHOLE, no conflict is detected."""
        provider = MockVisionProvider(simulated_category=CivicCategory.POTHOLE, is_clear=True)
        evidence = EvidenceMetadata(attachment_id="att-1", filename="pothole.jpg", file_type="image/jpeg")
        res = provider.analyze_image(evidence)

        has_conflict, rationale = detect_text_vision_conflict(
            text_category=CivicCategory.POTHOLE,
            visual_results=[res],
        )

        assert has_conflict is False
        assert rationale is None

    def test_conflicting_text_and_vision_generates_warning(self):
        """
        Discrepancy: Report text says broken streetlight, but attached photo clearly shows a pothole.
        Both categories must be preserved and a discrepancy warning generated.
        """
        provider = MockVisionProvider(simulated_category=CivicCategory.POTHOLE, is_clear=True)
        evidence = EvidenceMetadata(attachment_id="att-2", filename="street.jpg", file_type="image/jpeg")
        res = provider.analyze_image(evidence)

        has_conflict, rationale = detect_text_vision_conflict(
            text_category=CivicCategory.STREET_LIGHTING,
            visual_results=[res],
        )

        assert has_conflict is True
        assert rationale is not None
        assert "Multimodal discrepancy detected" in rationale
        assert "Street Lighting" in rationale
        assert "Pothole" in rationale
        assert "att-2" in rationale

    def test_unclear_or_unknown_vision_does_not_trigger_false_conflict(self):
        """If image is blurry/UNKNOWN, it should not trigger a false discrepancy warning."""
        provider = MockVisionProvider(is_clear=False)
        evidence = EvidenceMetadata(attachment_id="att-3", filename="blurry.jpg", file_type="image/jpeg")
        res = provider.analyze_image(evidence)

        has_conflict, rationale = detect_text_vision_conflict(
            text_category=CivicCategory.POTHOLE,
            visual_results=[res],
        )

        assert has_conflict is False
        assert rationale is None


# ===========================================================================
# 4. End-to-End Workflow Integration with Vision Tests
# ===========================================================================

class TestWorkflowVisionIntegration:
    """Verifies analyze_report() and analyze_report_graph() with optional vision."""

    def test_workflow_without_vision_provider_is_unaffected(self):
        """Baseline check: Without vision_provider, workflow behaves identically to Phase 9."""
        payload = {
            "report_id": "V-001",
            "description": "Deep pothole damaging vehicles on road.",
            "location": {"city": "Bengaluru", "ward_or_zone": "South Zone", "raw_address": "Main Ring Road South Zone"},
            "evidence_metadata": [
                {"attachment_id": "att-1", "filename": "pic.jpg", "file_type": "image/jpeg"}
            ],
        }

        res = analyze_report(payload, vision_provider=None)

        assert res.workflow_state == WorkflowState.DRAFT_READY
        assert res.response is not None
        assert res.response.visual_analysis is None
        # Confirms non-vision evidence disclaimer in draft
        assert "1 media attachment(s)" in res.response.complaint_draft.formal_body
        assert "content is unverified by automated systems" in res.response.complaint_draft.formal_body
        assert res.response.requires_human_approval is True

    def test_workflow_with_clear_vision_provider(self):
        """Workflow with vision_provider analyzes attachments and records visual results."""
        provider = MockVisionProvider(
            simulated_category=CivicCategory.POTHOLE,
            simulated_observations=["Asphalt crater approximately 1 meter across"],
            is_clear=True,
        )
        payload = {
            "report_id": "V-002",
            "description": "Dangerous pothole crater in South Zone near junction.",
            "location": {"city": "Bengaluru", "ward_or_zone": "South Zone", "raw_address": "Main Ring Road South Zone"},
            "evidence_metadata": [
                {"attachment_id": "att-photo", "filename": "crater.jpg", "file_type": "image/jpeg"}
            ],
        }

        res = analyze_report(payload, vision_provider=provider)

        assert res.workflow_state == WorkflowState.DRAFT_READY
        assert res.response is not None
        assert res.response.visual_analysis is not None
        assert len(res.response.visual_analysis) == 1
        vis = res.response.visual_analysis[0]
        assert vis.attachment_id == "att-photo"
        assert vis.detected_category == CivicCategory.POTHOLE
        assert vis.is_clear is True
        assert vis.is_simulated is True
        # Check step trace
        steps = [t.step for t in res.step_traces]
        assert WorkflowStep.VISION_ANALYSIS in steps
        assert res.response.requires_human_approval is True

    def test_workflow_surfaces_text_vision_discrepancy_warning(self):
        """Workflow records a multimodal discrepancy warning when text and image conflict."""
        # Provider sees GARBAGE, but text is strictly POTHOLE
        provider = MockVisionProvider(
            simulated_category=CivicCategory.GARBAGE,
            simulated_observations=["Overflowing waste dumpster and loose debris"],
            is_clear=True,
        )
        payload = {
            "report_id": "V-003",
            "description": "Deep asphalt pothole damaging car suspensions.",
            "location": {"city": "Bengaluru", "ward_or_zone": "South Zone", "raw_address": "Main Ring Road South Zone"},
            "evidence_metadata": [
                {"attachment_id": "att-conflict", "filename": "evidence.jpg", "file_type": "image/jpeg"}
            ],
        }

        res = analyze_report(payload, vision_provider=provider)

        assert res.response is not None
        assert res.response.suggested_category == CivicCategory.POTHOLE
        assert res.response.visual_analysis is not None
        assert res.response.visual_analysis[0].detected_category == CivicCategory.GARBAGE
        # Discrepancy warning must be present
        assert any("Multimodal discrepancy detected" in w for w in res.warnings)
        assert any("Pothole" in w and "Garbage" in w for w in res.warnings)

    def test_graph_workflow_vision_equivalence(self):
        """Verifies analyze_report_graph produces identical vision outcomes to analyze_report."""
        provider = MockVisionProvider(
            simulated_category=CivicCategory.POTHOLE,
            simulated_observations=["Surface void in asphalt"],
            is_clear=True,
        )
        payload = {
            "report_id": "V-004",
            "description": "Deep pothole crater in road.",
            "location": {"city": "Bengaluru", "ward_or_zone": "South Zone", "raw_address": "Main Ring Road South Zone"},
            "evidence_metadata": [
                {"attachment_id": "att-eq", "filename": "road.jpg", "file_type": "image/jpeg"}
            ],
        }

        pure_res = analyze_report(payload, vision_provider=provider)
        graph_res = analyze_report_graph(payload, vision_provider=provider)

        assert pure_res.workflow_state == graph_res.workflow_state == WorkflowState.DRAFT_READY
        assert pure_res.response is not None and graph_res.response is not None
        assert pure_res.response.suggested_category == graph_res.response.suggested_category
        assert pure_res.response.visual_analysis is not None and graph_res.response.visual_analysis is not None
        assert len(pure_res.response.visual_analysis) == len(graph_res.response.visual_analysis)
        assert (
            pure_res.response.visual_analysis[0].detected_category
            == graph_res.response.visual_analysis[0].detected_category
        )
        assert pure_res.response.requires_human_approval == graph_res.response.requires_human_approval is True
