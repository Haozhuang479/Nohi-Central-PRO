// Slash command autocomplete with full keyboard navigation (ArrowUp/Down, Enter, Escape)

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Skill } from '../../../electron/main/engine/types'

interface SlashMenuProps {
  skills: Skill[]
  query: string
  onSelect: (skill: Skill) => void
  onClose: () => void
}

export function SlashMenu({ skills, query, onSelect, onClose }: SlashMenuProps) {
  const filtered = useMemo(() =>
    skills.filter((s) =>
      s.enabled &&
      (s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase()))
    ),
  [skills, query])

  const [selectedIdx, setSelectedIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset selection when filter changes
  useEffect(() => { setSelectedIdx(0) }, [query, filtered.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (filtered.length === 0) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => (i + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        onSelect(filtered[selectedIdx])
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [filtered, selectedIdx, onSelect, onClose])

  // Keep selected item in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${selectedIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  if (filtered.length === 0) return null

  return (
    <div
      ref={listRef}
      role="listbox"
      className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-border bg-background overflow-hidden max-h-52 overflow-y-auto"
    >
      {filtered.map((skill, i) => (
        <button
          key={skill.id}
          type="button"
          role="option"
          aria-selected={i === selectedIdx}
          data-idx={i}
          onMouseEnter={() => setSelectedIdx(i)}
          onClick={() => onSelect(skill)}
          className={cn(
            'flex flex-col w-full px-3 py-2 text-left transition-colors',
            i === selectedIdx ? 'bg-muted' : 'hover:bg-muted/60',
          )}
        >
          <span className="text-xs font-medium text-foreground">/{skill.name}</span>
          <span className="text-[10px] text-muted-foreground truncate">{skill.description}</span>
        </button>
      ))}
    </div>
  )
}
