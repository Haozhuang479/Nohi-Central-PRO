# Architecture

Nohi Central PRO is an Electron 32 app with three processes:

```
┌─────────────────┐    contextBridge / ipcMain      ┌─────────────────┐
│   Renderer      │ ◄─────────────────────────────► │   Main          │
│  (React 18)     │                                  │  (Node.js)      │
│                 │                                  │                 │
│  - Chat UI      │                                  │  - Agent loop   │
│  - Sidebar      │                                  │  - Tool exec    │
│  - Settings     │                                  │  - MCP client   │
│  - Markdown     │                                  │  - Sessions     │
│  - KaTeX/hljs   │                                  │  - Memory       │
└─────────────────┘                                  │  - Hooks        │
        ▲                                            │  - Scheduler    │
        │                                            └─────────────────┘
        │                                                     ▲
        │                                                     │
   ┌────┴─────────┐                                  ┌────────┴────────┐
   │   Preload    │ ◄──── window.nohi exposed ─────► │  IPC schemas    │
   │ (sandboxed)  │                                  │  (Zod validated)│
   └──────────────┘                                  └─────────────────┘
```

## Directory layout

```
electron/
├── main/
│   ├── index.ts                       # IPC handlers, lifecycle, scheduler, protocol
│   ├── store.ts                       # Settings persistence + auto-detection
│   └── engine/
│       ├── types.ts                   # Shared types (Renderer + Main)
│       ├── ipc-schemas.ts             # Zod schemas for IPC inputs
│       ├── agent.ts                   # Dual-path agent loop (Anthropic + OpenAI-compat)
│       ├── tools/
│       │   ├── index.ts               # ALL_TOOLS array
│       │   ├── bash.ts                # Shell execution
│       │   ├── fileRead.ts            # Read file with binary detection
│       │   ├── fileWrite.ts           # Write file with workingDir guard
│       │   ├── fileEdit.ts            # Find/replace edit + unified diff output
│       │   ├── glob.ts                # Pattern file matching
│       │   ├── grep.ts                # Regex content search (execFile, no shell)
│       │   ├── webFetch.ts            # HTTP fetch + HTML→markdown
│       │   ├── webSearch.ts           # DuckDuckGo / Brave
│       │   ├── firecrawl.ts           # Firecrawl scrape/crawl/search
│       │   ├── deepResearch.ts        # Multi-step research
│       │   ├── memory.ts              # memory_read/write/delete
│       │   ├── todoWrite.ts           # Structured task list
│       │   ├── task.ts                # Subagent spawning
│       │   ├── notebookEdit.ts        # .ipynb cell editing
│       │   ├── imageGenerate.ts       # OpenAI Images API
│       │   └── productSearch.ts       # E-commerce product search/upload
│       ├── memory/
│       │   └── store.ts               # ~/.nohi/memory/*.md persistence
│       ├── sessions/
│       │   └── history.ts             # ~/.nohi/sessions/*.json persistence
│       ├── automation/
│       │   └── store.ts               # Scheduled prompts
│       ├── hooks/
│       │   └── runner.ts              # PreToolUse/PostToolUse/Stop/UserPromptSubmit
│       ├── skills/
│       │   └── loader.ts              # Markdown skill loader (built-in + custom)
│       └── mcp/
│           └── client.ts              # MCP client wrapper
└── preload/
    └── index.ts                       # contextBridge exposing window.nohi

src/
├── App.tsx                            # Routes + ErrorBoundary
├── pages/
│   ├── chat/
│   │   ├── page.tsx                   # Chat composer + message list
│   │   ├── layout.tsx                 # Sidebar with sessions
│   │   ├── skills.tsx                 # /chat/skills
│   │   ├── mcp.tsx                    # /chat/mcp
│   │   └── automation.tsx             # /chat/automation
│   └── seller/
│       ├── home/                      # Landing dashboard
│       ├── settings/                  # API keys, hooks, integrations
│       ├── automation/                # Same logic, different chrome
│       ├── analytics/
│       ├── skills/                    # /seller/skills
│       ├── mcp/                       # /seller/mcp
│       ├── catalog/, brand-context/   # E-commerce shells (mostly UI scaffolding)
│       └── channels/
├── components/
│   ├── error-boundary.tsx
│   ├── chat/
│   │   ├── image-lightbox.tsx
│   │   ├── tool-block.tsx
│   │   ├── message-view.tsx
│   │   └── slash-menu.tsx
│   ├── automation/
│   │   └── automation-body.tsx        # Shared by /chat/automation + /seller/automation
│   ├── seller/seller-sidebar.tsx
│   └── ui/                            # shadcn/ui primitives
├── lib/
│   ├── chat-markdown.ts               # marked + highlight.js + KaTeX + mermaid
│   ├── use-chat-stream.ts             # rAF-batched delta accumulator
│   ├── use-smart-scroll.ts            # Auto-scroll only when at bottom
│   ├── use-automations.ts             # Shared automation state hook
│   ├── use-voice-recorder.ts          # Whisper local transcription
│   └── language-context.tsx           # i18n
├── store/
│   └── ai-store.ts                    # Zustand global state
└── styles/
    └── global.css                     # Tailwind v4 + tokens

tests/
├── tools/                             # vitest tests for file/grep/bash tools
└── ipc-schemas.test.ts                # Zod schema tests
```

## Agent loop

`runAgent(session, settings, skills, onEvent)` is the single entry point. Internally:

1. **Pre-flight** — registers itself as the subagent runner (for the `task` tool), runs `UserPromptSubmit` hooks (a non-zero exit blocks the run).
2. **System prompt** — built from base prompt + skill injection (keyword-matched against last user message) + CLAUDE.md memory + cross-session memory + plan-mode instructions.
3. **Provider routing** — `detectProvider(model)` picks Anthropic / OpenAI / Kimi / DeepSeek / Minimax. The latter four share the OpenAI-compatible adapter via base URL swap.
4. **Streaming loop** (max 20 iterations):
   - Stream text deltas → `text_delta` events
   - Stream Anthropic thinking deltas → `thinking_delta` events
   - When tool calls arrive: run `PreToolUse` hooks → execute tool → emit `tool_result` → run `PostToolUse` hooks
   - If `todo_write` was called: emit `todos_updated`
   - Loop continues if model wants more tool calls; otherwise breaks
5. **Tear-down** — `Stop` hooks fire (best-effort), `done` event yields.

All events flow through `onEvent` (called by `agent.ts`) and `webContents.send('agent:event', ...)` (queued in `index.ts`). The renderer's `unsubRef.current` cleans up subscriptions when the user stops the agent or starts a new run.

## IPC boundary

Every renderer→main call goes through `window.nohi.*` (defined in `electron/preload/index.ts`). The corresponding `ipcMain.handle` in `electron/main/index.ts` validates the payload with a Zod schema from `ipc-schemas.ts` before doing anything.

This guards against:
- Renderer compromise sending malformed payloads
- Type drift between renderer types and main expectations
- Subtle bugs from upstream API changes

## Security model

- `contextIsolation: true` and `nodeIntegration: false` in BrowserWindow (Electron defaults respected).
- `nohi-file://` custom protocol restricts to `~/.nohi/` only — no `~/.ssh`, no `~/.aws/credentials`.
- All file tools resolve user-supplied paths and reject anything outside `workingDir`.
- `BashTool` blocks dangerous patterns (`rm -rf /`, etc.) on top of letting the shell parse the command.
- `GrepTool` uses `execFile()` with array args — no shell interpolation possible.
- Hook context is written to a temp JSON file; only `NOHI_HOOK_CONTEXT_FILE` (path) and `NOHI_TOOL_NAME` (sanitized) reach the shell as env vars.
- API keys live in `~/.nohi/settings.json` (plaintext — readable only by the user).
- CSP restricts `script-src` to `'self' 'unsafe-inline'` (inline needed for Vite HMR & marked output) and whitelists only the AI provider domains under `connect-src`.

## Local data layout

| Path | Format |
|--|--|
| `~/.nohi/settings.json` | Single JSON file |
| `~/.nohi/sessions/<uuid>.json` | One file per chat |
| `~/.nohi/memory/<slug>-<hash>.md` | YAML frontmatter + markdown body, plus `MEMORY.md` index |
| `~/.nohi/skills/<name>.md` | Same format as memory |
| `~/.nohi/automation/automations.json` | Single JSON list |
| `~/.nohi/images/<id>.png` | Generated images |

## Build & release

`npm run build` runs `electron-vite build` (renderer + main + preload bundles into `out/`) then `electron-builder` (packages a macOS arm64 .dmg + .zip in `dist/`). The release artifacts are uploaded with `gh release create vX.Y.Z dist/*.dmg dist/*.zip --notes-file ...`.

## Testing

`npm test` runs Vitest. Tool tests use real temp directories under `os.tmpdir()` to exercise actual filesystem behavior. IPC schemas are tested by parsing valid + invalid payloads and asserting Zod throws when expected.

There's no integration test for the full agent loop yet (would require either a recorded provider response or a stub).

## Extending

**Add a tool:**
1. Create `electron/main/engine/tools/myTool.ts` that exports a `ToolDef`.
2. Register it in `tools/index.ts`.
3. Optional: add a label to `TOOL_LABELS` in `src/components/chat/tool-block.tsx` and a custom result renderer.

**Add a provider:**
1. Add to `OPENAI_BASE_URLS` in `agent.ts` (if OpenAI-compatible) or add a new branch.
2. Add API key field to `NohiSettings` and `NohiSettingsSchema`.
3. Add provider option to settings UI.

**Add a skill:** drop a markdown file in `resources/skills/` (built-in) or `~/.nohi/skills/` (user) with YAML frontmatter (`name`, `description`, `trigger`, body).
