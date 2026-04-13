// Persistent cross-session memory stored in ~/.nohi/memory/
// Each memory is a .md file with YAML frontmatter

import { readFile, writeFile, readdir, mkdir, unlink } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'

export interface MemoryEntry {
  id: string
  category: 'user' | 'project' | 'feedback' | 'reference'
  content: string
  tags: string[]
  created: string  // ISO 8601
  updated: string
}

const MEMORY_DIR = join(homedir(), '.nohi', 'memory')
const INDEX_FILE = join(MEMORY_DIR, 'MEMORY.md')

export async function ensureMemoryDir(): Promise<void> {
  await mkdir(MEMORY_DIR, { recursive: true })
}

// Parse a .md memory file into MemoryEntry
function parseMemoryFile(raw: string, filename: string): MemoryEntry | null {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) return null
  const [, frontmatter, body] = match
  const meta: Record<string, string> = {}
  for (const line of frontmatter.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (kv) meta[kv[1]] = kv[2].trim()
  }
  return {
    id: basename(filename, '.md'),
    category: (meta['category'] as MemoryEntry['category']) || 'project',
    content: body.trim(),
    tags: (meta['tags'] ?? '').split(',').map(t => t.trim()).filter(Boolean),
    created: meta['created'] ?? new Date().toISOString(),
    updated: meta['updated'] ?? new Date().toISOString(),
  }
}

// Serialize a MemoryEntry to .md format
function serializeMemory(entry: MemoryEntry): string {
  return `---
category: ${entry.category}
tags: ${entry.tags.join(', ')}
created: ${entry.created}
updated: ${entry.updated}
---

${entry.content}
`
}

// List all memories
export async function listMemories(): Promise<MemoryEntry[]> {
  await ensureMemoryDir()
  let files: string[]
  try {
    files = await readdir(MEMORY_DIR)
  } catch {
    return []
  }
  const entries: MemoryEntry[] = []
  for (const file of files) {
    if (!file.endsWith('.md') || file === 'MEMORY.md') continue
    try {
      const raw = await readFile(join(MEMORY_DIR, file), 'utf-8')
      const entry = parseMemoryFile(raw, file)
      if (entry) entries.push(entry)
    } catch { /* skip corrupt files */ }
  }
  return entries.sort((a, b) => b.updated.localeCompare(a.updated))
}

// Write or update a memory
export async function writeMemory(
  content: string,
  category: MemoryEntry['category'],
  tags: string[] = [],
  existingId?: string,
): Promise<MemoryEntry> {
  await ensureMemoryDir()
  const now = new Date().toISOString()
  // Generate ID from content first line or use existing
  const id = existingId ?? content.split('\n')[0]
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .toLowerCase() || `memory-${Date.now()}`

  const filePath = join(MEMORY_DIR, `${id}.md`)
  let created = now
  // Preserve created date if updating
  if (existingId && existsSync(filePath)) {
    try {
      const raw = await readFile(filePath, 'utf-8')
      const existing = parseMemoryFile(raw, `${id}.md`)
      if (existing) created = existing.created
    } catch { /* use now */ }
  }

  const entry: MemoryEntry = { id, category, content, tags, created, updated: now }
  await writeFile(filePath, serializeMemory(entry), 'utf-8')
  await rebuildIndex()
  return entry
}

// Delete a memory
export async function deleteMemory(id: string): Promise<void> {
  const filePath = join(MEMORY_DIR, `${id}.md`)
  try { await unlink(filePath) } catch { /* already gone */ }
  await rebuildIndex()
}

// Rebuild the MEMORY.md index
async function rebuildIndex(): Promise<void> {
  const entries = await listMemories()
  const lines = ['# Memory Index', '']
  for (const e of entries) {
    const firstLine = e.content.split('\n')[0].slice(0, 100)
    lines.push(`- [${e.id}](${e.id}.md) (${e.category}) — ${firstLine}`)
  }
  await writeFile(INDEX_FILE, lines.join('\n'), 'utf-8')
}

// Build the memory injection string for the system prompt
export async function buildMemoryInjection(): Promise<string> {
  const entries = await listMemories()
  if (entries.length === 0) return ''

  const sections = entries.slice(0, 20).map(e =>
    `<memory id="${e.id}" category="${e.category}">\n${e.content}\n</memory>`
  )
  return '\n\n---\n# Persistent Memory (cross-session)\n' +
    'These are memories saved from previous conversations. Use them to maintain context.\n' +
    'To save new memories, use the memory_write tool.\n\n' +
    sections.join('\n\n') +
    '\n---'
}
