// Connector credential store — JSON files under ~/.nohi/connectors/
// Each connector owns one file; the app never reads the file content into the renderer.
// Tools running in the main process load credentials on demand.

import { readFile, writeFile, mkdir, unlink, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export type ConnectorId = 'shopify' | 'gdrive'

export interface ConnectorMeta {
  id: ConnectorId
  /** Display name */
  name: string
  /** Connection summary shown in the Connectors UI (e.g. shop domain, account email) */
  account?: string
  /** Whether the connector is currently connected */
  connected: boolean
  /** Unix ms when the credentials were stored */
  connectedAt?: number
  /** Last time any tool used these credentials */
  lastUsedAt?: number
  /** Last error message (if connection failed) */
  lastError?: string
}

const CONNECTORS_DIR = join(homedir(), '.nohi', 'connectors')

async function ensureDir(): Promise<void> {
  await mkdir(CONNECTORS_DIR, { recursive: true })
}

function credPath(id: ConnectorId): string {
  return join(CONNECTORS_DIR, `${id}.json`)
}

export async function saveCredentials<T extends Record<string, unknown>>(id: ConnectorId, creds: T): Promise<void> {
  await ensureDir()
  await writeFile(credPath(id), JSON.stringify(creds, null, 2), { encoding: 'utf-8', mode: 0o600 })
}

export async function loadCredentials<T extends Record<string, unknown>>(id: ConnectorId): Promise<T | null> {
  if (!existsSync(credPath(id))) return null
  try {
    const raw = await readFile(credPath(id), 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function deleteCredentials(id: ConnectorId): Promise<void> {
  await unlink(credPath(id)).catch(() => {})
}

export async function listConnectors(): Promise<ConnectorMeta[]> {
  await ensureDir()
  const out: ConnectorMeta[] = []
  const allIds: Array<{ id: ConnectorId; name: string }> = [
    { id: 'shopify', name: 'Shopify' },
    { id: 'gdrive', name: 'Google Drive' },
  ]
  let files: string[] = []
  try {
    files = await readdir(CONNECTORS_DIR)
  } catch { /* dir empty */ }

  for (const meta of allIds) {
    const exists = files.includes(`${meta.id}.json`)
    if (!exists) {
      out.push({ ...meta, connected: false })
      continue
    }
    const creds = await loadCredentials<Record<string, unknown>>(meta.id)
    out.push({
      ...meta,
      connected: !!creds,
      account: typeof creds?._account === 'string' ? creds._account : undefined,
      connectedAt: typeof creds?._connectedAt === 'number' ? creds._connectedAt : undefined,
      lastUsedAt: typeof creds?._lastUsedAt === 'number' ? creds._lastUsedAt : undefined,
      lastError: typeof creds?._lastError === 'string' ? creds._lastError : undefined,
    })
  }
  return out
}

export async function markUsed(id: ConnectorId): Promise<void> {
  const creds = await loadCredentials<Record<string, unknown>>(id)
  if (!creds) return
  creds._lastUsedAt = Date.now()
  delete creds._lastError
  await saveCredentials(id, creds)
}

export async function markError(id: ConnectorId, message: string): Promise<void> {
  const creds = await loadCredentials<Record<string, unknown>>(id)
  if (!creds) return
  creds._lastError = message.slice(0, 500)
  await saveCredentials(id, creds)
}
