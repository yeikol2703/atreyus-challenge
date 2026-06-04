import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadPDF } from '../lib/api'
import type { AgentEvent, BidSummary } from '../types/api'

function formatFileSizeKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function NewRun() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const runIdRef = useRef<string | null>(null)
  const eventsRef = useRef<AgentEvent[]>([])

  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectFile = (selected: File | null) => {
    if (!selected) return
    if (
      selected.type !== 'application/pdf' &&
      !selected.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('Please select a PDF file')
      return
    }
    setError(null)
    setFile(selected)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    selectFile(dropped ?? null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    selectFile(selected)
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!file || isLoading) return

    setIsLoading(true)
    setError(null)
    runIdRef.current = null
    eventsRef.current = []

    await uploadPDF(
      file,
      (event: AgentEvent) => {
        eventsRef.current = [...eventsRef.current, event]
        if (runIdRef.current === null) {
          runIdRef.current = event.run_id
        }
      },
      (_result: BidSummary) => {
        setIsLoading(false)
        const runId = runIdRef.current ?? _result.run_id
        if (runId) {
          navigate(`/runs/${runId}/live`, {
            state: { events: eventsRef.current, result: _result },
          })
        } else {
          setError('Analysis completed but run ID was not received')
        }
      },
      (message: string) => {
        setError(message)
        setIsLoading(false)
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl pt-8 sm:pt-16">
      <div className="mb-10 text-center">
        <span className="mb-4 inline-block rounded-pill border border-atreyus-purple/30 bg-atreyus-purple/10 px-4 py-1 text-xs font-medium uppercase tracking-wider text-atreyus-purple">
          RFP Analysis
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Accelerate Your RFP Response
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-atreyus-muted sm:text-base">
          Upload a construction RFP and let AI extract line items, estimate
          market pricing, and deliver an actionable bid summary.
        </p>
      </div>

      <div className="card-elevated p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-atreyus-purple/15">
            <svg
              className="h-5 w-5 text-atreyus-purple"
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
          <div>
            <h2 className="text-lg font-semibold text-white">Document Upload</h2>
            <p className="text-sm text-atreyus-muted">
              PDF format · construction RFPs
            </p>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-atreyus border-2 border-dashed p-10 text-center transition-all duration-200 ${
            isDragging
              ? 'border-atreyus-purple bg-atreyus-purple/10 shadow-glow-purple'
              : 'border-atreyus-border bg-atreyus-bg/50 hover:border-atreyus-purple/50 hover:bg-atreyus-bg'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {file ? (
            <div>
              <p className="font-medium text-white">{file.name}</p>
              <p className="mt-1 text-sm text-atreyus-muted">
                {formatFileSizeKb(file.size)}
              </p>
            </div>
          ) : (
            <>
              <img
                src="/atreyus-logo.svg"
                alt=""
                aria-hidden
                className="mx-auto mb-4 h-12 w-12 opacity-30"
              />
              <p className="font-medium text-white">Drop your PDF here</p>
              <p className="mt-1 text-sm text-atreyus-muted">
                or click to browse
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!file || isLoading}
          className="btn-primary mt-6 w-full justify-center py-3.5"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Analyzing…
            </span>
          ) : (
            'Analyze RFP'
          )}
        </button>

        {error && (
          <p className="mt-3 text-center text-sm text-red-400">{error}</p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        {[
          { label: 'Extract', desc: 'Line items from PDF' },
          { label: 'Price', desc: 'Market estimates' },
          { label: 'Summarize', desc: 'Actionable bid' },
        ].map((step) => (
          <div key={step.label} className="card px-3 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-atreyus-accent">
              {step.label}
            </p>
            <p className="mt-1 text-xs text-atreyus-muted">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
