"""Pricing Agent — receives a list of materials and asks Groq to estimate a market price for each one."""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from groq import AsyncGroq

from backend.models.schemas import LineItem

logger = logging.getLogger(__name__)

# The one tool Groq must call back — once per line item — with a unit price.
SET_ITEM_PRICE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "set_item_price",
            "description": "Set the estimated unit price for a construction line item.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {
                        "type": "string",
                        "description": "The line item ID to price.",
                    },
                    "unit_price": {
                        "type": "number",
                        "description": "Estimated unit price in USD.",
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Brief explanation of how the price was estimated.",
                    },
                },
                "required": ["item_id", "unit_price", "reasoning"],
            },
        },
    }
]

PRICING_PROMPT = (Path(__file__).parent / "prompts" / "pricing.txt").read_text()

@dataclass
class _ToolCall:
    name: str
    args: dict[str, Any]

# Build the prompt Groq reads: instructions plus a JSON list of items to price.
def _build_prompt(line_items: list[LineItem]) -> str:
    items_payload = [
        {
            "id": item.id,
            "description": item.description,
            "quantity": item.quantity,
            "unit": item.unit,
        }
        for item in line_items
    ]
    return (
        f"{PRICING_PROMPT}\n\n"
        f"Line items:\n{json.dumps(items_payload, indent=2)}"
    )

# Pull tool calls out of the Groq response and turn each call's JSON string into a dict.
def _extract_tool_calls(response: Any) -> list[_ToolCall]:
    if not response.choices:
        raise ValueError("Groq returned no choices")

    raw_calls = response.choices[0].message.tool_calls
    if not raw_calls:
        raise ValueError("Groq returned no tool calls")

    return [
        _ToolCall(
            name=tool_call.function.name,
            args=json.loads(tool_call.function.arguments),
        )
        for tool_call in raw_calls
    ]

# Walk through each set_item_price call and copy prices onto matching line items.
def _apply_price_updates(
    line_items: list[LineItem], function_calls: list[_ToolCall]
) -> list[LineItem]:
    items_by_id = {item.id: item for item in line_items}
    updated_items = [item.model_copy() for item in line_items]

    for function_call in function_calls:
        if function_call.name != "set_item_price":
            logger.warning("Ignoring unexpected tool call: %s", function_call.name)
            continue

        args = dict(function_call.args)
        item_id = args.get("item_id")
        unit_price = args.get("unit_price")
        reasoning = args.get("reasoning")

        if item_id is None or unit_price is None:
            raise ValueError(
                f"Invalid set_item_price call: missing item_id or unit_price ({args})"
            )

        if item_id not in items_by_id:
            raise ValueError(f"set_item_price referenced unknown item_id: {item_id}")

        logger.info(
            "Priced item %s at $%.2f — %s",
            item_id,
            float(unit_price),
            reasoning or "no reasoning provided",
        )

        source_item = items_by_id[item_id]
        for index, item in enumerate(updated_items):
            if item.id == item_id:
                # unit_price is per unit; total_price = unit price × quantity from the original item.
                updated_items[index] = item.model_copy(
                    update={
                        "unit_price": float(unit_price),
                        "total_price": float(unit_price) * source_item.quantity,
                    }
                )
                break

    return updated_items

# Main entry point: send items to Groq, then apply the prices it returns via tool calls.
async def price_line_items(line_items: list[LineItem]) -> list[LineItem]:
    if not line_items:
        return []

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")

    client = AsyncGroq(api_key=api_key)
    prompt = _build_prompt(line_items)
    logger.info("Requesting prices for %d line items from Groq", len(line_items))

    try:
        # tool_choice="required" forces Groq to reply with set_item_price calls, not plain text.
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            tools=SET_ITEM_PRICE_TOOLS,
            tool_choice="required",
        )
    except Exception as exc:
        logger.exception("Groq pricing request failed")
        raise ValueError(f"Groq pricing request failed: {exc}") from exc

    # Groq response → parsed tool calls → updated line items with prices filled in.
    tool_calls = _extract_tool_calls(response)
    return _apply_price_updates(line_items, tool_calls)
