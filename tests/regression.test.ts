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

describe('regression: v1.4 / v2.7.1 — provider routing (now in agent/providers.ts)', () => {
  it('agent/providers.ts routes each non-Anthropic provider', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent/providers.ts'), 'utf-8')
    expect(src).toMatch(/return\s+['"]openai['"]/)
    expect(src).toMatch(/return\s+['"]kimi['"]/)
    expect(src).toMatch(/return\s+['"]deepseek['"]/)
    expect(src).toMatch(/return\s+['"]minimax['"]/)
  })

  it('agent.ts imports detectProvider + has no local Anthropic-only gate', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent.ts'), 'utf-8')
    expect(src).toMatch(/import[\s\S]{0,200}detectProvider[\s\S]{0,200}from\s+['"]\.\/agent\/providers['"]/)
    expect(src).not.toMatch(/Only Anthropic models are supported/)
  })

  it('agent.ts still handles o-series and gpt-5 reasoning_effort', () => {
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

// ─── v2.8.0: chat reliability essentials ──────────────────────────────────
// Audit in v2.7.2 turned up a cluster of chat-side papercuts. This block
// pins the fixes.

describe('regression: v2.8 — cost-store wired end-to-end', () => {
  it('chat page feeds cost-store on message_complete', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/page.tsx'), 'utf-8')
    expect(src).toMatch(/useCostStore\.getState\(\)\.addEntry/)
    expect(src).toMatch(/message_complete/)
  })

  it('statusbar + titlebar read todaySpend instead of recomputing', () => {
    for (const rel of ['src/components/shell/statusbar.tsx', 'src/components/shell/titlebar.tsx']) {
      const src = readFileSync(join(ROOT, rel), 'utf-8')
      expect(src, `${rel} uses todaySpend`).toMatch(/todaySpend/)
      expect(src, `${rel} no longer imports calcCost`).not.toMatch(/import\s*\{[^}]*\bcalcCost\b/)
    }
  })

  it('cost-store exposes rolloverIfNewDay', () => {
    const src = readFileSync(join(ROOT, 'src/store/cost-store.ts'), 'utf-8')
    expect(src).toMatch(/rolloverIfNewDay/)
    expect(src).toMatch(/todayDate/)
  })
})

describe('regression: v2.8 — session delete requires confirmation', () => {
  it('layout uses AlertDialog + two-step delete', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/layout.tsx'), 'utf-8')
    expect(src).toMatch(/pendingDeleteId/)
    expect(src).toMatch(/AlertDialog/)
    expect(src).toMatch(/confirmDelete/)
    // The old one-click path must be gone
    expect(src).not.toMatch(/const deleteSession\s*=\s*useCallback/)
  })
})

describe('regression: v2.8 — Esc aborts a running agent', () => {
  it('chat/page.tsx registers a keydown listener that calls stopAgent', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/page.tsx'), 'utf-8')
    expect(src).toMatch(/key\s*!==\s*['"]Escape['"]/)
    expect(src).toMatch(/stopAgent\(\)/)
  })
})

describe('regression: v2.8 — command palette chat-aware', () => {
  it('palette dispatches nohi:chat-action and has New Chat / Search Sessions', () => {
    const src = readFileSync(join(ROOT, 'src/components/shell/command-palette.tsx'), 'utf-8')
    expect(src).toMatch(/nohi:chat-action/)
    expect(src).toMatch(/new-session/)
    expect(src).toMatch(/focus-search/)
    expect(src).toMatch(/toggle-sidebar/)
  })

  it('chat layout listens for nohi:chat-action', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/layout.tsx'), 'utf-8')
    expect(src).toMatch(/nohi:chat-action/)
  })
})

describe('regression: v2.8 — atomic session writes', () => {
  it('sessions/history.ts uses a tmp + rename dance', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/sessions/history.ts'), 'utf-8')
    expect(src).toMatch(/rename/)
    expect(src).toMatch(/\.tmp\./)
  })
})

describe('regression: v2.8 — tool-consent modal is Esc-dismissible', () => {
  it('tool-consent passes onOpenChange that denies on close', () => {
    const src = readFileSync(join(ROOT, 'src/components/chat/tool-consent.tsx'), 'utf-8')
    expect(src).toMatch(/onOpenChange/)
    expect(src).toMatch(/respond\(['"]deny['"]\)/)
  })
})

describe('regression: v2.8 — attachment size + binary guard', () => {
  it('chat/page.tsx enforces image/text caps + sniffs binaries', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/page.tsx'), 'utf-8')
    expect(src).toMatch(/MAX_IMAGE_BYTES/)
    expect(src).toMatch(/MAX_TEXT_BYTES/)
    expect(src).toMatch(/looksBinary/)
  })
})

// ─── v2.8.1: session management UX ───────────────────────────────────────

describe('regression: v2.8.1 — session rename + duplicate wired', () => {
  it('SessionList exposes onRename + onDuplicate props', () => {
    const src = readFileSync(join(ROOT, 'src/components/chat/session-list.tsx'), 'utf-8')
    expect(src).toMatch(/onRename\?:/)
    expect(src).toMatch(/onDuplicate\?:/)
    expect(src).toMatch(/onDoubleClick/)
  })

  it('chat/layout.tsx provides renameSession + duplicateSession', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/layout.tsx'), 'utf-8')
    expect(src).toMatch(/renameSession/)
    expect(src).toMatch(/duplicateSession/)
  })
})

describe('regression: v2.8.1 — search uses body cache', () => {
  it('chat/layout.tsx reuses a session-body Map across keystrokes', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/layout.tsx'), 'utf-8')
    expect(src).toMatch(/bodyCacheRef/)
    expect(src).toMatch(/useRef<Map<string, Session>>\(new Map\(\)\)/)
  })
})

describe('regression: v2.8.1 — markdown export keeps images + tool blocks', () => {
  it('chat/layout.tsx exports tool_use / tool_result / image blocks', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/layout.tsx'), 'utf-8')
    expect(src).toMatch(/case 'tool_use'/)
    expect(src).toMatch(/case 'tool_result'/)
    expect(src).toMatch(/case 'image'/)
    expect(src).toMatch(/encodeURIComponent/)
  })
})

// ─── v2.8.2: keyboard + slash builtins + nav consistency ─────────────────

describe('regression: v2.8.2 — slash menu has built-in commands', () => {
  it('SlashMenu surfaces builtins distinct from skills', () => {
    const src = readFileSync(join(ROOT, 'src/components/chat/slash-menu.tsx'), 'utf-8')
    expect(src).toMatch(/BuiltinCommand/)
    expect(src).toMatch(/onBuiltinSelect/)
    expect(src).toMatch(/built-in/)
  })

  it('chat/page.tsx wires /clear /new /help /model handlers', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/page.tsx'), 'utf-8')
    expect(src).toMatch(/BUILTIN_COMMANDS/)
    expect(src).toMatch(/handleBuiltinSelect/)
    for (const id of ['clear', 'new', 'help', 'model']) {
      expect(src, `case '${id}' handled`).toMatch(new RegExp(`case\\s+['"]${id}['"]`))
    }
  })
})

describe('regression: v2.8.2 — chat nav single-source', () => {
  it('chat-nav module exports the two link arrays', () => {
    const src = readFileSync(join(ROOT, 'src/lib/chat-nav.ts'), 'utf-8')
    expect(src).toMatch(/export const CHAT_SIDEBAR_NAV/)
    expect(src).toMatch(/export const CHAT_ADD_MENU_LINKS/)
  })

  it('sidebar and + Add menu both import from @/lib/chat-nav', () => {
    for (const rel of ['src/pages/chat/layout.tsx', 'src/pages/chat/page.tsx']) {
      const src = readFileSync(join(ROOT, rel), 'utf-8')
      expect(src, `${rel} imports chat-nav`).toMatch(/from\s+['"]@\/lib\/chat-nav['"]/)
    }
  })

  it('chat/page.tsx no longer hard-codes /seller/catalog/connectors', () => {
    const src = readFileSync(join(ROOT, 'src/pages/chat/page.tsx'), 'utf-8')
    expect(src).not.toMatch(/window\.location\.hash\s*=\s*['"]\/seller\/catalog\/connectors/)
    expect(src).not.toMatch(/window\.location\.hash\s*=\s*['"]\/seller\/settings['"]/)
  })
})

describe('regression: v2.8.2 — dead use-smart-scroll hook removed', () => {
  it('src/lib/use-smart-scroll.ts no longer exists', () => {
    expect(
      () => readFileSync(join(ROOT, 'src/lib/use-smart-scroll.ts'), 'utf-8'),
    ).toThrow()
  })
})

// ─── v2.8.3: cross-cutting cleanup ────────────────────────────────────────

describe('regression: v2.8.3 — dead catalog/connectors page removed', () => {
  it('/seller/catalog/connectors page file is gone', () => {
    expect(
      () => readFileSync(join(ROOT, 'src/pages/seller/catalog/connectors/page.tsx'), 'utf-8'),
    ).toThrow()
  })

  it('App.tsx redirects the old route to /seller/connectors', () => {
    const src = readFileSync(join(ROOT, 'src/App.tsx'), 'utf-8')
    expect(src).toMatch(/path="catalog\/connectors"[\s\S]*Navigate\s+to="\/seller\/connectors"/)
  })

  it('seller-sidebar no longer links to /seller/catalog/connectors', () => {
    const src = readFileSync(join(ROOT, 'src/components/seller/seller-sidebar.tsx'), 'utf-8')
    // Quoted href is the thing that matters — comments referencing the old
    // path are fine.
    expect(src).not.toMatch(/href:\s*['"]\/seller\/catalog\/connectors['"]/)
    expect(src).toMatch(/href:\s*['"]\/seller\/connectors['"]/)
  })
})

describe('regression: v2.8.3 — IPC errors routed through toastIpcError', () => {
  it('ipc-toast helper exports toastIpcError', () => {
    const src = readFileSync(join(ROOT, 'src/lib/ipc-toast.ts'), 'utf-8')
    expect(src).toMatch(/export function toastIpcError/)
    expect(src).toMatch(/toast\.error/)
  })

  it('key call sites no longer use bare .catch(() => {})', () => {
    const cases: Array<[string, RegExp]> = [
      ['src/App.tsx',                              /settings:save/],
      ['src/lib/use-automations.ts',               /automation:list/],
      ['src/pages/seller/connectors/page.tsx',     /connectors:list/],
      ['src/pages/seller/skills/page.tsx',         /skills:list/],
      ['src/pages/chat/skills.tsx',                /skills:list/],
      ['src/pages/chat/layout.tsx',                /sessions:list/],
      ['src/pages/seller/mcp/page.tsx',            /mcp:reconnect/],
      ['src/pages/chat/mcp.tsx',                   /mcp:reconnect/],
    ]
    for (const [rel, label] of cases) {
      const src = readFileSync(join(ROOT, rel), 'utf-8')
      expect(src, `${rel} imports toastIpcError`).toMatch(/toastIpcError/)
      expect(src, `${rel} labels with ${label}`).toMatch(label)
    }
  })
})

// ─── v2.9.0: automation cron support ─────────────────────────────────────

describe('regression: v2.9 — automation accepts cron schedule', () => {
  it('schedule union + cronExpression field exist in store', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/automation/store.ts'), 'utf-8')
    expect(src).toMatch(/schedule:\s*'manual'\s*\|\s*'hourly'\s*\|\s*'daily'\s*\|\s*'weekly'\s*\|\s*'cron'/)
    expect(src).toMatch(/cronExpression\?:\s*string/)
    expect(src).toMatch(/nextCronRun/)
  })

  it('AutomationCreateSchema validates cronExpression shape', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/ipc-schemas.ts'), 'utf-8')
    expect(src).toMatch(/'manual',\s*'hourly',\s*'daily',\s*'weekly',\s*'cron'/)
    expect(src).toMatch(/cronExpression/)
    expect(src).toMatch(/5 space-separated fields/)
  })

  it('UI ships a CronField with live preview', () => {
    const src = readFileSync(join(ROOT, 'src/components/automation/automation-body.tsx'), 'utf-8')
    expect(src).toMatch(/CronField/)
    expect(src).toMatch(/cronError/)
    expect(src).toMatch(/describeCron/)
  })

  it('use-automations save blocks missing cronExpression', () => {
    const src = readFileSync(join(ROOT, 'src/lib/use-automations.ts'), 'utf-8')
    expect(src).toMatch(/Cron expression is required/)
  })
})

describe('regression: v2.8.3 — EmptyState + ListSkeleton components', () => {
  it('shared components exist', () => {
    const empty = readFileSync(join(ROOT, 'src/components/ui/empty-state.tsx'), 'utf-8')
    const skel = readFileSync(join(ROOT, 'src/components/ui/list-skeleton.tsx'), 'utf-8')
    expect(empty).toMatch(/export function EmptyState/)
    expect(skel).toMatch(/export function ListSkeleton/)
  })

  it('four list pages adopt at least one of the shared components', () => {
    const pages = [
      'src/pages/seller/skills/page.tsx',
      'src/pages/seller/connectors/page.tsx',
      'src/pages/seller/mcp/page.tsx',
      'src/pages/chat/mcp.tsx',
    ]
    for (const rel of pages) {
      const src = readFileSync(join(ROOT, rel), 'utf-8')
      expect(src, `${rel} uses EmptyState or ListSkeleton`).toMatch(/EmptyState|ListSkeleton/)
    }
  })
})

// ─── v2.7.2: polish + doc drift ───────────────────────────────────────────

describe('regression: v2.7.2 — small hardening + doc drift fixes', () => {
  it('Brave key lookup centralised in lib/keys.ts', () => {
    const helper = readFileSync(join(ROOT, 'electron/main/engine/lib/keys.ts'), 'utf-8')
    expect(helper).toMatch(/export function getBraveKey/)
    expect(helper).toMatch(/BRAVE_SEARCH_API_KEY/)
    for (const path of ['electron/main/engine/tools/webSearch.ts', 'electron/main/engine/tools/webHelpers.ts']) {
      const src = readFileSync(join(ROOT, path), 'utf-8')
      expect(src, `${path} calls getBraveKey`).toMatch(/getBraveKey\(opts\.settings\)/)
      expect(src, `${path} no longer inlines the env fallback`).not.toMatch(/process\.env\.BRAVE_SEARCH_API_KEY/)
    }
  })

  it('gdrive.ts openExternal no longer swallows errors silently', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/connectors/gdrive.ts'), 'utf-8')
    // The old pattern `.catch(() => {})` after openExternal is gone.
    expect(src).not.toMatch(/openExternal\([^)]+\)\.catch\(\(\)\s*=>\s*\{\s*\}\)/)
    expect(src).toMatch(/logError[\s\S]{0,120}gdrive[\s\S]{0,120}openExternal/)
  })

  it('native/tools.ts stub comment no longer claims Phase 6 delivery', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/layer4-distribution/native/tools.ts'), 'utf-8')
    expect(src).not.toMatch(/real implementations in Phase 6/)
  })
})

// ─── v2.7.1: agent.ts pure helpers lifted to agent/providers.ts ──────────
// The big agent.ts file used to hold routing + conversion helpers inline.
// They moved out so agent.ts can focus on the async generator loop. This
// regression prevents anyone from accidentally copy-pasting a helper back
// into agent.ts and shadowing the canonical version.

describe('regression: v2.7.1 — agent helpers live in agent/providers.ts', () => {
  const HELPERS = ['detectProvider', 'getAnthropicClient', 'getOpenAIApiKey', 'getMaxTokens', 'supportsExtendedThinking', 'toOpenAITools', 'toOpenAIMessages'] as const

  it('providers.ts exports every helper', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent/providers.ts'), 'utf-8')
    for (const ident of HELPERS) {
      expect(src, `exports ${ident}`).toMatch(new RegExp(`export\\s+(?:function|const)\\s+${ident}\\b`))
    }
  })

  it('agent.ts does not redeclare any extracted helper', () => {
    const src = readFileSync(join(ROOT, 'electron/main/engine/agent.ts'), 'utf-8')
    for (const ident of HELPERS) {
      // Must NOT appear in a local `function foo(` or `const foo =` declaration
      expect(src, `no local decl of ${ident}`).not.toMatch(
        new RegExp(`^\\s*(?:function|const)\\s+${ident}\\b`, 'm'),
      )
    }
  })
})

// ─── v2.7.1: analytics mock data + MetricCard extracted ──────────────────

describe('regression: v2.7.1 — analytics page leaner', () => {
  it('mock data lives in its own module', () => {
    const src = readFileSync(join(ROOT, 'src/pages/seller/analytics/mock-data.ts'), 'utf-8')
    for (const arr of ['viewsData', 'ordersData', 'conversionData', 'projections']) {
      expect(src, `exports ${arr}`).toMatch(new RegExp(`export\\s+const\\s+${arr}\\b`))
    }
  })

  it('MetricCard lives in its own module', () => {
    const src = readFileSync(join(ROOT, 'src/pages/seller/analytics/metric-card.tsx'), 'utf-8')
    expect(src).toMatch(/export\s+function\s+MetricCard/)
  })

  it('analytics/page.tsx imports extracted pieces and does not redeclare them', () => {
    const src = readFileSync(join(ROOT, 'src/pages/seller/analytics/page.tsx'), 'utf-8')
    expect(src).toMatch(/from\s+["']\.\/mock-data["']/)
    expect(src).toMatch(/from\s+["']\.\/metric-card["']/)
    expect(src).not.toMatch(/^function\s+MetricCard/m)
    expect(src).not.toMatch(/^const\s+viewsData\s*=/m)
  })
})

// ─── v2.7.0: settings sections extracted + Agent Safety UI landed ─────────
// The settings page historically grew to 982 LOC in a single file. Phase D
// pulls Store Information into its own component and ships the Agent Safety
// UI (Phase B1 deferred this — bashConsentMode had a backend but no frontend).

describe('regression: v2.7 — settings sections modularised', () => {
  it('StoreSection lives in src/components/settings', () => {
    expect(
      () => readFileSync(join(ROOT, 'src/components/settings/store-section.tsx'), 'utf-8'),
    ).not.toThrow()
  })

  it('AgentSafetySection renders bash consent UI + allowlist', () => {
    const src = readFileSync(join(ROOT, 'src/components/settings/agent-safety-section.tsx'), 'utf-8')
    expect(src).toMatch(/bashConsentMode/)
    expect(src).toMatch(/bashAllowlist/)
    // All 4 modes show up as object keys in the MODE_LABELS table
    for (const mode of ['off', 'dangerous', 'always', 'allowlist']) {
      expect(src, `mode ${mode} rendered`).toMatch(new RegExp(`\\b${mode}\\b`))
    }
  })

  it('settings/page.tsx imports both extracted sections + does not redeclare their constants', () => {
    const src = readFileSync(join(ROOT, 'src/pages/seller/settings/page.tsx'), 'utf-8')
    expect(src).toMatch(/from\s+['"]@\/components\/settings\/store-section['"]/)
    expect(src).toMatch(/from\s+['"]@\/components\/settings\/agent-safety-section['"]/)
    // Constants moved into store-section.tsx — must not also live in page.tsx
    expect(src).not.toMatch(/const\s+STORE_CATEGORIES\s*=/)
    expect(src).not.toMatch(/const\s+GMV_RANGES\s*=/)
    expect(src).not.toMatch(/const\s+TEAM_SIZES\s*=/)
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
