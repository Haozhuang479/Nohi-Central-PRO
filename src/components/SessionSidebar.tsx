import type { Session } from '../../electron/main/engine/types'
import './SessionSidebar.css'

interface Props {
  sessions: Session[]
  activeId?: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export default function SessionSidebar({ sessions, activeId, onSelect, onNew, onDelete }: Props) {
  const grouped = groupByDate(sessions)

  return (
    <div className="session-sidebar">
      <div className="session-sidebar-header">
        <button className="new-chat-btn" onClick={onNew}>
          + New chat
        </button>
      </div>

      <div className="session-list">
        {grouped.map(({ label, items }) => (
          <div key={label} className="session-group">
            <div className="session-group-label">{label}</div>
            {items.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                active={s.id === activeId}
                onSelect={() => onSelect(s.id)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="session-empty">No conversations yet</div>
        )}
      </div>
    </div>
  )
}

function SessionItem({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: Session
  active: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div className={`session-item ${active ? 'active' : ''}`} onClick={onSelect}>
      <span className="session-title truncate">{session.title}</span>
      <button
        className="session-delete"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete"
      >
        ×
      </button>
    </div>
  )
}

function groupByDate(sessions: Session[]): { label: string; items: Session[] }[] {
  const now = Date.now()
  const today = new Date().setHours(0, 0, 0, 0)
  const weekAgo = today - 6 * 86400_000

  const groups: Record<string, Session[]> = { Today: [], 'This Week': [], Older: [] }

  for (const s of sessions) {
    if (s.updatedAt >= today) groups['Today'].push(s)
    else if (s.updatedAt >= weekAgo) groups['This Week'].push(s)
    else groups['Older'].push(s)
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}
