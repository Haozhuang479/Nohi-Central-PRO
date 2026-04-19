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

// ─── v2.5.x: chat page references resolved (no dangling identifiers) ─────

describe('regression: chat page identifiers resolve', () => {
  it('chat/page.tsx defines PROVIDER_LABELS, PROVIDER_MODELS, getContextWindow, formatCtxLabel', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/page.tsx'), 'utf-8')
    // Each is both *used* (reference) and *defined* (declaration) in the same file
    for (const ident of ['PROVIDER_LABELS', 'PROVIDER_MODELS', 'getContextWindow', 'formatCtxLabel', 'shortenPath']) {
      expect(src, `identifier "${ident}" referenced`).toMatch(new RegExp(`\\b${ident}\\b`))
      // Declaration — `const PROVIDER_LABELS =` or `function getContextWindow(`
      expect(src, `identifier "${ident}" declared`).toMatch(
        new RegExp(`(?:const|function)\\s+${ident}\\b`),
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
