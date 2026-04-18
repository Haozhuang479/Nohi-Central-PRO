import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron'
import { join } from 'path'
import { homedir, tmpdir } from 'os'
import { mkdir, writeFile, unlink, readFile, access } from 'fs/promises'
import { spawn } from 'child_process'
import { is } from '@electron-toolkit/utils'

import type { Session, Skill, NohiSettings } from './engine/types'
import { getSettings, saveSettings, getLastSettingsError } from './store'
import { runAgent } from './engine/agent'
import { log, logError } from './engine/lib/logger'

// Global crash safety net — without this, uncaught errors silently kill the process.
process.on('uncaughtException', (err) => logError(err, '[uncaughtException]'))
process.on('unhandledRejection', (reason) => logError(reason, '[unhandledRejection]'))
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
  await mkdir(join(homedir(), '.nohi', 'logs'), { recursive: true })
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
  await reloadSkills()
  if (settings.mcpServers.length > 0) {
    await mcpManager.connect(settings.mcpServers).catch((e) => logError(e, '[mcp] reconnect after settings save failed'))
  }
  return { ok: true }
})

ipcMain.handle('settings:lastError', () => getLastSettingsError())

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

ipcMain.handle('shell:open-external', (_e, url: string) => shell.openExternal(url))

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

  try {
    const generator = runAgent(session, settings, activeSkills, (agentEvent) => {
      send('agent:event', agentEvent)
    })

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
  }
})
