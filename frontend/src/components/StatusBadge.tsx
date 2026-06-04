export type StatusBadgeStatus =
  | 'running'
  | 'complete'
  | 'failed'
  | 'draft'
  | 'finalized'

interface StatusBadgeProps {
  status: StatusBadgeStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'complete' || status === 'finalized') {
    return (
      <span className="rounded-pill border border-atreyus-accent/30 bg-atreyus-accent/10 px-2.5 py-0.5 text-xs font-medium text-atreyus-accent">
        {status}
      </span>
    )
  }

  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill border border-atreyus-purple/30 bg-atreyus-purple/10 px-2.5 py-0.5 text-xs font-medium text-atreyus-purple">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-atreyus-purple" />
        running
      </span>
    )
  }

  if (status === 'draft') {
    return (
      <span className="rounded-pill border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
        draft
      </span>
    )
  }

  return (
    <span className="rounded-pill border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
      failed
    </span>
  )
}
