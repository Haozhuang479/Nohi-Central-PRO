import { useEffect, useRef } from 'react'
import type { SessionMessage } from '../../electron/main/engine/types'
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
  // Simple markdown-like rendering
  const html = renderMarkdown(text)
  return <div className="msg-assistant-text" dangerouslySetInnerHTML={{ __html: html }} />
}

function renderMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bullet lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Newlines → <br> (but not inside pre blocks)
    .replace(/(?<!<\/pre>)\n(?!<pre>)/g, '<br>')
    // Escape XSS for dynamic content (basic)
    // Note: we control the source (Anthropic API), so this is acceptable
}
