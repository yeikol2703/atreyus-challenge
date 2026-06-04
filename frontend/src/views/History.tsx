import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RunCard from '../components/RunCard'
import { getRuns } from '../lib/api'
import type { RunRecord } from '../types/api'

export default function History() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRuns = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getRuns()
      setRuns(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load run history',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRuns()
  }, [loadRuns])

  return (
    <div>
      <div className="mb-8">
        <span className="mb-2 inline-block text-xs font-medium uppercase tracking-wider text-atreyus-purple">
          Past Analyses
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Run History
        </h1>
        <p className="mt-2 text-sm text-atreyus-muted">
          Review previous RFP analyses and bid summaries
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-atreyus bg-atreyus-surface"
            />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="card p-6">
          <p className="text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void loadRuns()}
            className="btn-secondary mt-3"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && runs.length === 0 && (
        <div className="card py-16 text-center">
          <img
            src="/atreyus-logo.svg"
            alt=""
            aria-hidden
            className="mx-auto mb-4 h-14 w-14 opacity-20"
          />
          <p className="text-atreyus-muted">No runs yet</p>
          <p className="mt-1 text-sm text-atreyus-muted-light">
            Upload an RFP to get started
          </p>
          <Link to="/" className="btn-primary mt-6 inline-flex px-6 py-2.5">
            New Analysis
          </Link>
        </div>
      )}

      {!isLoading && !error && runs.length > 0 && (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              onClick={() => navigate(`/runs/${run.id}/live`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
