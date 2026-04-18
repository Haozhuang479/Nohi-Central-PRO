// Google Drive connector — OAuth 2.0 Loopback flow (the Google-recommended flow for desktop apps).
//
// Why: PRO is a desktop app that can't safely ship a long-lived client_secret for a shared
// Google Cloud OAuth client. Instead, the user creates their own OAuth client in Google Cloud
// Console (OAuth Client ID type: "Desktop app"), pastes the client_id + client_secret into Nohi,
// and we do a loopback redirect (http://127.0.0.1:<port>) to capture the authorization code.
//
// Scopes: drive.readonly (enough for search + file read). No write access yet.

import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { URL } from 'url'
import { randomBytes, createHash } from 'crypto'
import { shell } from 'electron'
import { loadCredentials, saveCredentials, deleteCredentials, markUsed, markError } from './store'
import { z } from 'zod'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export const GDriveCredentialsSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenExpiresAt: z.number(),
  _account: z.string().optional(),
  _connectedAt: z.number().optional(),
  _lastUsedAt: z.number().optional(),
  _lastError: z.string().optional(),
})

export type GDriveCredentials = z.infer<typeof GDriveCredentialsSchema>

// ─── OAuth Loopback Flow ───────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

/**
 * Runs the full Google Drive OAuth flow:
 * 1. Spin up a localhost HTTP server on a free port
 * 2. Open the system browser to Google's consent page with redirect_uri = http://127.0.0.1:<port>
 * 3. Google redirects back with ?code=... → the localhost server captures it
 * 4. Exchange the code for tokens at https://oauth2.googleapis.com/token
 * 5. Save tokens to disk
 */
export async function connectGDrive(clientId: string, clientSecret: string): Promise<{ ok: true; account: string } | { ok: false; error: string }> {
  if (!clientId.trim() || !clientSecret.trim()) {
    return { ok: false, error: 'clientId and clientSecret are required.' }
  }
  const { verifier, challenge } = generatePkce()
  const state = base64url(randomBytes(16))

  // Capture the code on localhost
  const { code, redirectUri, error } = await runLoopback(state)
  if (error) return { ok: false, error }
  if (!code) return { ok: false, error: 'No code returned.' }

  // Exchange code for tokens
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    })
    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(15_000),
    })
    if (!resp.ok) {
      const text = await resp.text()
      return { ok: false, error: `Token exchange failed (${resp.status}): ${text.slice(0, 300)}` }
    }
    const tok = await resp.json() as { access_token: string; refresh_token?: string; expires_in: number }
    if (!tok.refresh_token) {
      return { ok: false, error: 'Google did not return a refresh_token. Revoke the app at https://myaccount.google.com/permissions and retry.' }
    }

    // Fetch user email
    const userResp = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${tok.access_token}` },
      signal: AbortSignal.timeout(10_000),
    })
    const userData = userResp.ok ? await userResp.json() as { user?: { emailAddress?: string; displayName?: string } } : null
    const account = userData?.user?.emailAddress ?? userData?.user?.displayName ?? 'Google Drive'

    await saveCredentials<GDriveCredentials>('gdrive', {
      clientId,
      clientSecret,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      tokenExpiresAt: Date.now() + tok.expires_in * 1000,
      _account: account,
      _connectedAt: Date.now(),
    })
    return { ok: true, account }

    // helper placeholder; unused because `challenge` var is referenced inside runLoopback via closure
    void challenge
  } catch (err) {
    const e = err as { name?: string; message?: string }
    return { ok: false, error: e.name === 'TimeoutError' ? 'Token exchange timed out' : (e.message ?? 'Unknown error') }
  }

  async function runLoopback(expectedState: string): Promise<{ code?: string; redirectUri: string; error?: string }> {
    return new Promise((resolve) => {
      const server = createServer((req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', `http://127.0.0.1`)
        const gotState = url.searchParams.get('state')
        const gotCode = url.searchParams.get('code')
        const gotError = url.searchParams.get('error')
        if (gotError) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body style="font-family:system-ui;text-align:center;padding:40px"><h2>Google login failed</h2><p>Return to Nohi.</p></body></html>')
          server.close()
          resolve({ redirectUri: '', error: gotError })
          return
        }
        if (!gotCode || gotState !== expectedState) {
          res.writeHead(400)
          res.end('Invalid state')
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body style="font-family:system-ui;text-align:center;padding:40px"><h2>✓ Google Drive connected</h2><p>You can close this tab and return to Nohi.</p></body></html>')
        server.close()
        resolve({ code: gotCode, redirectUri: `http://127.0.0.1:${(server.address() as { port: number }).port}/callback` })
      })

      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as { port: number }).port
        const redirectUri = `http://127.0.0.1:${port}/callback`
        const authUrl = new URL(AUTH_URL)
        authUrl.searchParams.set('client_id', clientId)
        authUrl.searchParams.set('redirect_uri', redirectUri)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('scope', DRIVE_SCOPE)
        authUrl.searchParams.set('access_type', 'offline')
        authUrl.searchParams.set('prompt', 'consent')
        authUrl.searchParams.set('state', state)
        authUrl.searchParams.set('code_challenge', challenge)
        authUrl.searchParams.set('code_challenge_method', 'S256')
        shell.openExternal(authUrl.toString()).catch(() => {})
      })

      // 5 min safety timeout
      setTimeout(() => {
        server.close()
        resolve({ redirectUri: '', error: 'OAuth flow timed out (5 min)' })
      }, 5 * 60 * 1000)
    })
  }
}

export async function disconnectGDrive(): Promise<void> {
  await deleteCredentials('gdrive')
}

async function getValidToken(): Promise<string | null> {
  const creds = await loadCredentials<GDriveCredentials>('gdrive')
  if (!creds) return null
  const parsed = GDriveCredentialsSchema.safeParse(creds)
  if (!parsed.success) return null
  const current = parsed.data

  // Refresh if expiring in <60s
  if (current.tokenExpiresAt - Date.now() < 60_000) {
    try {
      const body = new URLSearchParams({
        client_id: current.clientId,
        client_secret: current.clientSecret,
        refresh_token: current.refreshToken,
        grant_type: 'refresh_token',
      })
      const resp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      if (!resp.ok) {
        await markError('gdrive', `Token refresh failed: ${resp.status}`)
        return null
      }
      const tok = await resp.json() as { access_token: string; expires_in: number }
      current.accessToken = tok.access_token
      current.tokenExpiresAt = Date.now() + tok.expires_in * 1000
      await saveCredentials('gdrive', current)
    } catch (err) {
      await markError('gdrive', err instanceof Error ? err.message : String(err))
      return null
    }
  }
  await markUsed('gdrive')
  return current.accessToken
}

// ─── Drive API helpers ─────────────────────────────────────────────────────

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  size?: string
  parents?: string[]
  webViewLink?: string
}

export async function searchFiles(q: string, pageSize = 20): Promise<DriveFile[]> {
  const token = await getValidToken()
  if (!token) throw new Error('Google Drive not connected.')
  const params = new URLSearchParams()
  params.set('q', q)
  params.set('pageSize', String(pageSize))
  params.set('fields', 'files(id,name,mimeType,modifiedTime,size,parents,webViewLink)')
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!resp.ok) throw new Error(`Drive search failed: ${resp.status} ${await resp.text()}`)
  const data = (await resp.json()) as { files: DriveFile[] }
  return data.files ?? []
}

export async function listFolder(folderId: string, pageSize = 50): Promise<DriveFile[]> {
  const q = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`
  return searchFiles(q, pageSize)
}

/** Returns text content for text-bearing files, base64 + mime for images. */
export async function readFile(fileId: string): Promise<{ kind: 'text'; content: string; mimeType: string; name: string } | { kind: 'binary'; base64: string; mimeType: string; name: string }> {
  const token = await getValidToken()
  if (!token) throw new Error('Google Drive not connected.')

  const metaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!metaResp.ok) throw new Error(`Drive metadata failed: ${metaResp.status}`)
  const meta = (await metaResp.json()) as { id: string; name: string; mimeType: string }

  // Google-native types need export
  if (meta.mimeType === 'application/vnd.google-apps.document') {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) throw new Error(`Drive export failed: ${r.status}`)
    return { kind: 'text', content: await r.text(), mimeType: 'text/plain', name: meta.name }
  }
  if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) throw new Error(`Drive export failed: ${r.status}`)
    return { kind: 'text', content: await r.text(), mimeType: 'text/csv', name: meta.name }
  }

  // Everything else: direct download
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60_000),
  })
  if (!r.ok) throw new Error(`Drive download failed: ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  const isText = meta.mimeType.startsWith('text/')
    || meta.mimeType === 'application/json'
    || meta.mimeType === 'application/xml'
    || meta.mimeType === 'application/javascript'
  if (isText && buf.length < 1_000_000) {
    return { kind: 'text', content: buf.toString('utf-8'), mimeType: meta.mimeType, name: meta.name }
  }
  return { kind: 'binary', base64: buf.toString('base64'), mimeType: meta.mimeType, name: meta.name }
}

export async function getStatus(): Promise<{ connected: boolean; account?: string }> {
  const creds = await loadCredentials<GDriveCredentials>('gdrive')
  if (!creds) return { connected: false }
  return { connected: true, account: creds._account }
}
