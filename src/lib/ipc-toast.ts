// Centralised IPC-error surface so main-process failures reach the user
// instead of evaporating into a silent `.catch(() => {})`. Prefer this
// over bespoke error handlers — a consistent toast style reads better and
// the devtools console still gets the full error object for debugging.
//
// Usage:
//   window.nohi.sessions.save(s).catch(toastIpcError('sessions:save'))
//
// For fire-and-forget polls where a transient failure is acceptable (e.g.
// MCP status retried next tick), keep the bare `.catch(() => {})` and
// leave an explicit comment — this helper is for user-visible failures.

import { toast } from 'sonner'

export function toastIpcError(label: string) {
  return (err: unknown): void => {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(`${label}: ${msg}`, { duration: 6000 })
    // eslint-disable-next-line no-console
    console.error(`[ipc:${label}]`, err)
  }
}
