import { formatCurrency } from '../lib/utils'
import type { RunRecord } from '../types/api'
import StatusBadge from './StatusBadge'

interface RunCardProps {
  run: RunRecord
  onClick: () => void
}

function formatCreatedAt(iso: string): string {
  const date = new Date(iso)
  const datePart = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timePart = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${datePart} at ${timePart}`
}

export default function RunCard({ run, onClick }: RunCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="card group cursor-pointer p-5 transition-all duration-200 hover:border-atreyus-purple/40 hover:shadow-glow-purple"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-atreyus-purple/10 transition-colors group-hover:bg-atreyus-purple/20">
              <svg
                className="h-4 w-4 text-atreyus-purple"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <p className="truncate text-sm font-medium text-white">
              {run.pdf_filename}
            </p>
          </div>
          <p className="mt-2 pl-10 text-xs text-atreyus-muted">
            {formatCreatedAt(run.created_at)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <StatusBadge status={run.status} />
          {run.result?.total_amount != null && (
            <p className="mt-2 text-sm font-semibold text-atreyus-accent">
              {formatCurrency(run.result.total_amount)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
