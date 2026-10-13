"""
ai/vision.py

Optional Image-Understanding Extension for CivicFix AI.

Technical & Safety Principles:
-------------------------------
1. Metadata Is Not Proof:
   - File metadata (filename, URL, MIME type) is NEVER treated as proof of image content.
2. Separation of Visual Observations from Citizen Claims:
   - Visual claims are strictly segregated from citizen statements.
   - AI visual features are labeled as machine observations, not confirmed ground truth.
3. Zero Hallucination of Physical Measurements:
   - Never estimates pothole depth (e.g., 'depth: 12cm') or structural engineering metrics
     from uncalibrated 2D monocular photographs.
4. Honest Uncertainty & Blurry/Irrelevant Handling:
   - Low quality, blurry, dark, or out-of-scope images produce explicit uncertainty results
     (`is_clear = False`) rather than fabricated predictions.
5. Multimodal Disagreement Preservation:
   - When text description and visual features disagree (e.g. text says 'broken streetlight'
     while image shows a pothole), the disagreement is surfaced for citizen/admin review
     rather than silently overriding either source.
6. Honest Simulation Disclosure:
   - `is_simulated = True` is explicitly recorded on all mock adapter outputs.
"""

import logging
from typing import Any, Dict, List, Optional, Protocol, Tuple, runtime_checkable

from ai.schemas import CivicCategory, EvidenceMetadata, VisionAnalysisResult

logger = logging.getLogger("civicfix_ai.vision")

SUPPORTED_IMAGE_MIMES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}


# ---------------------------------------------------------------------------
# Vision Provider Protocol
# ---------------------------------------------------------------------------

@runtime_checkable
class VisionProvider(Protocol):
    """
    Protocol interface for vision analysis adapters.
    Allows pluggable integration with cloud multimodal models or local vision classifiers.
    """

    def analyze_image(
        self,
        evidence: EvidenceMetadata,
    ) -> VisionAnalysisResult:
        """Analyzes an image attachment and returns structured visual observations."""
        ...


# ---------------------------------------------------------------------------
# Mock Vision Adapter (Honest Simulation for College Demo & Testing)
# ---------------------------------------------------------------------------

class MockVisionProvider:
    """
    Mock vision adapter used for demonstration and unit testing.

    Safety:
    - Strictly sets `is_simulated = True`. Never represents simulated outputs as real model predictions.
    - Accurately simulates blurry photos, irrelevant uploads, and category predictions.
    """

    def __init__(
        self,
        simulated_category: CivicCategory = CivicCategory.POTHOLE,
        simulated_observations: Optional[List[str]] = None,
        is_clear: bool = True,
        uncertainty_rationale: Optional[str] = None,
        should_fail: bool = False,
        error_message: str = "Simulated vision provider connection timeout",
    ):
        self.simulated_category = simulated_category
        self.simulated_observations = simulated_observations or [
            "Surface depression visible on asphalt pavement",
            "Disrupted road surface with exposed gravel aggregate",
        ]
        self.is_clear = is_clear
        self.uncertainty_rationale = uncertainty_rationale
        self.should_fail = should_fail
        self.error_message = error_message

    def analyze_image(
        self,
        evidence: EvidenceMetadata,
    ) -> VisionAnalysisResult:
        if self.should_fail:
            raise RuntimeError(self.error_message)

        # 1. Check MIME type support
        if evidence.file_type.lower() not in SUPPORTED_IMAGE_MIMES:
            return VisionAnalysisResult(
                attachment_id=evidence.attachment_id,
                detected_category=CivicCategory.UNKNOWN,
                visual_observations=[],
                is_clear=False,
                uncertainty_rationale=(
                    f"Unsupported media type '{evidence.file_type}'. "
                    "Vision analysis is restricted to standard photographic formats (JPEG, PNG, WebP)."
                ),
                confidence=None,
                model_provider="mock_vision_adapter",
                is_simulated=True,
                notes="File cannot be processed by computer vision.",
            )

        # 2. Return configured simulation
        return VisionAnalysisResult(
            attachment_id=evidence.attachment_id,
            detected_category=self.simulated_category if self.is_clear else CivicCategory.UNKNOWN,
            visual_observations=self.simulated_observations if self.is_clear else [],
            is_clear=self.is_clear,
            uncertainty_rationale=self.uncertainty_rationale,
            confidence=0.88 if self.is_clear else None,
            model_provider="mock_vision_adapter",
            is_simulated=True,
            notes=(
                "SIMULATION DISCLOSURE: Generated by MockVisionProvider for demonstration/testing. "
                "Not a certified computer vision prediction."
            ),
        )


# ---------------------------------------------------------------------------
# Multimodal Conflict Detection Helper
# ---------------------------------------------------------------------------

def detect_text_vision_conflict(
    text_category: CivicCategory,
    visual_results: List[VisionAnalysisResult],
) -> Tuple[bool, Optional[str]]:
    """
    Evaluates whether textual classification and image predictions conflict.

    Preserves ambiguity and surfaces disagreements for human review rather than
    silently overwriting citizen input or vision claims.

    Args:
        text_category: Category inferred from text report.
        visual_results: Visual analysis results from image attachments.

    Returns:
        Tuple of (has_conflict: bool, rationale: Optional[str]).
    """
    if not visual_results:
        return False, None

    for vis in visual_results:
        # Ignore unclear, unknown, or other_civic vision results
        if not vis.is_clear or vis.detected_category in (CivicCategory.UNKNOWN, CivicCategory.OTHER_CIVIC):
            continue

        if text_category not in (CivicCategory.UNKNOWN, CivicCategory.OTHER_CIVIC):
            if vis.detected_category != text_category:
                rationale = (
                    f"Multimodal discrepancy detected: Citizen report text indicates "
                    f"'{text_category.value.replace('_', ' ').title()}', but image analysis "
                    f"(Attachment ID: {vis.attachment_id}) features '{vis.detected_category.value.replace('_', ' ').title()}'. "
                    "Both findings are preserved; citizen review required."
                )
                return True, rationale

    return False, None


# ---------------------------------------------------------------------------
# Batch Image Analysis Helper
# ---------------------------------------------------------------------------

def analyze_evidence_attachments(
    evidence_list: Optional[List[EvidenceMetadata]],
    provider: Optional[VisionProvider] = None,
) -> Tuple[List[VisionAnalysisResult], List[str]]:
    """
    Executes vision analysis across all supplied evidence attachments.

    Safety:
    - If provider is None or fails, returns empty/uncertain results without breaking text workflow.
    - Strips URLs and storage credentials from logs to ensure privacy.
    """
    if not evidence_list or provider is None:
        return [], []

    results: List[VisionAnalysisResult] = []
    warnings: List[str] = []

    for item in evidence_list:
        try:
            res = provider.analyze_image(item)
            results.append(res)
            if not res.is_clear and res.uncertainty_rationale:
                warnings.append(f"Image {item.attachment_id}: {res.uncertainty_rationale}")
        except Exception as exc:
            logger.warning(f"Vision provider failed for attachment {item.attachment_id}: {exc}")
            warnings.append(
                f"Image analysis unavailable for attachment {item.attachment_id} (provider failure)."
            )
            results.append(
                VisionAnalysisResult(
                    attachment_id=item.attachment_id,
                    detected_category=CivicCategory.UNKNOWN,
                    visual_observations=[],
                    is_clear=False,
                    uncertainty_rationale="Vision provider encountered an error during image processing.",
                    confidence=None,
                    model_provider="fallback_error_handler",
                    is_simulated=True,
                    notes="Error during processing; safely contained.",
                )
            )

    return results, warnings
