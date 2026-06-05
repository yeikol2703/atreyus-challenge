"""HTTP routes for bid analysis runs — upload a PDF, stream progress, and fetch past results."""
from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from backend.agents.orchestrator import run_analysis
from backend.db.database import (
    engine,
    get_all_runs,
    get_run_by_id,
    get_session,
    save_run,
    update_run,
)
from backend.models.schemas import AgentEvent, BidSummary, RunRecord

logger = logging.getLogger(__name__)

router = APIRouter(tags=["runs"])


def _is_pdf(pdf_file: UploadFile) -> bool:
    content_type = pdf_file.content_type or ""
    filename = pdf_file.filename or ""
    return content_type == "application/pdf" or filename.lower().endswith(".pdf")


def _mark_run_failed(run_id: str, pdf_filename: str) -> None:
    with Session(engine) as session:
        update_run(
            session,
            RunRecord(
                id=run_id,
                created_at=datetime.now(timezone.utc),
                status="failed",
                pdf_filename=pdf_filename,
                result=None,
            ),
        )


# Upload a PDF, run the agent pipeline, and stream progress back as Server-Sent Events (SSE).
@router.post("/runs/analyze")
async def analyze_run(
    pdf_file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> StreamingResponse:
    if not _is_pdf(pdf_file):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")

    pdf_bytes = await pdf_file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty")

    run_id = str(uuid4())
    pdf_filename = pdf_file.filename or "upload.pdf"

    run_record = RunRecord(
        id=run_id,
        created_at=datetime.now(timezone.utc),
        status="running",
        pdf_filename=pdf_filename,
        result=None,
    )
    save_run(session, run_record)

    async def event_stream() -> AsyncGenerator[str, None]:
        # SSE format: each message is "data: <json>\n\n" — the browser reads these one at a time.
        try:
            # The orchestrator yields AgentEvents (progress) and one BidSummary (final result).
            async for item in run_analysis(pdf_bytes, pdf_filename, run_id):

                # Step 1: yield agent events as SSE
                if isinstance(item, AgentEvent):
                    yield f"data: {item.model_dump_json()}\n\n"
                    if item.event_type == "error":
                        _mark_run_failed(run_id, pdf_filename)
                        return

                # Step 2: when BidSummary arrives, save to DB and send as final result
                elif isinstance(item, BidSummary):
                    with Session(engine) as db_session:
                        update_run(
                            db_session,
                            RunRecord(
                                id=run_id,
                                created_at=run_record.created_at,
                                status="complete",
                                pdf_filename=pdf_filename,
                                result=item,
                            ),
                        )

                    # Wrap the summary so the frontend knows this is the final payload, not a progress tick.
                    summary_dict = item.model_dump(mode="json")
                    yield f"data: {json.dumps({'type': 'result', 'payload': summary_dict})}\n\n"

        # Step 3: on any error, mark run as failed and send error event
        except Exception as exc:
            logger.exception("Stream failed for run %s", run_id)
            _mark_run_failed(run_id, pdf_filename)
            error_payload = json.dumps(
                {
                    "type": "error",
                    "payload": {"run_id": run_id, "message": str(exc)},
                }
            )
            yield f"data: {error_payload}\n\n"

    # text/event-stream tells the browser to keep the connection open and read events as they arrive.
    return StreamingResponse(event_stream(), media_type="text/event-stream")


# Return every saved run, newest first.
@router.get("/runs", response_model=list[RunRecord])
def list_runs(session: Session = Depends(get_session)) -> list[RunRecord]:
    return get_all_runs(session)


# Return one run by ID, including its bid summary if the analysis finished.
@router.get("/runs/{run_id}", response_model=RunRecord)
def get_run(run_id: str, session: Session = Depends(get_session)) -> RunRecord:
    run = get_run_by_id(session, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return run
