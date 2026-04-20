// Regression tests — assert that bugs we previously fixed stay fixed.
// Each test name should reference the version + symptom so it's clear what we're guarding against.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

// ─── v1.6.0: ErrorBoundary added at app root ──────────────────────────────

describe('regression: v1.6 — ErrorBoundary at app root', () => {
  it('App.tsx imports ErrorBoundary', () => {
    const src = readFileSync(join(ROOT, 'src/App.tsx'), 'utf-8')
    expect(src).toMatch(/import\s*\{\s*ErrorBoundary\s*\}\s*from\s*['"]@\/components\/error-boundary['"]/)
  })

  it('App.tsx wraps the tree in <ErrorBoundary>', () => {
    const src = readFileSync(join(ROOT, 'src/App.tsx'), 'utf-8')
    expect(src).toMatch(/<ErrorBoundary>/)
    expect(src).toMatch(/<\/ErrorBoundary>/)
  })

  it('ErrorBoundary component file exists', () => {
    const src = readFileSync(join(ROOT, 'src/components/error-boundary.tsx'), 'utf-8')
    expect(src).toMatch(/class ErrorBoundary extends Component/)
    expect(src).toMatch(/getDerivedStateFromError/)
  })
})

// ─── v1.6.0: grep error message includes context ──────────────────────────

describe('regression: v1.6 — grep error returns specific message, not "Grep failed"', () => {
  it('grep.ts does NOT return the bare string "Grep failed"', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/tools/grep.ts'), 'utf-8')
    expect(src).not.toMatch(/return\s*\{\s*error:\s*['"]Grep failed['"]\s*\}/)
  })

  it('grep.ts uses execFile (not exec) to prevent shell injection', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/tools/grep.ts'), 'utf-8')
    expect(src).toMatch(/execFile/)
    expect(src).not.toMatch(/from\s+['"]child_process['"][\s\S]*\{\s*exec\s*\}/)
  })
})

// ─── v1.4.0: OpenAI provider routing supported ────────────────────────────

describe('regression: v1.4 — OpenAI / Kimi / DeepSeek / Minimax provider routing', () => {
  it('agent.ts has detectProvider for openai', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent.ts'), 'utf-8')
    expect(src).toMatch(/detectProvider/)
    expect(src).toMatch(/return\s+['"]openai['"]/)
    expect(src).toMatch(/return\s+['"]kimi['"]/)
    expect(src).toMatch(/return\s+['"]deepseek['"]/)
  })

  it('agent.ts does NOT contain "Only Anthropic models are supported"', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent.ts'), 'utf-8')
    expect(src).not.toMatch(/Only Anthropic models are supported/)
  })

  it('agent.ts handles o-series and gpt-5 reasoning_effort', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent.ts'), 'utf-8')
    expect(src).toMatch(/reasoning_effort/)
  })
})

// ─── v1.6.0: nohi-file:// protocol restricted to ~/.nohi/ ─────────────────

describe('regression: v1.6 — nohi-file:// scoped to ~/.nohi/', () => {
  it('main/index.ts restricts protocol path to nohiRoot', () => {
    const src = readFileSync(join(ROOT, 'electron/main/index.ts'), 'utf-8')
    expect(src).toMatch(/protocol\.handle\(['"]nohi-file['"]/)
    expect(src).toMatch(/nohiRoot/)
    expect(src).toMatch(/'\.nohi'/)
  })
})

// ─── v1.6.0: Hooks pass context via JSON file, not env var ────────────────

describe('regression: v1.6 — Hooks use temp JSON file for context', () => {
  it('hooks/runner.ts writes context to temp file (NOHI_HOOK_CONTEXT_FILE)', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/hooks/runner.ts'), 'utf-8')
    expect(src).toMatch(/NOHI_HOOK_CONTEXT_FILE/)
    expect(src).toMatch(/writeFile/)
  })

  it('hooks/runner.ts hard-kills timed-out processes (SIGKILL)', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/hooks/runner.ts'), 'utf-8')
    expect(src).toMatch(/SIGKILL/)
  })
})

// ─── v2.0.1: Tool input malformed JSON surfaces as agent error ────────────

describe('regression: v2.0.1 — malformed tool input JSON yields tool_result error', () => {
  it('Anthropic branch yields tool_result with isError=true on JSON parse failure', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent.ts'), 'utf-8')
    // Look for the new error-surfacing block
    expect(src).toMatch(/Tool input was malformed JSON/)
  })

  it('OpenAI branch handles malformed tool args without silently passing {}', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent.ts'), 'utf-8')
    // Should NOT have the bare `try { input = JSON.parse(tc.args) } catch { /* ignore */ }` pattern
    expect(src).not.toMatch(/try\s*\{\s*input\s*=\s*JSON\.parse\(tc\.args\)\s*\}\s*catch\s*\{\s*\/\*\s*ignore/)
  })
})

// ─── v2.0.1: store.ts saves atomically + surfaces errors ─────────────────

describe('regression: v2.0.1 — store.ts atomic writes + error surfacing', () => {
  it('store.ts uses renameSync for atomic writes', () => {
    const src = readFileSync(join(ROOT, 'electron/main/store.ts'), 'utf-8')
    expect(src).toMatch(/renameSync/)
  })

  it('store.ts catches save errors and exposes them via getLastSettingsError', () => {
    const src = readFileSync(join(ROOT, 'electron/main/store.ts'), 'utf-8')
    expect(src).toMatch(/getLastSettingsError/)
    expect(src).toMatch(/EACCES/)
    expect(src).toMatch(/EROFS/)
  })

  it('main/index.ts settings:save returns { ok: false, error } on failure', () => {
    const src = readFileSync(join(ROOT, 'electron/main/index.ts'), 'utf-8')
    expect(src).toMatch(/settings:save/)
    expect(src).toMatch(/ok:\s*false/)
  })
})

// ─── v2.0.1: MCP errors include server name + reconnect hint ─────────────

describe('regression: v2.0.1 — MCP errors are actionable', () => {
  it('mcp/client.ts does NOT return bare "MCP tool call failed"', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/mcp/client.ts'), 'utf-8')
    expect(src).not.toMatch(/return\s*\{\s*error:\s*e\.message\s*\?\?\s*['"]MCP tool call failed['"]\s*\}/)
  })

  it('mcp/client.ts mentions Settings → MCP for reconnect guidance', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/mcp/client.ts'), 'utf-8')
    expect(src).toMatch(/Settings.*MCP|MCP.*Reconnect/)
  })
})

// ─── v2.5.x / v2.6.1: chat page + providers module stay in sync ──────────
// Originally guarded against a v1.6 bug where helpers were dropped during a
// split. In v2.6.1 the helpers moved into src/lib/providers.ts; chat page
// must still reference them (import path checked) AND providers must still
// export them (declaration checked there).

describe('regression: chat page + providers module are in sync', () => {
  const HELPERS = ['PROVIDER_LABELS', 'PROVIDER_MODELS', 'getContextWindow', 'formatCtxLabel', 'shortenPath'] as const

  it('chat/page.tsx still references every helper', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/page.tsx'), 'utf-8')
    for (const ident of HELPERS) {
      expect(src, `identifier "${ident}" referenced`).toMatch(new RegExp(`\\b${ident}\\b`))
    }
  })

  it('chat/page.tsx imports helpers from @/lib/providers', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/page.tsx'), 'utf-8')
    expect(src).toMatch(/from\s+['"]@\/lib\/providers['"]/)
  })

  it('providers.ts exports every helper', () => {
    const src = readFileSync(join(ROOT, 'src/lib/providers.ts'), 'utf-8')
    for (const ident of HELPERS) {
      expect(src, `identifier "${ident}" exported`).toMatch(
        new RegExp(`export\\s+(?:const|function)\\s+${ident}\\b`),
      )
    }
  })
})

// ─── v2.0.1: Brave fallback to DuckDuckGo is visible to user ─────────────

describe('regression: v2.0.1 — Brave→DuckDuckGo fallback visible in tool output', () => {
  it('webSearch.ts includes braveErrorNote in output', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/tools/webSearch.ts'), 'utf-8')
    expect(src).toMatch(/braveErrorNote/)
    expect(src).toMatch(/falling back to DuckDuckGo/)
  })

  it('formatResults includes the source label', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/tools/webSearch.ts'), 'utf-8')
    expect(src).toMatch(/via\s+\$\{source\}/)
  })
})

// ─── v2.5.2: markdown renderers must route through DOMPurify ─────────────
// MessageList.tsx used to ship a local renderMarkdown with no HTML escape —
// tool results from webFetch / gdrive / shopify flowed directly into
// dangerouslySetInnerHTML (XSS). chat-markdown.ts is the single sanitized path.

describe('regression: v2.5.2 — MessageList routes through DOMPurify', () => {
  it('MessageList.tsx no longer defines a local renderMarkdown', () => {
    const src = readFileSync(join(ROOT, 'src/components/MessageList.tsx'), 'utf-8')
    expect(src).not.toMatch(/function\s+renderMarkdown\s*\(/)
  })

  it('MessageList.tsx imports renderMarkdown from @/lib/chat-markdown', () => {
    const src = readFileSync(join(ROOT, 'src/components/MessageList.tsx'), 'utf-8')
    expect(src).toMatch(/import\s*\{\s*renderMarkdown\s*\}\s*from\s*['"]@\/lib\/chat-markdown['"]/)
  })

  it('chat-markdown.ts sanitizes via DOMPurify', () => {
    const src = readFileSync(join(ROOT, 'src/lib/chat-markdown.ts'), 'utf-8')
    expect(src).toMatch(/DOMPurify\.sanitize/)
    expect(src).toMatch(/export function renderMarkdown/)
  })
})

// ─── v2.5.2: shell:open-external has a protocol allowlist ────────────────
// Without the allowlist, prompt-injected javascript:/file:/data: URLs could
// be opened via ipcMain → shell.openExternal → RCE inside Electron.

describe('regression: v2.5.2 — shell:open-external protocol allowlist', () => {
  it('main/index.ts declares SAFE_EXTERNAL_PROTOCOLS', () => {
    const src = readFileSync(join(ROOT, 'electron/main/index.ts'), 'utf-8')
    expect(src).toMatch(/SAFE_EXTERNAL_PROTOCOLS/)
    expect(src).toMatch(/http:/)
    expect(src).toMatch(/https:/)
  })

  it('main/index.ts does not have a raw shell.openExternal pass-through handler', () => {
    const src = readFileSync(join(ROOT, 'electron/main/index.ts'), 'utf-8')
    // Previous buggy line: `ipcMain.handle('shell:open-external', (_e, url: string) => shell.openExternal(url))`
    expect(src).not.toMatch(/ipcMain\.handle\(['"]shell:open-external['"],\s*\(_e,\s*url:\s*string\)\s*=>\s*shell\.openExternal\(url\)\)/)
  })

  it('preload returns structured { ok } result', () => {
    const src = readFileSync(join(ROOT, 'electron/preload/index.ts'), 'utf-8')
    expect(src).toMatch(/openExternal[\s\S]{0,200}ok:\s*true/)
  })
})

// ─── v2.5.2: ai-console page deleted, dead i18n keys removed ─────────────
// Duplicate chat UI at /seller/ai-console had 2 of the XSS sinks above and
// 0 routing references. Removing it kills 825 LOC and the XSS sources.

describe('regression: v2.5.2 — ai-console page removed', () => {
  it('ai-console page file is deleted', () => {
    expect(
      () => readFileSync(join(ROOT, 'src/pages/seller/ai-console/page.tsx'), 'utf-8'),
    ).toThrow()
  })

  it('language-context has no nav.aiConsole key', () => {
    const src = readFileSync(join(ROOT, 'src/lib/language-context.tsx'), 'utf-8')
    expect(src).not.toMatch(/['"]nav\.aiConsole['"]/)
    expect(src).not.toMatch(/['"]aiConsole\.title['"]/)
  })

  it('App.tsx still has a catch-all redirect to /chat', () => {
    const src = readFileSync(join(ROOT, 'src/App.tsx'), 'utf-8')
    expect(src).toMatch(/Navigate\s+to=['"]\/chat['"]/)
  })
})

// ─── v2.6.0: Bash consent + approval IPC wiring ──────────────────────────
// Ensures the consent bridge between agent tools and the renderer stays
// wired. If someone refactors any link, the test drops — preventing a
// silent regression back to bash "warn only".

describe('regression: v2.6 — bash consent is plumbed end-to-end', () => {
  it('bash.ts exports shouldRequireBashConsent + covers the 4 modes', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/tools/bash.ts'), 'utf-8')
    expect(src).toMatch(/export function shouldRequireBashConsent/)
    for (const mode of ['off', 'dangerous', 'always', 'allowlist']) {
      expect(src, `mode ${mode}`).toMatch(new RegExp(`['"]${mode}['"]`))
    }
  })

  it('bash.ts fails closed when consent is required but no channel exists', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/tools/bash.ts'), 'utf-8')
    expect(src).toMatch(/no approval channel/i)
  })

  it('agent/dispatch forwards requestApproval to tool.call opts', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent/dispatch.ts'), 'utf-8')
    expect(src).toMatch(/requestApproval/)
    expect(src).toMatch(/bindApproval/)
  })

  it('main/index.ts ships pendingApprovals + agent:approval IPC handler', () => {
    const src = readFileSync(join(ROOT, 'electron/main/index.ts'), 'utf-8')
    expect(src).toMatch(/pendingApprovals/)
    expect(src).toMatch(/ipcMain\.on\(['"]agent:approval['"]/)
    expect(src).toMatch(/tool_approval_request/)
  })

  it('preload exposes agent.approve', () => {
    const src = readFileSync(join(ROOT, 'electron/preload/index.ts'), 'utf-8')
    expect(src).toMatch(/approve:\s*\(toolUseId/)
    expect(src).toMatch(/agent:approval/)
  })

  it('AgentEvent union includes tool_approval_request', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/types.ts'), 'utf-8')
    expect(src).toMatch(/tool_approval_request/)
  })

  it('renderer ships ToolConsent modal hooked into App.tsx', () => {
    const comp = readFileSync(join(ROOT, 'src/components/chat/tool-consent.tsx'), 'utf-8')
    expect(comp).toMatch(/tool_approval_request/)
    expect(comp).toMatch(/window\.nohi\.agent\.approve/)
    const app = readFileSync(join(ROOT, 'src/App.tsx'), 'utf-8')
    expect(app).toMatch(/<ToolConsent\s*\/>/)
  })

  it('App.tsx surfaces the plaintext-key migration toast', () => {
    const app = readFileSync(join(ROOT, 'src/App.tsx'), 'utf-8')
    expect(app).toMatch(/migratedPlaintextKeys/)
    expect(app).toMatch(/toast\.warning/)
  })
})

// ─── v2.6.0: safeStorage hard cutover for API keys ───────────────────────
// The old settings.json format stored provider keys in plaintext. Any copy
// of ~/.nohi/settings.json leaked everything. Now they go through Electron
// safeStorage and plaintext leftovers are dropped on read.

describe('regression: v2.6 — API keys encrypted at rest', () => {
  it('store.ts imports safeStorage from electron', () => {
    const src = readFileSync(join(ROOT, 'electron/main/store.ts'), 'utf-8')
    expect(src).toMatch(/import[^;]*safeStorage[^;]*from\s+['"]electron['"]/)
  })

  it('store.ts enumerates all 9 secret fields', () => {
    const src = readFileSync(join(ROOT, 'electron/main/store.ts'), 'utf-8')
    for (const field of [
      'anthropicApiKey',
      'openaiApiKey',
      'googleApiKey',
      'kimiApiKey',
      'minimaxApiKey',
      'deepseekApiKey',
      'braveSearchApiKey',
      'firecrawlApiKey',
      'catalogApiToken',
    ]) {
      expect(src, `field ${field} in SECRET_FIELDS`).toMatch(new RegExp(`['"]${field}['"]`))
    }
  })

  it('store.ts drops plaintext values and flags the migration', () => {
    const src = readFileSync(join(ROOT, 'electron/main/store.ts'), 'utf-8')
    expect(src).toMatch(/migratedPlaintextKeys/)
    expect(src).toMatch(/ENC_PREFIX/)
  })

  it('store.ts refuses to save when safeStorage is unavailable', () => {
    const src = readFileSync(join(ROOT, 'electron/main/store.ts'), 'utf-8')
    expect(src).toMatch(/safeStorage is unavailable/)
  })

  it('NohiSettings type includes migratedPlaintextKeys flag', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/types.ts'), 'utf-8')
    expect(src).toMatch(/migratedPlaintextKeys/)
  })
})

// ─── v2.5.2: header-level CSP + deny window.open ─────────────────────────
// Meta-only CSP misses about:blank / file:// navigations. setWindowOpenHandler
// forces window.open to fail — callers must go through shell:open-external
// which is now protocol-restricted.

describe('regression: v2.5.2 — header CSP + deny window.open', () => {
  it('main/index.ts installs CSP via onHeadersReceived', () => {
    const src = readFileSync(join(ROOT, 'electron/main/index.ts'), 'utf-8')
    expect(src).toMatch(/onHeadersReceived/)
    expect(src).toMatch(/Content-Security-Policy/)
    expect(src).toMatch(/CSP_POLICY/)
  })

  it('main/index.ts denies window.open via setWindowOpenHandler', () => {
    const src = readFileSync(join(ROOT, 'electron/main/index.ts'), 'utf-8')
    expect(src).toMatch(/setWindowOpenHandler/)
    expect(src).toMatch(/action:\s*['"]deny['"]/)
  })

  it('repo no longer contains a self-nested Nohi-Central-PRO/ directory on disk', () => {
    expect(
      () => readFileSync(join(ROOT, 'Nohi-Central-PRO/package.json'), 'utf-8'),
    ).toThrow()
  })
})
