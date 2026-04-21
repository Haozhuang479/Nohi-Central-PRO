// Virtualized session list for the chat sidebar.
// Falls back to plain rendering when count < 50 (virtualization overhead isn't worth it for small lists).

import { useMemo, useRef, useState, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import type { Session } from '../../../electron/main/engine/types'

type Group = 'today' | 'yesterday' | 'week' | 'older'

interface Props {
  grouped: Array<{ group: Group; items: Session[] }>
  active: Session | null
  hoveredId: string | null
  language: 'en' | 'zh'
  groupLabel: (g: string, lang: 'en' | 'zh') => string
  onSelect: (s: Session) => void
  onHover: (id: string | null) => void
  onExport: (id: string, format: 'md' | 'json', e: React.MouseEvent) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  /** Inline rename. Commits the new title via sessions:save. */
  onRename?: (id: string, title: string) => void
  /** Duplicate a session as a new one with its messages. */
  onDuplicate?: (id: string, e: React.MouseEvent) => void
}

type Row =
  | { kind: 'header'; group: Group; key: string }
  | { kind: 'session'; session: Session; key: string }

const HEADER_HEIGHT = 28
const ROW_HEIGHT = 32
const VIRTUALIZE_THRESHOLD = 50

export function SessionList(props: Props) {
  const totalCount = props.grouped.reduce((sum, g) => sum + g.items.length, 0)

  // Flatten grouped structure into a single list of rows
  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const { group, items } of props.grouped) {
      out.push({ kind: 'header', group, key: `h-${group}` })
      for (const s of items) out.push({ kind: 'session', session: s, key: s.id })
    }
    return out
  }, [props.grouped])

  if (totalCount < VIRTUALIZE_THRESHOLD) {
    // Simple render for small lists
    return (
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {props.grouped.map(({ group, items }) => (
          <div key={group} className="mb-1">
            <SessionGroupHeader group={group} language={props.language} groupLabel={props.groupLabel} />
            {items.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                active={props.active?.id === s.id}
                hovered={props.hoveredId === s.id}
                language={props.language}
                onSelect={props.onSelect}
                onHover={props.onHover}
                onExport={props.onExport}
                onDelete={props.onDelete}
                onRename={props.onRename}
                onDuplicate={props.onDuplicate}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return <VirtualSessionList {...props} rows={rows} />
}

function VirtualSessionList(props: Props & { rows: Row[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: props.rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (props.rows[i].kind === 'header' ? HEADER_HEIGHT : ROW_HEIGHT),
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto px-2 pb-2">
      <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtual) => {
          const row = props.rows[virtual.index]
          return (
            <div
              key={row.key}
              data-index={virtual.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtual.start}px)`,
              }}
            >
              {row.kind === 'header' ? (
                <SessionGroupHeader group={row.group} language={props.language} groupLabel={props.groupLabel} />
              ) : (
                <SessionRow
                  session={row.session}
                  active={props.active?.id === row.session.id}
                  hovered={props.hoveredId === row.session.id}
                  language={props.language}
                  onSelect={props.onSelect}
                  onHover={props.onHover}
                  onExport={props.onExport}
                  onDelete={props.onDelete}
                  onRename={props.onRename}
                  onDuplicate={props.onDuplicate}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SessionGroupHeader({ group, language, groupLabel }: {
  group: Group; language: 'en' | 'zh'; groupLabel: (g: string, lang: 'en' | 'zh') => string;
}) {
  return (
    <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
      {groupLabel(group, language)}
    </p>
  )
}

interface RowProps {
  session: Session
  active: boolean
  hovered: boolean
  language: 'en' | 'zh'
  onSelect: (s: Session) => void
  onHover: (id: string | null) => void
  onExport: (id: string, format: 'md' | 'json', e: React.MouseEvent) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  onRename?: (id: string, title: string) => void
  onDuplicate?: (id: string, e: React.MouseEvent) => void
}

function SessionRow({
  session,
  active,
  hovered,
  language,
  onSelect,
  onHover,
  onExport,
  onDelete,
  onRename,
  onDuplicate,
}: RowProps) {
  // Inline rename state — entered by double-clicking the title. Enter commits,
  // Escape cancels, blur commits (matches macOS Finder renaming semantics).
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(session.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraftTitle(session.title)
      requestAnimationFrame(() => {
        inputRef.current?.select()
      })
    }
  }, [editing, session.title])

  const commitRename = (): void => {
    const next = draftTitle.trim()
    setEditing(false)
    if (!next || next === session.title) return
    onRename?.(session.id, next.slice(0, 200))
  }

  return (
    <div
      onMouseEnter={() => onHover(session.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'group/item relative flex items-center w-full px-2 py-1.5 rounded-lg text-left transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
      )}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename() }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
          }}
          onBlur={commitRename}
          className="flex-1 bg-sidebar-accent/80 rounded px-1 py-0 text-xs text-sidebar-foreground outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => onSelect(session)}
          onDoubleClick={() => onRename && setEditing(true)}
          className="flex-1 text-xs truncate pr-16 text-left"
        >
          {session.title || (language === 'zh' ? '新对话' : 'New Chat')}
        </button>
      )}
      {hovered && !editing && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => onDuplicate(session.id, e)}
              title={language === 'zh' ? '复制对话' : 'Duplicate chat'}
              className="flex items-center justify-center size-5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-[11px]"
            >
              ⧉
            </button>
          )}
          <button
            type="button"
            onClick={(e) => onExport(session.id, 'md', e)}
            title={language === 'zh' ? '导出 Markdown' : 'Export as Markdown'}
            className="flex items-center justify-center size-5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-[10px]"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={(e) => onDelete(session.id, e)}
            className="flex items-center justify-center size-5 rounded-md text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors text-xs"
          >
            ×
          </button>
        </span>
      )}
    </div>
  )
}
