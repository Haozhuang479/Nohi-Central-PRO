import { useState } from 'react'
import type { NohiSettings, McpServerConfig } from '../../electron/main/engine/types'
import { v4 as uuidv4 } from 'uuid'
import './Settings.css'

interface Props {
  settings: NohiSettings
  onSave: (settings: NohiSettings) => Promise<void>
}

export default function SettingsPage({ settings, onSave }: Props) {
  const [local, setLocal] = useState<NohiSettings>({ ...settings })
  const [saved, setSaved] = useState(false)

  const update = (patch: Partial<NohiSettings>) => {
    setLocal((prev) => ({ ...prev, ...patch }))
    setSaved(false)
  }

  const handleSave = async () => {
    await onSave(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const browseSkillsDir = async () => {
    const dir = await window.nohi.dialog.openDir()
    if (dir) update({ skillsDir: dir })
  }

  const browseWorkingDir = async () => {
    const dir = await window.nohi.dialog.openDir()
    if (dir) update({ workingDir: dir })
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      {/* API Keys */}
      <Section title="API Keys" description="Keys are stored locally and never sent to Nohi servers.">
        <Field label="Anthropic API Key" hint="Required for Claude models">
          <input
            type="password"
            value={local.anthropicApiKey ?? ''}
            onChange={(e) => update({ anthropicApiKey: e.target.value })}
            placeholder="sk-ant-…"
          />
        </Field>
      </Section>

      {/* Model */}
      <Section title="Default Model">
        <Field label="Model">
          <select value={local.defaultModel} onChange={(e) => update({ defaultModel: e.target.value })}>
            <optgroup label="Anthropic">
              <option value="claude-opus-4-6">Claude Opus 4.6</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            </optgroup>
          </select>
        </Field>
      </Section>

      {/* Directories */}
      <Section title="Directories">
        <Field label="Working Directory" hint="Default directory for file operations">
          <div className="dir-field">
            <input readOnly value={local.workingDir} />
            <button className="browse-btn" onClick={browseWorkingDir}>Browse</button>
          </div>
        </Field>
        <Field label="Skills Directory" hint="Place custom .md skill files here">
          <div className="dir-field">
            <input readOnly value={local.skillsDir} />
            <button className="browse-btn" onClick={browseSkillsDir}>Browse</button>
          </div>
        </Field>
      </Section>

      {/* MCP Servers */}
      <Section
        title="MCP Servers"
        description="Connect to external tools via Model Context Protocol (Shopify, databases, APIs, etc.)"
      >
        <McpServerList
          servers={local.mcpServers}
          onChange={(servers) => update({ mcpServers: servers })}
        />
      </Section>

      {/* Save */}
      <div className="settings-footer">
        <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="settings-section">
      <div className="settings-section-head">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="settings-section-body">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="settings-field">
      <label>
        {label}
        {hint && <span className="field-hint">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function McpServerList({
  servers,
  onChange,
}: {
  servers: McpServerConfig[]
  onChange: (servers: McpServerConfig[]) => void
}) {
  const add = () => {
    onChange([
      ...servers,
      {
        id: uuidv4(),
        name: '',
        command: '',
        args: [],
        enabled: true,
      },
    ])
  }

  const update = (id: string, patch: Partial<McpServerConfig>) => {
    onChange(servers.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const remove = (id: string) => {
    onChange(servers.filter((s) => s.id !== id))
  }

  return (
    <div className="mcp-list">
      {servers.map((server) => (
        <div key={server.id} className="mcp-server-row">
          <input
            placeholder="Name (e.g. Shopify)"
            value={server.name}
            onChange={(e) => update(server.id, { name: e.target.value })}
          />
          <input
            placeholder="Command (e.g. npx)"
            value={server.command}
            onChange={(e) => update(server.id, { command: e.target.value })}
            className="mcp-cmd"
          />
          <input
            placeholder="Args (space-separated)"
            value={server.args.join(' ')}
            onChange={(e) => update(server.id, { args: e.target.value.split(' ').filter(Boolean) })}
            className="mcp-args"
          />
          <button className="mcp-remove" onClick={() => remove(server.id)}>×</button>
        </div>
      ))}
      <button className="mcp-add-btn" onClick={add}>+ Add MCP Server</button>
    </div>
  )
}
