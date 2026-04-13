// Skills Loader — scans ~/.nohi/skills/ and built-in resources/skills/
// Adapted from Claude Code SkillTool + plugin loader patterns

import { readFile, readdir, stat, watch } from 'fs/promises'
import { join, extname, basename } from 'path'
import type { Skill } from '../types'

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/

// Toolkit directory for Shopify scripts — set by main process before loading
let _toolkitDir = ''
export function setToolkitDir(dir: string): void { _toolkitDir = dir }

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } | null {
  const m = raw.match(FRONTMATTER_RE)
  if (!m) return null
  const meta: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const [k, ...rest] = line.split(':')
    if (k?.trim()) meta[k.trim()] = rest.join(':').trim()
  }
  return { meta, body: m[2].trim() }
}

export async function loadSkillsFromDir(
  dir: string,
  source: 'builtin' | 'custom'
): Promise<Skill[]> {
  const skills: Skill[] = []
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return skills
  }

  for (const entry of entries) {
    if (extname(entry) !== '.md') continue
    const filePath = join(dir, entry)
    try {
      const s = await stat(filePath)
      if (!s.isFile()) continue
      const raw = await readFile(filePath, 'utf-8')
      const parsed = parseFrontmatter(raw)
      if (!parsed) continue

      const { meta, body: rawBody } = parsed
      // Replace toolkit path placeholders
      const body = _toolkitDir ? rawBody.replaceAll('{{SHOPIFY_TOOLKIT_DIR}}', _toolkitDir) : rawBody
      const id = meta.name ?? basename(entry, '.md')
      skills.push({
        id,
        name: meta.name ?? id,
        description: meta.description ?? '',
        trigger: meta.trigger?.replace(/^"|"$/g, '') ?? '',
        content: body,
        source,
        enabled: true,
        filePath,
      })
    } catch {
      // Skip malformed files
    }
  }
  return skills
}

// Build the system prompt injection for active skills
export function buildSkillInjection(skills: Skill[], userMessage: string): string {
  const active = skills.filter((s) => {
    if (!s.enabled) return false
    if (!s.trigger) return false
    const keywords = s.trigger.split(/[|,]/).map((k) => k.trim().toLowerCase())
    const msg = userMessage.toLowerCase()
    return keywords.some((kw) => kw && msg.includes(kw))
  })

  if (active.length === 0) return ''

  return (
    '\n\n' +
    active
      .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
      .join('\n\n')
  )
}

// Watch a directory for changes and call onChange
export async function watchSkillsDir(
  dir: string,
  onChange: () => void
): Promise<() => void> {
  try {
    const watcher = watch(dir, { recursive: false })
    let stopped = false
    ;(async () => {
      for await (const _ of watcher) {
        if (stopped) break
        onChange()
      }
    })()
    return () => {
      stopped = true
    }
  } catch {
    return () => {}
  }
}
