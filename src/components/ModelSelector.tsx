import { useState } from 'react'
import './ModelSelector.css'

const MODELS = [
  { id: 'claude-opus-4-6',            label: 'Claude Opus 4.6',    group: 'Anthropic', tokens: '200K' },
  { id: 'claude-sonnet-4-6',          label: 'Claude Sonnet 4.6',  group: 'Anthropic', tokens: '200K' },
  { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5',   group: 'Anthropic', tokens: '200K' },
]

function shortName(id: string): string {
  if (id.includes('opus'))   return 'Opus 4.6'
  if (id.includes('sonnet')) return 'Sonnet 4.6'
  if (id.includes('haiku'))  return 'Haiku 4.5'
  return id
}

interface Props {
  value: string
  onChange: (model: string) => void
}

export default function ModelSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="model-selector">
      <button className="model-btn" onClick={() => setOpen((o) => !o)}>
        {shortName(value)} ▾
      </button>

      {open && (
        <>
          <div className="model-backdrop" onClick={() => setOpen(false)} />
          <div className="model-dropdown">
            {MODELS.map((m) => (
              <button
                key={m.id}
                className={`model-option ${m.id === value ? 'selected' : ''}`}
                onClick={() => { onChange(m.id); setOpen(false) }}
              >
                <span className="model-option-name">{m.label}</span>
                <span className="model-option-tokens">{m.tokens}</span>
                {m.id === value && <span className="model-check">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
