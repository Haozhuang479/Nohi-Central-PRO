import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  Plus,
  History,
  Wrench,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Bot,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { useAIStore } from '@/store/ai-store'
import type { NohiSettings, Session, AgentEvent, ContentBlock, ToolUseBlock, ToolResultBlock } from '../../../../electron/main/engine/types'

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

// ─── Simple markdown → HTML converter ──────────────────────────────────────

function simpleMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="bg-muted/60 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">$1</pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted/60 rounded px-1 py-0.5 text-xs font-mono">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-semibold mt-4 mb-2">$1</h1>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$1</li>')
    // Newlines to <br>
    .replace(/\n/g, '<br />')
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ToolBlock({ tool }: { tool: ToolBlockState }) {
  const [collapsed, setCollapsed] = useState(tool.collapsed)

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs font-mono my-2">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 text-muted-foreground w-full text-left hover:text-foreground transition-colors"
      >
        <Wrench className="size-3 shrink-0" />
        <span className="flex-1 font-medium">{tool.name}</span>
        {tool.result !== undefined ? (
          tool.isError ? (
            <XCircle className="size-3 text-destructive shrink-0" />
          ) : (
            <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
          )
        ) : (
          <Loader2 className="size-3 animate-spin shrink-0" />
        )}
        {collapsed ? (
          <ChevronDown className="size-3 shrink-0" />
        ) : (
          <ChevronUp className="size-3 shrink-0" />
        )}
      </button>

      {!collapsed && (
        <div className="mt-2 space-y-2">
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider">Input</p>
            <pre className="text-xs overflow-x-auto bg-background/50 rounded p-2 border border-border/50">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>
          {tool.result !== undefined && (
            <div>
              <p className={cn('mb-1 text-[10px] uppercase tracking-wider', tool.isError ? 'text-destructive' : 'text-muted-foreground')}>
                {tool.isError ? 'Error' : 'Result'}
              </p>
              <pre className={cn('text-xs overflow-x-auto rounded p-2 border', tool.isError ? 'bg-destructive/10 border-destructive/30' : 'bg-background/50 border-border/50')}>
                {tool.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlanPanel({
  steps,
  onApprove,
  onCancel,
  language,
}: {
  steps: string[]
  onApprove: () => void
  onCancel: () => void
  language: string
}) {
  return (
    <div className="mx-4 mb-3 rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-yellow-500" />
          <span className="text-sm font-medium">
            {language === 'zh' ? '审核计划' : 'Review Plan'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {steps.length} {language === 'zh' ? '步骤' : 'steps'}
        </span>
      </div>

      <ol className="space-y-2 mb-4">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="size-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-foreground leading-snug">{step}</span>
          </li>
        ))}
      </ol>

      <div className="flex gap-2 mt-4">
        <Button size="sm" className="rounded-full" onClick={onApprove}>
          {language === 'zh' ? '批准并执行' : 'Approve & Run'}
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={onCancel}>
          {language === 'zh' ? '取消' : 'Cancel'}
        </Button>
      </div>
    </div>
  )
}

interface MessageViewProps {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
  tools: ToolBlockState[]
}

function MessageView({ role, content, tools }: MessageViewProps) {
  const isUser = role === 'user'

  const textContent = typeof content === 'string'
    ? content
    : content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('')

  const toolUseIds = typeof content !== 'string'
    ? content.filter((b): b is ToolUseBlock => b.type === 'tool_use').map((b) => b.id)
    : []

  const relevantTools = tools.filter((t) => toolUseIds.includes(t.id))

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[75%] rounded-2xl bg-foreground text-background px-4 py-2.5 text-sm leading-relaxed">
          {textContent}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-1">
      <div className="size-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        {relevantTools.map((tool) => (
          <ToolBlock key={tool.id} tool={tool} />
        ))}
        {textContent && (
          <div
            className="rounded-2xl bg-secondary/50 px-4 py-2.5 text-sm leading-relaxed max-w-[85%]"
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(textContent) }}
          />
        )}
      </div>
    </div>
  )
}

function SessionHistoryPanel({
  sessions,
  currentSessionId,
  onSelect,
  onClose,
  language,
}: {
  sessions: Session[]
  currentSessionId: string | null
  onSelect: (s: Session) => void
  onClose: () => void
  language: string
}) {
  return (
    <div className="absolute top-full right-0 mt-1 w-72 z-50 rounded-2xl border border-border bg-background shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium">
          {language === 'zh' ? '历史会话' : 'Session History'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          ✕
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {language === 'zh' ? '暂无历史会话' : 'No sessions yet'}
          </p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className={cn(
                'flex flex-col items-start gap-0.5 w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0',
                s.id === currentSessionId && 'bg-secondary/50'
              )}
            >
              <span className="text-sm font-medium text-foreground truncate w-full">
                {s.title || (language === 'zh' ? '未命名会话' : 'Untitled Session')}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(s.updatedAt).toLocaleDateString()} · {s.messages.length} msgs
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

const PROVIDER_LABELS = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  kimi: 'Kimi',
  minimax: 'Minimax',
  deepseek: 'Deepseek',
} as const

const PROVIDER_MODELS: Record<string, string[]> = {
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k'],
  minimax: ['abab6.5s-chat'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
}

function extractPlanSteps(text: string): string[] | null {
  if (!text) return null
  const lower = text.toLowerCase()
  if (!lower.startsWith('plan:') && !lower.includes('\nplan:')) return null

  // Try to extract numbered steps
  const lines = text.split('\n').filter(Boolean)
  const steps: string[] = []
  for (const line of lines) {
    const match = line.match(/^\s*(?:\d+[\.\)]|[-*])\s+(.+)/)
    if (match) steps.push(match[1].trim())
  }
  return steps.length > 0 ? steps : null
}

export default function AIConsolePage({ settings }: Props) {
  const { language } = useLanguage()
  const {
    session,
    sessions,
    isRunning,
    provider,
    model,
    inputTokens,
    outputTokens,
    costToday,
    setSession,
    setSessions,
    setIsRunning,
    setProvider,
    setModel,
    addTokens,
  } = useAIStore()

  const [input, setInput] = useState('')
  const [tools, setTools] = useState<ToolBlockState[]>([])
  const [planSteps, setPlanSteps] = useState<string[] | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showProviderMenu, setShowProviderMenu] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [streamingText, setStreamingText] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const totalTokens = inputTokens + outputTokens
  const formattedCost = costToday < 0.01
    ? `$${(costToday).toFixed(4)}`
    : `$${costToday.toFixed(3)}`

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.messages, streamingText])

  // Load sessions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.nohi?.sessions) {
      window.nohi.sessions.list().then((list: Session[]) => {
        setSessions(list)
        if (list.length > 0 && !session) {
          setSession(list[0])
        }
      }).catch(() => {
        // Sessions not available — graceful fallback
      })
    }
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`
  }, [input])

  const createNewSession = useCallback(async () => {
    if (typeof window !== 'undefined' && window.nohi?.sessions) {
      try {
        const s = await window.nohi.sessions.create(model)
        setSession(s)
        setSessions((prev: Session[]) => [s, ...prev])
        setTools([])
        setPlanSteps(null)
        setStreamingText('')
      } catch {
        // Fallback: create a local stub session
        const stub: Session = {
          id: crypto.randomUUID(),
          title: 'New Session',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          model,
          workingDir: settings.workingDir,
        }
        setSession(stub)
      }
    } else {
      const stub: Session = {
        id: crypto.randomUUID(),
        title: 'New Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        model,
        workingDir: settings.workingDir,
      }
      setSession(stub)
    }
  }, [model, settings.workingDir, setSession, setSessions])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isRunning) return

      let activeSession = session
      if (!activeSession) {
        // Create session on the fly
        if (typeof window !== 'undefined' && window.nohi?.sessions) {
          try {
            activeSession = await window.nohi.sessions.create(model)
            setSession(activeSession)
          } catch {
            activeSession = {
              id: crypto.randomUUID(),
              title: text.slice(0, 40),
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages: [],
              model,
              workingDir: settings.workingDir,
            }
            setSession(activeSession)
          }
        } else {
          activeSession = {
            id: crypto.randomUUID(),
            title: text.slice(0, 40),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
            model,
            workingDir: settings.workingDir,
          }
          setSession(activeSession)
        }
      }

      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: text,
        timestamp: Date.now(),
      }

      const updatedSession: Session = {
        ...activeSession,
        messages: [...activeSession.messages, userMsg],
        updatedAt: Date.now(),
      }

      setSession(updatedSession)
      setIsRunning(true)
      setInput('')
      setStreamingText('')
      setTools([])
      setPlanSteps(null)

      let assistantText = ''
      const localTools: ToolBlockState[] = []

      if (typeof window !== 'undefined' && window.nohi?.agent) {
        unsubRef.current = window.nohi.agent.onEvent((event: AgentEvent) => {
          if (event.type === 'text_delta') {
            assistantText += event.delta
            setStreamingText(assistantText)

            // Check for plan mode
            const planStepsFound = extractPlanSteps(assistantText)
            if (planStepsFound) setPlanSteps(planStepsFound)

          } else if (event.type === 'tool_start') {
            const newTool: ToolBlockState = {
              id: event.id,
              name: event.name,
              input: event.input,
              collapsed: false,
            }
            localTools.push(newTool)
            setTools([...localTools])

          } else if (event.type === 'tool_result') {
            const idx = localTools.findIndex((t) => t.id === event.id)
            if (idx !== -1) {
              localTools[idx] = {
                ...localTools[idx],
                result: event.output,
                isError: event.isError,
                collapsed: true,
              }
              setTools([...localTools])
            }

          } else if (event.type === 'message_complete') {
            addTokens(event.usage.input_tokens, event.usage.output_tokens, provider)

          } else if (event.type === 'done' || event.type === 'error') {
            const finalContent = event.type === 'error'
              ? `Error: ${event.message}`
              : assistantText

            const assistantMsg = {
              id: crypto.randomUUID(),
              role: 'assistant' as const,
              content: finalContent,
              timestamp: Date.now(),
            }

            setSession((prev: Session | null) => {
              if (!prev) return prev
              return {
                ...prev,
                messages: [...prev.messages, assistantMsg],
                updatedAt: Date.now(),
              }
            })

            setStreamingText('')
            setIsRunning(false)
            unsubRef.current?.()
          }
        })

        window.nohi.agent.run(updatedSession)
      } else {
        // Dev fallback: simulate a reply
        setTimeout(() => {
          const assistantMsg = {
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            content: language === 'zh'
              ? '（IPC 未就绪 — 运行于渲染器开发模式）'
              : '(IPC not ready — running in renderer dev mode)',
            timestamp: Date.now(),
          }
          setSession((prev: Session | null) => {
            if (!prev) return prev
            return { ...prev, messages: [...prev.messages, assistantMsg] }
          })
          setIsRunning(false)
        }, 800)
      }
    },
    [session, isRunning, model, provider, settings, setSession, setIsRunning, addTokens, language]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const suggestions = [
    language === 'zh' ? '同步我的产品目录到所有渠道' : 'Sync my catalog to all channels',
    language === 'zh' ? '为我的夏季系列生成产品描述' : 'Generate product descriptions for my summer collection',
    language === 'zh' ? '分析我最近的销售数据' : 'Analyze my recent sales data',
    language === 'zh' ? '优化我的品牌故事' : 'Optimize my brand story',
  ]

  const messages = session?.messages ?? []
  const hasMessages = messages.length > 0 || streamingText

  const currentModels = PROVIDER_MODELS[provider] ?? []

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0">
        {/* Provider selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowProviderMenu((v) => !v); setShowModelMenu(false) }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-transparent text-xs font-medium hover:bg-secondary/50 transition-colors"
          >
            {PROVIDER_LABELS[provider]}
            <ChevronDown className="size-3 opacity-50" />
          </button>

          {showProviderMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-xl border border-border bg-background shadow-lg overflow-hidden">
              {(Object.keys(PROVIDER_LABELS) as Array<keyof typeof PROVIDER_LABELS>).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setProvider(p)
                    setModel(PROVIDER_MODELS[p][0])
                    setShowProviderMenu(false)
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary/50 transition-colors',
                    p === provider && 'text-foreground font-medium'
                  )}
                >
                  {p === provider && <CheckCircle2 className="size-3 text-emerald-500" />}
                  {p !== provider && <span className="size-3" />}
                  {PROVIDER_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowModelMenu((v) => !v); setShowProviderMenu(false) }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-transparent text-xs font-medium hover:bg-secondary/50 transition-colors max-w-[200px] truncate"
          >
            <span className="truncate">{model}</span>
            <ChevronDown className="size-3 opacity-50 shrink-0" />
          </button>

          {showModelMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded-xl border border-border bg-background shadow-lg overflow-hidden">
              {currentModels.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setModel(m); setShowModelMenu(false) }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary/50 transition-colors',
                    m === model && 'text-foreground font-medium'
                  )}
                >
                  {m === model && <CheckCircle2 className="size-3 text-emerald-500" />}
                  {m !== model && <span className="size-3" />}
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Cost display */}
        <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
          {language === 'zh' ? '今日' : 'Today'}: {formattedCost}
        </span>

        {/* Session history */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory((v) => !v)}
            className="gap-1.5 text-xs"
          >
            <History className="size-3.5" />
            <span className="hidden sm:inline">
              {language === 'zh' ? '历史' : 'History'}
            </span>
          </Button>
          {showHistory && (
            <SessionHistoryPanel
              sessions={sessions}
              currentSessionId={session?.id ?? null}
              onSelect={(s) => { setSession(s); setShowHistory(false); setTools([]) }}
              onClose={() => setShowHistory(false)}
              language={language}
            />
          )}
        </div>

        {/* New session */}
        <Button
          variant="outline"
          size="sm"
          onClick={createNewSession}
          className="gap-1.5 text-xs"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">
            {language === 'zh' ? '新会话' : 'New Session'}
          </span>
        </Button>
      </div>

      {/* ── Messages area ────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto py-4 space-y-1"
        onClick={() => { setShowProviderMenu(false); setShowModelMenu(false); setShowHistory(false) }}
      >
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
            {/* Hero */}
            <div className="text-center">
              <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <Sparkles className="size-7 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {language === 'zh' ? 'AI 控制台' : 'AI Console'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'zh'
                  ? '运行智能体任务，管理会话，监控 AI 使用情况'
                  : 'Run agentic tasks, manage sessions, monitor AI usage'}
              </p>
            </div>

            {/* Suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setInput(s); textareaRef.current?.focus() }}
                  className="text-left rounded-2xl bg-secondary/30 px-4 py-3 text-sm text-foreground hover:bg-secondary/60 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageView
            key={msg.id}
            role={msg.role}
            content={msg.content}
            tools={tools}
          />
        ))}

        {/* Streaming assistant message */}
        {streamingText && !messages.some((m) => m.role === 'assistant' && (typeof m.content === 'string' ? m.content : '') === streamingText) && (
          <div className="flex items-start gap-3 px-4 py-1">
            <div className="size-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              {tools.map((tool) => (
                <ToolBlock key={tool.id} tool={tool} />
              ))}
              <div
                className="rounded-2xl bg-secondary/50 px-4 py-2.5 text-sm leading-relaxed max-w-[85%]"
                dangerouslySetInnerHTML={{ __html: simpleMarkdown(streamingText) }}
              />
            </div>
          </div>
        )}

        {/* Running indicator with no text yet */}
        {isRunning && !streamingText && tools.length === 0 && (
          <div className="flex items-start gap-3 px-4 py-1">
            <div className="size-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <Bot className="size-3.5 text-muted-foreground" />
            </div>
            <div className="rounded-2xl bg-secondary/50 px-4 py-2.5">
              <div className="flex gap-1 items-center h-5">
                <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Plan mode panel ──────────────────────────────────────────────── */}
      {planSteps && planSteps.length > 0 && (
        <PlanPanel
          steps={planSteps}
          language={language}
          onApprove={() => setPlanSteps(null)}
          onCancel={() => {
            setPlanSteps(null)
            if (unsubRef.current) {
              unsubRef.current()
              unsubRef.current = null
            }
            setIsRunning(false)
          }}
        />
      )}

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="rounded-2xl bg-background overflow-hidden">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              language === 'zh' ? '输入指令或提问…' : 'Type a command or ask anything…'
            }
            disabled={isRunning}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[44px] max-h-[180px]"
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {totalTokens > 0
                ? `${language === 'zh' ? 'Token' : 'Tokens'}: ${totalTokens.toLocaleString()} · ${formattedCost}`
                : language === 'zh' ? 'Shift+Enter 换行' : 'Shift+Enter for newline'
              }
            </span>
            <Button
              size="sm"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isRunning}
              className="gap-1.5 h-7 px-3 text-xs rounded-full"
            >
              {isRunning ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )}
              {language === 'zh' ? '发送' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
