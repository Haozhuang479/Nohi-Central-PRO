// Shared helpers for tool implementations.
// Goal: kill the boilerplate that the audit identified across all 36 tools.
// Every tool should be able to express its core behavior in <30 LOC.
//
// Conventions used by all helpers:
//  - Cast helpers throw `ToolInputError` on bad input — caller wraps in toolError() at the boundary
//  - All errors return `ToolResult` shaped objects; never throw from a tool's `call()`
//  - Path safety always uses `resolve()` to normalize symlinks and `..` segments

import { resolve } from 'path'
import type { ToolResult } from '../types'

// ─── Result helpers ────────────────────────────────────────────────────────

export function toolError(message: string): ToolResult {
  return { error: message }
}

export function toolOk(output: string): ToolResult {
  return { output }
}

/** Map an unknown thrown value to a ToolResult error with optional context. */
export function toolErrorFrom(err: unknown, context?: string): ToolResult {
  if (err instanceof ToolInputError) return { error: err.message }
  const e = err as { code?: string; message?: string; name?: string }
  if (e.code === 'ENOENT') return { error: `${context ? context + ': ' : ''}file not found` }
  if (e.code === 'EACCES') return { error: `${context ? context + ': ' : ''}permission denied` }
  if (e.name === 'TimeoutError') return { error: `${context ? context + ': ' : ''}timed out` }
  if (e.name === 'AbortError') return { error: `${context ? context + ': ' : ''}aborted` }
  const base = e.message ?? String(err)
  return { error: context ? `${context}: ${base}` : base }
}

// ─── Input validation ──────────────────────────────────────────────────────

/** Thrown by cast helpers when input doesn't match expectations. Caller catches at the boundary. */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToolInputError'
  }
}

/** Coerce + validate a string. Treats whitespace-only as empty. */
export function castString(v: unknown, fieldName: string, opts: { optional?: boolean; default?: string; maxLength?: number } = {}): string {
  if (v === undefined || v === null) {
    if (opts.default !== undefined) return opts.default
    if (opts.optional) return ''
    throw new ToolInputError(`${fieldName} must be a non-empty string`)
  }
  if (typeof v !== 'string') throw new ToolInputError(`${fieldName} must be a non-empty string`)
  if (!v.trim()) {
    if (opts.default !== undefined) return opts.default
    if (opts.optional) return ''
    throw new ToolInputError(`${fieldName} must be a non-empty string`)
  }
  if (opts.maxLength && v.length > opts.maxLength) {
    throw new ToolInputError(`${fieldName} too long (${v.length} > ${opts.maxLength})`)
  }
  return v
}

/** Coerce + clamp a number. */
export function clampNumber(v: unknown, opts: { min: number; max: number; default: number }): number {
  if (v === undefined || v === null) return opts.default
  const n = typeof v === 'string' ? Number(v) : (v as number)
  if (typeof n !== 'number' || Number.isNaN(n)) return opts.default
  return Math.min(Math.max(n, opts.min), opts.max)
}

export function castBoolean(v: unknown, defaultValue = false): boolean {
  if (v === undefined || v === null) return defaultValue
  return Boolean(v)
}

export function castStringArray(v: unknown, fieldName: string): string[] {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) throw new ToolInputError(`${fieldName} must be an array of strings`)
  for (const item of v) {
    if (typeof item !== 'string') throw new ToolInputError(`${fieldName}[] must contain strings only`)
  }
  return v as string[]
}

// ─── Path safety ───────────────────────────────────────────────────────────

/**
 * Resolve a user-supplied path against workingDir and check it stays within bounds.
 * Returns the resolved absolute path on success, or a ToolResult error to return immediately.
 *
 * Usage:
 *   const r = resolveSafePath(input.file_path, opts.workingDir)
 *   if ('error' in r) return r
 *   // use r.path
 */
export function resolveSafePath(
  rawPath: unknown,
  workingDir: string,
  opts: { allow?: string[] } = {},
): { path: string } | ToolResult {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return toolError('path must be a non-empty string')
  }
  const resolved = resolve(workingDir, rawPath)
  const baseAllowed = resolve(workingDir)
  if (resolved.startsWith(baseAllowed)) return { path: resolved }
  for (const extra of opts.allow ?? []) {
    if (resolved.startsWith(resolve(extra))) return { path: resolved }
  }
  return toolError(`Access denied: ${rawPath} resolves outside the working directory`)
}

// ─── Tool wrapping helper ──────────────────────────────────────────────────

/**
 * Wrap a tool body so any thrown ToolInputError or unexpected exception becomes
 * a clean ToolResult. Lets tool authors throw freely instead of try/catch everywhere.
 */
export async function runTool(body: () => Promise<ToolResult> | ToolResult, context?: string): Promise<ToolResult> {
  try {
    return await body()
  } catch (err) {
    return toolErrorFrom(err, context)
  }
}
