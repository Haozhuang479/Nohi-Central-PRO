import { useState, useEffect } from 'react'
import type { Skill } from '../../electron/main/engine/types'
import './Skills.css'

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [tab, setTab] = useState<'builtin' | 'custom'>('builtin')

  useEffect(() => {
    window.nohi.skills.list().then(setSkills)
  }, [])

  const toggle = async (id: string, enabled: boolean) => {
    const updated = await window.nohi.skills.toggle(id, enabled)
    setSkills(updated)
  }

  const visible = skills.filter((s) => s.source === tab)

  return (
    <div className="skills-page">
      <div className="skills-header">
        <h1>Skills</h1>
        <p>Skills inject context into Nohi's system prompt when triggered by keywords in your messages.</p>
      </div>

      <div className="skills-tabs">
        <button className={tab === 'builtin' ? 'active' : ''} onClick={() => setTab('builtin')}>
          Built-in ({skills.filter((s) => s.source === 'builtin').length})
        </button>
        <button className={tab === 'custom' ? 'active' : ''} onClick={() => setTab('custom')}>
          Custom ({skills.filter((s) => s.source === 'custom').length})
        </button>
      </div>

      <div className="skills-list">
        {visible.length === 0 && (
          <div className="skills-empty">
            {tab === 'custom'
              ? 'No custom skills yet. Add .md files to your skills directory in Settings.'
              : 'No built-in skills found.'}
          </div>
        )}
        {visible.map((skill) => (
          <SkillCard key={skill.id} skill={skill} onToggle={toggle} />
        ))}
      </div>

      {tab === 'custom' && (
        <div className="skills-guide">
          <h3>How to add a custom skill</h3>
          <p>Create a <code>.md</code> file in your skills directory with this format:</p>
          <pre>{SKILL_TEMPLATE}</pre>
        </div>
      )}
    </div>
  )
}

function SkillCard({
  skill,
  onToggle,
}: {
  skill: Skill
  onToggle: (id: string, enabled: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`skill-card ${skill.enabled ? 'enabled' : 'disabled'}`}>
      <div className="skill-card-header">
        <div className="skill-card-info">
          <div className="skill-card-name">{skill.name}</div>
          <div className="skill-card-desc">{skill.description}</div>
          {skill.trigger && (
            <div className="skill-triggers">
              {skill.trigger.split(/[|,]/).map((t) => (
                <span key={t} className="skill-trigger-tag">
                  {t.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="skill-card-actions">
          <button
            className="skill-preview-btn"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? 'Hide' : 'Preview'}
          </button>
          <Toggle checked={skill.enabled} onChange={(v) => onToggle(skill.id, v)} />
        </div>
      </div>
      {expanded && (
        <pre className="skill-content-preview">{skill.content.slice(0, 600)}{skill.content.length > 600 ? '\n…' : ''}</pre>
      )}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`toggle ${checked ? 'on' : 'off'}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

const SKILL_TEMPLATE = `---
name: my-skill
description: What this skill does
trigger: "keyword1|keyword2|keyword3"
---

You are an expert in [topic].

When the user asks about [topic]:
- Step 1
- Step 2
`
