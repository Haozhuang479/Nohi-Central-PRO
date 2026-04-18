// Automation store — manages scheduled prompts that run on a cron-like interval
// Each automation is a saved prompt + schedule that creates a new chat session when it fires

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { v4 as uuidv4 } from 'uuid'

const AUTOMATION_DIR = join(homedir(), '.nohi', 'automation')
const AUTOMATION_FILE = join(AUTOMATION_DIR, 'automations.json')

export type AutomationStatus = 'active' | 'paused'

export interface Automation {
  id: string
  name: string
  description?: string
  prompt: string
  // Recurrence: 'manual' (run on demand only), 'hourly', 'daily', 'weekly'
  schedule: 'manual' | 'hourly' | 'daily' | 'weekly'
  // For daily/weekly: time of day in HH:mm (24h) — local time
  timeOfDay?: string
  // For weekly: 0=Sun..6=Sat
  dayOfWeek?: number
  status: AutomationStatus
  createdAt: number
  updatedAt: number
  lastRunAt?: number
  nextRunAt?: number
  lastRunSessionId?: string
  lastRunOutput?: string
  // Optional: model override
  model?: string
}

async function ensureDir(): Promise<void> {
  await mkdir(AUTOMATION_DIR, { recursive: true })
}

export async function listAutomations(): Promise<Automation[]> {
  await ensureDir()
  if (!existsSync(AUTOMATION_FILE)) return []
  try {
    const raw = await readFile(AUTOMATION_FILE, 'utf-8')
    const list = JSON.parse(raw) as Automation[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

async function saveAll(list: Automation[]): Promise<void> {
  await ensureDir()
  await writeFile(AUTOMATION_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

export async function createAutomation(
  data: Omit<Automation, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'nextRunAt'>,
): Promise<Automation[]> {
  const list = await listAutomations()
  const now = Date.now()
  const automation: Automation = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    status: 'active',
    nextRunAt: computeNextRun(data.schedule, data.timeOfDay, data.dayOfWeek),
  }
  list.unshift(automation)
  await saveAll(list)
  return list
}

export async function updateAutomation(
  id: string,
  patch: Partial<Automation>,
): Promise<Automation[]> {
  const list = await listAutomations()
  const idx = list.findIndex((a) => a.id === id)
  if (idx === -1) return list
  const merged = { ...list[idx], ...patch, id, updatedAt: Date.now() }
  if (patch.schedule || patch.timeOfDay !== undefined || patch.dayOfWeek !== undefined) {
    merged.nextRunAt = computeNextRun(merged.schedule, merged.timeOfDay, merged.dayOfWeek)
  }
  list[idx] = merged
  await saveAll(list)
  return list
}

export async function deleteAutomation(id: string): Promise<Automation[]> {
  const list = await listAutomations()
  const next = list.filter((a) => a.id !== id)
  await saveAll(next)
  return next
}

export async function recordRun(
  id: string,
  sessionId: string,
  output: string,
): Promise<void> {
  const list = await listAutomations()
  const idx = list.findIndex((a) => a.id === id)
  if (idx === -1) return
  list[idx].lastRunAt = Date.now()
  list[idx].lastRunSessionId = sessionId
  list[idx].lastRunOutput = output.slice(0, 1000)
  list[idx].nextRunAt = computeNextRun(
    list[idx].schedule,
    list[idx].timeOfDay,
    list[idx].dayOfWeek,
  )
  await saveAll(list)
}

// ── Schedule computation ───────────────────────────────────────────────────

function computeNextRun(
  schedule: Automation['schedule'],
  timeOfDay?: string,
  dayOfWeek?: number,
): number | undefined {
  if (schedule === 'manual') return undefined
  const now = new Date()

  if (schedule === 'hourly') {
    const next = new Date(now)
    next.setHours(now.getHours() + 1, 0, 0, 0)
    return next.getTime()
  }

  // Parse time of day
  const [hStr, mStr] = (timeOfDay ?? '09:00').split(':')
  const hour = Math.max(0, Math.min(23, parseInt(hStr, 10) || 9))
  const minute = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0))

  if (schedule === 'daily') {
    const next = new Date(now)
    next.setHours(hour, minute, 0, 0)
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
    return next.getTime()
  }

  if (schedule === 'weekly') {
    const targetDow = dayOfWeek ?? 1 // Monday default
    const next = new Date(now)
    next.setHours(hour, minute, 0, 0)
    let daysUntil = (targetDow - next.getDay() + 7) % 7
    if (daysUntil === 0 && next.getTime() <= now.getTime()) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
    return next.getTime()
  }

  return undefined
}

export async function getDueAutomations(): Promise<Automation[]> {
  const list = await listAutomations()
  const now = Date.now()
  return list.filter(
    (a) => a.status === 'active' && a.nextRunAt !== undefined && a.nextRunAt <= now,
  )
}
