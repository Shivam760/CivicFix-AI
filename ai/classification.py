"""
ai/classification.py

Deterministic baseline for civic issue category suggestion.

Technical Nature:
-----------------
This module implements a deterministic, rule- and keyword-based baseline
for classifying civic complaints into standard categories.

It is NOT a trained machine-learning or LLM-based classifier.
Consequently, it does NOT fabricate or return calibrated confidence scores
(confidence is strictly None). Instead, it provides an explicit
CategoryMatchStrength indicator (STRONG_MATCH, WEAK_MATCH, AMBIGUOUS, NO_MATCH)
and exposes all matched keyword signals for transparent auditability.

Reliability Rules:
------------------
1. Do not label vague reports with unjustified certainty (e.g., 'damaged object
   near the road' must NOT be classified as a pothole).
2. Explicitly fall back to OTHER_CIVIC / UNKNOWN when no category matches.
   Never silently force unsupported complaints into supported categories.
3. When citizen-selected category conflicts with AI suggestion, preserve both
   and expose the conflict.
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from ai.schemas import (
    AIAnalysisRequest,
    CategoryMatchStrength,
    CategorySuggestionResult,
    CivicCategory,
)
from ai.validation import normalize_category, sanitize_text

# ---------------------------------------------------------------------------
# Specific and Contextual Keywords per Category
# ---------------------------------------------------------------------------

# Specific keywords: unambiguous signals that directly indicate the problem
SPECIFIC_CATEGORY_KEYWORDS: Dict[CivicCategory, List[str]] = {
    CivicCategory.POTHOLE: [
        "pothole",
        "potholes",
        "crater",
        "craters",
        "sinkhole",
        "sinkholes",
        "road cave-in",
        "cave in",
        "asphalt crack",
        "road cavity",
        "subsidence",
        "tarmac damage",
        "damaged road surface",
    ],
    CivicCategory.GARBAGE: [
        "garbage",
        "trash",
        "rubbish",
        "uncollected waste",
        "refuse dump",
        "dustbin",
        "litter",
        "garbage dump",
        "garbage pile",
        "waste pile",
        "overflowing bin",
        "overflowing dustbin",
        "solid waste",
        "debris accumulation",
    ],
    CivicCategory.STREET_LIGHTING: [
        "streetlight",
        "streetlights",
        "street light",
        "street lights",
        "lamp post",
        "lamppost",
        "light pole",
        "street lamp",
        "broken light",
        "dark street",
        "non-functional light",
        "bulb fused",
        "fused bulb",
        "street lighting",
    ],
    CivicCategory.WATER_LEAKAGE: [
        "water leakage",
        "water leak",
        "burst pipe",
        "broken pipe",
        "leaking pipe",
        "pipeline leak",
        "water pipeline",
        "drinking water wastage",
        "water gushing",
        "broken water main",
        "water main break",
        "leaking valve",
    ],
    CivicCategory.DRAINAGE_SEWAGE: [
        "drainage",
        "sewage",
        "sewer",
        "sewerage",
        "drain overflow",
        "blocked drain",
        "open manhole",
        "manhole overflow",
        "storm drain",
        "stagnant sewage",
        "gutters",
        "sewage overflow",
    ],
    CivicCategory.ROAD_HAZARD: [
        "fallen tree",
        "fallen branch",
        "live wire",
        "electric wire",
        "exposed cable",
        "road hazard",
        "oil spill",
        "road blockage",
        "broken barricade",
        "hanging wire",
    ],
}

# Weak contextual keywords: single words that provide secondary confirmation
# but ARE NOT sufficient on their own to establish a category without specificity.
WEAK_CATEGORY_KEYWORDS: Dict[CivicCategory, List[str]] = {
    CivicCategory.POTHOLE: ["road", "street", "tarmac", "asphalt"],
    CivicCategory.GARBAGE: ["waste", "dump", "smell", "rotting"],
    CivicCategory.STREET_LIGHTING: ["dark", "light", "bulb", "lamp"],
    CivicCategory.WATER_LEAKAGE: ["pipe", "pipeline", "leak", "water"],
    CivicCategory.DRAINAGE_SEWAGE: ["drain", "overflow", "gutter", "manhole"],
    CivicCategory.ROAD_HAZARD: ["hazard", "wire", "cable", "tree", "branch"],
}

# Ambiguous phrases that contain civic words but do not establish a specific problem.
# For example: "damaged object near the road" contains "road", but is NOT a pothole.
VAGUE_OR_GENERIC_PATTERNS: List[re.Pattern] = [
    re.compile(r"\b(damaged|broken|unknown|strange)\s+object\b", re.IGNORECASE),
    re.compile(r"\bsomething\s+(is\s+)?(broken|damaged|wrong|there)\b", re.IGNORECASE),
    re.compile(r"\bissue\s+near\s+(the\s+)?(road|street)\b", re.IGNORECASE),
    re.compile(r"\bproblem\s+on\s+(the\s+)?(road|street)\b", re.IGNORECASE),
]


# ---------------------------------------------------------------------------
# Core Suggestion Logic
# ---------------------------------------------------------------------------

def _extract_description_and_category(
    report: Union[AIAnalysisRequest, Dict[str, Any], str, Any]
) -> Tuple[str, Optional[str]]:
    """
    Normalizes diverse report representations to extract (description, citizen_category).
    """
    if isinstance(report, AIAnalysisRequest):
        return report.description, report.category
    elif isinstance(report, dict):
        desc = report.get("description", "")
        cat = report.get("category")
        return str(desc) if desc is not None else "", str(cat) if cat is not None else None
    elif isinstance(report, str):
        return report, None
    return "", None


def suggest_category(
    report: Union[AIAnalysisRequest, Dict[str, Any], str, Any]
) -> CategorySuggestionResult:
    """
    Deterministically suggests a civic category based on textual keyword matching.

    Rules:
    - Empty or whitespace descriptions return CivicCategory.UNKNOWN with NO_MATCH.
    - Highly specific keywords return STRONG_MATCH.
    - Generic/vague phrases (e.g. 'damaged object near the road') do NOT produce
      unjustified category certainty; they return CivicCategory.OTHER_CIVIC with AMBIGUOUS or NO_MATCH.
    - When multiple categories match equally, returns AMBIGUOUS with secondary candidates.
    - Unsupported issues (e.g. noise complaints, stray animals) explicitly fall back to OTHER_CIVIC.
    - When citizen-provided category conflicts with AI suggestion, preserves both and
      exposes the conflict in has_category_conflict and conflict_rationale.
    - Does NOT fabricate confidence scores (confidence is strictly None).

    Args:
        report: AIAnalysisRequest, dictionary, or raw description string.

    Returns:
        CategorySuggestionResult with suggested category, match strength, and conflict details.
    """
    raw_desc, citizen_cat_raw = _extract_description_and_category(report)
    sanitized_desc = sanitize_text(raw_desc).lower()

    # 1. Handle empty description
    if not sanitized_desc:
        return CategorySuggestionResult(
            suggested_category=CivicCategory.UNKNOWN,
            confidence=None,
            match_strength=CategoryMatchStrength.NO_MATCH,
            matched_keywords=[],
            secondary_candidates=[],
            original_category=citizen_cat_raw,
            has_category_conflict=False,
            conflict_rationale=None,
        )

    # 2. Check for vague / ambiguous generic patterns
    is_vague_description = any(pattern.search(sanitized_desc) for pattern in VAGUE_OR_GENERIC_PATTERNS)

    # 3. Score categories based on keyword matches
    category_scores: Dict[CivicCategory, int] = {}
    matched_keywords_by_cat: Dict[CivicCategory, List[str]] = {}

    for cat, specific_kw_list in SPECIFIC_CATEGORY_KEYWORDS.items():
        matched_specific = [kw for kw in specific_kw_list if kw in sanitized_desc]
        score = len(matched_specific) * 3  # Specific matches weighted heavily
        matched_keywords_by_cat[cat] = list(matched_specific)

        # Check weak keywords only if specific keywords or context warrants
        weak_kw_list = WEAK_CATEGORY_KEYWORDS.get(cat, [])
        matched_weak = [
            kw for kw in weak_kw_list
            if re.search(rf"\b{re.escape(kw)}\b", sanitized_desc) and kw not in matched_specific
        ]

        # Weak keywords alone do not count if the description is recognized as vague
        if not is_vague_description:
            score += len(matched_weak)
            matched_keywords_by_cat[cat].extend(matched_weak)

        if score > 0:
            category_scores[cat] = score

    # 4. Resolve matches, ambiguity, and fallback
    suggested_category: CivicCategory = CivicCategory.OTHER_CIVIC
    match_strength: CategoryMatchStrength = CategoryMatchStrength.NO_MATCH
    matched_keywords: List[str] = []
    secondary_candidates: List[CivicCategory] = []

    if not category_scores:
        # Explicit fallback: no recognized category matched
        suggested_category = CivicCategory.OTHER_CIVIC
        match_strength = (
            CategoryMatchStrength.AMBIGUOUS
            if is_vague_description
            else CategoryMatchStrength.NO_MATCH
        )
        matched_keywords = []
    else:
        # Sort categories by score descending
        sorted_candidates = sorted(category_scores.items(), key=lambda item: item[1], reverse=True)
        top_cat, top_score = sorted_candidates[0]
        matched_keywords = matched_keywords_by_cat[top_cat]

        # Check for ambiguity: multiple categories with specific matches or tied scores
        competing = [
            cat for cat, score in sorted_candidates[1:]
            if score >= 3 or score >= top_score * 0.7
        ]

        if competing:
            suggested_category = top_cat
            match_strength = CategoryMatchStrength.AMBIGUOUS
            secondary_candidates = competing
        elif top_score >= 3:
            suggested_category = top_cat
            match_strength = CategoryMatchStrength.STRONG_MATCH
        else:
            suggested_category = top_cat
            match_strength = CategoryMatchStrength.WEAK_MATCH

    # Special check: If description was flagged as vague and only had weak matches
    if is_vague_description and match_strength == CategoryMatchStrength.WEAK_MATCH:
        suggested_category = CivicCategory.OTHER_CIVIC
        match_strength = CategoryMatchStrength.AMBIGUOUS
        matched_keywords = []

    # 5. Check conflict with citizen-provided category
    has_conflict = False
    conflict_rationale: Optional[str] = None

    if citizen_cat_raw:
        normalized_citizen_cat, is_recognized = normalize_category(citizen_cat_raw)
        if is_recognized and normalized_citizen_cat is not None:
            if (
                suggested_category not in (CivicCategory.UNKNOWN, CivicCategory.OTHER_CIVIC)
                and normalized_citizen_cat != suggested_category
            ):
                has_conflict = True
                conflict_rationale = (
                    f"Citizen selected '{citizen_cat_raw}' ({normalized_citizen_cat.value}), "
                    f"but report description text indicates '{suggested_category.value}'."
                )

    return CategorySuggestionResult(
        suggested_category=suggested_category,
        confidence=None,  # Baseline rule engine does not output calibrated confidence
        match_strength=match_strength,
        matched_keywords=matched_keywords,
        secondary_candidates=secondary_candidates,
        original_category=citizen_cat_raw,
        has_category_conflict=has_conflict,
        conflict_rationale=conflict_rationale,
    )
