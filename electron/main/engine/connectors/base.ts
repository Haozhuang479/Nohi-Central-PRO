// Generic connector factory.
//
// Best fit for "token-based" connectors where verify = single ping with the user-supplied
// credentials. Used by Shopify; the next token connector (Klaviyo, Notion API key, etc.)
// can be added in ~30 LOC by writing a new ConnectorAdapter.
//
// Not used by Google Drive on purpose — its OAuth Loopback flow inverts control (the
// "verify" step itself drives the user through a browser dance), so it stays in
// gdrive.ts as a one-off. We could shoehorn it into this factory but it would
// remove clarity, not add it.

import { z } from 'zod'
import { saveCredentials, loadCredentials, deleteCredentials, type ConnectorId } from './store'

/** What every connector must provide. */
export interface ConnectorAdapter<Creds> {
  id: ConnectorId
  /** Display name shown in the Connectors UI. */
  name: string
  /** Schema for the persisted credential shape (must include _account / _connectedAt / etc fields). */
  schema: z.ZodType<Creds>
  /**
   * Verify a candidate credential set. Should hit a lightweight remote endpoint
   * to confirm the credentials work, and return an account label for UI display.
   *
   * Receives whatever the connect() caller passed. Adapter decides shape.
   */
  verify(input: unknown): Promise<{ ok: true; creds: Creds; account: string } | { ok: false; error: string }>
}

export interface ConnectorBindings<Creds> {
  /** Connect: verify, save, return result. */
  connect(input: unknown): Promise<{ ok: true; account: string } | { ok: false; error: string }>
  /** Wipe credentials from disk. */
  disconnect(): Promise<void>
  /** Load + Zod-validate stored credentials. Returns null if absent or corrupt. */
  getCreds(): Promise<Creds | null>
}

export function defineConnector<Creds>(adapter: ConnectorAdapter<Creds>): ConnectorBindings<Creds> {
  return {
    async connect(input) {
      const verified = await adapter.verify(input)
      if (!verified.ok) return { ok: false, error: verified.error }
      // Stamp metadata fields on the persisted record.
      // We do this with a clone so we don't mutate the original.
      const creds = {
        ...verified.creds,
        _account: verified.account,
        _connectedAt: Date.now(),
      } as Record<string, unknown>
      await saveCredentials(adapter.id, creds)
      return { ok: true, account: verified.account }
    },

    async disconnect() {
      await deleteCredentials(adapter.id)
    },

    async getCreds() {
      const raw = await loadCredentials<Record<string, unknown>>(adapter.id)
      if (!raw) return null
      const parsed = adapter.schema.safeParse(raw)
      return parsed.success ? parsed.data : null
    },
  }
}
