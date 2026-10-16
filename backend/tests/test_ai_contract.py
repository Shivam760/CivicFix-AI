import copy
import uuid

import pytest
from pydantic import ValidationError

from app.ai.analyzers import fake_analyze
from app.ai.contract import AnalysisInput, AuthorityInput, InvalidAnalysis, validate_output

AUTHORITY_ID = uuid.uuid4()


@pytest.fixture
def analysis_input() -> AnalysisInput:
    return AnalysisInput(
        report_id=uuid.uuid4(),
        title="Pothole near the market",
        description="A large pothole is making the road unsafe.",
        category="road_damage",
        location_text="Near the main market",
        latitude=None,
        longitude=None,
        available_authorities=[
            {
                "id": AUTHORITY_ID,
                "name": "City Council",
                "region": "Example City",
                "supported_categories": ["road_damage"],
                "verification_status": "verified",
            }
        ],
    )


@pytest.fixture
def valid_output(analysis_input) -> dict:
    return fake_analyze(analysis_input)


def broken(output: dict, path: str, value) -> dict:
    """A copy of output with one nested value replaced, e.g. path="complaint_draft.text"."""
    result = copy.deepcopy(output)
    *parents, last = path.split(".")
    target = result
    for key in parents:
        target = target[key]
    target[last] = value
    return result


def test_fake_output_is_valid(analysis_input, valid_output):
    output = validate_output(valid_output, analysis_input)

    assert output.authority_suggestion.authority_id == AUTHORITY_ID
    assert output.complaint_draft.requires_approval is True


@pytest.mark.parametrize(
    "path, value",
    [
        ("suggested_category.value", "potholes"),
        ("suggested_category.confidence", 1.5),
        ("suggested_category.confidence", -0.1),
        ("complaint_draft.requires_approval", False),
        ("complaint_draft.text", "   "),
        ("model_metadata.prompt_version", ""),
        ("authority_suggestion.verification_status", "verified"),  # AI must not state it
    ],
)
def test_contract_violations_rejected(analysis_input, valid_output, path, value):
    with pytest.raises(InvalidAnalysis, match="schema validation"):
        validate_output(broken(valid_output, path, value), analysis_input)


@pytest.mark.parametrize(
    "path, value",
    [
        ("suggested_category.value", "unknown"),
        ("suggested_category.confidence", None),
        ("suggested_category.confidence", 0),
        ("authority_suggestion.authority_id", None),
    ],
)
def test_allowed_values_accepted(analysis_input, valid_output, path, value):
    validate_output(broken(valid_output, path, value), analysis_input)


def test_wrong_report_id_rejected(analysis_input, valid_output):
    with pytest.raises(InvalidAnalysis, match="report_id"):
        validate_output(broken(valid_output, "report_id", str(uuid.uuid4())), analysis_input)


def test_authority_not_supplied_rejected(analysis_input, valid_output):
    invented = broken(valid_output, "authority_suggestion.authority_id", str(uuid.uuid4()))

    with pytest.raises(InvalidAnalysis, match="not supplied"):
        validate_output(invented, analysis_input)


def test_error_message_does_not_contain_report_text(analysis_input, valid_output):
    secret_text = "private citizen detail"
    bad = broken(valid_output, "suggested_category.value", secret_text)

    with pytest.raises(InvalidAnalysis) as caught:
        validate_output(bad, analysis_input)
    assert secret_text not in str(caught.value)


def test_unverified_authority_cannot_be_sent():
    with pytest.raises(ValidationError):
        AuthorityInput(
            id=uuid.uuid4(), name="X", region="Y", supported_categories=[],
            verification_status="unverified",
        )


def test_fake_analyzer_never_guesses_a_category(analysis_input):
    no_category = analysis_input.model_copy(update={"category": None})

    assert fake_analyze(no_category)["suggested_category"]["value"] == "unknown"
