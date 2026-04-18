// Rolling file logger for the Electron main process.
// Writes to ~/.nohi/logs/<YYYY-MM-DD>.log, prunes files older than 14 days.
// Mirrors output to console so dev workflows are unchanged.
//
// Usage: import { log, logError } from '../lib/logger'
//        log('info', '[skills]', 'reloaded', { count: 23 })
//        logError(err, '[catalog]', 'upsert failed', { oneId })

import { mkdirSync, appendFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const LOG_DIR = join(homedir(), '.nohi', 'logs')
const RETENTION_DAYS = 14

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

let initialized = false
let bufferedQueue: string[] = []

function init(): void {
  if (initialized) return
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
    initialized = true
    pruneOldFiles()
    // Drain anything that arrived before init
    if (bufferedQueue.length > 0) {
      const path = currentPath()
      for (const line of bufferedQueue) {
        try { appendFileSync(path, line + '\n', 'utf-8') } catch { /* swallow — logger must never crash */ }
      }
      bufferedQueue = []
    }
  } catch {
    // Filesystem broken (read-only home, etc.) — keep working in console-only mode
    initialized = true
  }
}

function currentPath(): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return join(LOG_DIR, `${stamp}.log`)
}

function pruneOldFiles(): void {
  try {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    for (const f of readdirSync(LOG_DIR)) {
      if (!f.endsWith('.log')) continue
      const full = join(LOG_DIR, f)
      try {
        const st = statSync(full)
        if (st.mtimeMs < cutoff) unlinkSync(full)
      } catch { /* skip */ }
    }
  } catch { /* dir gone — fine */ }
}

function fmt(level: LogLevel, parts: unknown[]): string {
  const ts = new Date().toISOString()
  const body = parts.map((p) => {
    if (p instanceof Error) return `${p.name}: ${p.message}\n${p.stack ?? ''}`
    if (typeof p === 'string') return p
    try { return JSON.stringify(p) } catch { return String(p) }
  }).join(' ')
  return `${ts} [${level.toUpperCase()}] ${body}`
}

export function log(level: LogLevel, ...parts: unknown[]): void {
  const line = fmt(level, parts)

  // Always echo to console for dev visibility
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)

  if (!initialized) {
    bufferedQueue.push(line)
    init()
    return
  }
  try {
    appendFileSync(currentPath(), line + '\n', 'utf-8')
  } catch {
    // Disk full / read-only — console echo above already handled visibility
  }
}

export function logError(err: unknown, ...context: unknown[]): void {
  log('error', ...context, err)
}

export function getLogDir(): string {
  return LOG_DIR
}
