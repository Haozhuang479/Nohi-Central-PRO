import { describe, it, expect } from 'vitest'
import { settingsView, integrationsView } from '../../electron/main/engine/lib/settings-view'
import type { NohiSettings } from '../../electron/main/engine/types'

const base: NohiSettings = {
  defaultModel: 'claude-sonnet-4-6',
  skillsDir: '/tmp/skills',
  workingDir: '/tmp',
  mcpServers: [],
  theme: 'light',
}

describe('settingsView', () => {
  it('groups providers under .providers', () => {
    const v = settingsView({ ...base, anthropicApiKey: 'a1', openaiApiKey: 'a2' })
    expect(v.providers.anthropic).toBe('a1')
    expect(v.providers.openai).toBe('a2')
    expect(v.providers.defaultModel).toBe('claude-sonnet-4-6')
  })

  it('groups integrations correctly — omits empty subkeys', () => {
    const v = settingsView(base)
    expect(v.integrations.brave).toBeUndefined()
    expect(v.integrations.firecrawl).toBeUndefined()
    expect(v.integrations.catalog).toEqual({ apiUrl: undefined, apiToken: undefined, merchantId: undefined })
  })

  it('preserves catalog settings', () => {
    const v = settingsView({ ...base, catalogApiUrl: 'https://x', catalogApiToken: 'tk', merchantId: 'm1' })
    expect(v.integrations.catalog).toEqual({ apiUrl: 'https://x', apiToken: 'tk', merchantId: 'm1' })
  })

  it('groups firecrawl when either key or url present', () => {
    const v1 = settingsView({ ...base, firecrawlApiKey: 'fc' })
    expect(v1.integrations.firecrawl?.apiKey).toBe('fc')
    const v2 = settingsView({ ...base, firecrawlApiUrl: 'https://fc' })
    expect(v2.integrations.firecrawl?.apiUrl).toBe('https://fc')
  })

  it('exposes app section', () => {
    const v = settingsView({ ...base, language: 'zh', theme: 'dark' })
    expect(v.app.language).toBe('zh')
    expect(v.app.theme).toBe('dark')
  })

  it('integrationsView shortcut matches settingsView.integrations', () => {
    const s = { ...base, firecrawlApiKey: 'fc', catalogApiToken: 'tk' }
    expect(integrationsView(s)).toEqual(settingsView(s).integrations)
  })
})
