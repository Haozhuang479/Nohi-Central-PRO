# Nohi Central PRO

A local-first desktop app that runs a Claude Code-style agent on your machine — wired to multiple AI providers, with a full tool loop, MCP integration, scheduled automations, and a chat UI.

[**Download latest release →**](https://github.com/Haozhuang479/Nohi-Central-PRO/releases/latest)

---

## What it does

- **Multi-provider chat** — Anthropic, OpenAI, Kimi, DeepSeek, Minimax. Switch mid-conversation.
- **22 agent tools** — bash, file read/write/edit, glob, grep, web fetch/search, Firecrawl scrape/crawl/search, deep research, image generation, image edit, memory read/write/delete, todo_write, task (subagent), notebook_edit, product search/upload.
- **MCP support** — connect any MCP server via stdio.
- **Skills system** — 23 built-in skills plus your own. Auto-injected via keyword triggers or invoked via `/skill-name`.
- **Cross-conversation memory** — agent uses `memory_write` / `memory_read` to remember durable facts across chats. Stored at `~/.nohi/memory/`.
- **Hooks** — PreToolUse / PostToolUse / Stop / UserPromptSubmit, configured in settings, executed via shell with sandboxed env.
- **Scheduled automations** — manual / hourly / daily / weekly prompts that fire as new chat sessions in the background.
- **Rich rendering** — syntax highlighting (highlight.js), math (KaTeX), Mermaid diagrams, GFM tables/checklists, image lightbox, colored diffs.
- **Voice input** — local Whisper transcription, no cloud round-trip.

## Install

**macOS Apple Silicon** — download the `.dmg` from [Releases](https://github.com/Haozhuang479/Nohi-Central-PRO/releases/latest).

The app is not code-signed. On first launch:
- Right-click the app → **Open** → confirm, OR
- Run `xattr -cr "/Applications/Nohi Central PRO.app"` in Terminal.

## Configure

After install, open the app and go to **Settings** to add at least one AI provider API key:
- Anthropic: get from [console.anthropic.com](https://console.anthropic.com/)
- OpenAI: [platform.openai.com](https://platform.openai.com/api-keys)
- Kimi / DeepSeek / Minimax: vendor consoles

Optional integrations:
- **Firecrawl** — for high-quality web scraping. Get an API key at [firecrawl.dev](https://firecrawl.dev).
- **MCP servers** — configure in Settings → MCP.
- **Hooks** — configure in `~/.nohi/settings.json` under `hooks: []`.

## Build from source

```bash
git clone https://github.com/Haozhuang479/Nohi-Central-PRO
cd Nohi-Central-PRO
npm install
npm run dev          # local dev with hot-reload
npm test             # run vitest suites
npm run build        # produce dmg/zip in dist/
```

Requires Node 20+ and macOS for native builds.

## Local data

Everything lives under `~/.nohi/`:

| Path | What |
|--|--|
| `~/.nohi/settings.json` | Settings + API keys (plaintext — chmod 600 on shared machines) |
| `~/.nohi/sessions/*.json` | Chat history (one file per session) |
| `~/.nohi/memory/*.md` | Cross-conversation memory |
| `~/.nohi/skills/*.md` | Custom skills |
| `~/.nohi/automation/automations.json` | Scheduled automations |
| `~/.nohi/images/*.png` | AI-generated images |

Nothing leaves your machine except API calls to the providers you configured.

## License

See repo for license details.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).
