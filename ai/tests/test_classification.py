"""
ai/tests/test_classification.py

Comprehensive test suite for deterministic category suggestion.
Covers clear category descriptions, ambiguous reports, unsupported issues,
conflicting citizen hints, empty inputs, and uncertainty indicators.
"""

import pytest

from ai.classification import suggest_category
from ai.schemas import (
    AIAnalysisRequest,
    CategoryMatchStrength,
    CivicCategory,
)


class TestClearCategorySuggestions:
    """Tests for clear, unambiguous category descriptions."""

    def test_pothole_suggestion(self):
        desc = "There is a deep pothole in the middle of the road causing vehicle damage."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.POTHOLE
        assert res.match_strength == CategoryMatchStrength.STRONG_MATCH
        assert "pothole" in res.matched_keywords
        assert res.confidence is None

    def test_crater_and_road_damage(self):
        desc = "Severe road crater and asphalt crack near the bus terminal."
        res = suggest_category({"description": desc})
        assert res.suggested_category == CivicCategory.POTHOLE
        assert res.match_strength == CategoryMatchStrength.STRONG_MATCH

    def test_garbage_accumulation(self):
        desc = "Uncollected garbage is piling up by the curbside with overflowing dustbin."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.GARBAGE
        assert res.match_strength == CategoryMatchStrength.STRONG_MATCH
        assert any(k in res.matched_keywords for k in ["garbage", "overflowing dustbin"])

    def test_broken_streetlight(self):
        desc = "The streetlight pole is broken and the lamp post is dark at night."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.STREET_LIGHTING
        assert res.match_strength == CategoryMatchStrength.STRONG_MATCH

    def test_water_leakage(self):
        desc = "Drinking water pipeline leak with clean water gushing onto the street."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.WATER_LEAKAGE
        assert res.match_strength == CategoryMatchStrength.STRONG_MATCH

    def test_drainage_sewage(self):
        desc = "Open manhole with sewage overflow spreading foul water across the road."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.DRAINAGE_SEWAGE
        assert res.match_strength == CategoryMatchStrength.STRONG_MATCH

    def test_road_hazard(self):
        desc = "A fallen tree and live wire are blocking both traffic lanes."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.ROAD_HAZARD
        assert res.match_strength == CategoryMatchStrength.STRONG_MATCH


class TestAmbiguousAndVagueDescriptions:
    """Tests for ambiguous, tied, or generic phrasing."""

    def test_vague_damaged_object_near_road_not_pothole(self):
        """
        Prompt requirement:
        'For example, if a report says "There is a damaged object near the road"
        and does not establish what the object is, do not confidently label it as a pothole.'
        """
        desc = "There is a damaged object near the road."
        res = suggest_category(desc)
        # Must NOT be labeled as a pothole
        assert res.suggested_category != CivicCategory.POTHOLE
        assert res.suggested_category in (CivicCategory.OTHER_CIVIC, CivicCategory.UNKNOWN)
        assert res.match_strength in (CategoryMatchStrength.AMBIGUOUS, CategoryMatchStrength.NO_MATCH)

    def test_generic_something_broken_not_categorized(self):
        desc = "Something is broken on the street corner."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.OTHER_CIVIC
        assert res.match_strength in (CategoryMatchStrength.AMBIGUOUS, CategoryMatchStrength.NO_MATCH)

    def test_tied_multiple_categories(self):
        """Description with equal signals across two categories marks as AMBIGUOUS."""
        desc = "The broken street light fell into a severe water leak."
        res = suggest_category(desc)
        assert res.match_strength == CategoryMatchStrength.AMBIGUOUS
        assert len(res.secondary_candidates) > 0


class TestUnsupportedAndEmptyDescriptions:
    """Tests for out-of-scope issues and empty text."""

    def test_empty_string_returns_unknown(self):
        res = suggest_category("")
        assert res.suggested_category == CivicCategory.UNKNOWN
        assert res.match_strength == CategoryMatchStrength.NO_MATCH
        assert len(res.matched_keywords) == 0

    def test_whitespace_string_returns_unknown(self):
        res = suggest_category("   \n\t  ")
        assert res.suggested_category == CivicCategory.UNKNOWN
        assert res.match_strength == CategoryMatchStrength.NO_MATCH

    def test_unsupported_noise_complaint(self):
        desc = "Loud construction noise from the neighbor's house at 2 AM every night."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.OTHER_CIVIC
        assert res.match_strength == CategoryMatchStrength.NO_MATCH

    def test_unsupported_parking_dispute(self):
        desc = "An unauthorized private car is parked blocking my garage driveway."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.OTHER_CIVIC
        assert res.match_strength == CategoryMatchStrength.NO_MATCH

    def test_unsupported_stray_animals(self):
        desc = "Stray dogs are barking loudly in the society courtyard."
        res = suggest_category(desc)
        assert res.suggested_category == CivicCategory.OTHER_CIVIC
        assert res.match_strength == CategoryMatchStrength.NO_MATCH


class TestCategoryConflictDetection:
    """Tests for detecting and exposing disagreement between citizen hint and AI suggestion."""

    def test_conflicting_citizen_category(self):
        """Citizen selected 'garbage', but description is clearly about a pothole."""
        report = {
            "description": "Massive pothole crater on the road that ruined my car tire.",
            "category": "garbage",
        }
        res = suggest_category(report)
        assert res.suggested_category == CivicCategory.POTHOLE
        assert res.original_category == "garbage"
        assert res.has_category_conflict is True
        assert res.conflict_rationale is not None
        assert "garbage" in res.conflict_rationale
        assert "pothole" in res.conflict_rationale

    def test_agreeing_citizen_category(self):
        """Citizen selected 'roads', description is about a pothole -> no conflict."""
        report = {
            "description": "Deep pothole near the signal.",
            "category": "roads",
        }
        res = suggest_category(report)
        assert res.suggested_category == CivicCategory.POTHOLE
        assert res.has_category_conflict is False
        assert res.conflict_rationale is None

    def test_citizen_category_preserved_on_request_model(self):
        """When passing AIAnalysisRequest instance, original category is preserved."""
        req = AIAnalysisRequest(
            description="Garbage dump overflowing with plastic waste.",
            category="waste_management",
        )
        res = suggest_category(req)
        assert res.suggested_category == CivicCategory.GARBAGE
        assert res.original_category == "waste_management"


class TestConfidenceInvariant:
    """Verify that heuristic baseline never fabricates artificial confidence scores."""

    def test_confidence_strictly_none(self):
        for text in [
            "Deep pothole on highway",
            "Broken streetlight",
            "Water leak",
            "Garbage accumulation",
            "Vague issue",
        ]:
            res = suggest_category(text)
            assert res.confidence is None
