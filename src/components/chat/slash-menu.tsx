// Slash command autocomplete with full keyboard navigation (ArrowUp/Down, Enter, Escape)

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Skill } from '../../../electron/main/engine/types'

/** Built-in commands like /clear, /new, /help, /model. Handled by the chat
 *  page itself rather than by injecting skill content into the input. */
export interface BuiltinCommand {
  id: string
  name: string
  description: string
}

interface SlashMenuProps {
  skills: Skill[]
  builtins?: BuiltinCommand[]
  query: string
  onSelect: (skill: Skill) => void
  onBuiltinSelect?: (command: BuiltinCommand) => void
  onClose: () => void
}

type MenuItem =
  | { kind: 'builtin'; builtin: BuiltinCommand }
  | { kind: 'skill'; skill: Skill }

export function SlashMenu({ skills, builtins, query, onSelect, onBuiltinSelect, onClose }: SlashMenuProps) {
  // Unified ordered list: built-ins first, then enabled skills that match.
  const items: MenuItem[] = useMemo(() => {
    const q = query.toLowerCase()
    const out: MenuItem[] = []
    for (const b of builtins ?? []) {
      if (!q || b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)) {
        out.push({ kind: 'builtin', builtin: b })
      }
    }
    for (const s of skills) {
      if (!s.enabled) continue
      if (!q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) {
        out.push({ kind: 'skill', skill: s })
      }
    }
    return out
  }, [builtins, skills, query])

  const [selectedIdx, setSelectedIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset selection when filter changes
  useEffect(() => { setSelectedIdx(0) }, [query, items.length])

  const fire = (item: MenuItem): void => {
    if (item.kind === 'builtin') {
      onBuiltinSelect?.(item.builtin)
    } else {
      onSelect(item.skill)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (items.length === 0) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => (i + 1) % items.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => (i - 1 + items.length) % items.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        fire(items[selectedIdx])
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  // fire closes over items + callbacks; we rebind the handler on every change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedIdx, onSelect, onBuiltinSelect, onClose])

  // Keep selected item in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${selectedIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  if (items.length === 0) return null

  return (
    <div
      ref={listRef}
      role="listbox"
      className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-border bg-background overflow-hidden max-h-52 overflow-y-auto"
    >
      {items.map((item, i) => {
        const name = item.kind === 'builtin' ? item.builtin.name : item.skill.name
        const description = item.kind === 'builtin' ? item.builtin.description : item.skill.description
        const key = item.kind === 'builtin' ? `b-${item.builtin.id}` : `s-${item.skill.id}`
        return (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={i === selectedIdx}
            data-idx={i}
            onMouseEnter={() => setSelectedIdx(i)}
            onClick={() => fire(item)}
            className={cn(
              'flex flex-col w-full px-3 py-2 text-left transition-colors',
              i === selectedIdx ? 'bg-muted' : 'hover:bg-muted/60',
            )}
          >
            <span className="text-xs font-medium text-foreground flex items-center gap-2">
              /{name}
              {item.kind === 'builtin' && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-normal">
                  built-in
                </span>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">{description}</span>
          </button>
        )
      })}
    </div>
  )
}
