import pytest

from backend.agents.orchestrator import (
    _ToolCall,
    _default_project_name,
    _parse_extraction_calls,
)


def test_parse_extraction_calls_happy_path() -> None:
    tool_calls = [
        _ToolCall("set_project_name", {"project_name": "Warehouse Expansion"}),
        _ToolCall(
            "add_line_item",
            {
                "description": "Copper wire 12AWG",
                "quantity": 500,
                "unit": "meters",
                "confidence": 0.92,
            },
        ),
        _ToolCall(
            "add_line_item",
            {
                "description": "Steel rebar #4",
                "quantity": 120,
                "unit": "kg",
                "confidence": 0.85,
            },
        ),
    ]

    line_items, project_name = _parse_extraction_calls(tool_calls)

    assert project_name == "Warehouse Expansion"
    assert len(line_items) == 2

    assert line_items[0].description == "Copper wire 12AWG"
    assert line_items[0].quantity == 500
    assert line_items[0].unit == "meters"
    assert line_items[0].confidence == 0.92

    assert line_items[1].description == "Steel rebar #4"
    assert line_items[1].quantity == 120
    assert line_items[1].unit == "kg"
    assert line_items[1].confidence == 0.85


def test_parse_extraction_calls_no_items() -> None:
    tool_calls = [
        _ToolCall("set_project_name", {"project_name": "Empty Project"}),
    ]

    with pytest.raises(ValueError, match="did not extract"):
        _parse_extraction_calls(tool_calls)


def test_parse_extraction_calls_missing_fields() -> None:
    tool_calls = [
        _ToolCall(
            "add_line_item",
            {
                "description": "Missing quantity item",
                "unit": "units",
                "confidence": 0.8,
            },
        ),
    ]

    with pytest.raises(ValueError, match="missing required fields"):
        _parse_extraction_calls(tool_calls)


def test_confidence_clamped() -> None:
    high_confidence = _parse_extraction_calls(
        [
            _ToolCall(
                "add_line_item",
                {
                    "description": "High confidence item",
                    "quantity": 1,
                    "unit": "units",
                    "confidence": 1.5,
                },
            ),
        ]
    )[0][0]
    assert high_confidence.confidence == 1.0

    low_confidence = _parse_extraction_calls(
        [
            _ToolCall(
                "add_line_item",
                {
                    "description": "Low confidence item",
                    "quantity": 1,
                    "unit": "units",
                    "confidence": -0.5,
                },
            ),
        ]
    )[0][0]
    assert low_confidence.confidence == 0.0


def test_default_project_name() -> None:
    assert _default_project_name("my-warehouse-rfp.pdf") == "My Warehouse Rfp"
    assert _default_project_name("project_name.pdf") == "Project Name"
