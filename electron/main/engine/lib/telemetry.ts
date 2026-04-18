// Local-only telemetry. Opt-in via settings.telemetry.enabled; default OFF.
// Writes JSONL summaries to ~/.nohi/telemetry/<YYYY-MM>.jsonl so the user can
// open + inspect every line. Nothing is uploaded. Nothing is ever transmitted
// to Nohi or any third party — this is purely for the merchant's own records
// (and for bug reports, where they can paste a day's worth into an issue).
//
// Why bother? The Phase 0 meta-critique noted we had zero visibility into
// real usage. This gives users *themselves* a record; it does NOT transmit.
//
// Schema per line:
//   { ts, event, sessionId?, model?, provider?, tools?, tokensIn?, tokensOut?, durationMs?, error? }

import { mkdir, appendFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { log } from './logger'

const TELEMETRY_DIR = join(homedir(), '.nohi', 'telemetry')

let enabled = false
export function setTelemetryEnabled(value: boolean): void {
  enabled = !!value
}

export function isTelemetryEnabled(): boolean {
  return enabled
}

export type TelemetryEvent =
  | { event: 'session_start'; sessionId: string; model: string; provider?: string }
  | { event: 'session_end'; sessionId: string; durationMs: number; tokensIn: number; tokensOut: number; toolCalls: number; toolErrors: number }
  | { event: 'tool_call'; sessionId: string; name: string; durationMs: number; isError: boolean }
  | { event: 'provider_error'; sessionId: string; provider: string; message: string }
  | { event: 'catalog_upsert'; merchantId: string; success: boolean; readinessScore?: number }
  | { event: 'ingest_orders'; merchantId: string; count: number }

function monthFile(): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return join(TELEMETRY_DIR, `${stamp}.jsonl`)
}

let initialized = false
let pending: string[] = []

async function ensureDir(): Promise<void> {
  if (initialized) return
  try {
    await mkdir(TELEMETRY_DIR, { recursive: true })
    initialized = true
    if (pending.length > 0) {
      const path = monthFile()
      await appendFile(path, pending.join('\n') + '\n', 'utf-8').catch(() => {})
      pending = []
    }
  } catch {
    // Filesystem broken — drop silently. Telemetry must never crash the app.
  }
}

export function record(event: TelemetryEvent): void {
  if (!enabled) return
  const line = JSON.stringify({ ts: Date.now(), ...event })
  if (!initialized) {
    pending.push(line)
    ensureDir().catch(() => {})
    return
  }
  appendFile(monthFile(), line + '\n', 'utf-8').catch((err) => {
    log('warn', '[telemetry] append failed', err)
  })
}

export function getTelemetryDir(): string {
  return TELEMETRY_DIR
}
