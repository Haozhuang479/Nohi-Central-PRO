import { useState, useRef, useEffect, useCallback } from 'react'
import nohiLogo from '@/assets/nohi-logo.svg'
import { useVoiceRecorder } from '@/lib/use-voice-recorder'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { useAIStore } from '@/store/ai-store'
import { useChatOutletContext } from './layout'
import type {
  NohiSettings,
  Session,
  AgentEvent,
  ContentBlock,
  ToolUseBlock,
  Skill,
} from '../../../electron/main/engine/types'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Props {
  settings: NohiSettings
}

interface ToolBlockState {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  isError?: boolean
  collapsed: boolean
}

// ─── HTML sanitizer (DOMPurify) ───────────────────────────────────────────────

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    // Allow safe HTML elements used by marked output
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span', 'div',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'data-code', 'role',
    ],
    // Force all links to open externally (renderer has no navigation)
    FORCE_BODY: false,
    ADD_ATTR: ['target'],
  })
}

// ─── Markdown renderer using `marked` ────────────────────────────────────────

// Configure marked
marked.setOptions({ breaks: true, gfm: true })

// Custom renderer to inject copy button containers for code blocks
const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const langLabel = lang ? `<span class="code-lang">${lang}</span>` : ''
  return `<div class="code-block-wrapper relative group/code my-2">${langLabel}<span role="button" class="copy-code-btn absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity rounded-md bg-muted/80 hover:bg-muted px-2 py-1 text-[10px] text-muted-foreground border border-border/50 cursor-pointer select-none" data-code="${text.replace(/"/g, '&quot;')}">Copy</span><pre class="bg-muted/60 rounded-lg p-3 text-xs font-mono overflow-x-auto"><code>${escapedText}</code></pre></div>`
}
renderer.codespan = ({ text }: { text: string }) => {
  return `<code class="bg-muted/60 rounded px-1 py-0.5 text-xs font-mono">${text}</code>`
}

function renderMarkdown(text: string): string {
  try {
    const html = marked.parse(text, { renderer }) as string
    return sanitizeHtml(html)
  } catch {
    return sanitizeHtml(text.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
  }
}

// ─── Copy code button handler (injected via event delegation) ─────────────────

function useCodeCopyHandler(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.copy-code-btn') as HTMLElement | null
      if (!btn) return
      const code = btn.getAttribute('data-code') ?? ''
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!'
        setTimeout(() => { btn.textContent = 'Copy' }, 1500)
      }).catch(() => {})
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [containerRef])
}

// ─── Tool call card ─────────────────────────────────────────────────────────

function ToolBlock({ tool }: { tool: ToolBlockState }) {
  const [collapsed, setCollapsed] = useState(tool.collapsed)
  const isRunning = tool.result === undefined

  return (
    <div className={cn(
      'rounded-xl border p-3 text-xs font-mono my-2 transition-colors',
      isRunning ? 'border-amber-300/50 bg-amber-50/30' : 'border-border bg-muted/30'
    )}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 text-muted-foreground w-full text-left hover:text-foreground transition-colors"
      >
        <span className="flex-1 font-medium">{tool.name}</span>
        {isRunning ? (
          <span className="flex items-center gap-[2px] shrink-0">
            <span className="w-[2px] h-2 bg-amber-500/70 rounded-full animate-[wave_0.8s_ease-in-out_infinite]" />
            <span className="w-[2px] h-3 bg-amber-500/70 rounded-full animate-[wave_0.8s_ease-in-out_0.15s_infinite]" />
            <span className="w-[2px] h-2 bg-amber-500/70 rounded-full animate-[wave_0.8s_ease-in-out_0.3s_infinite]" />
          </span>
        ) : tool.isError ? (
          <span className="text-destructive shrink-0 text-xs">failed</span>
        ) : (
          <span className="text-emerald-600 shrink-0 text-xs">done</span>
        )}
        <span className="shrink-0 text-xs opacity-50">{collapsed ? '▾' : '▴'}</span>
      </button>
      {/* Progress bar when running */}
      {isRunning && (
        <div className="mt-2 h-[2px] rounded-full bg-amber-200 overflow-hidden">
          <div className="h-full w-1/3 bg-amber-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
        </div>
      )}

      {!collapsed && (
        <div className="mt-2 space-y-2">
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider">
              Input
            </p>
            <pre className="text-xs overflow-x-auto bg-background/50 rounded p-2 border border-border/50">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>
          {tool.result !== undefined && (
            <div>
              <p
                className={cn(
                  'mb-1 text-[10px] uppercase tracking-wider',
                  tool.isError ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {tool.isError ? 'Error' : 'Result'}
              </p>
              <pre
                className={cn(
                  'text-xs overflow-x-auto rounded p-2 border',
                  tool.isError
                    ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-background/50 border-border/50'
                )}
              >
                {tool.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Message bubble ─────────────────────────────────────────────────────────

interface MessageViewProps {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
  tools: ToolBlockState[]
  isLastAssistant?: boolean
  onEdit?: (text: string) => void
  onRetry?: () => void
}

function MessageView({ role, content, tools, isLastAssistant, onEdit, onRetry }: MessageViewProps) {
  const isUser = role === 'user'
  const [hovered, setHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useCodeCopyHandler(containerRef)

  const textContent =
    typeof content === 'string'
      ? content
      : content
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
          .map((b) => b.text)
          .join('')

  const toolUseIds =
    typeof content !== 'string'
      ? content
          .filter((b): b is ToolUseBlock => b.type === 'tool_use')
          .map((b) => b.id)
      : []

  const relevantTools = tools.filter((t) => toolUseIds.includes(t.id))

  if (isUser) {
    return (
      <div
        className="flex justify-end px-4 py-1.5 group/msg"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-end gap-2">
          {hovered && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(textContent)}
              className="flex items-center gap-1 h-6 px-2 rounded-full bg-muted text-muted-foreground text-[10px] hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
            >
              Edit
            </button>
          )}
          <div className="max-w-[72%] rounded-2xl bg-foreground text-background px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
            {textContent}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-start px-4 py-1.5 group/msg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex-1 min-w-0" ref={containerRef}>
        {relevantTools.map((tool) => (
          <ToolBlock key={tool.id} tool={tool} />
        ))}
        {textContent && (
          <div
            className="prose prose-sm dark:prose-invert max-w-none px-1 text-sm leading-relaxed max-w-[90%]"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(textContent) }}
          />
        )}
        {isLastAssistant && hovered && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1.5 flex items-center h-6 px-2 rounded-full bg-muted text-muted-foreground text-[10px] hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Streaming message bubble ─────────────────────────────────────────────────

function StreamingMessageView({
  text,
  tools,
}: {
  text: string
  tools: ToolBlockState[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  useCodeCopyHandler(containerRef)

  return (
    <div className="flex items-start px-4 py-1.5">
      <div className="flex-1 min-w-0" ref={containerRef}>
        {tools.map((tool) => (
          <ToolBlock key={tool.id} tool={tool} />
        ))}
        {text && (
          <div
            className="prose prose-sm dark:prose-invert max-w-none px-1 text-sm leading-relaxed max-w-[90%]"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Provider / model constants ─────────────────────────────────────────────

const PROVIDER_LABELS = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  kimi: 'Kimi',
  minimax: 'Minimax',
  deepseek: 'DeepSeek',
} as const

const PROVIDER_MODELS: Record<string, string[]> = {
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini', 'o4-mini'],
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  minimax: ['abab6.5s-chat'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
}

// Context window sizes by model keyword
function getContextWindow(model: string): number {
  if (model.includes('claude')) return 200000
  if (model.includes('gpt-4o')) return 128000
  return 32000
}

function formatCtxLabel(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return String(n)
}

// ─── Working directory badge ──────────────────────────────────────────────────

function shortenPath(p: string): string {
  if (!p) return ''
  const home = '/Users/'
  if (p.startsWith(home)) {
    const rest = p.slice(home.indexOf('/Users/') + 7)
    const slash = rest.indexOf('/')
    return '~/' + (slash === -1 ? rest : rest.slice(slash + 1))
  }
  const parts = p.split('/')
  if (parts.length > 3) return '…/' + parts.slice(-2).join('/')
  return p
}


// ─── Slash command autocomplete ───────────────────────────────────────────────

interface SlashMenuProps {
  skills: Skill[]
  query: string
  onSelect: (skill: Skill) => void
  onClose: () => void
}

function SlashMenu({ skills, query, onSelect, onClose }: SlashMenuProps) {
  const filtered = skills.filter(
    (s) =>
      s.enabled &&
      (s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase()))
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (filtered.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-border bg-background overflow-hidden max-h-52 overflow-y-auto">
      {filtered.map((skill) => (
        <button
          key={skill.id}
          type="button"
          onClick={() => onSelect(skill)}
          className="flex flex-col w-full px-3 py-2 text-left hover:bg-muted transition-colors"
        >
          <span className="text-xs font-medium text-foreground">/{skill.name}</span>
          <span className="text-[10px] text-muted-foreground truncate">{skill.description}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ChatPage({ settings }: Props) {
  const { language } = useLanguage()
  const { createNewSession, sidebarOpen, setSidebarOpen } = useChatOutletContext()
  const {
    session,
    isRunning,
    provider,
    model,
    inputTokens,
    outputTokens,
    setSession,
    setIsRunning,
    setProvider,
    setModel,
    addTokens,
  } = useAIStore()

  const [input, setInput] = useState('')
  // Persistent round-tools map: roundId -> tools[], never cleared
  const [roundToolsMap, setRoundToolsMap] = useState<Record<string, ToolBlockState[]>>({})
  // Maps assistantMsgId -> roundId so historical messages can find their tools
  const [msgRoundMap, setMsgRoundMap] = useState<Record<string, string>>({})
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null)

  const [showProviderMenu, setShowProviderMenu] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [streamingText, setStreamingText] = useState('')

  // Slash command state
  const [skills, setSkills] = useState<Skill[]>([])
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const totalTokens = inputTokens + outputTokens
  const contextWindow = getContextWindow(model)

  // ── Sync provider/model from settings on mount ────────────────────────────
  useEffect(() => {
    if (settings.primaryProvider && settings.defaultModel) {
      setProvider(settings.primaryProvider as Parameters<typeof setProvider>[0])
      setModel(settings.defaultModel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-scroll on new content ────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.messages, streamingText])

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`
  }, [input])

  // ── Load skills for slash commands ────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && window.nohi?.skills) {
      window.nohi.skills
        .list()
        .then((list: Skill[]) => setSkills(list))
        .catch(() => {})
    }
  }, [])

  // ── Stop/interrupt ────────────────────────────────────────────────────────
  const stopAgent = useCallback(() => {
    // Signal the main process to stop the agent loop for this session
    if (session?.id && typeof window !== 'undefined' && window.nohi?.agent?.abort) {
      window.nohi.agent.abort(session.id)
    }
    // Also unsubscribe locally so no more events are processed
    unsubRef.current?.()
    unsubRef.current = null
    setIsRunning(false)
    setStreamingText('')
  }, [session, setIsRunning])

  // ── File attachment ───────────────────────────────────────────────────────
  const [attachedImages, setAttachedImages] = useState<Array<{ name: string; base64: string; mediaType: string }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)

  // ── Voice recorder ────────────────────────────────────────────────────────
  const { state: voiceState, toggle: toggleVoice } = useVoiceRecorder({
    onTranscript: (text) => setInput((prev) => prev ? `${prev} ${text}` : text),
  })

  // Close add menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }
    if (showAddMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAddMenu])

  const attachFile = useCallback(async () => {
    if (typeof window !== 'undefined' && window.nohi?.dialog?.openFile) {
      try {
        const results = await window.nohi.dialog.openFile()
        if (!results) return
        for (const file of results) {
          const fileName = file.path.split('/').pop() ?? file.path
          if (file.isImage && file.base64 && file.mediaType) {
            setAttachedImages((prev) => [...prev, { name: fileName, base64: file.base64!, mediaType: file.mediaType! }])
          } else if (!file.isImage && file.content !== undefined) {
            const block = `\n\n> **File: ${fileName}**\n>\n${file.content
              .split('\n')
              .map((l: string) => `> ${l}`)
              .join('\n')}\n`
            setInput((prev) => prev + block)
          }
        }
        textareaRef.current?.focus()
      } catch {
        // dialog cancelled
      }
    }
  }, [])

  // ── Working directory picker ──────────────────────────────────────────────
  const openDirPicker = useCallback(async () => {
    if (typeof window !== 'undefined' && window.nohi?.dialog?.openDir) {
      try {
        const dir = await window.nohi.dialog.openDir()
        if (dir && session) {
          // Write back to session and persist
          const updated = { ...session, workingDir: dir }
          setSession(updated)
          window.nohi.sessions.save(updated).catch(() => {})
        }
      } catch {
        // cancelled
      }
    }
  }, [session, setSession])

  // ── Drag-and-drop files onto chat area ───────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only clear if leaving the chat container itself (not a child)
    if (e.currentTarget === e.target || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    for (const file of files) {
      const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      if (imageTypes.includes(file.type)) {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result !== 'string') return
          const base64 = reader.result.split(',')[1]
          if (!base64) return
          setAttachedImages((prev) => [...prev, { name: file.name, base64, mediaType: file.type }])
        }
        reader.readAsDataURL(file)
      } else {
        // Text / code file
        const text = await file.text()
        const block = `\n\n> **File: ${file.name}**\n>\n${text
          .split('\n')
          .map((l: string) => `> ${l}`)
          .join('\n')}\n`
        setInput((prev) => prev + block)
      }
    }
    textareaRef.current?.focus()
  }, [])

  // ── Handle textarea input (slash commands) ────────────────────────────────
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)

    // Detect "/" at beginning of input or after whitespace
    const match = val.match(/(?:^|\s)\/(\w*)$/)
    if (match) {
      setSlashQuery(match[1])
      setShowSlashMenu(true)
    } else {
      setShowSlashMenu(false)
      setSlashQuery('')
    }
  }, [])

  const handleSkillSelect = useCallback((skill: Skill) => {
    // Replace the trailing /query with the skill name + content
    const newInput = input.replace(/(?:^|\s)\/\w*$/, (m) => {
      const prefix = m.startsWith('/') ? '' : m[0]
      return prefix + '/' + skill.name + ' ' + skill.content
    })
    setInput(newInput)
    setShowSlashMenu(false)
    textareaRef.current?.focus()
  }, [input])

  // ── Edit message ──────────────────────────────────────────────────────────
  const handleEditMessage = useCallback((text: string, msgId: string) => {
    if (!session) return
    const idx = session.messages.findIndex((m) => m.id === msgId)
    if (idx === -1) return
    const trimmed = session.messages.slice(0, idx)
    setSession({ ...session, messages: trimmed })
    setInput(text)
    setStreamingText('')
    setAttachedImages([])  // clear any lingering attachments from the edited message
    textareaRef.current?.focus()
  }, [session, setSession])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isRunning) return

      let activeSession = session
      if (!activeSession) {
        const stub: Session = {
          id: crypto.randomUUID(),
          title: text.slice(0, 40),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          model,
          workingDir: settings.workingDir,
        }
        if (typeof window !== 'undefined' && window.nohi?.sessions) {
          try {
            activeSession = await window.nohi.sessions.create(model)
          } catch {
            activeSession = stub
          }
        } else {
          activeSession = stub
        }
        setSession(activeSession)
      }

      // Build content: plain text, or array of image + text blocks
      const content: string | Array<{ type: string; [k: string]: unknown }> =
        attachedImages.length > 0
          ? [
              ...attachedImages.map((img) => ({
                type: 'image',
                source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
              })),
              { type: 'text', text },
            ]
          : text

      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content,
        timestamp: Date.now(),
      }

      const updatedSession: Session = {
        ...activeSession,
        model,  // always use the currently selected model from the store
        messages: [...activeSession.messages, userMsg as typeof activeSession.messages[0]],
        updatedAt: Date.now(),
      }

      setSession(updatedSession)
      setIsRunning(true)
      setInput('')
      setAttachedImages([])
      setStreamingText('')
      setShowSlashMenu(false)

      // Generate a roundId for this send; tools will be stored under it
      const roundId = crypto.randomUUID()
      setCurrentRoundId(roundId)
      setRoundToolsMap((prev) => ({ ...prev, [roundId]: [] }))

      let assistantText = ''
      const localTools: ToolBlockState[] = []
      let assistantMsgId: string | null = null

      if (typeof window !== 'undefined' && window.nohi?.agent) {
        // Clean up any existing subscription before creating a new one
        unsubRef.current?.()
        unsubRef.current = null

        unsubRef.current = window.nohi.agent.onEvent((event: AgentEvent) => {
          if (event.type === 'text_delta') {
            assistantText += event.delta
            setStreamingText(assistantText)
          } else if (event.type === 'tool_start') {
            const newTool: ToolBlockState = {
              id: event.id,
              name: event.name,
              input: event.input,
              collapsed: false,
            }
            localTools.push(newTool)
            setRoundToolsMap((prev) => ({ ...prev, [roundId]: [...localTools] }))
          } else if (event.type === 'tool_result') {
            const idx = localTools.findIndex((t) => t.id === event.id)
            if (idx !== -1) {
              localTools[idx] = {
                ...localTools[idx],
                result: event.output,
                isError: event.isError,
                collapsed: true,
              }
              setRoundToolsMap((prev) => ({ ...prev, [roundId]: [...localTools] }))
            }
          } else if (event.type === 'message_complete') {
            addTokens(event.usage.input_tokens, event.usage.output_tokens, provider)
          } else if (event.type === 'done' || event.type === 'error') {
            const finalContent =
              event.type === 'error' ? `Error: ${event.message}` : assistantText

            assistantMsgId = crypto.randomUUID()
            const newAssistantMsgId = assistantMsgId

            const assistantMsg = {
              id: newAssistantMsgId,
              role: 'assistant' as const,
              content: finalContent,
              timestamp: Date.now(),
            }

            setSession((prev: Session | null) => {
              if (!prev) return prev
              const saved: Session = {
                ...prev,
                messages: [...prev.messages, assistantMsg],
                updatedAt: Date.now(),
              }
              // Persist the full session (including assistant response) to disk
              if (typeof window !== 'undefined' && window.nohi?.sessions) {
                window.nohi.sessions.save(saved).catch(() => {})
              }
              return saved
            })

            // Map the assistant message id to the roundId for historical tool lookup
            setMsgRoundMap((prev) => ({ ...prev, [newAssistantMsgId]: roundId }))

            setStreamingText('')
            setIsRunning(false)
            setCurrentRoundId(null)
            unsubRef.current?.()
          }
        })

        window.nohi.agent.run(updatedSession)
      } else {
        // Dev fallback
        setTimeout(() => {
          assistantMsgId = crypto.randomUUID()
          const newAssistantMsgId = assistantMsgId
          const assistantMsg = {
            id: newAssistantMsgId,
            role: 'assistant' as const,
            content:
              language === 'zh'
                ? '（IPC 未就绪 — 运行于渲染器开发模式）'
                : '(IPC not ready — running in renderer dev mode)',
            timestamp: Date.now(),
          }
          setSession((prev: Session | null) => {
            if (!prev) return prev
            return { ...prev, messages: [...prev.messages, assistantMsg] }
          })
          setMsgRoundMap((prev) => ({ ...prev, [newAssistantMsgId]: roundId }))
          setIsRunning(false)
          setCurrentRoundId(null)
        }, 800)
      }
    },
    [session, isRunning, model, provider, settings, setSession, setIsRunning, addTokens, language]
  )

  // ── Retry last assistant message (defined after sendMessage to close over it) ─
  const handleRetry = useCallback(() => {
    if (!session) return
    const msgs = session.messages
    let lastAssistantIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') { lastAssistantIdx = i; break }
    }
    if (lastAssistantIdx === -1) return

    // Find the last user message before the assistant turn
    let lastUserContent: typeof msgs[0]['content'] | null = null
    for (let i = lastAssistantIdx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserContent = msgs[i].content; break }
    }
    if (!lastUserContent) return

    const trimmed = msgs.slice(0, lastAssistantIdx)
    setSession({ ...session, messages: trimmed })
    setStreamingText('')

    // Restore text and images from the original user message
    if (typeof lastUserContent === 'string') {
      sendMessage(lastUserContent)
    } else {
      // Extract text and image blocks from the content array
      const textBlocks = lastUserContent
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('')
      const imageBlocks = lastUserContent
        .filter((b): b is { type: 'image'; source: { type: 'base64'; media_type: string; data: string } } => b.type === 'image')
        .map((b) => ({ name: 'image', base64: b.source.data, mediaType: b.source.media_type }))
      setAttachedImages(imageBlocks)
      sendMessage(textBlocks)
    }
  }, [session, setSession, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!showSlashMenu) sendMessage(input)
    }
  }

  const closeMenus = () => {
    setShowProviderMenu(false)
    setShowModelMenu(false)
  }

  const suggestions =
    language === 'zh'
      ? [
          '帮我解释量子计算的基本原理',
          '写一封专业的商务邮件',
          '用 Python 实现快速排序',
          '分析这段代码的性能瓶颈',
        ]
      : [
          'Explain how quantum computing works',
          'Write a professional business email',
          'Implement quicksort in Python',
          'Help me debug this code',
        ]

  const messages = session?.messages ?? []
  const hasMessages = messages.length > 0 || !!streamingText
  const currentModels = PROVIDER_MODELS[provider] ?? []

  // Find last assistant message index for Retry button
  let lastAssistantMsgId: string | null = null
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantMsgId = messages[i].id
      break
    }
  }

  // Tools for the streaming round
  const currentRoundTools = currentRoundId ? (roundToolsMap[currentRoundId] ?? []) : []

  return (
    <div
      className="flex flex-col h-full relative"
      onClick={closeMenus}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-ring rounded-xl pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <p className="text-sm font-medium">{language === 'zh' ? '释放以添加到对话' : 'Drop to add to conversation'}</p>
          </div>
        </div>
      )}
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar toggle */}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title={sidebarOpen
            ? (language === 'zh' ? '收起侧栏' : 'Collapse sidebar')
            : (language === 'zh' ? '展开侧栏' : 'Expand sidebar')
          }
        >
          <span className="text-sm">{sidebarOpen ? '←' : '→'}</span>
        </button>

        {/* Provider selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProviderMenu((v) => !v)
              setShowModelMenu(false)
            }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-transparent text-xs font-medium hover:bg-muted transition-colors"
          >
            {PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] ?? provider}
            <span className="text-[10px] opacity-50">▾</span>
          </button>

          {showProviderMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-background overflow-hidden">
              {(Object.keys(PROVIDER_LABELS) as Array<keyof typeof PROVIDER_LABELS>).map(
                (p) => {
                  // Check if user has configured an API key for this provider
                  const providerKeyMap: Record<string, keyof NohiSettings> = {
                    anthropic: 'anthropicApiKey',
                    openai: 'openaiApiKey',
                    kimi: 'kimiApiKey',
                    minimax: 'minimaxApiKey',
                    deepseek: 'deepseekApiKey',
                  }
                  const keyField = providerKeyMap[p]
                  const hasKey = keyField ? !!settings[keyField] : false
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        const newModel = PROVIDER_MODELS[p][0]
                        setProvider(p)
                        setModel(newModel)
                        // Sync model to current session so agent:run uses the right model
                        if (session) {
                          const updated = { ...session, model: newModel }
                          setSession(updated)
                          window.nohi?.sessions?.save(updated).catch(() => {})
                        }
                        setShowProviderMenu(false)
                      }}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-muted cursor-pointer',
                        p === provider && 'font-medium text-foreground'
                      )}
                    >
                      {p === provider ? (
                        <span className="text-emerald-500 shrink-0 text-xs">✓</span>
                      ) : (
                        <span className="size-3 shrink-0" />
                      )}
                      <span className="flex-1 text-left">{PROVIDER_LABELS[p]}</span>
                      {!hasKey && (
                        <span className="text-[9px] text-muted-foreground">
                          No key
                        </span>
                      )}
                    </button>
                  )
                }
              )}
            </div>
          )}
        </div>

        {/* Model selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowModelMenu((v) => !v)
              setShowProviderMenu(false)
            }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-transparent text-xs font-medium hover:bg-muted transition-colors max-w-[220px]"
          >
            <span className="truncate">{model}</span>
            <span className="text-[10px] opacity-50 shrink-0">▾</span>
          </button>

          {showModelMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded-xl border border-border bg-background overflow-hidden">
              {currentModels.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setModel(m)
                    if (session) {
                      const updated = { ...session, model: m }
                      setSession(updated)
                      window.nohi?.sessions?.save(updated).catch(() => {})
                    }
                    setShowModelMenu(false)
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors',
                    m === model && 'font-medium text-foreground'
                  )}
                >
                  {m === model ? (
                    <span className="text-emerald-500 text-xs">✓</span>
                  ) : (
                    <span className="size-3" />
                  )}
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plan Mode toggle */}
        <button
          type="button"
          onClick={() => {
            if (!session) return
            const updated = { ...session, planMode: !session.planMode }
            setSession(updated)
            window.nohi.sessions.save(updated).catch(() => {})
          }}
          title={language === 'zh' ? '计划模式：先规划再执行' : 'Plan Mode: plan before executing'}
          className={cn(
            'flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[10px] font-medium transition-colors',
            session?.planMode
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          Plan
        </button>

        <div className="flex-1" />

        {/* Working directory badge */}
        {settings.workingDir && (
          <button
            type="button"
            onClick={openDirPicker}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-transparent text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors max-w-[160px]"
            title={settings.workingDir}
          >
            <span className="truncate">{shortenPath(settings.workingDir)}</span>
          </button>
        )}

        {/* Token / cost summary */}
        {totalTokens > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
            {totalTokens.toLocaleString()} tokens
          </span>
        )}
      </div>

      {/* ── Messages area ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {/* Empty state */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
            <div className="text-center">
              <div className="mx-auto mb-4">
                <img src={nohiLogo} alt="Nohi" className="h-12 w-auto object-contain mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {language === 'zh' ? '有什么可以帮你？' : 'How can I help you?'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                {language === 'zh'
                  ? '开始对话，或从下方选择一个建议'
                  : 'Start a conversation, or pick a suggestion below'}
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setInput(s)
                    textareaRef.current?.focus()
                  }}
                  className="text-left rounded-2xl bg-muted/40 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation messages */}
        {messages.map((msg, idx) => {
          const roundId = msg.role === 'assistant' ? msgRoundMap[msg.id] : undefined
          const msgTools = roundId ? (roundToolsMap[roundId] ?? []) : []

          // For user messages, we need the message id for edit
          const isLastAssistant = msg.id === lastAssistantMsgId && !isRunning

          return (
            <MessageView
              key={msg.id}
              role={msg.role}
              content={msg.content}
              tools={msgTools}
              isLastAssistant={isLastAssistant}
              onEdit={
                msg.role === 'user'
                  ? (text) => handleEditMessage(text, msg.id)
                  : undefined
              }
              onRetry={isLastAssistant ? handleRetry : undefined}
            />
          )
        })}

        {/* Streaming assistant message */}
        {streamingText &&
          !messages.some(
            (m) =>
              m.role === 'assistant' &&
              (typeof m.content === 'string' ? m.content : '') === streamingText
          ) && (
            <StreamingMessageView text={streamingText} tools={currentRoundTools} />
          )}

        {/* Tool activity only (no text yet) */}
        {isRunning && !streamingText && currentRoundTools.length > 0 && (
          <StreamingMessageView text="" tools={currentRoundTools} />
        )}

        {/* Typing indicator — running with no text and no tools yet */}
        {isRunning && !streamingText && currentRoundTools.length === 0 && (
          <div className="flex items-start px-4 py-1.5">
            <div className="rounded-2xl bg-muted px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Context window indicator ─────────────────────────────────────── */}
      {totalTokens > 0 && (
        <div className="shrink-0 px-4 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-muted-foreground/30 rounded-full transition-all"
                style={{ width: `${Math.min((totalTokens / contextWindow) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
              {totalTokens.toLocaleString()} / {formatCtxLabel(contextWindow)} tokens
            </span>
          </div>
        </div>
      )}

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div className="shrink-0 relative">
        {/* Gradient mask: transparent → background, bottom-up */}
        <div className="absolute -top-10 inset-x-0 h-10 bg-gradient-to-t from-white/70 to-transparent pointer-events-none" />
      <div className="px-4 pb-5 pt-2">
        <div className="relative rounded-2xl bg-background overflow-visible">
          {/* Slash command autocomplete */}
          {showSlashMenu && skills.length > 0 && (
            <SlashMenu
              skills={skills}
              query={slashQuery}
              onSelect={handleSkillSelect}
              onClose={() => setShowSlashMenu(false)}
            />
          )}

          {/* Attached image previews */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-2">
              {attachedImages.map((img, i) => (
                <div key={i} className="relative group/img">
                  <img
                    src={`data:${img.mediaType};base64,${img.base64}`}
                    alt={img.name}
                    className="h-14 w-14 rounded-lg object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setAttachedImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              language === 'zh' ? '发送消息… 输入 / 使用技能' : 'Send a message… type / for skills'
            }
            disabled={isRunning}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[44px] max-h-[180px]"
          />
          {/* ── Toolbar row ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-0.5">
              {/* + Add menu */}
              <div className="relative" ref={addMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAddMenu((v) => !v)}
                  disabled={isRunning}
                  title={language === 'zh' ? '添加内容' : 'Add content'}
                  className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                >
                  <span className="text-sm font-medium">+</span>
                </button>
                {showAddMenu && (
                  <div className="absolute bottom-full left-0 mb-1.5 z-50 min-w-[160px] rounded-xl bg-background border border-border/40 shadow-lg overflow-hidden py-1">
                    {/* Attach file */}
                    <button
                      type="button"
                      onClick={() => { setShowAddMenu(false); attachFile() }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <span>{language === 'zh' ? '附加文件' : 'Attach file'}</span>
                    </button>
                    {/* Set working dir */}
                    <button
                      type="button"
                      onClick={() => { setShowAddMenu(false); openDirPicker() }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <span>{language === 'zh' ? '设置工作目录' : 'Set working dir'}</span>
                    </button>
                    {/* Connectors */}
                    <button
                      type="button"
                      onClick={() => { setShowAddMenu(false); window.location.hash = '/seller/catalog/connectors' }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <span>{language === 'zh' ? '连接器' : 'Connectors'}</span>
                    </button>
                    {/* Skills */}
                    <button
                      type="button"
                      onClick={() => { setShowAddMenu(false); window.location.hash = '/seller/settings' }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <span>{language === 'zh' ? '技能' : 'Skills'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Voice mic */}
              <button
                type="button"
                onClick={toggleVoice}
                disabled={isRunning}
                title={
                  voiceState === 'recording'
                    ? (language === 'zh' ? '停止录音' : 'Stop recording')
                    : voiceState === 'transcribing'
                      ? (language === 'zh' ? '转录中…' : 'Transcribing…')
                      : (language === 'zh' ? '语音输入' : 'Voice input')
                }
                className={cn(
                  'relative flex items-center justify-center size-7 rounded-full transition-colors disabled:opacity-40',
                  voiceState === 'recording'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : voiceState === 'transcribing'
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {/* Ripple rings when recording */}
                {voiceState === 'recording' && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
                    <span className="absolute -inset-1 rounded-full border-2 border-red-400 animate-ping opacity-20" style={{ animationDelay: '0.3s' }} />
                  </>
                )}
                {/* Waveform dots when transcribing */}
                {voiceState === 'transcribing' ? (
                  <span className="flex items-center gap-[2px]">
                    <span className="w-[2px] h-2 bg-muted-foreground/60 rounded-full animate-[wave_0.8s_ease-in-out_infinite]" />
                    <span className="w-[2px] h-3 bg-muted-foreground/60 rounded-full animate-[wave_0.8s_ease-in-out_0.15s_infinite]" />
                    <span className="w-[2px] h-2.5 bg-muted-foreground/60 rounded-full animate-[wave_0.8s_ease-in-out_0.3s_infinite]" />
                    <span className="w-[2px] h-3 bg-muted-foreground/60 rounded-full animate-[wave_0.8s_ease-in-out_0.45s_infinite]" />
                    <span className="w-[2px] h-2 bg-muted-foreground/60 rounded-full animate-[wave_0.8s_ease-in-out_0.6s_infinite]" />
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 relative z-10">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="17" x2="12" y2="22" />
                  </svg>
                )}
              </button>

              {/* Stop agent */}
              {isRunning && (
                <button
                  type="button"
                  onClick={stopAgent}
                  title={language === 'zh' ? '停止' : 'Stop'}
                  className="flex items-center justify-center size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <span className="text-xs">■</span>
                </button>
              )}
              {/* Send */}
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isRunning}
                title={language === 'zh' ? '发送' : 'Send'}
                className="flex items-center justify-center size-7 rounded-full bg-foreground text-background transition-opacity disabled:opacity-25 hover:opacity-75"
              >
                {isRunning ? (
                  <span className="text-[10px]">···</span>
                ) : (
                  <span className="text-sm">↑</span>
                )}
              </button>
            </div>
          </div>

          {/* ── Status bar ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-input/40">
            {/* Left: working path */}
            <button
              type="button"
              onClick={openDirPicker}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors max-w-[55%]"
              title={session?.workingDir || settings.workingDir || ''}
            >
              <span className="truncate">
                {shortenPath(session?.workingDir || settings.workingDir) ||
                  (language === 'zh' ? '未设置工作目录' : 'No working dir')}
              </span>
            </button>
            {/* Right: environment/provider */}
            <span className="text-[10px] text-muted-foreground">Nohi</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
