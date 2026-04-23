import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, session } from 'electron'
import { join } from 'path'
import { homedir, tmpdir } from 'os'
import { mkdir, writeFile, unlink, readFile, access } from 'fs/promises'
import { spawn } from 'child_process'
import { is } from '@electron-toolkit/utils'

import type { Session, Skill, NohiSettings } from './engine/types'
import { getSettings, saveSettings, getLastSettingsError } from './store'
import { runAgent } from './engine/agent'
import { log, logError } from './engine/lib/logger'
import { setTelemetryEnabled } from './engine/lib/telemetry'

// Global crash safety net — log AND surface to the renderer so the user can copy
// the diagnostic bundle. Without this, uncaught errors silently kill the process.
process.on('uncaughtException', (err) => {
  logError(err, '[uncaughtException]')
  notifyRendererCrash('uncaughtException', err)
})
process.on('unhandledRejection', (reason) => {
  logError(reason, '[unhandledRejection]')
  notifyRendererCrash('unhandledRejection', reason)
})

function notifyRendererCrash(kind: string, reason: unknown): void {
  try {
    const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason)
    const stack = reason instanceof Error ? reason.stack : undefined
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:crash', { kind, message, stack, timestamp: Date.now() })
    }
  } catch { /* best effort */ }
}
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  createSession,
} from './engine/sessions/history'
import { loadSkillsFromDir, setToolkitDir } from './engine/skills/loader'
import { mcpManager } from './engine/mcp/client'
import {
  NohiSettingsSchema,
  SessionSchema,
  CreateSessionSchema,
  SkillCreateSchema,
  SkillUpdateSchema,
  AutomationCreateSchema,
  AutomationUpdateSchema,
  safeParseIpc,
} from './engine/ipc-schemas'

// ─── Built-in skills directory ─────────────────────────────────────────────

// In dev: __dirname = <repo>/out/main → ../.. = <repo>
// In prod: process.resourcesPath = <app>/Contents/Resources
const RESOURCES_ROOT = app.isPackaged ? process.resourcesPath : join(__dirname, '../..')

const SKILLS_BUILTIN_DIR = join(RESOURCES_ROOT, 'resources', 'skills')
const SHOPIFY_TOOLKIT_DIR = join(RESOURCES_ROOT, 'resources', 'shopify-toolkit')

// ─── In-memory active skills cache ────────────────────────────────────────

let activeSkills: Skill[] = []

async function reloadSkills(): Promise<void> {
  const settings = getSettings()
  const builtin = await loadSkillsFromDir(SKILLS_BUILTIN_DIR, 'builtin')
  const custom = await loadSkillsFromDir(settings.skillsDir, 'custom')
  const all = [...builtin, ...custom]
  // Apply persisted enabled state; default all skills to enabled if no preference saved
  const enabledIds = settings.enabledSkillIds
  if (enabledIds !== undefined) {
    for (const skill of all) {
      skill.enabled = enabledIds.includes(skill.id)
    }
  }
  activeSkills = all
}

// ─── Window ────────────────────────────────────────────────────────────────

// Mirrors src/index.html meta CSP. Duplicated at the header level so it also
// covers navigations, about:blank and file:// loads where the meta tag does not
// apply. Update both in lockstep.
const CSP_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: nohi-file:; connect-src 'self' https://nohi-product-search-1049263400892.us-west1.run.app https://api.anthropic.com https://api.openai.com https://api.moonshot.cn https://api.minimax.chat https://api.deepseek.com https://api.firecrawl.dev; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"

function installHeaderCsp(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP_POLICY],
      },
    })
  })
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Any window.open from the renderer is blocked. Links meant to open in the
  // browser must go through the protocol-whitelisted shell:open-external IPC.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  await mkdir(join(homedir(), '.nohi', 'skills'), { recursive: true })
  await mkdir(join(homedir(), '.nohi', 'memory'), { recursive: true })
  await mkdir(join(homedir(), '.nohi', 'images'), { recursive: true })
  await mkdir(join(homedir(), '.nohi', 'automation'), { recursive: true })
  await mkdir(join(homedir(), '.nohi', 'connectors'), { recursive: true })
  await mkdir(join(homedir(), '.nohi', 'catalog'), { recursive: true })
  await mkdir(join(homedir(), '.nohi', 'orders'), { recursive: true })
  await mkdir(join(homedir(), '.nohi', 'logs'), { recursive: true })
  // Apply telemetry setting from disk on boot
  setTelemetryEnabled(!!(getSettings() as { telemetryEnabled?: boolean }).telemetryEnabled)
  // Install header-level CSP (defence-in-depth with the meta tag in index.html)
  installHeaderCsp()
  log('info', '[startup] Nohi Central PRO main process up')

  // Register custom protocol to serve local images in the renderer.
  // Restricted to ~/.nohi/ subtree only — no access to ~/.ssh, ~/.aws/credentials, etc.
  protocol.handle('nohi-file', (request) => {
    const raw = decodeURIComponent(request.url.replace('nohi-file://', ''))
    const nohiRoot = join(homedir(), '.nohi')
    // Resolve to canonical absolute path and check it stays under ~/.nohi/
    let resolved: string
    try {
      resolved = require('path').resolve(raw)
    } catch {
      return new Response('Bad request', { status: 400 })
    }
    if (!resolved.startsWith(nohiRoot)) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(`file://${resolved}`)
  })
  setToolkitDir(SHOPIFY_TOOLKIT_DIR)
  await reloadSkills()

  const settings = getSettings()
  if (settings.mcpServers.length > 0) {
    await mcpManager.connect(settings.mcpServers).catch(console.error)
  }

  createWindow()
  startScheduler()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await mcpManager.disconnectAll().catch(() => {})
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ─────────────────────────────────────────────────────────

// Settings
ipcMain.handle('settings:get', () => getSettings())
ipcMain.handle('settings:save', async (_e, raw: unknown) => {
  const settings = safeParseIpc(NohiSettingsSchema, raw, 'settings:save') as NohiSettings
  // saveSettings now throws on disk errors; we surface the message to the renderer.
  try {
    saveSettings(settings)
  } catch (err) {
    const e = err as { code?: string; message?: string }
    return { ok: false, error: getLastSettingsError()?.message ?? e.message ?? 'Failed to save settings' }
  }
  // Re-apply telemetry preference on every save
  setTelemetryEnabled(!!(settings as { telemetryEnabled?: boolean }).telemetryEnabled)
  await reloadSkills()
  if (settings.mcpServers.length > 0) {
    await mcpManager.connect(settings.mcpServers).catch((e) => logError(e, '[mcp] reconnect after settings save failed'))
  }
  return { ok: true }
})

ipcMain.handle('settings:lastError', () => getLastSettingsError())

// Diagnostic bundle — last N lines of today's log + key version info.
// Used by the crash recovery UI's "Copy diagnostics" button.
ipcMain.handle('diagnostics:bundle', async () => {
  const { readFile, readdir } = await import('fs/promises')
  const logsDir = join(homedir(), '.nohi', 'logs')
  let logTail = '(no log file)'
  try {
    const files = (await readdir(logsDir)).filter((f) => f.endsWith('.log')).sort()
    const latest = files[files.length - 1]
    if (latest) {
      const raw = await readFile(join(logsDir, latest), 'utf-8')
      const lines = raw.split('\n')
      logTail = lines.slice(-200).join('\n')
    }
  } catch {
    /* no logs */
  }
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.versions.node,
    timestamp: new Date().toISOString(),
    logTail,
  }
})

// Sessions
ipcMain.handle('sessions:list', () => listSessions())
ipcMain.handle('sessions:load', (_e, id: string) => loadSession(id))
ipcMain.handle('sessions:save', (_e, raw: unknown) => {
  const session = safeParseIpc(SessionSchema, raw, 'sessions:save') as Session
  return saveSession(session)
})
ipcMain.handle('sessions:delete', (_e, id: unknown) => {
  if (typeof id !== 'string' || id.length === 0 || id.length > 200) throw new Error('[IPC sessions:delete] invalid id')
  return deleteSession(id)
})
ipcMain.handle('sessions:create', (_e, model: unknown, workingDir?: unknown) => {
  const parsed = safeParseIpc(CreateSessionSchema, { model, workingDir }, 'sessions:create')
  const settings = getSettings()
  return createSession(parsed.model ?? settings.defaultModel, parsed.workingDir ?? settings.workingDir)
})

// Skills
ipcMain.handle('skills:list', async () => {
  await reloadSkills()
  return activeSkills
})
ipcMain.handle('skills:toggle', async (_e, id: string, enabled: boolean) => {
  const skill = activeSkills.find((s) => s.id === id)
  if (skill) skill.enabled = enabled
  const settings = getSettings()
  settings.enabledSkillIds = activeSkills.filter((s) => s.enabled).map((s) => s.id)
  saveSettings(settings)
  return activeSkills
})

// Escape YAML special chars in skill frontmatter (colons, newlines, quotes)
function yamlSafe(s: string): string {
  return s.replace(/\r?\n/g, ' ').replace(/"/g, '\\"').slice(0, 500)
}

ipcMain.handle('skills:create', async (_e, raw: unknown) => {
  const data = safeParseIpc(SkillCreateSchema, raw, 'skills:create')
  const settings = getSettings()
  const id = data.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
  const filePath = join(settings.skillsDir || join(homedir(), '.nohi', 'skills'), `${id}.md`)
  const md = `---\nname: "${yamlSafe(data.name)}"\ndescription: "${yamlSafe(data.description)}"\ntrigger: "${yamlSafe(data.trigger)}"\n---\n\n${data.content}\n`
  const { writeFile: wf } = await import('fs/promises')
  await wf(filePath, md, 'utf-8')
  await reloadSkills()
  return activeSkills
})

ipcMain.handle('skills:update', async (_e, raw: unknown) => {
  const data = safeParseIpc(SkillUpdateSchema, raw, 'skills:update')
  const skill = activeSkills.find((s) => s.id === data.id)
  if (!skill || skill.source !== 'custom' || !skill.filePath) return activeSkills
  const md = `---\nname: "${yamlSafe(data.name)}"\ndescription: "${yamlSafe(data.description)}"\ntrigger: "${yamlSafe(data.trigger)}"\n---\n\n${data.content}\n`
  const { writeFile: wf } = await import('fs/promises')
  await wf(skill.filePath, md, 'utf-8')
  await reloadSkills()
  return activeSkills
})

ipcMain.handle('skills:delete', async (_e, id: string) => {
  const skill = activeSkills.find((s) => s.id === id)
  if (!skill || skill.source !== 'custom' || !skill.filePath) return activeSkills
  const { unlink } = await import('fs/promises')
  await unlink(skill.filePath).catch(() => {})
  await reloadSkills()
  return activeSkills
})

// ── Automation (scheduled prompts) ───────────────────────────────────────
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  recordRun,
  getDueAutomations,
  type Automation,
} from './engine/automation/store'

ipcMain.handle('automation:list', () => listAutomations())

ipcMain.handle('automation:create', (_e, raw: unknown) => {
  const data = safeParseIpc(AutomationCreateSchema, raw, 'automation:create')
  return createAutomation(data as Omit<Automation, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'nextRunAt'>)
})

ipcMain.handle('automation:update', (_e, id: unknown, patch: unknown) => {
  if (typeof id !== 'string' || id.length === 0) throw new Error('[IPC automation:update] invalid id')
  const validPatch = safeParseIpc(AutomationUpdateSchema, patch, 'automation:update')
  return updateAutomation(id, validPatch as Partial<Automation>)
})

ipcMain.handle('automation:delete', (_e, id: string) => deleteAutomation(id))

// Manual "run now" — creates a session + runs the agent on the prompt
ipcMain.handle('automation:run', async (_e, id: string) => {
  const list = await listAutomations()
  const auto = list.find((a) => a.id === id)
  if (!auto) return { error: 'Automation not found' }
  return runAutomation(auto, 'manual')
})

async function runAutomation(auto: Automation, _reason: 'manual' | 'scheduled'): Promise<{ sessionId: string; output: string } | { error: string }> {
  const settings = getSettings()
  const model = auto.model || settings.defaultModel
  const session = createSession(model, settings.workingDir)
  session.title = `[Auto] ${auto.name}`
  session.messages.push({
    id: `msg-${Date.now()}`,
    role: 'user',
    content: auto.prompt,
    timestamp: Date.now(),
  })
  await saveSession(session)

  let assistantText = ''
  try {
    for await (const event of runAgent(session, settings, activeSkills, () => {})) {
      if (event.type === 'text_delta') assistantText += event.delta
      if (event.type === 'done' || event.type === 'error') break
    }
    session.messages.push({
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: assistantText || '(no response)',
      timestamp: Date.now(),
    })
    session.updatedAt = Date.now()
    await saveSession(session)
    await recordRun(auto.id, session.id, assistantText)
    // Notify renderer so the sidebar refreshes
    mainWindow?.webContents.send('automation:completed', { id: auto.id, sessionId: session.id })
    return { sessionId: session.id, output: assistantText }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// Scheduler: every 60s check for due automations
let schedulerInterval: NodeJS.Timeout | null = null
function startScheduler(): void {
  if (schedulerInterval) return
  schedulerInterval = setInterval(async () => {
    try {
      const due = await getDueAutomations()
      for (const auto of due) {
        // Fire and forget
        runAutomation(auto, 'scheduled').catch(() => {})
      }
    } catch {
      // ignore
    }
  }, 60_000)
}

// ── Connectors (Layer 1 ingestion credentials) ────────────────────────────
import { listConnectors } from './engine/connectors/store'
import { connectShopify, disconnectShopify } from './engine/connectors/shopify'
import { connectGDrive, disconnectGDrive } from './engine/connectors/gdrive'

ipcMain.handle('connectors:list', () => listConnectors())

ipcMain.handle('connectors:shopify:connect', async (_e, shop: unknown, accessToken: unknown) => {
  if (typeof shop !== 'string' || typeof accessToken !== 'string') {
    return { ok: false, error: 'shop and accessToken must be strings' }
  }
  return connectShopify(shop, accessToken)
})
ipcMain.handle('connectors:shopify:disconnect', () => disconnectShopify())

ipcMain.handle('connectors:gdrive:connect', async (_e, clientId: unknown, clientSecret: unknown) => {
  if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
    return { ok: false, error: 'clientId and clientSecret must be strings' }
  }
  return connectGDrive(clientId, clientSecret)
})
ipcMain.handle('connectors:gdrive:disconnect', () => disconnectGDrive())

// ── Catalog (shared by agent + seller UI) ───────────────────────────────
import { searchRemote as catalogSearchRemote, resolveConfig as resolveCatalogConfig } from './engine/catalog/client'
import { listOrders, summarize, ingestShopifyOrders } from './engine/layer4-distribution/attribution/orders'

ipcMain.handle('attribution:summary', async (_e, sinceDays: unknown) => {
  const days = typeof sinceDays === 'number' ? Math.min(Math.max(sinceDays, 1), 365) : 30
  const settings = getSettings()
  const merchantId = (settings as Record<string, unknown>).merchantId as string | undefined
  try {
    const orders = await listOrders({
      since: Date.now() - days * 24 * 60 * 60 * 1000,
      merchantId,
    })
    return { ok: true, summary: summarize(orders), orderCount: orders.length, windowDays: days }
  } catch (err) {
    logError(err, '[attribution:summary] failed')
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

ipcMain.handle('attribution:ingest', async (_e, sinceDays: unknown) => {
  const days = typeof sinceDays === 'number' ? Math.min(Math.max(sinceDays, 1), 365) : 30
  const settings = getSettings()
  const merchantId = (settings as Record<string, unknown>).merchantId as string | undefined
  if (!merchantId) return { ok: false, error: 'merchantId not set (Settings → Agentic Catalog → Merchant ID).' }
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const result = await ingestShopifyOrders({ merchantId, sinceIso, limit: 250 })
  return { ok: result.errors.length === 0, ingested: result.ingested, errors: result.errors }
})

ipcMain.handle('catalog:search', async (_e, query: unknown, limit: unknown) => {
  if (typeof query !== 'string' || !query.trim()) {
    return { ok: false, error: 'query must be a non-empty string', results: [] }
  }
  const n = typeof limit === 'number' ? Math.min(Math.max(limit, 1), 50) : 20
  try {
    const settings = getSettings()
    const cfg = resolveCatalogConfig({
      catalogApiUrl: (settings as Record<string, unknown>).catalogApiUrl as string | undefined,
      catalogApiToken: (settings as Record<string, unknown>).catalogApiToken as string | undefined,
      merchantId: (settings as Record<string, unknown>).merchantId as string | undefined,
    })
    const results = await catalogSearchRemote(cfg, query, n)
    return { ok: true, results, query, total: results.length }
  } catch (err) {
    logError(err, '[catalog:search] failed')
    return { ok: false, error: err instanceof Error ? err.message : String(err), results: [] }
  }
})

// MCP status
ipcMain.handle('mcp:status', () => mcpManager.getStatuses())
ipcMain.handle('mcp:tools', (_e, serverId: string) => mcpManager.getServerTools(serverId))

// File dialog
ipcMain.handle('dialog:open-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Text & Code', extensions: ['txt', 'md', 'json', 'csv', 'ts', 'tsx', 'js', 'jsx', 'py', 'sh', 'yaml', 'yml', 'toml', 'xml', 'html', 'css'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const { readFile } = await import('fs/promises')
  const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
  const files = await Promise.all(
    result.filePaths.map(async (filePath) => {
      const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
      const isImage = IMAGE_EXTS.has(ext)
      try {
        if (isImage) {
          const buf = await readFile(filePath)
          const base64 = buf.toString('base64')
          const mediaType = ext === '.png' ? 'image/png'
            : ext === '.gif' ? 'image/gif'
            : ext === '.webp' ? 'image/webp'
            : 'image/jpeg'
          return { path: filePath, isImage: true, base64, mediaType }
        } else {
          const content = await readFile(filePath, 'utf-8')
          return { path: filePath, isImage: false, content }
        }
      } catch {
        return null
      }
    })
  )
  return files.filter(Boolean)
})

const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
ipcMain.handle('shell:open-external', async (_e, url: unknown): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (typeof url !== 'string') return { ok: false, error: 'url must be string' }
  let protocol: string
  try {
    protocol = new URL(url).protocol
  } catch {
    return { ok: false, error: 'invalid URL' }
  }
  if (!SAFE_EXTERNAL_PROTOCOLS.has(protocol)) {
    return { ok: false, error: `protocol ${protocol} is not allowed` }
  }
  await shell.openExternal(url)
  return { ok: true }
})

// API key validation
const OPENAI_TEST_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/models',
  kimi: 'https://api.moonshot.cn/v1/models',
  deepseek: 'https://api.deepseek.com/v1/models',
  minimax: 'https://api.minimax.chat/v1/models',
}

ipcMain.handle('api:test-key', async (_e, { provider, apiKey }: { provider: string; apiKey: string }) => {
  const key = apiKey.trim()
  if (!key) return { success: false, error: 'API key is empty' }

  if (provider === 'anthropic') {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: key })
      await client.models.list({ limit: 1 })
      return { success: true }
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      return { success: false, error: e.message ?? 'Connection failed' }
    }
  }

  // OpenAI-compatible providers — hit the /models endpoint
  const testUrl = OPENAI_TEST_URLS[provider]
  if (testUrl) {
    try {
      const resp = await fetch(testUrl, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (resp.ok || resp.status === 200) return { success: true }
      const body = await resp.text()
      return { success: false, error: `${resp.status}: ${body.slice(0, 120)}` }
    } catch (err: unknown) {
      const e = err as { message?: string }
      return { success: false, error: e.message ?? 'Connection failed' }
    }
  }

  return { success: false, error: `Unknown provider: ${provider}` }
})

// ─── Agent streaming ───────────────────────────────────────────────────────
// Uses ipcMain.on (event-based) so we can push multiple streaming events back

// ─── Voice transcription (whisper-cli) ────────────────────────────────────

// Default whisper binary locations for Apple Silicon and Intel Mac
const WHISPER_BIN_DEFAULT = (() => {
  const arm = '/opt/homebrew/bin/whisper-cli'
  const intel = '/usr/local/bin/whisper-cli'
  try { require('fs').accessSync(arm); return arm } catch { /* not found */ }
  try { require('fs').accessSync(intel); return intel } catch { /* not found */ }
  return arm // fallback to Apple Silicon path
})()
const WHISPER_MODEL = join(homedir(), '.nohi', 'models', 'ggml-base.bin')

/** Write a 16kHz mono Float32 PCM array to a WAV file */
function writeWav(pcm: Float32Array, sampleRate: number): Buffer {
  const numSamples = pcm.length
  const dataBytes = numSamples * 2 // 16-bit
  const buf = Buffer.alloc(44 + dataBytes)

  // RIFF header
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataBytes, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)       // chunk size
  buf.writeUInt16LE(1, 20)        // PCM
  buf.writeUInt16LE(1, 22)        // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28) // byte rate
  buf.writeUInt16LE(2, 32)        // block align
  buf.writeUInt16LE(16, 34)       // bits per sample
  buf.write('data', 36)
  buf.writeUInt32LE(dataBytes, 40)

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }
  return buf
}

ipcMain.handle('voice:transcribe', async (_e, pcmBuffer: ArrayBuffer, sampleRate: number) => {
  const WHISPER_BIN = getSettings().whisperBinPath || WHISPER_BIN_DEFAULT
  try {
    // Check whisper binary
    try { await access(WHISPER_BIN) } catch {
      return { success: false, error: `whisper-cli not found at ${WHISPER_BIN}. Install via 'brew install whisper-cpp' or set a custom path in Settings.` }
    }
    // Check model
    try { await access(WHISPER_MODEL) } catch {
      return { success: false, error: 'Whisper model not found. Download ggml-base.bin to ~/.nohi/models/' }
    }

    const pcm = new Float32Array(pcmBuffer)
    const wavBuf = writeWav(pcm, sampleRate)
    const tmpWav = join(tmpdir(), `nohi-voice-${Date.now()}.wav`)
    await writeFile(tmpWav, wavBuf)

    // Run whisper-cli asynchronously so the main process event loop stays free
    const whisperResult = await new Promise<{ stdout: string; stderr: string; code: number }>(
      (resolve_p, reject_p) => {
        let settled = false
        const proc = spawn(WHISPER_BIN, [
          '-m', WHISPER_MODEL,
          '-f', tmpWav,
          '-l', 'auto',
          '--no-timestamps',
          '-np',
          '--output-txt',
        ])
        let stdout = ''
        let stderr = ''
        proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
        proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
        const timer = setTimeout(() => { if (!settled) { settled = true; proc.kill(); reject_p(new Error('Transcription timed out')) } }, 30000)
        proc.on('close', (code) => { clearTimeout(timer); if (!settled) { settled = true; resolve_p({ stdout, stderr, code: code ?? 0 }) } })
        proc.on('error', (err) => { clearTimeout(timer); if (!settled) { settled = true; reject_p(err) } })
      }
    )

    await unlink(tmpWav).catch(() => {})

    // whisper-cli writes output to <file>.txt
    const txtPath = tmpWav + '.txt'
    let text = ''
    try {
      text = (await readFile(txtPath, 'utf-8')).trim()
      await unlink(txtPath).catch(() => {})
    } catch {
      // Fallback: parse stdout
      text = whisperResult.stdout.trim()
    }

    // Clean up any whisper noise markers like [BLANK_AUDIO] or (inaudible)
    text = text.replace(/\[BLANK_AUDIO\]|\(inaudible\)/gi, '').trim()

    return { success: true, text }
  } catch (err: unknown) {
    const e = err as { message?: string }
    return { success: false, error: e.message ?? 'Transcription failed' }
  }
})

ipcMain.handle('voice:model-status', async () => {
  try {
    await access(WHISPER_MODEL)
    return { ready: true, modelPath: WHISPER_MODEL }
  } catch {
    return { ready: false, modelPath: WHISPER_MODEL }
  }
})

// Track abort requests by session ID
const abortedSessions = new Set<string>()

ipcMain.on('agent:abort', (_e, sessionId: string) => {
  abortedSessions.add(sessionId)
})

// Consent resolvers keyed by toolUseId. Populated when a tool calls
// opts.requestApproval; drained by the agent:approval IPC reply from renderer.
const pendingApprovals = new Map<string, (decision: 'approve' | 'deny') => void>()

ipcMain.on('agent:approval', (_e, toolUseId: unknown, decision: unknown) => {
  if (typeof toolUseId !== 'string') return
  const verdict = decision === 'approve' ? 'approve' : 'deny'
  const resolver = pendingApprovals.get(toolUseId)
  if (resolver) {
    resolver(verdict)
    pendingApprovals.delete(toolUseId)
  }
})

// Plan-mode gate resolvers keyed by sessionId. Mirrors the pendingApprovals
// pattern but carries a richer decision: approve / deny / revise-with-text.
// Populated when the agent's first iteration in plan mode yields tool calls;
// drained by the agent:plan-approval IPC reply from the renderer.
type PlanDecision =
  | { kind: 'approve' }
  | { kind: 'deny' }
  | { kind: 'revise'; reviseText: string }
const pendingPlans = new Map<string, (d: PlanDecision) => void>()

ipcMain.on('agent:plan-approval', (_e, sessionId: unknown, kind: unknown, reviseText: unknown) => {
  if (typeof sessionId !== 'string') return
  const resolver = pendingPlans.get(sessionId)
  if (!resolver) return
  if (kind === 'approve') resolver({ kind: 'approve' })
  else if (kind === 'revise' && typeof reviseText === 'string' && reviseText.trim()) {
    resolver({ kind: 'revise', reviseText: reviseText.trim() })
  } else {
    resolver({ kind: 'deny' })
  }
  pendingPlans.delete(sessionId)
})

ipcMain.on('agent:run', async (event, session: Session) => {
  const settings = getSettings()
  const webContents = event.sender
  // Clear any stale abort flag for this session before starting
  abortedSessions.delete(session.id)

  const send = (channel: string, ...args: unknown[]): void => {
    try {
      if (!webContents.isDestroyed()) {
        webContents.send(channel, ...args)
      }
    } catch {
      // Window closed
    }
  }

  // Consent bridge — emits a tool_approval_request event to the renderer and
  // waits for a matching agent:approval IPC reply. If the window closes or
  // agent aborts, resolve as 'deny' so the tool returns an error instead of
  // hanging. Per-tool timeout keeps a zombie modal from blocking the loop.
  const requestApproval = (
    toolUseId: string,
    req: { toolName: string; reason: string; input: unknown },
  ): Promise<'approve' | 'deny'> =>
    new Promise<'approve' | 'deny'>((resolve) => {
      const cleanup = (verdict: 'approve' | 'deny'): void => {
        pendingApprovals.delete(toolUseId)
        resolve(verdict)
      }
      pendingApprovals.set(toolUseId, cleanup)
      send('agent:event', {
        type: 'tool_approval_request',
        toolUseId,
        toolName: req.toolName,
        input: req.input as Record<string, unknown>,
        reason: req.reason,
      })
    })

  // Plan-mode gate — emits a plan_approval_request when the model's first
  // iteration in plan mode wants to call tools. Pauses the agent loop on
  // this promise until the renderer sends agent:plan-approval. Same
  // fail-closed semantics as requestApproval: dropped window = deny.
  const requestPlanApproval = (req: {
    sessionId: string
    planText: string
    toolPreview: Array<{ name: string; input: unknown }>
  }): Promise<PlanDecision> =>
    new Promise<PlanDecision>((resolve) => {
      pendingPlans.set(req.sessionId, (d) => {
        pendingPlans.delete(req.sessionId)
        resolve(d)
      })
      send('agent:event', {
        type: 'plan_approval_request',
        sessionId: req.sessionId,
        planText: req.planText,
        toolPreview: req.toolPreview as Array<{ name: string; input: Record<string, unknown> }>,
      })
    })

  try {
    const generator = runAgent(
      session,
      settings,
      activeSkills,
      (agentEvent) => {
        send('agent:event', agentEvent)
      },
      requestApproval,
      requestPlanApproval,
    )

    for await (const agentEvent of generator) {
      // Check abort flag between every streamed event
      if (abortedSessions.has(session.id)) {
        abortedSessions.delete(session.id)
        send('agent:event', { type: 'done' })
        return
      }
      send('agent:event', agentEvent)
    }
  } catch (err: unknown) {
    const e = err as { message?: string }
    send('agent:event', { type: 'error', message: e.message ?? 'Agent error' })
    send('agent:event', { type: 'done' })
  } finally {
    abortedSessions.delete(session.id)
    // Drain any stale resolvers for this session — a dropped window would
    // otherwise leak promises that never settle.
    for (const resolver of pendingApprovals.values()) resolver('deny')
    pendingApprovals.clear()
    for (const resolver of pendingPlans.values()) resolver({ kind: 'deny' })
    pendingPlans.clear()
  }
})
