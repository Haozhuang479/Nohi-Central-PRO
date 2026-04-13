import { useState, useEffect, useRef, useCallback } from 'react'
import type { Session, SessionMessage, AgentEvent, NohiSettings } from '../../electron/main/engine/types'
import { v4 as uuidv4 } from 'uuid'
import MessageList from '../components/MessageList'
import SessionSidebar from '../components/SessionSidebar'
import ModelSelector from '../components/ModelSelector'
import './Chat.css'

interface Props {
  settings: NohiSettings
}

export default function ChatPage({ settings }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [input, setInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [model, setModel] = useState(settings.defaultModel)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  // Load session list on mount
  useEffect(() => {
    window.nohi.sessions.list().then(setSessions)
  }, [])

  const selectSession = useCallback(async (id: string) => {
    const session = await window.nohi.sessions.load(id)
    if (session) setActiveSession(session)
  }, [])

  const newSession = useCallback(async () => {
    const session = await window.nohi.sessions.create(model)
    setActiveSession(session)
    setSessions((prev) => [session, ...prev])
  }, [model])

  const deleteSession = useCallback(async (id: string) => {
    await window.nohi.sessions.delete(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeSession?.id === id) setActiveSession(null)
  }, [activeSession])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isRunning) return

    let session = activeSession
    if (!session) {
      session = await window.nohi.sessions.create(model)
      setSessions((prev) => [session!, ...prev])
    }

    const userMsg: SessionMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    const updatedSession: Session = {
      ...session,
      model,
      messages: [...session.messages, userMsg],
    }
    setActiveSession(updatedSession)
    setInput('')
    setIsRunning(true)

    // Placeholder assistant message that streams into
    const assistantMsgId = uuidv4()
    const placeholderMsg: SessionMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, placeholderMsg] } : prev)

    // Clean up previous listener
    if (unsubRef.current) unsubRef.current()

    let accText = ''
    const toolCalls: Record<string, { name: string; input: Record<string, unknown>; output?: string; isError?: boolean }> = {}

    const unsub = window.nohi.agent.onEvent((event: AgentEvent) => {
      if (event.type === 'text_delta') {
        accText += event.delta
        setActiveSession((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, content: accText } : m
            ),
          }
        })
      } else if (event.type === 'tool_start') {
        toolCalls[event.id] = { name: event.name, input: event.input }
      } else if (event.type === 'tool_result') {
        if (toolCalls[event.id]) {
          toolCalls[event.id].output = event.output
          toolCalls[event.id].isError = event.isError
        }
      } else if (event.type === 'error') {
        accText += `\n\n⚠️ ${event.message}`
        setActiveSession((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, content: accText } : m
            ),
          }
        })
      } else if (event.type === 'done') {
        setIsRunning(false)
        unsub()
        // Refresh session list
        window.nohi.sessions.list().then(setSessions)
        inputRef.current?.focus()
      }
    })
    unsubRef.current = unsub

    window.nohi.agent.run({ ...updatedSession, model })
  }, [input, isRunning, activeSession, model])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleAttachFile = async () => {
    const file = await window.nohi.dialog.openFile()
    if (!file) return
    setInput((prev) => prev + (prev ? '\n\n' : '') + `<file path="${file.path}">\n${file.content}\n</file>`)
    inputRef.current?.focus()
  }

  return (
    <div className="chat-layout">
      <SessionSidebar
        sessions={sessions}
        activeId={activeSession?.id}
        onSelect={selectSession}
        onNew={newSession}
        onDelete={deleteSession}
      />

      <div className="chat-main">
        {activeSession && activeSession.messages.length > 0 ? (
          <MessageList messages={activeSession.messages} isRunning={isRunning} />
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-logo">N</div>
            <h2>Nohi Central PRO</h2>
            <p>Your local AI operations hub. Ask anything about your store, files, or data.</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chat-suggestion" onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input-area">
          <div className="chat-input-bar">
            <button className="chat-attach-btn" onClick={handleAttachFile} title="Attach file">
              +
            </button>
            <textarea
              ref={inputRef}
              className="chat-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeSession?.messages.length ? 'Reply…' : 'Ask Nohi…'}
              rows={1}
              disabled={isRunning}
            />
            <button
              className={`chat-send-btn ${isRunning ? 'running' : ''}`}
              onClick={sendMessage}
              disabled={!input.trim() || isRunning}
            >
              {isRunning ? '⏹' : '↑'}
            </button>
          </div>

          <div className="chat-toolbar">
            <ModelSelector value={model} onChange={setModel} />
            <span className="chat-hint">Enter to send · Shift+Enter for newline</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Check my inventory levels and flag low-stock SKUs',
  'Draft a flash sale email for my top 5 products',
  'Analyze last week\'s orders and give me a summary',
  'Help me write a product listing for a new item',
]
