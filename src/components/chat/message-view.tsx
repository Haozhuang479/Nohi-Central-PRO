import { memo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { renderMarkdown, useCodeCopyHandler, useMermaidRenderer } from '@/lib/chat-markdown'
import { ToolBlock, type ToolBlockState } from './tool-block'
import type { ContentBlock, ToolUseBlock } from '../../../electron/main/engine/types'

interface MessageViewProps {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
  tools: ToolBlockState[]
  isLastAssistant?: boolean
  onEdit?: (text: string) => void
  onRetry?: () => void
}

function MessageViewInner({ role, content, tools, isLastAssistant, onEdit, onRetry }: MessageViewProps) {
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
  useMermaidRenderer(containerRef, textContent)

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

// Memoize: re-render only when content/tools/state change.
// Cuts re-renders during streaming when previous messages are stable.
export const MessageView = memo(MessageViewInner, (prev, next) => (
  prev.role === next.role &&
  prev.content === next.content &&
  prev.tools === next.tools &&
  prev.isLastAssistant === next.isLastAssistant &&
  prev.onEdit === next.onEdit &&
  prev.onRetry === next.onRetry
))

interface StreamingProps {
  text: string
  thinking?: string
  tools: ToolBlockState[]
}

export function StreamingMessageView({ text, thinking, tools }: StreamingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [thinkingOpen, setThinkingOpen] = useState(false)
  useCodeCopyHandler(containerRef)
  useMermaidRenderer(containerRef, text)

  return (
    <div className="flex items-start px-4 py-1.5">
      <div className="flex-1 min-w-0" ref={containerRef}>
        {thinking && (
          <div className="rounded-xl border border-purple-200/50 bg-purple-50/20 my-2 overflow-hidden">
            <button
              type="button"
              onClick={() => setThinkingOpen((v) => !v)}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-purple-700 hover:bg-purple-50/40 transition-colors"
            >
              <span className="font-medium">Thinking</span>
              <span className="text-purple-400/60">·</span>
              <span className="text-purple-500/80 italic truncate flex-1">
                {thinking.slice(-80)}
              </span>
              <span className="text-[10px] opacity-50">{thinkingOpen ? '▾' : '▸'}</span>
            </button>
            {thinkingOpen && (
              <div className="px-3 pb-3 text-xs text-purple-900/80 italic whitespace-pre-wrap font-mono max-h-[200px] overflow-y-auto">
                {thinking}
              </div>
            )}
          </div>
        )}
        {tools.map((tool) => (
          <ToolBlock key={tool.id} tool={tool} />
        ))}
        {text && (
          <div
            className={cn(
              'prose prose-sm dark:prose-invert max-w-none px-1 text-sm leading-relaxed max-w-[90%]'
            )}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
          />
        )}
      </div>
    </div>
  )
}
