import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import AgentEventLog from '../components/AgentEventLog'
import BidSummaryTable from '../components/BidSummaryTable'
import StatusBadge from '../components/StatusBadge'
import { getRun } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import type { AgentEvent, BidSummary, LineItem } from '../types/api'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function computeTotalAmount(items: LineItem[]): number | null {
  if (items.length === 0) return null
  let sum = 0
  for (const item of items) {
    if (item.total_price === null) return null
    sum += item.total_price
  }
  return sum
}

export default function LiveRun() {
  const { runId } = useParams<{ runId: string }>()
  const location = useLocation()
  const navState = location.state as {
    events?: AgentEvent[]
    result?: BidSummary
  } | null

  const [events, setEvents] = useState<AgentEvent[]>([])
  const [result, setResult] = useState<BidSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editedItems, setEditedItems] = useState<LineItem[]>([])
  const [summaryStatus, setSummaryStatus] = useState<'draft' | 'finalized'>(
    'draft',
  )
  const [runStatus, setRunStatus] = useState<
    'running' | 'complete' | 'failed' | null
  >(null)
  const [isLoading, setIsLoading] = useState(true)

  const applyResult = useCallback((summary: BidSummary) => {
    setResult(summary)
    setEditedItems(summary.line_items.map((item) => ({ ...item })))
    setSummaryStatus(summary.status)
    setError(null)
  }, [])

  const loadRun = useCallback(async () => {
    if (!runId) {
      setError('Invalid run ID')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const run = await getRun(runId)
      setRunStatus(run.status)

      if (run.status === 'complete' && run.result) {
        applyResult(run.result)
      } else if (run.status === 'failed') {
        setResult(null)
        setError('Analysis failed')
      } else {
        setResult(null)
        setError(null)
      }
    } catch {
      setRunStatus(null)
      setResult(null)
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }, [runId, applyResult])

  useEffect(() => {
    const hasEvents = (navState?.events?.length ?? 0) > 0
    const hasResult = navState?.result != null

    if (hasEvents && navState?.events) {
      setEvents(navState.events)
    }
    if (hasResult && navState?.result) {
      applyResult(navState.result)
      setRunStatus('complete')
    }

    if (!hasEvents && !hasResult) {
      void loadRun()
    } else {
      setIsLoading(false)
    }
  }, [navState, applyResult, loadRun])

  const updateLineItem = (
    id: string,
    field: 'quantity' | 'unit_price',
    rawValue: string,
  ) => {
    setEditedItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item

        const parsed = rawValue === '' ? null : Number.parseFloat(rawValue)
        const quantity =
          field === 'quantity'
            ? parsed === null || Number.isNaN(parsed)
              ? item.quantity
              : parsed
            : item.quantity
        const unitPrice =
          field === 'unit_price'
            ? parsed === null || Number.isNaN(parsed)
              ? null
              : parsed
            : item.unit_price

        const totalPrice =
          unitPrice !== null && !Number.isNaN(quantity)
            ? quantity * unitPrice
            : null

        return {
          ...item,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        }
      }),
    )
  }

  const totalAmount = computeTotalAmount(editedItems)

  if (!runId) {
    return (
      <p className="text-center text-red-400">Invalid run ID in URL.</p>
    )
  }

  if (error) {
    return (
      <div className="card mx-auto max-w-2xl border-red-900/50 bg-red-950/30 p-6">
        <h2 className="font-semibold text-red-400">Analysis Failed</h2>
        <p className="mt-2 text-red-300">{error}</p>
        <Link to="/" className="btn-primary mt-4 inline-flex px-5 py-2">
          Try Again
        </Link>
      </div>
    )
  }

  if (result) {
    return (
      <div>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="mb-2 inline-block text-xs font-medium uppercase tracking-wider text-atreyus-accent">
              Bid Summary
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {result.project_name}
            </h1>
            <p className="mt-2 text-sm text-atreyus-muted">
              Extracted {formatDate(result.extracted_at)} · {editedItems.length}{' '}
              items · <StatusBadge status={summaryStatus} />
            </p>
          </div>
          <div className="card shrink-0 px-6 py-4 text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-atreyus-muted">
              Total Estimate
            </p>
            {totalAmount !== null ? (
              <p className="mt-1 text-2xl font-bold text-atreyus-accent">
                {formatCurrency(totalAmount)}
              </p>
            ) : (
              <p className="mt-1 text-2xl font-bold text-atreyus-muted">
                Calculating…
              </p>
            )}
          </div>
        </div>

        <BidSummaryTable items={editedItems} onUpdateItem={updateLineItem} />

        <div className="mt-6 flex items-center gap-4">
          {summaryStatus === 'draft' && (
            <button
              type="button"
              onClick={() => setSummaryStatus('finalized')}
              className="btn-primary px-5 py-2"
            >
              Mark as Finalized
            </button>
          )}
          <Link
            to="/"
            className="text-sm text-atreyus-muted transition hover:text-white"
          >
            Rerun Analysis
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="inline-flex items-center gap-3 rounded-atreyus border border-atreyus-border bg-atreyus-surface px-6 py-4">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-atreyus-purple" />
          <span className="text-sm text-atreyus-muted">Loading run…</span>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-atreyus-muted">
          Run not found or still processing
          {runStatus === 'running' ? '…' : ''}
        </p>
        <button
          type="button"
          onClick={() => void loadRun()}
          className="btn-secondary mt-4"
        >
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <span className="mb-2 inline-block text-xs font-medium uppercase tracking-wider text-atreyus-purple">
          AI Analysis Engine
        </span>
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Analyzing RFP…
        </h1>
      </div>
      <div className="card p-6">
        <AgentEventLog
          events={events}
          isRunning={isLoading || runStatus === 'running'}
        />
      </div>
    </div>
  )
}
