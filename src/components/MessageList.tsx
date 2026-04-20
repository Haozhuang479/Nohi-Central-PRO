import { useEffect, useRef } from 'react'
import type { SessionMessage } from '../../electron/main/engine/types'
import { renderMarkdown } from '@/lib/chat-markdown'
import './MessageList.css'

interface Props {
  messages: SessionMessage[]
  isRunning: boolean
}

export default function MessageList({ messages, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="msg-list">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}
      {isRunning && (
        <div className="msg-bubble assistant">
          <div className="msg-avatar">N</div>
          <div className="msg-body">
            <div className="msg-thinking">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}

function MessageBubble({ msg }: { msg: SessionMessage }) {
  const isUser = msg.role === 'user'
  const text =
    typeof msg.content === 'string'
      ? msg.content
      : (msg.content as Array<{ type: string; text?: string }>)
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join('')

  if (!text && !isUser) return null

  return (
    <div className={`msg-bubble ${msg.role}`}>
      {!isUser && <div className="msg-avatar">N</div>}
      <div className="msg-body">
        {isUser ? (
          <div className="msg-user-text">{text}</div>
        ) : (
          <AssistantContent text={text} />
        )}
      </div>
    </div>
  )
}

function AssistantContent({ text }: { text: string }) {
  // Sanitized via DOMPurify inside chat-markdown::renderMarkdown.
  const html = renderMarkdown(text)
  return <div className="msg-assistant-text" dangerouslySetInnerHTML={{ __html: html }} />
}
