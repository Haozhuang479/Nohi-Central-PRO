// Session persistence — saves/loads conversations to ~/.nohi/sessions/
// Adapted from Claude Code history.ts patterns

import { readFile, writeFile, readdir, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import type { Session, SessionMessage } from '../types'
import { v4 as uuidv4 } from 'uuid'

const SESSIONS_DIR = join(homedir(), '.nohi', 'sessions')

async function ensureDir(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true })
}

function sessionPath(id: string): string {
  return join(SESSIONS_DIR, `${id}.json`)
}

export async function saveSession(session: Session): Promise<void> {
  await ensureDir()
  session.updatedAt = Date.now()
  await writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf-8')
}

export async function loadSession(id: string): Promise<Session | null> {
  try {
    const raw = await readFile(sessionPath(id), 'utf-8')
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export async function listSessions(): Promise<Session[]> {
  await ensureDir()
  let files: string[]
  try {
    files = await readdir(SESSIONS_DIR)
  } catch {
    return []
  }

  const sessions: Session[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = await readFile(join(SESSIONS_DIR, file), 'utf-8')
      const s = JSON.parse(raw) as Session
      // Return lightweight version (no messages) for sidebar
      sessions.push({ ...s, messages: [] })
    } catch {
      // Skip corrupt files
    }
  }

  return sessions.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await unlink(sessionPath(id))
  } catch {
    // Already gone
  }
}

export function createSession(model: string, workingDir: string): Session {
  return {
    id: uuidv4(),
    title: 'New conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    model,
    workingDir,
  }
}

export function deriveTitle(messages: SessionMessage[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New conversation'
  const text =
    typeof first.content === 'string'
      ? first.content
      : (first.content as Array<{ type: string; text?: string }>)
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join(' ')
  return text.slice(0, 50).trim() || 'New conversation'
}
