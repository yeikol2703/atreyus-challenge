import type { AgentEvent } from '../types/api'

interface AgentEventLogProps {
  events: AgentEvent[]
  isRunning: boolean
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function dotColor(eventType: AgentEvent['event_type']): string {
  switch (eventType) {
    case 'complete':
      return 'bg-atreyus-accent'
    case 'error':
      return 'bg-red-500'
    case 'pricing':
      return 'bg-atreyus-purple'
    default:
      return 'bg-atreyus-muted'
  }
}

export default function AgentEventLog({ events, isRunning }: AgentEventLogProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={`${event.timestamp}-${index}`} className="flex items-start gap-3">
          <span
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor(event.event_type)}`}
          />
          <span className="rounded-pill border border-atreyus-purple/30 bg-atreyus-purple/10 px-2.5 py-0.5 text-xs font-medium text-atreyus-purple">
            {event.agent}
          </span>
          <p className="flex-1 text-sm text-white/80">{event.message}</p>
          <span className="ml-auto shrink-0 text-xs text-atreyus-muted-light">
            {formatTime(event.timestamp)}
          </span>
        </div>
      ))}

      {isRunning && (
        <div className="flex items-center gap-3 border-t border-atreyus-border pt-4">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-atreyus-purple" />
          <span className="text-sm text-atreyus-muted">Processing…</span>
        </div>
      )}
    </div>
  )
}
