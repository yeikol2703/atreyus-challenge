# Atreyus — Multi-Agent Bid Analysis

## Overview

Atreyus is a multi-agent system that ingests construction RFP PDFs and produces structured bid summaries with estimated line-item pricing. Users upload a PDF, watch real-time progress over Server-Sent Events (SSE), and receive a finalized `BidSummary` with extracted materials, quantities, units, and market price estimates.

Built as a technical interview demo: two specialized agents orchestrated in a linear pipeline, typed Pydantic schemas end-to-end, and a React frontend for upload, live streaming, and run history.

Live demo: https://atreyus-challenge.vercel.app

## Architecture

```
User uploads PDF
      │
      ▼
┌─────────────────────┐
│  Orchestrator Agent  │  ← extracts line items from PDF via tool calling
│  (OpenAI / GPT-4o-mini)   │
└────────┬────────────┘
         │ delegates pricing
         ▼
┌─────────────────────┐
│   Pricing Agent      │  ← estimates market prices via tool calling
│  (OpenAI / GPT-4o-mini)   │
└────────┬────────────┘
         │ returns priced items
         ▼
┌─────────────────────┐
│   BidSummary         │  → persisted to SQLite, streamed to frontend
└─────────────────────┘
```

Agents communicate via direct async function calls with typed Pydantic interfaces. The Orchestrator calls `price_line_items(list[LineItem])` and receives `list[LineItem]` back. No message bus — chosen for simplicity and because the delegation is synchronous and linear.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Backend | FastAPI + Python 3.11 | Async-native, automatic OpenAPI docs, great SSE support |
| Agents | OpenAI GPT-4o-mini with tool calling | Structured function calls, no tool call limits |
| Schemas | Pydantic v2 | Shared typed contracts between agents, API, and DB serialization |
| Database | SQLite + SQLModel | Zero-config persistence for demo runs and results |
| Streaming | Server-Sent Events (SSE) | Simple one-way progress stream from backend to browser |
| Frontend | React + TypeScript + Vite | Fast dev loop, type-safe API client |
| Styling | Tailwind CSS | Utility-first UI without a heavy component library |

## Project Structure

```
atreyus/
├── backend/
│   ├── agents/
│   │   ├── orchestrator.py   # Extracts line items from PDF via Groq tool calling
│   │   └── pricing.py        # Estimates market prices for extracted items
│   ├── db/
│   │   └── database.py       # SQLite + SQLModel setup, CRUD for runs
│   ├── models/
│   │   └── schemas.py        # Pydantic v2 contracts (LineItem, BidSummary, AgentEvent)
│   ├── routes/
│   │   └── runs.py           # PDF upload, SSE streaming, run history endpoints
│   ├── tests/
│   │   ├── test_orchestrator.py
│   │   └── test_schemas.py
│   └── main.py               # FastAPI app entry point
├── frontend/
│   └── src/
│       ├── components/       # RunCard, BidSummaryTable, AgentEventLog, StatusBadge
│       ├── lib/              # API client (api.ts) and utilities
│       ├── types/            # TypeScript types mirroring backend schemas
│       └── views/            # NewRun, LiveRun, History pages
├── data/                     # SQLite DB created at runtime
└── README.md
```

## Setup

All commands are run from the project root unless noted.

### Backend

```bash
pip install fastapi uvicorn sqlmodel openai pypdf pydantic python-dotenv pytest pytest-asyncio
```

Create `.env` in project root:

```
OPENAI_API_KEY=your_key_here
```

Run from the project root:

```bash
python -m uvicorn backend.main:app --reload
```

API health check: `GET http://localhost:8000/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Tests

```bash
python -m pytest backend/tests/ -v
```


## Key Design Decisions

**Why direct function calls between agents, not a message bus?**  
The delegation is linear and synchronous — Orchestrator calls Pricing and waits. 
A message bus would add broker infrastructure with no benefit at this scale.
The contract is enforced by Pydantic types, not by the transport.

**Why SSE instead of WebSockets?**  
Agent progress is server-to-client only. SSE is unidirectional, runs over plain HTTP,
and requires no protocol upgrade. WebSockets make sense when the client needs 
to send messages mid-stream — that's not the case here.

**Why tool calling instead of plain prompts?**  
Tool calling forces the model to return typed, structured arguments that map 
directly to Pydantic schemas. A plain prompt would return free text requiring 
fragile regex parsing. Tool calling is the correct primitive for structured extraction.

**Why SQLite instead of PostgreSQL?**  
Zero infrastructure for a demo. SQLModel uses the same interface for both — 
swapping to Postgres in production is a one-line connection string change.

## Trade-offs & Known Limitations

- **No auth**: Authentication and multi-tenancy are out of scope for this demo.

- **Edit state is local**: Edits to the bid summary are not persisted back to the DB. In production: add a `PATCH /runs/{id}` endpoint and save edited items.

- **PDF text only**: Uses pypdf for text extraction, which fails on scanned/image PDFs. Fix: add OCR via pytesseract or use a vision model.

## What I'd change for production

- **Upgrade the model layer** — Use Claude or GPT-4 (or a vision model) for higher extraction accuracy, larger context windows, and fewer tool-call limits on dense RFPs.
- **Batch processing** — Split large line-item lists into chunks for extraction and pricing so every item is covered reliably.
- **Authentication & tenancy** — Add JWT or OAuth, per-user run isolation, and API key management instead of a shared Groq key.
- **Persist edits** — Add `PATCH /api/runs/{id}` to save user corrections to line items, notes, and finalized status.
- **Resilience** — Retry Groq calls with exponential backoff, idempotent run IDs, and dead-letter handling for failed analyses.
