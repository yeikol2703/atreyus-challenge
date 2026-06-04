from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, computed_field


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class LineItem(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    description: str
    quantity: float
    unit: str
    unit_price: float | None = None
    total_price: float | None = None
    confidence: float = Field(ge=0.0, le=1.0)


class BidSummary(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    run_id: str
    project_name: str
    extracted_at: datetime = Field(default_factory=_utc_now)
    line_items: list[LineItem]
    status: Literal["draft", "finalized"] = "draft"
    notes: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_amount(self) -> float | None:
        if not self.line_items:
            return None
        totals = [item.total_price for item in self.line_items]
        if any(price is None for price in totals):
            return None
        return sum(totals)


class AgentEvent(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    run_id: str
    event_type: Literal["started", "extracting", "pricing", "complete", "error"]
    agent: Literal["orchestrator", "pricing"]
    message: str
    data: dict | None = None
    timestamp: datetime = Field(default_factory=_utc_now)


class RunRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=_utc_now)
    status: Literal["running", "complete", "failed"] = "running"
    pdf_filename: str
    result: BidSummary | None = None
