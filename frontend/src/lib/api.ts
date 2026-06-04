import type {
  AgentEvent,
  BidSummary,
  RunRecord,
  SSEResultMessage,
} from '../types/api'

const BASE_URL = 'http://localhost:8000/api'

function processSSELine(
  line: string,
  onEvent: (event: AgentEvent) => void,
  onResult: (result: BidSummary) => void,
  onError: (message: string) => void,
): void {
  if (!line.startsWith('data: ')) return

  const jsonStr = line.slice('data: '.length).trim()
  if (!jsonStr) return

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>
  } catch {
    onError('Failed to parse SSE message')
    return
  }

  if (parsed.type === 'result') {
    onResult((parsed as SSEResultMessage).payload)
    return
  }

  if (parsed.event_type === 'error') {
    onError(String(parsed.message))
    return
  }

  onEvent(parsed as AgentEvent)
}

async function readSSEStream(
  response: Response,
  onEvent: (event: AgentEvent) => void,
  onResult: (result: BidSummary) => void,
  onError: (message: string) => void,
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) {
    onError('Response body is not readable')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        processSSELine(line, onEvent, onResult, onError)
      }
    }

    if (buffer.trim()) {
      processSSELine(buffer, onEvent, onResult, onError)
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Network error')
  } finally {
    reader.releaseLock()
  }
}

export async function uploadPDF(
  file: File,
  onEvent: (event: AgentEvent) => void,
  onResult: (result: BidSummary) => void,
  onError: (message: string) => void,
): Promise<void> {
  const formData = new FormData()
  formData.append('pdf_file', file)

  try {
    const response = await fetch(`${BASE_URL}/runs/analyze`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      let message = `Upload failed (${response.status})`
      try {
        const body = (await response.json()) as { detail?: string }
        if (typeof body.detail === 'string') message = body.detail
      } catch {
        /* use default message */
      }
      onError(message)
      return
    }

    await readSSEStream(response, onEvent, onResult, onError)
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Network error')
  }
}

export async function getRuns(): Promise<RunRecord[]> {
  const response = await fetch(`${BASE_URL}/runs`)
  if (!response.ok) {
    throw new Error(`Failed to fetch runs (${response.status})`)
  }
  return response.json() as Promise<RunRecord[]>
}

export async function getRun(id: string): Promise<RunRecord> {
  const response = await fetch(`${BASE_URL}/runs/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch run (${response.status})`)
  }
  return response.json() as Promise<RunRecord>
}
