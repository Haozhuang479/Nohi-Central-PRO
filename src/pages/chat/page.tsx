import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import nohiLogo from '@/assets/nohi-logo.svg'
import { useVoiceRecorder } from '@/lib/use-voice-recorder'
import { ImageLightbox } from '@/components/chat/image-lightbox'
import { ToolBlock, type ToolBlockState } from '@/components/chat/tool-block'
import { MessageView, StreamingMessageView } from '@/components/chat/message-view'
import { SlashMenu, type BuiltinCommand } from '@/components/chat/slash-menu'
import { CHAT_ADD_MENU_LINKS, labelFor } from '@/lib/chat-nav'
import { toastIpcError } from '@/lib/ipc-toast'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { useAIStore } from '@/store/ai-store'
import { useCostStore } from '@/store/cost-store'
import { toast } from 'sonner'
import { useChatOutletContext } from './layout'

// Attachment size caps — images are IPC-base64'd and every large image
// chokes the renderer → main bridge. Text files get blockquoted into the
// prompt so they directly inflate token counts.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_TEXT_BYTES = 1 * 1024 * 1024

/** Reject obvious binaries slipping through as "text/plain". A drop sniff on
 *  the first 1 KB looking for either a NUL byte or a high ratio of
 *  non-printable characters. */
function looksBinary(sample: string): boolean {
  if (sample.includes('\x00')) return true
  let bad = 0
  const n = Math.min(sample.length, 1024)
  for (let i = 0; i < n; i++) {
    const c = sample.charCodeAt(i)
    // Printable ASCII + common whitespace. Unicode above 127 is allowed.
    if (c < 9 || (c > 13 && c < 32)) bad++
  }
  return n > 0 && bad / n > 0.1
}
import {
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  getContextWindow,
  formatCtxLabel,
  shortenPath,
} from '@/lib/providers'
import type {
  NohiSettings,
  Session,
  AgentEvent,
  Skill,
} from '../../../electron/main/engine/types'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Props {
  settings: NohiSettings
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
    setSessions,
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
  const [thinkingText, setThinkingText] = useState('')

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

  // ── Smart auto-scroll: only scroll to bottom if user is already near bottom ──
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [stickToBottom, setStickToBottom] = useState(true)

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => {
      // 80px threshold — if scrolled up beyond this, stop auto-following
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setStickToBottom(distFromBottom < 80)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!stickToBottom) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.messages, streamingText, stickToBottom])

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
        .catch(toastIpcError('skills:list'))
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

  // Esc → abort the running agent. Skips when a modal is open (radix
  // portals a `[role=dialog]` that the browser will have Esc-captured
  // already via its own handler) or when the user is typing inside a
  // contenteditable — we don't want to hijack Escape inside an input's
  // own clear gesture.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (!isRunning) return
      // If any radix dialog is open, let it handle Esc (tool-consent,
      // delete-confirm, image lightbox all register their own).
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      e.preventDefault()
      stopAgent()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isRunning, stopAgent])

  // ── File attachment ───────────────────────────────────────────────────────
  const [attachedImages, setAttachedImages] = useState<Array<{ name: string; base64: string; mediaType: string }>>([])
  // Text attachments are tracked structurally (like images) since v2.9.2 so
  // users can see what's attached, remove a single file, and we can de-dup
  // by (name + size). Before this, text content was inlined as a blockquote
  // directly into the input textarea — once there, the user had to hunt
  // through the text to surgically delete it.
  const [attachedTexts, setAttachedTexts] = useState<Array<{ id: string; name: string; content: string; bytes: number }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)

  // Helper: add a text attachment unless an identical one (same name + bytes
  // + content-hash-of-first-100-chars) already exists.
  const addTextAttachment = useCallback((name: string, content: string) => {
    setAttachedTexts((prev) => {
      const fingerprint = `${name}::${content.length}::${content.slice(0, 100)}`
      if (prev.some((a) => `${a.name}::${a.bytes}::${a.content.slice(0, 100)}` === fingerprint)) {
        return prev
      }
      return [...prev, {
        id: crypto.randomUUID(),
        name,
        content,
        bytes: new TextEncoder().encode(content).byteLength,
      }]
    })
  }, [])

  // ── Voice recorder ────────────────────────────────────────────────────────
  // onError was previously unset — voice failures (mic denied, whisper
  // model missing, transcription empty) just flashed the mic back to idle
  // with no user-visible signal. Now errors surface via toast.
  const {
    state: voiceState,
    toggle: toggleVoice,
    elapsedMs: voiceElapsed,
    maxMs: voiceMaxMs,
  } = useVoiceRecorder({
    onTranscript: (text) => {
      if (!text.trim()) {
        toast.info(language === 'zh' ? '未识别到语音' : 'No speech detected')
        return
      }
      setInput((prev) => prev ? `${prev} ${text}` : text)
    },
    onError: (msg) => toast.error(`${language === 'zh' ? '语音' : 'Voice'}: ${msg}`, { duration: 6000 }),
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
            // base64 expands 3 bytes → 4 chars; approximate the original.
            const bytes = Math.floor(file.base64.length * 0.75)
            if (bytes > MAX_IMAGE_BYTES) {
              toast.error(`${fileName}: image exceeds 5 MB limit`, { duration: 6000 })
              continue
            }
            setAttachedImages((prev) => [...prev, { name: fileName, base64: file.base64!, mediaType: file.mediaType! }])
          } else if (!file.isImage && file.content !== undefined) {
            const bytes = new TextEncoder().encode(file.content).byteLength
            if (bytes > MAX_TEXT_BYTES) {
              toast.error(`${fileName}: text exceeds 1 MB limit`, { duration: 6000 })
              continue
            }
            if (looksBinary(file.content)) {
              toast.error(`${fileName}: looks like a binary file — skipped`, { duration: 6000 })
              continue
            }
            addTextAttachment(fileName, file.content)
          }
        }
        textareaRef.current?.focus()
      } catch {
        // dialog cancelled
      }
    }
  }, [addTextAttachment])

  // ── Working directory picker ──────────────────────────────────────────────
  const openDirPicker = useCallback(async () => {
    if (typeof window !== 'undefined' && window.nohi?.dialog?.openDir) {
      try {
        const dir = await window.nohi.dialog.openDir()
        if (dir && session) {
          // Write back to session and persist
          const updated = { ...session, workingDir: dir }
          setSession(updated)
          window.nohi.sessions.save(updated).catch(toastIpcError('sessions:save'))
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
        if (file.size > MAX_IMAGE_BYTES) {
          toast.error(`${file.name}: image exceeds 5 MB limit`, { duration: 6000 })
          continue
        }
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result !== 'string') return
          const base64 = reader.result.split(',')[1]
          if (!base64) return
          setAttachedImages((prev) => [...prev, { name: file.name, base64, mediaType: file.type }])
        }
        reader.readAsDataURL(file)
      } else {
        if (file.size > MAX_TEXT_BYTES) {
          toast.error(`${file.name}: text exceeds 1 MB limit`, { duration: 6000 })
          continue
        }
        const text = await file.text()
        if (looksBinary(text)) {
          toast.error(`${file.name}: looks like a binary file — skipped`, { duration: 6000 })
          continue
        }
        addTextAttachment(file.name, text)
      }
    }
    textareaRef.current?.focus()
  }, [addTextAttachment])

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

  // Built-in slash commands. Each runs an action instead of injecting text;
  // the trailing "/foo" is stripped from the input so the user isn't left
  // with a half-typed command.
  const BUILTIN_COMMANDS: BuiltinCommand[] = useMemo(() => {
    if (language === 'zh') {
      return [
        { id: 'clear',   name: 'clear',   description: '清空当前对话消息' },
        { id: 'new',     name: 'new',     description: '新建一个空对话' },
        { id: 'compact', name: 'compact', description: '总结历史并截断,释放上下文' },
        { id: 'help',    name: 'help',    description: '显示键盘快捷键和命令' },
        { id: 'model',   name: 'model',   description: '切换模型: /model <名称>' },
      ]
    }
    return [
      { id: 'clear',   name: 'clear',   description: 'Clear messages in this chat' },
      { id: 'new',     name: 'new',     description: 'Start a fresh chat' },
      { id: 'compact', name: 'compact', description: 'Summarise + truncate history to free up context' },
      { id: 'help',    name: 'help',    description: 'Show keyboard shortcuts + commands' },
      { id: 'model',   name: 'model',   description: 'Switch model: /model <name>' },
    ]
  }, [language])

  const handleBuiltinSelect = useCallback((cmd: BuiltinCommand) => {
    setInput((prev) => prev.replace(/(?:^|\s)\/\w*$/, (m) => (m.startsWith('/') ? '' : m[0])))
    setShowSlashMenu(false)
    switch (cmd.id) {
      case 'clear': {
        if (!session) return
        const cleared: Session = { ...session, messages: [], updatedAt: Date.now() }
        setSession(cleared)
        setSessions((prev) => prev.map((s) => (s.id === cleared.id ? { ...cleared, messages: [] } : s)))
        if (typeof window !== 'undefined' && window.nohi?.sessions) {
          window.nohi.sessions.save(cleared).catch(toastIpcError('sessions:save'))
        }
        setStreamingText('')
        setThinkingText('')
        break
      }
      case 'new': {
        window.dispatchEvent(new CustomEvent('nohi:chat-action', { detail: 'new-session' }))
        break
      }
      case 'compact': {
        // Free up context by truncating to the most recent N=10 turns
        // (5 user + 5 assistant pairs). The first user message is preserved
        // as a "session anchor" so the new agent loop still has the original
        // task framing. A summary marker tells the model what was dropped.
        // Real LLM-driven summarisation lands in a future phase; this is the
        // honest minimum that prevents Sonnet 200K runaway.
        if (!session) return
        const KEEP_RECENT = 10
        if (session.messages.length <= KEEP_RECENT + 1) {
          toast.info(language === 'zh'
            ? '会话太短,无需压缩'
            : 'Conversation already short — nothing to compact')
          break
        }
        const first = session.messages[0]
        const recent = session.messages.slice(-KEEP_RECENT)
        const droppedCount = session.messages.length - KEEP_RECENT - 1
        const marker = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: language === 'zh'
            ? `_[已压缩: 省略 ${droppedCount} 条历史消息以释放上下文]_`
            : `_[Compacted: dropped ${droppedCount} earlier messages to free context]_`,
          timestamp: Date.now(),
        }
        const compacted: Session = {
          ...session,
          messages: [first, marker, ...recent],
          updatedAt: Date.now(),
        }
        setSession(compacted)
        if (typeof window !== 'undefined' && window.nohi?.sessions) {
          window.nohi.sessions.save(compacted).catch(toastIpcError('sessions:save'))
        }
        toast.success(language === 'zh'
          ? `已压缩 ${droppedCount} 条消息`
          : `Compacted ${droppedCount} messages`)
        break
      }
      case 'help': {
        const body = language === 'zh'
          ? `**可用的内置斜杠命令**

- \`/clear\` — 清空当前对话（消息仍保留磁盘历史直到下次保存）
- \`/new\` — 新建一个空对话
- \`/compact\` — 压缩对话历史（保留首条 + 最近 10 条，释放上下文）
- \`/help\` — 显示本帮助
- \`/model <名称>\` — 切换模型，例如 \`/model claude-opus-4-6\`

**键盘快捷键**

- **Esc** — 中断正在运行的智能体
- **⌘K** — 打开命令面板（新建对话、切换侧栏、搜索对话）
- **Enter** — 发送； **Shift+Enter** — 换行`
          : `**Built-in slash commands**

- \`/clear\` — clear the current conversation
- \`/new\` — start a fresh chat
- \`/compact\` — compress history (keep first + last 10, free context)
- \`/help\` — show this help message
- \`/model <name>\` — switch model, e.g. \`/model claude-opus-4-6\`

**Keyboard shortcuts**

- **Esc** — abort a running agent
- **⌘K** — open command palette
- **Enter** to send · **Shift+Enter** for newline`
        const helpMsg = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: body,
          timestamp: Date.now(),
        }
        if (session) {
          const updated: Session = { ...session, messages: [...session.messages, helpMsg], updatedAt: Date.now() }
          setSession(updated)
          if (typeof window !== 'undefined' && window.nohi?.sessions) {
            window.nohi.sessions.save(updated).catch(toastIpcError('sessions:save'))
          }
        }
        break
      }
      case 'model': {
        // `/model <name>` — switch to <name>. Validate against the known
        // PROVIDER_MODELS table. If <name> belongs to a different provider,
        // also switch provider so the next send doesn't fail with
        // "Unknown model" (the v2.8.2 hole this v2.9.1 patch closes).
        const match = input.match(/\/model\s+(\S+)/)
        if (!match) {
          toast.info(language === 'zh'
            ? '用法: /model <模型名>，例如 /model claude-opus-4-6'
            : 'Usage: /model <name>, e.g. /model claude-opus-4-6')
          break
        }
        const target = match[1]
        // Find which provider owns this model id
        let foundProvider: keyof typeof PROVIDER_MODELS | null = null
        for (const [p, models] of Object.entries(PROVIDER_MODELS) as Array<[keyof typeof PROVIDER_MODELS, string[]]>) {
          if (models.includes(target)) { foundProvider = p; break }
        }
        if (!foundProvider) {
          // Build a hint showing the closest models the user might have meant
          const all = Object.values(PROVIDER_MODELS).flat()
          const hint = all.filter((m) => m.toLowerCase().includes(target.toLowerCase().slice(0, 4))).slice(0, 4).join(', ')
          toast.error(language === 'zh'
            ? `未知模型 "${target}"${hint ? `。可能想用: ${hint}` : ''}`
            : `Unknown model "${target}"${hint ? `. Did you mean: ${hint}` : ''}`,
            { duration: 8000 })
          break
        }
        if (foundProvider !== provider) {
          setProvider(foundProvider as Parameters<typeof setProvider>[0])
        }
        setModel(target)
        toast.success(language === 'zh' ? `已切换到 ${target}` : `Switched to ${target}`)
        break
      }
    }
    textareaRef.current?.focus()
  }, [input, language, session, setSession, setSessions, setModel, setProvider, provider])

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
      const isNewSession = !activeSession || activeSession.messages.length === 0
      if (!activeSession) {
        const stub: Session = {
          id: crypto.randomUUID(),
          title: 'New conversation',
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

      // Compose the final text body: prepend any text attachments as fenced
      // sections the model can clearly distinguish from the user's message.
      // Kept server-agnostic (still plain text) so both the Anthropic and
      // OpenAI branches receive the same shape.
      const textWithAttachments = attachedTexts.length > 0
        ? [
            ...attachedTexts.map((a) => `> **File: ${a.name}** (${a.bytes.toLocaleString()} bytes)\n>\n${a.content.split('\n').map((l) => `> ${l}`).join('\n')}`),
            text,
          ].join('\n\n')
        : text

      // Build content: plain text, or array of image + text blocks
      const content: string | Array<{ type: string; [k: string]: unknown }> =
        attachedImages.length > 0
          ? [
              ...attachedImages.map((img) => ({
                type: 'image',
                source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
              })),
              { type: 'text', text: textWithAttachments },
            ]
          : textWithAttachments

      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content,
        timestamp: Date.now(),
      }

      // Derive title from first user message (replaces "New conversation")
      const derivedTitle = isNewSession
        ? text.trim().slice(0, 50) || 'New conversation'
        : activeSession.title

      const updatedSession: Session = {
        ...activeSession,
        title: derivedTitle,
        model,  // always use the currently selected model from the store
        messages: [...activeSession.messages, userMsg as typeof activeSession.messages[0]],
        updatedAt: Date.now(),
      }

      setSession(updatedSession)

      // Persist user message immediately so it's not lost if agent fails
      if (typeof window !== 'undefined' && window.nohi?.sessions) {
        window.nohi.sessions.save(updatedSession).catch(toastIpcError('sessions:save'))
      }

      // Sync sidebar list: insert if new, update title if existing
      setSessions((prev: Session[]) => {
        const lightweight: Session = { ...updatedSession, messages: [] }
        const existing = prev.findIndex((s) => s.id === updatedSession.id)
        if (existing === -1) return [lightweight, ...prev]
        const next = [...prev]
        next[existing] = lightweight
        return next.sort((a, b) => b.updatedAt - a.updatedAt)
      })

      setIsRunning(true)
      setInput('')
      setAttachedImages([])
      setAttachedTexts([])
      setStreamingText('')
      setThinkingText('')
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

        // rAF batching: collect text deltas and flush at most once per frame
        let pendingFlush = false
        let pendingThinking = ''
        const flush = () => {
          pendingFlush = false
          setStreamingText(assistantText)
          if (pendingThinking) {
            const t = pendingThinking
            pendingThinking = ''
            setThinkingText((prev) => prev + t)
          }
        }
        const scheduleFlush = () => {
          if (pendingFlush) return
          pendingFlush = true
          requestAnimationFrame(flush)
        }

        unsubRef.current = window.nohi.agent.onEvent((event: AgentEvent) => {
          if (event.type === 'text_delta') {
            assistantText += event.delta
            scheduleFlush()
          } else if (event.type === 'thinking_delta') {
            pendingThinking += event.delta
            scheduleFlush()
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
            // Also feed the cost-store — this is what Statusbar / Titlebar read
            // for the "$X today" display. Without this call the UI reads $0
            // forever (agent never touched this store prior to v2.8.0).
            useCostStore.getState().addEntry({
              label: session?.title ?? 'chat',
              inputTokens: event.usage.input_tokens,
              outputTokens: event.usage.output_tokens,
              model,
              provider,
            })
          } else if (event.type === 'done' || event.type === 'error') {
            // Preserve any partial response the user already saw streaming.
            // Before v2.9.1 we overwrote it with `"Error: ..."`, so a network
            // blip mid-answer made the half-message vanish. Now we keep the
            // partial text and append a tagged error footer the markdown
            // renderer styles in red. handleRetry continues to work because
            // it slices off the entire last assistant turn anyway.
            const finalContent =
              event.type === 'error'
                ? (assistantText
                    ? `${assistantText}\n\n> **⚠ ${language === 'zh' ? '流中断' : 'Stream interrupted'}:** ${event.message}`
                    : `**${language === 'zh' ? '错误' : 'Error'}:** ${event.message}`)
                : assistantText

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
                window.nohi.sessions.save(saved).catch(toastIpcError('sessions:save'))
              }
              // Bubble updated timestamp to sidebar so list reorders
              setSessions((prevList: Session[]) => {
                const lightweight: Session = { ...saved, messages: [] }
                const idx = prevList.findIndex((s) => s.id === saved.id)
                if (idx === -1) return [lightweight, ...prevList]
                const next = [...prevList]
                next[idx] = lightweight
                return next.sort((a, b) => b.updatedAt - a.updatedAt)
              })
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
    [session, isRunning, model, provider, settings, setSession, setSessions, setIsRunning, addTokens, language, attachedImages, attachedTexts]
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
    <>
    <ImageLightbox />
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
                          window.nohi?.sessions?.save(updated).catch(toastIpcError('sessions:save'))
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
                      window.nohi?.sessions?.save(updated).catch(toastIpcError('sessions:save'))
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

        {/* Plan Mode toggle — hard gate as of v3.0.0. When on, the first
            tool-bearing response of each send triggers the plan-approval
            modal; tools only execute after the user clicks Approve. */}
        <button
          type="button"
          onClick={() => {
            if (!session) return
            const updated = { ...session, planMode: !session.planMode }
            setSession(updated)
            window.nohi.sessions.save(updated).catch(toastIpcError('sessions:save'))
            if (!session.planMode) {
              toast.info(
                language === 'zh'
                  ? '计划模式已开启。每次发送后,智能体若要调用工具,会先弹出计划审核弹窗。'
                  : 'Plan mode on. Each send: if the agent wants to call tools, a review modal appears before execution.',
                { duration: 5000 },
              )
            }
          }}
          title={language === 'zh'
            ? '计划模式: 工具执行前弹出审核弹窗(批准 / 修订 / 取消)。'
            : 'Plan Mode: review modal before tools execute (Approve / Revise / Cancel).'}
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-4 space-y-0.5">
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
              metadata={msg.metadata}
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
            <StreamingMessageView text={streamingText} thinking={thinkingText} tools={currentRoundTools} />
          )}

        {/* Tool activity only (no text yet) */}
        {isRunning && !streamingText && currentRoundTools.length > 0 && (
          <StreamingMessageView text="" thinking={thinkingText} tools={currentRoundTools} />
        )}

        {/* Thinking only (no tools, no text yet) */}
        {isRunning && !streamingText && currentRoundTools.length === 0 && thinkingText && (
          <StreamingMessageView text="" thinking={thinkingText} tools={[]} />
        )}

        {/* Typing indicator — running with no text and no tools yet */}
        {isRunning && !streamingText && currentRoundTools.length === 0 && !thinkingText && (
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
                className={cn(
                  'h-full rounded-full transition-all',
                  totalTokens / contextWindow >= 0.9
                    ? 'bg-destructive/80'
                    : totalTokens / contextWindow >= 0.7
                      ? 'bg-amber-500/80'
                      : 'bg-muted-foreground/30',
                )}
                style={{ width: `${Math.min((totalTokens / contextWindow) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
              {totalTokens.toLocaleString()} / {formatCtxLabel(contextWindow)} tokens
              {totalTokens / contextWindow >= 0.7 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  {language === 'zh' ? '· 输入 /compact 压缩' : '· type /compact'}
                </span>
              )}
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
          {showSlashMenu && (
            <SlashMenu
              skills={skills}
              builtins={BUILTIN_COMMANDS}
              query={slashQuery}
              onSelect={handleSkillSelect}
              onBuiltinSelect={handleBuiltinSelect}
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

          {/* Text attachment chips. Each shows name + byte count and has a
              remove button. Content is inlined at send time. */}
          {attachedTexts.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-2">
              {attachedTexts.map((a) => (
                <div
                  key={a.id}
                  className="group/txt relative flex items-center gap-1.5 h-7 pl-2.5 pr-6 rounded-full bg-muted/60 text-[11px] text-foreground max-w-[220px]"
                  title={a.name}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span className="truncate">{a.name}</span>
                  <span className="opacity-50 shrink-0">
                    {a.bytes >= 1024 ? `${(a.bytes / 1024).toFixed(1)}k` : `${a.bytes}b`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachedTexts((prev) => prev.filter((t) => t.id !== a.id))}
                    aria-label={language === 'zh' ? '移除附件' : 'Remove attachment'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-4 rounded-full bg-foreground/10 hover:bg-foreground hover:text-background text-[10px] flex items-center justify-center opacity-60 group-hover/txt:opacity-100 transition-opacity"
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
                    {/* Nav links — single-source via @/lib/chat-nav so these
                        always agree with the sidebar quick-nav in layout.tsx. */}
                    {CHAT_ADD_MENU_LINKS.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => { setShowAddMenu(false); window.location.hash = entry.href }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                      >
                        <span>{labelFor(entry, language)}</span>
                      </button>
                    ))}
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

              {/* Recording timer: shows MM:SS / cap. Amber past 75%, red near cap. */}
              {voiceState === 'recording' && (
                <span
                  className={cn(
                    'text-[11px] tabular-nums font-mono',
                    voiceElapsed / voiceMaxMs >= 0.9
                      ? 'text-red-500'
                      : voiceElapsed / voiceMaxMs >= 0.75
                        ? 'text-amber-500'
                        : 'text-muted-foreground',
                  )}
                >
                  {String(Math.floor(voiceElapsed / 60000)).padStart(2, '0')}:
                  {String(Math.floor((voiceElapsed / 1000) % 60)).padStart(2, '0')}
                  <span className="text-muted-foreground/60"> / {Math.floor(voiceMaxMs / 60000)}:00</span>
                </span>
              )}

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
    </>
  )
}
