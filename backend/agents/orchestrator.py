"""Coordinates RFP analysis: reads a PDF, asks the LLM to extract materials, then prices them.

This file is the main pipeline. It streams progress events so the frontend can show each step.
The LLM returns structured tool calls (project name + line items) that we turn into a bid summary.
"""
from __future__ import annotations

import io
import json
import logging
import os
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

import pypdf
from groq import AsyncGroq

from backend.agents.pricing import price_line_items
from backend.models.schemas import AgentEvent, BidSummary, LineItem

logger = logging.getLogger(__name__)

# Tool definitions the LLM must call to report what it found in the PDF.
EXTRACTION_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "set_project_name",
            "description": "Set the project name found in the RFP document.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {
                        "type": "string",
                        "description": "The name of the construction project.",
                    }
                },
                "required": ["project_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_line_item",
            "description": "Record a construction material or line item extracted from the RFP.",
            "parameters": {
                "type": "object",
                "properties": {
                    "description": {
                        "type": "string",
                        "description": "Description of the material or work item.",
                    },
                    "quantity": {
                        "type": "number",
                        "description": "Quantity required.",
                    },
                    "unit": {
                        "type": "string",
                        "description": 'Unit of measure, e.g. "meters", "units", "kg".',
                    },
                    "confidence": {
                        "type": "number",
                        "description": "Extraction confidence from 0 to 1.",
                    },
                },
                "required": ["description", "quantity", "unit", "confidence"],
            },
        },
    },
]

EXTRACTION_PROMPT = (Path(__file__).parent / "prompts" / "extraction.txt").read_text()

@dataclass
class _ToolCall:
    """One function call returned by the LLM (name + parsed JSON arguments)."""
    name: str
    args: dict[str, Any]

def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Pull plain text out of every page in the PDF."""
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)

def _build_extraction_prompt(pdf_text: str) -> str:
    """Combine the system instructions with the actual document text."""
    return f"{EXTRACTION_PROMPT}\n\nRFP document text:\n\n{pdf_text}"

def _make_event(
    run_id: str,
    event_type: Literal["started", "extracting", "pricing", "complete", "error"],
    agent: Literal["orchestrator", "pricing"],
    message: str,
    data: dict | None = None,
) -> AgentEvent:
    """Build a single progress event the frontend can display."""
    return AgentEvent(
        run_id=run_id,
        event_type=event_type,
        agent=agent,
        message=message,
        data=data,
    )

def _default_project_name(pdf_filename: str) -> str:
    """Guess a project name from the PDF filename when the LLM does not provide one."""
    stem = Path(pdf_filename).stem.replace("_", " ").replace("-", " ")
    return stem.title() or "Untitled Project"

def _extract_tool_calls(response: Any) -> list[_ToolCall]:
    """Read tool calls from the Groq response and parse each call's JSON arguments."""
    if not response.choices:
        raise ValueError("Groq returned no choices")

    raw_calls = response.choices[0].message.tool_calls
    if not raw_calls:
        raise ValueError("Groq returned no tool calls")

    parsed: list[_ToolCall] = []
    for call in raw_calls:
        # Each tool call stores its arguments as a JSON string — parse it into a dict.
        parsed.append(
            _ToolCall(
                name=call.function.name,
                args=json.loads(call.function.arguments),
            )
        )
    return parsed

def _parse_extraction_calls(tool_calls: list[_ToolCall]) -> tuple[list[LineItem], str | None]:
    """Turn LLM tool calls into LineItem objects and an optional project name."""
    line_items: list[LineItem] = []
    project_name: str | None = None

    for call in tool_calls:
        args = dict(call.args)

        if call.name == "set_project_name":
            name = args.get("project_name")
            if name:
                project_name = str(name).strip()
            continue

        if call.name != "add_line_item":
            logger.warning("Ignoring unexpected tool call: %s", call.name)
            continue

        description = args.get("description")
        quantity = args.get("quantity")
        unit = args.get("unit")
        confidence = args.get("confidence")

        if description is None or quantity is None or unit is None or confidence is None:
            raise ValueError(
                f"Invalid add_line_item call: missing required fields ({args})"
            )

        line_items.append(
            LineItem(
                id=str(uuid4()),
                description=str(description).strip(),
                quantity=float(quantity),
                unit=str(unit).strip(),
                # Keep confidence between 0 and 1 even if the model sends a bad value.
                confidence=max(0.0, min(1.0, float(confidence))),
            )
        )

    if not line_items:
        raise ValueError("Groq did not extract any line items from the PDF")

    return line_items, project_name

async def _extract_line_items_from_pdf(
    pdf_bytes: bytes,
    pdf_filename: str,
) -> tuple[list[LineItem], str]:
    """Send PDF text to Groq and return extracted line items plus a project name."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")

    pdf_text = _extract_pdf_text(pdf_bytes)
    if not pdf_text.strip():
        raise ValueError("PDF contains no extractable text")

    client = AsyncGroq(api_key=api_key)
    prompt = _build_extraction_prompt(pdf_text)
    logger.info("Extracting line items from PDF: %s", pdf_filename)

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            tools=EXTRACTION_TOOLS,
            tool_choice="required",
        )
    except Exception as exc:
        logger.exception("Groq PDF extraction failed")
        raise ValueError(f"Groq PDF extraction failed: {exc}") from exc

    tool_calls = _extract_tool_calls(response)
    line_items, project_name = _parse_extraction_calls(tool_calls)
    final_name = project_name or _default_project_name(pdf_filename)
    logger.info(
        "Extracted %d line items for project '%s'",
        len(line_items),
        final_name,
    )
    return line_items, final_name

async def run_analysis(
    pdf_bytes: bytes,
    pdf_filename: str,
    run_id: str,
) -> AsyncGenerator[AgentEvent | BidSummary, None]:
    """Run the full pipeline and yield progress events, then the final bid summary."""
    try:
        yield _make_event(
            run_id,
            "started",
            "orchestrator",
            "Starting RFP analysis...",
        )
        yield _make_event(
            run_id,
            "extracting",
            "orchestrator",
            "Reading PDF and extracting materials...",
        )

        line_items, project_name = await _extract_line_items_from_pdf(
            pdf_bytes, pdf_filename
        )

        yield _make_event(
            run_id,
            "pricing",
            "pricing",
            "Pricing extracted materials...",
            data={"item_count": len(line_items), "project_name": project_name},
        )

        priced_items = await price_line_items(line_items)

        summary = BidSummary(
            run_id=run_id,
            project_name=project_name,
            line_items=priced_items,
            status="finalized",
        )

        yield _make_event(
            run_id,
            "complete",
            "orchestrator",
            "Analysis complete.",
            data={
                "item_count": len(priced_items),
                "total_amount": summary.total_amount,
            },
        )
        yield summary

    except Exception as exc:
        logger.exception("Run %s failed during analysis", run_id)
        yield _make_event(
            run_id,
            "error",
            "orchestrator",
            str(exc),
        )
