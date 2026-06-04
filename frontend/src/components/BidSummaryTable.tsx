import { formatCurrency } from '../lib/utils'
import type { LineItem } from '../types/api'

interface BidSummaryTableProps {
  items: LineItem[]
  onUpdateItem: (
    id: string,
    field: 'quantity' | 'unit_price',
    value: string,
  ) => void
}

function confidenceBarColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-atreyus-accent'
  if (confidence >= 0.5) return 'bg-yellow-500'
  return 'bg-red-500'
}

export default function BidSummaryTable({
  items,
  onUpdateItem,
}: BidSummaryTableProps) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-atreyus-border bg-atreyus-bg/50 text-left text-xs uppercase tracking-wide text-atreyus-muted">
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium text-right">Qty</th>
            <th className="px-4 py-3 font-medium">Unit</th>
            <th className="px-4 py-3 font-medium text-right">Unit Price</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-atreyus-border/60 transition-colors last:border-0 hover:bg-atreyus-purple/5"
            >
              <td className="px-4 py-3 text-sm text-white">
                {item.description}
              </td>
              <td className="px-4 py-3 text-right">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdateItem(item.id, 'quantity', e.target.value)
                  }
                  className="input-inline w-16"
                />
              </td>
              <td className="px-4 py-3 text-xs text-atreyus-muted">
                {item.unit}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center justify-end">
                  <span className="mr-1 text-sm text-atreyus-muted">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price ?? ''}
                    onChange={(e) =>
                      onUpdateItem(item.id, 'unit_price', e.target.value)
                    }
                    className="input-inline w-20"
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-right text-sm text-white/80">
                {item.total_price !== null
                  ? formatCurrency(item.total_price)
                  : '—'}
              </td>
              <td className="px-4 py-3">
                <div
                  className="h-2 w-12 overflow-hidden rounded-full bg-atreyus-elevated"
                  title={`${Math.round(item.confidence * 100)}%`}
                >
                  <div
                    className={`h-2 rounded-full ${confidenceBarColor(item.confidence)}`}
                    style={{ width: `${Math.round(item.confidence * 100)}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
