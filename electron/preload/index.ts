import { contextBridge, ipcRenderer } from 'electron'
import type { NohiSettings, Session, Skill, AgentEvent } from '../main/engine/types'
import type { Automation } from '../main/engine/automation/store'

// Expose a clean, typed API to the renderer
contextBridge.exposeInMainWorld('nohi', {
  // Settings
  settings: {
    get: (): Promise<NohiSettings> => ipcRenderer.invoke('settings:get'),
    save: (settings: NohiSettings): Promise<{ ok: true } | { ok: false; error: string }> =>
      ipcRenderer.invoke('settings:save', settings),
    lastError: (): Promise<{ message: string; timestamp: number; path: string } | null> =>
      ipcRenderer.invoke('settings:lastError'),
  },

  // Sessions
  sessions: {
    list: (): Promise<Session[]> => ipcRenderer.invoke('sessions:list'),
    load: (id: string): Promise<Session | null> => ipcRenderer.invoke('sessions:load', id),
    save: (session: Session): Promise<void> => ipcRenderer.invoke('sessions:save', session),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('sessions:delete', id),
    create: (model: string, workingDir?: string): Promise<Session> =>
      ipcRenderer.invoke('sessions:create', model, workingDir),
  },

  // Skills
  skills: {
    list: (): Promise<Skill[]> => ipcRenderer.invoke('skills:list'),
    toggle: (id: string, enabled: boolean): Promise<Skill[]> =>
      ipcRenderer.invoke('skills:toggle', id, enabled),
    create: (data: { name: string; description: string; trigger: string; content: string }): Promise<Skill[]> =>
      ipcRenderer.invoke('skills:create', data),
    update: (data: { id: string; name: string; description: string; trigger: string; content: string }): Promise<Skill[]> =>
      ipcRenderer.invoke('skills:update', data),
    delete: (id: string): Promise<Skill[]> =>
      ipcRenderer.invoke('skills:delete', id),
  },

  // MCP
  mcp: {
    status: (): Promise<Record<string, string>> => ipcRenderer.invoke('mcp:status'),
    tools: (serverId: string): Promise<string[]> => ipcRenderer.invoke('mcp:tools', serverId),
  },

  // Connectors (Layer 1 ingestion credentials)
  connectors: {
    list: (): Promise<Array<{ id: 'shopify' | 'gdrive'; name: string; connected: boolean; account?: string; connectedAt?: number; lastUsedAt?: number; lastError?: string }>> =>
      ipcRenderer.invoke('connectors:list'),
    shopify: {
      connect: (shop: string, accessToken: string): Promise<{ ok: true; account: string } | { ok: false; error: string }> =>
        ipcRenderer.invoke('connectors:shopify:connect', shop, accessToken),
      disconnect: (): Promise<void> => ipcRenderer.invoke('connectors:shopify:disconnect'),
    },
    gdrive: {
      connect: (clientId: string, clientSecret: string): Promise<{ ok: true; account: string } | { ok: false; error: string }> =>
        ipcRenderer.invoke('connectors:gdrive:connect', clientId, clientSecret),
      disconnect: (): Promise<void> => ipcRenderer.invoke('connectors:gdrive:disconnect'),
    },
  },

  // Automation (scheduled prompts)
  automation: {
    list: (): Promise<Automation[]> => ipcRenderer.invoke('automation:list'),
    create: (data: Omit<Automation, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'nextRunAt'>): Promise<Automation[]> =>
      ipcRenderer.invoke('automation:create', data),
    update: (id: string, patch: Partial<Automation>): Promise<Automation[]> =>
      ipcRenderer.invoke('automation:update', id, patch),
    delete: (id: string): Promise<Automation[]> => ipcRenderer.invoke('automation:delete', id),
    run: (id: string): Promise<{ sessionId: string; output: string } | { error: string }> =>
      ipcRenderer.invoke('automation:run', id),
    onCompleted: (callback: (info: { id: string; sessionId: string }) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, info: { id: string; sessionId: string }): void => callback(info)
      ipcRenderer.on('automation:completed', handler)
      return () => ipcRenderer.removeListener('automation:completed', handler)
    },
  },

  // Dialogs
  dialog: {
    openDir: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-dir'),
    openFile: (): Promise<Array<{ path: string; isImage: boolean; content?: string; base64?: string; mediaType?: string }> | null> =>
      ipcRenderer.invoke('dialog:open-file'),
  },

  // External links
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:open-external', url),

  // API key testing
  testApiKey: (provider: string, apiKey: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('api:test-key', { provider, apiKey }),

  // Voice transcription
  voice: {
    transcribe: (pcmBuffer: ArrayBuffer, sampleRate: number): Promise<{ success: boolean; text?: string; error?: string }> =>
      ipcRenderer.invoke('voice:transcribe', pcmBuffer, sampleRate),
    modelStatus: (): Promise<{ ready: boolean; modelPath: string }> =>
      ipcRenderer.invoke('voice:model-status'),
  },

  // Agent streaming
  agent: {
    run: (session: Session): void => ipcRenderer.send('agent:run', session),
    abort: (sessionId: string): void => ipcRenderer.send('agent:abort', sessionId),
    onEvent: (callback: (event: AgentEvent) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, event: AgentEvent): void => callback(event)
      ipcRenderer.on('agent:event', handler)
      return () => ipcRenderer.removeListener('agent:event', handler)
    },
  },
})
