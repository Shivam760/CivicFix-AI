"""
ai/tests/test_complaint_builder.py

Comprehensive unit tests for complaint drafting and provider integration.
Tests cover verified authority drafting, unverified/ambiguous drafting, missing location handling,
zero fact invention, mock LLM provider integration, and graceful error fallback.
"""

import pytest

from ai.complaint_builder import (
    DeterministicTemplateDraftingProvider,
    MockLLMDraftingProvider,
    build_complaint,
)
from ai.schemas import (
    AIAnalysisRequest,
    AuthorityMatchResult,
    AuthorityMatchStatus,
    CivicCategory,
    ComplaintDraft,
    EvidenceMetadata,
    LocationInput,
)


class TestDeterministicComplaintDrafting:
    """Tests for deterministic template-based complaint generation."""

    def test_complete_report_verified_authority(self):
        """Full report with verified authority produces well-formed formal complaint."""
        req = AIAnalysisRequest(
            report_id="rep-101",
            description="Deep pothole right after 14th Cross on 80 Feet Road. Dangerous for two-wheelers.",
            location=LocationInput(
                raw_address="80 Feet Road, 14th Cross",
                landmark="Near Sony Signal",
                city="Bengaluru",
                ward_or_zone="South Zone",
                latitude=12.9344,
                longitude=77.6288,
            ),
            evidence_metadata=[
                EvidenceMetadata(
                    attachment_id="att-1",
                    file_type="image/jpeg",
                    filename="pothole.jpg",
                )
            ],
        )
        auth = AuthorityMatchResult(
            status=AuthorityMatchStatus.VERIFIED_MATCH,
            authority_id="BBMP_ROAD_SOUTH",
            authority_name="Bruhat Bengaluru Mahanagara Palike",
            department="Road Infrastructure Division (South Zone)",
            jurisdiction="Bengaluru (South Zone)",
            verification_date="2026-01-15",
            source_reference="Official Gazette 2026",
        )

        draft = build_complaint(req, analysis=CivicCategory.POTHOLE, authority_match=auth)
        assert isinstance(draft, ComplaintDraft)
        assert "Pothole" in draft.title
        assert "BBMP_ROAD_SOUTH" in draft.formal_body or "Bruhat Bengaluru Mahanagara Palike" in draft.formal_body
        assert "Road Infrastructure Division" in draft.formal_body
        assert "80 Feet Road" in draft.formal_body
        assert "1 media attachment(s)" in draft.formal_body
        assert "unverified by automated systems" in draft.formal_body  # Non-vision disclaimer
        assert draft.generation_method == "deterministic_template"
        assert len(draft.key_facts) >= 4
        assert "pothole" in draft.suggested_tags

    def test_unverified_authority_handling(self):
        """When authority lookup is unverified, draft is still generated with explicit disclaimer."""
        req = AIAnalysisRequest(
            description="Garbage dump overflowing outside public library for several days.",
            location=LocationInput(city="UnknownVillage"),
        )
        auth = AuthorityMatchResult(
            status=AuthorityMatchStatus.NO_VERIFIED_MATCH,
            notes="No verified authority in directory for UnknownVillage.",
        )

        draft = build_complaint(req, analysis=CivicCategory.GARBAGE, authority_match=auth)
        assert isinstance(draft, ComplaintDraft)
        assert "has NOT been verified" in draft.formal_body
        assert any("authority" in c.lower() for c in draft.missing_confirmations)

    def test_ambiguous_authority_handling(self):
        """When multiple authorities are plausible, draft explicitly notes ambiguity."""
        req = AIAnalysisRequest(
            description="Road crater causing traffic congestion.",
            location=LocationInput(city="Bengaluru"),
        )
        auth = AuthorityMatchResult(
            status=AuthorityMatchStatus.AMBIGUOUS_MATCH,
            plausible_alternatives=[
                "BBMP Road Division (South)",
                "State Highway PWD",
            ],
        )

        draft = build_complaint(req, analysis=CivicCategory.POTHOLE, authority_match=auth)
        assert "ambiguous between" in draft.formal_body
        assert "State Highway PWD" in draft.formal_body
        assert any("authority" in c.lower() for c in draft.missing_confirmations)

    def test_missing_location_handling(self):
        """Report lacking location details flags missing location in draft and confirmations."""
        req = AIAnalysisRequest(
            description="Broken streetlight flickering in the street at night.",
        )
        draft = build_complaint(req, analysis=CivicCategory.STREET_LIGHTING)
        assert "Location not specified" in draft.formal_body
        assert any("location" in c.lower() for c in draft.missing_confirmations)


class TestZeroFactInvention:
    """Tests ensuring no unsupported facts are hallucinated into drafts."""

    def test_does_not_invent_dates_or_accidents(self):
        """Plain description must not have invented dates, accident claims, or policy citations."""
        req = AIAnalysisRequest(
            description="Drinking water pipe is leaking clean water onto the sidewalk.",
            location=LocationInput(city="Bengaluru"),
        )
        draft = build_complaint(req, analysis=CivicCategory.WATER_LEAKAGE)
        # Should not invent specific accident or financial loss claims
        assert "hospital" not in draft.formal_body.lower()
        assert "injury" not in draft.formal_body.lower()
        assert "litigation" not in draft.formal_body.lower()

    def test_evidence_metadata_not_turned_into_verified_vision(self):
        """Attachment metadata is not described as verified image analysis."""
        req = AIAnalysisRequest(
            description="Pile of garbage on the corner.",
            evidence_metadata=[
                EvidenceMetadata(
                    attachment_id="att-99",
                    file_type="image/jpeg",
                    filename="severe_structural_hazard.jpg",  # Misleading filename
                )
            ],
        )
        draft = build_complaint(req, analysis=CivicCategory.GARBAGE)
        # Must not claim that image analysis verified severe structural hazard
        assert "unverified by automated systems" in draft.formal_body
        assert "1 media attachment(s)" in draft.formal_body


class TestProviderIntegrationAndFallback:
    """Tests for swappable provider abstraction, mock LLM, and error recovery."""

    def test_mock_llm_provider_success(self):
        """Mock LLM provider generates draft with llm_provider generation method."""
        req = AIAnalysisRequest(
            description="Broken streetlight fixture outside community hall.",
            location=LocationInput(city="Bengaluru"),
        )
        mock_provider = MockLLMDraftingProvider()
        draft = build_complaint(req, analysis=CivicCategory.STREET_LIGHTING, provider=mock_provider)
        assert draft.generation_method == "llm_provider"
        assert "Mock LLM" in draft.title

    def test_llm_provider_failure_graceful_fallback(self):
        """
        When the LLM provider fails (simulated crash/timeout), the workflow
        does NOT fail; it gracefully falls back to the deterministic template.
        """
        req = AIAnalysisRequest(
            description="Water pipeline burst gushing onto the avenue road.",
            location=LocationInput(city="Bengaluru", raw_address="Avenue Road"),
        )
        failing_provider = MockLLMDraftingProvider(should_fail=True, error_message="Provider 500 error")
        draft = build_complaint(req, analysis=CivicCategory.WATER_LEAKAGE, provider=failing_provider)
        # Must still return a valid ComplaintDraft instance!
        assert isinstance(draft, ComplaintDraft)
        assert draft.generation_method == "deterministic_template_fallback"
        assert "Water Leakage" in draft.title
        assert "Avenue Road" in draft.formal_body

    def test_malformed_llm_output_triggers_fallback(self):
        """
        When the LLM provider returns invalid data that violates ComplaintDraft schema,
        the validator catches it and safely falls back to deterministic template.
        """
        req = AIAnalysisRequest(
            description="Pothole near post office.",
            location=LocationInput(city="Bengaluru"),
        )
        # Title too short (min_length=5) violates schema
        malformed_mock = MockLLMDraftingProvider(
            mock_response={"title": "Bad", "formal_body": "Too short"}
        )
        draft = build_complaint(req, analysis=CivicCategory.POTHOLE, provider=malformed_mock)
        assert isinstance(draft, ComplaintDraft)
        assert draft.generation_method == "deterministic_template_fallback"
        assert len(draft.title) >= 5
