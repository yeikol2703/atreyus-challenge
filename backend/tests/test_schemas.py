import json
from datetime import datetime

import pytest
from pydantic import ValidationError

from backend.models.schemas import AgentEvent, BidSummary, LineItem, RunRecord


def _line_item(description: str, total_price: float | None) -> LineItem:
    return LineItem(
        description=description,
        quantity=1.0,
        unit="units",
        total_price=total_price,
        confidence=0.9,
    )


def test_bid_summary_total_amount_calculated() -> None:
    summary = BidSummary(
        run_id="run-1",
        project_name="Test Project",
        line_items=[
            _line_item("Item A", 100.0),
            _line_item("Item B", 250.5),
            _line_item("Item C", 49.5),
        ],
    )

    assert summary.total_amount == 400.0


def test_bid_summary_total_amount_none_if_missing_price() -> None:
    summary = BidSummary(
        run_id="run-1",
        project_name="Test Project",
        line_items=[
            _line_item("Item A", 100.0),
            _line_item("Item B", None),
            _line_item("Item C", 50.0),
        ],
    )

    assert summary.total_amount is None


def test_bid_summary_total_amount_none_if_empty() -> None:
    summary = BidSummary(
        run_id="run-1",
        project_name="Test Project",
        line_items=[],
    )

    assert summary.total_amount is None


def test_line_item_confidence_validation() -> None:
    with pytest.raises(ValidationError):
        LineItem(
            description="Invalid confidence item",
            quantity=1.0,
            unit="units",
            confidence=1.5,
        )


def test_agent_event_serialization() -> None:
    timestamp = datetime(2026, 6, 3, 12, 0, 0)
    event = AgentEvent(
        run_id="run-123",
        event_type="extracting",
        agent="orchestrator",
        message="Reading PDF and extracting materials...",
        data={"item_count": 3},
        timestamp=timestamp,
    )

    payload = json.loads(event.model_dump_json())

    assert payload["run_id"] == "run-123"
    assert payload["event_type"] == "extracting"
    assert payload["agent"] == "orchestrator"
    assert payload["message"] == "Reading PDF and extracting materials..."
    assert payload["data"] == {"item_count": 3}
    assert isinstance(payload["timestamp"], str)


def test_run_record_default_status() -> None:
    record = RunRecord(pdf_filename="rfp.pdf")

    assert record.status == "running"
