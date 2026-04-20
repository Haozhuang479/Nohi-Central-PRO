/// <reference types="vite/client" />
import type { NohiSettings, Session, Skill, AgentEvent } from '../electron/main/engine/types'

declare global {
  interface Window {
    nohi: {
      settings: {
        get(): Promise<NohiSettings>
        save(settings: NohiSettings): Promise<void>
      }
      sessions: {
        list(): Promise<Session[]>
        load(id: string): Promise<Session | null>
        save(session: Session): Promise<void>
        delete(id: string): Promise<void>
        create(model: string, workingDir?: string): Promise<Session>
      }
      skills: {
        list(): Promise<Skill[]>
        toggle(id: string, enabled: boolean): Promise<Skill[]>
        create(data: { name: string; description: string; trigger: string; content: string }): Promise<Skill[]>
        update(data: { id: string; name: string; description: string; trigger: string; content: string }): Promise<Skill[]>
        delete(id: string): Promise<Skill[]>
      }
      mcp: {
        status(): Promise<Record<string, string>>
        tools(serverId: string): Promise<string[]>
      }
      dialog: {
        openDir(): Promise<string | null>
        openFile(): Promise<Array<{ path: string; isImage: boolean; content?: string; base64?: string; mediaType?: string }> | null>
      }
      openExternal(url: string): Promise<{ ok: true } | { ok: false; error: string }>
      testApiKey(provider: string, apiKey: string): Promise<{ success: boolean; error?: string }>
      voice: {
        transcribe(pcmBuffer: ArrayBuffer, sampleRate: number): Promise<{ success: boolean; text?: string; error?: string }>
        modelStatus(): Promise<{ ready: boolean; modelPath: string }>
      }
      agent: {
        run(session: Session): void
        abort(sessionId: string): void
        onEvent(callback: (event: AgentEvent) => void): () => void
      }
    }
  }
}
