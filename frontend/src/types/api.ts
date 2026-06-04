export type LineItem = {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price: number | null
  total_price: number | null
  confidence: number
}

export type BidSummary = {
  id: string
  run_id: string
  project_name: string
  extracted_at: string
  line_items: LineItem[]
  status: 'draft' | 'finalized'
  notes: string | null
  total_amount: number | null
}

export type AgentEvent = {
  run_id: string
  event_type: 'started' | 'extracting' | 'pricing' | 'complete' | 'error'
  agent: 'orchestrator' | 'pricing'
  message: string
  data: Record<string, unknown> | null
  timestamp: string
}

export type RunRecord = {
  id: string
  created_at: string
  status: 'running' | 'complete' | 'failed'
  pdf_filename: string
  result: BidSummary | null
}

export type SSEResultMessage = {
  type: 'result'
  payload: BidSummary
}
