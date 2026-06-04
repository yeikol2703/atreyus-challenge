from __future__ import annotations

from collections.abc import Generator
from datetime import datetime
from pathlib import Path

from sqlmodel import Field, Session, SQLModel, create_engine, select

from backend.models.schemas import BidSummary, RunRecord

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DATA_DIR / "runs.db"
DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DATABASE_URL, echo=False)


class RunTable(SQLModel, table=True):
    __tablename__ = "runs"

    id: str = Field(primary_key=True)
    created_at: datetime
    status: str
    pdf_filename: str
    result_json: str | None = None


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def save_run(session: Session, run_record: RunRecord) -> RunTable:
    result_json = (
        run_record.result.model_dump_json() if run_record.result is not None else None
    )
    run_table = RunTable(
        id=run_record.id,
        created_at=run_record.created_at,
        status=run_record.status,
        pdf_filename=run_record.pdf_filename,
        result_json=result_json,
    )
    session.add(run_table)
    session.commit()
    session.refresh(run_table)
    return run_table


def get_all_runs(session: Session) -> list[RunRecord]:
    statement = select(RunTable).order_by(RunTable.created_at.desc())
    rows = session.exec(statement).all()
    return [_run_table_to_record(row) for row in rows]


def get_run_by_id(session: Session, run_id: str) -> RunRecord | None:
    row = session.get(RunTable, run_id)
    if row is None:
        return None
    return _run_table_to_record(row)


def update_run(session: Session, run_record: RunRecord) -> RunTable | None:
    row = session.get(RunTable, run_record.id)
    if row is None:
        return None

    result_json = (
        run_record.result.model_dump_json() if run_record.result is not None else None
    )
    row.status = run_record.status
    row.result_json = result_json
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def _run_table_to_record(row: RunTable) -> RunRecord:
    result = (
        BidSummary.model_validate_json(row.result_json)
        if row.result_json is not None
        else None
    )
    return RunRecord(
        id=row.id,
        created_at=row.created_at,
        status=row.status,  # type: ignore[arg-type]
        pdf_filename=row.pdf_filename,
        result=result,
    )
