import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { mkdir } from 'fs/promises'
import { is } from '@electron-toolkit/utils'

import type { Session, Skill } from './engine/types'
import { getSettings, saveSettings } from './store'
import { runAgent } from './engine/agent'
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  createSession,
  deriveTitle,
} from './engine/sessions/history'
import { loadSkillsFromDir } from './engine/skills/loader'
import { mcpManager } from './engine/mcp/client'

// ─── Built-in skills directory ─────────────────────────────────────────────

const SKILLS_BUILTIN_DIR = join(
  app.isPackaged ? process.resourcesPath : join(__dirname, '../../..'),
  'resources',
  'skills'
)

// ─── In-memory active skills cache ────────────────────────────────────────

let activeSkills: Skill[] = []

async function reloadSkills(): Promise<void> {
  const settings = getSettings()
  const builtin = await loadSkillsFromDir(SKILLS_BUILTIN_DIR, 'builtin')
  const custom = await loadSkillsFromDir(settings.skillsDir, 'custom')
  activeSkills = [...builtin, ...custom]
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
  await reloadSkills()

  const settings = getSettings()
  if (settings.mcpServers.length > 0) {
    await mcpManager.connect(settings.mcpServers).catch(console.error)
  }

  createWindow()

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
ipcMain.handle('settings:save', async (_e, settings: NohiSettings) => {
  saveSettings(settings)
  await reloadSkills()
  if (settings.mcpServers.length > 0) {
    await mcpManager.connect(settings.mcpServers).catch(console.error)
  }
})

// Sessions
ipcMain.handle('sessions:list', () => listSessions())
ipcMain.handle('sessions:load', (_e, id: string) => loadSession(id))
ipcMain.handle('sessions:save', (_e, session: Session) => saveSession(session))
ipcMain.handle('sessions:delete', (_e, id: string) => deleteSession(id))
ipcMain.handle('sessions:create', (_e, model: string, workingDir?: string) => {
  const settings = getSettings()
  return createSession(model ?? settings.defaultModel, workingDir ?? settings.workingDir)
})

// Skills
ipcMain.handle('skills:list', async () => {
  await reloadSkills()
  return activeSkills
})
ipcMain.handle('skills:toggle', async (_e, id: string, enabled: boolean) => {
  const skill = activeSkills.find((s) => s.id === id)
  if (skill) skill.enabled = enabled
  return activeSkills
})

// File dialog
ipcMain.handle('dialog:open-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Text', extensions: ['txt', 'md', 'json', 'csv', 'ts', 'tsx', 'js', 'py'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (result.canceled || !result.filePaths[0]) return null
  const { readFile } = await import('fs/promises')
  try {
    const content = await readFile(result.filePaths[0], 'utf-8')
    return { path: result.filePaths[0], content }
  } catch {
    return null
  }
})

ipcMain.handle('shell:open-external', (_e, url: string) => shell.openExternal(url))

// ─── Agent streaming ───────────────────────────────────────────────────────
// Uses ipcMain.on (event-based) so we can push multiple streaming events back

ipcMain.on('agent:run', async (event, session: Session) => {
  const settings = getSettings()
  const senderId = event.sender.id

  const send = (channel: string, ...args: unknown[]): void => {
    try {
      const sender = BrowserWindow.fromId(senderId)?.webContents
      sender?.send(channel, ...args)
    } catch {
      // Window closed
    }
  }

  try {
    const generator = runAgent(session, settings, activeSkills, (agentEvent) => {
      send('agent:event', agentEvent)
    })

    for await (const agentEvent of generator) {
      send('agent:event', agentEvent)
    }

    // Auto-save session with updated title
    if (session.messages.length > 0) {
      session.title = deriveTitle(session.messages)
      await saveSession(session)
    }
  } catch (err: unknown) {
    const e = err as { message?: string }
    send('agent:event', { type: 'error', message: e.message ?? 'Agent error' })
    send('agent:event', { type: 'done' })
  }
})
