import { contextBridge, ipcRenderer } from 'electron'
import type { NohiSettings, Session, Skill, AgentEvent } from '../main/engine/types'

// Expose a clean, typed API to the renderer
contextBridge.exposeInMainWorld('nohi', {
  // Settings
  settings: {
    get: (): Promise<NohiSettings> => ipcRenderer.invoke('settings:get'),
    save: (settings: NohiSettings): Promise<void> => ipcRenderer.invoke('settings:save', settings),
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
