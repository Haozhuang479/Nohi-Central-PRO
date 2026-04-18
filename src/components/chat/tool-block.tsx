import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { renderMarkdown, useCodeCopyHandler, useMermaidRenderer } from '@/lib/chat-markdown'

export interface ToolBlockState {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  isError?: boolean
  collapsed: boolean
}

const TOOL_LABELS: Record<string, string> = {
  bash: 'Terminal',
  file_read: 'Read File',
  file_write: 'Write File',
  file_edit: 'Edit File',
  glob: 'Find Files',
  grep: 'Search Content',
  web_fetch: 'Fetch Page',
  web_search: 'Web Search',
  firecrawl_scrape: 'Scrape Page',
  firecrawl_search: 'Firecrawl Search',
  firecrawl_crawl: 'Crawl Site',
  deep_research: 'Deep Research',
  product_search: 'Product Search',
  product_upload: 'Upload Product',
  memory_read: 'Read Memory',
  memory_write: 'Write Memory',
  memory_delete: 'Delete Memory',
  image_generate: 'Generate Image',
  image_edit: 'Edit Image',
  todo_write: 'Update Tasks',
  task: 'Subagent',
  notebook_edit: 'Edit Notebook',
}

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, ' ')
}

function toolInputSummary(name: string, input: Record<string, unknown>): string {
  if (name === 'bash' && input.command) return String(input.command).slice(0, 80)
  if ((name === 'file_read' || name === 'file_write' || name === 'file_edit') && input.path)
    return String(input.path).split('/').pop() ?? ''
  if (name === 'glob' && input.pattern) return String(input.pattern)
  if (name === 'grep' && input.pattern) return `"${String(input.pattern).slice(0, 40)}"`
  if ((name === 'web_fetch' || name === 'firecrawl_scrape') && input.url)
    return String(input.url).replace(/^https?:\/\//, '').slice(0, 60)
  if ((name === 'web_search' || name === 'firecrawl_search' || name === 'deep_research') && input.query)
    return `"${String(input.query).slice(0, 50)}"`
  if (name === 'firecrawl_crawl' && input.url) return String(input.url).replace(/^https?:\/\//, '').slice(0, 50)
  if (name === 'image_generate' && input.prompt) return String(input.prompt).slice(0, 60)
  if (name === 'task' && input.description) return String(input.description).slice(0, 60)
  if (name === 'todo_write' && Array.isArray(input.todos)) return `${(input.todos as unknown[]).length} tasks`
  if (name === 'notebook_edit' && input.notebook_path) return String(input.notebook_path).split('/').pop() ?? ''
  return ''
}

function TodoListView({ todos }: { todos: Array<{ content: string; activeForm: string; status: string }> }) {
  return (
    <div className="space-y-1.5">
      {todos.map((t, i) => {
        const done = t.status === 'completed'
        const active = t.status === 'in_progress'
        const display = active ? t.activeForm : t.content
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={cn(
              'inline-flex items-center justify-center size-4 rounded-full border shrink-0',
              done ? 'bg-emerald-500 border-emerald-500 text-white' :
              active ? 'border-amber-500 bg-amber-50' : 'border-border bg-background'
            )}>
              {done ? '✓' : active ? <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" /> : ''}
            </span>
            <span className={cn(
              done && 'line-through text-muted-foreground/60',
              active && 'font-medium text-foreground',
              !done && !active && 'text-foreground/80'
            )}>
              {display}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ToolResultContent({ tool }: { tool: ToolBlockState }) {
  const result = tool.result ?? ''
  const containerRef = useRef<HTMLDivElement>(null)
  useCodeCopyHandler(containerRef)
  useMermaidRenderer(containerRef, result)

  if (tool.isError) {
    return (
      <pre className="text-xs overflow-x-auto rounded-lg p-3 bg-destructive/10 border border-destructive/30 text-destructive whitespace-pre-wrap">
        {result}
      </pre>
    )
  }

  if (tool.name === 'todo_write' && Array.isArray(tool.input.todos)) {
    return <TodoListView todos={tool.input.todos as Array<{ content: string; activeForm: string; status: string }>} />
  }

  if ((tool.name === 'image_generate' || tool.name === 'image_edit') && result.includes('file://')) {
    const images = [...result.matchAll(/!\[.*?\]\(file:\/\/(.+?)\)/g)]
    return (
      <div className="space-y-2">
        {images.map((m, i) => (
          <img
            key={i}
            src={`nohi-file://${m[1]}`}
            alt="Generated"
            className="max-w-full max-h-[500px] rounded-xl object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ))}
      </div>
    )
  }

  if (tool.name === 'bash') {
    return (
      <pre className="text-xs overflow-x-auto rounded-lg p-3 bg-zinc-900 text-zinc-100 font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
        <code>{result.slice(0, 5000)}{result.length > 5000 ? '\n… (truncated)' : ''}</code>
      </pre>
    )
  }

  if (tool.name === 'file_read') {
    const filePath = String(tool.input.path ?? '')
    const ext = filePath.split('.').pop() ?? ''
    return (
      <div ref={containerRef}>
        <div className="flex items-center gap-2 mb-1.5 text-[10px] text-muted-foreground">
          <span className="font-mono">{filePath.split('/').pop()}</span>
          {ext && <span className="px-1.5 py-0.5 rounded bg-muted text-[9px]">{ext}</span>}
        </div>
        <pre className="text-xs overflow-x-auto rounded-lg p-3 bg-muted/40 font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-border/50">
          <code>{result.slice(0, 8000)}{result.length > 8000 ? '\n… (truncated)' : ''}</code>
        </pre>
      </div>
    )
  }

  if (tool.name === 'web_search' || tool.name === 'firecrawl_search') {
    return (
      <div ref={containerRef} className="prose prose-sm dark:prose-invert max-w-none text-xs">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(result.slice(0, 6000)) }} />
      </div>
    )
  }

  if (tool.name === 'firecrawl_scrape' || tool.name === 'web_fetch' || tool.name === 'firecrawl_crawl' || tool.name === 'deep_research') {
    return (
      <div ref={containerRef} className="prose prose-sm dark:prose-invert max-w-none text-xs max-h-[400px] overflow-y-auto">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(result.slice(0, 8000)) }} />
        {result.length > 8000 && (
          <p className="text-muted-foreground text-[10px] mt-2">… content truncated ({result.length.toLocaleString()} total characters)</p>
        )}
      </div>
    )
  }

  if (tool.name === 'glob' || tool.name === 'grep') {
    const lines = result.split('\n').filter(Boolean)
    return (
      <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
        {lines.slice(0, 50).map((line, i) => (
          <div key={i} className="text-xs font-mono text-muted-foreground truncate px-1 py-0.5 hover:bg-muted/40 rounded">
            {line}
          </div>
        ))}
        {lines.length > 50 && (
          <p className="text-[10px] text-muted-foreground mt-1">… and {lines.length - 50} more</p>
        )}
      </div>
    )
  }

  return (
    <pre className="text-xs overflow-x-auto rounded-lg p-3 bg-background/50 border border-border/50 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
      {result.slice(0, 5000)}{result.length > 5000 ? '\n… (truncated)' : ''}
    </pre>
  )
}

export function ToolBlock({ tool }: { tool: ToolBlockState }) {
  const [collapsed, setCollapsed] = useState(tool.collapsed)
  const isRunning = tool.result === undefined
  const summary = toolInputSummary(tool.name, tool.input)

  return (
    <div className={cn(
      'rounded-xl border p-3 text-xs my-2 transition-colors',
      isRunning ? 'border-amber-300/50 bg-amber-50/5' : 'border-border/50 bg-muted/20'
    )}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 text-muted-foreground w-full text-left hover:text-foreground transition-colors"
      >
        <span className="font-medium text-foreground/80">{toolLabel(tool.name)}</span>
        {summary && (
          <span className="flex-1 truncate text-muted-foreground/60 font-mono text-[11px]">{summary}</span>
        )}
        {!summary && <span className="flex-1" />}
        {isRunning ? (
          <span className="flex items-center gap-[2px] shrink-0">
            <span className="w-[2px] h-2 bg-amber-500/70 rounded-full animate-[wave_0.8s_ease-in-out_infinite]" />
            <span className="w-[2px] h-3 bg-amber-500/70 rounded-full animate-[wave_0.8s_ease-in-out_0.15s_infinite]" />
            <span className="w-[2px] h-2 bg-amber-500/70 rounded-full animate-[wave_0.8s_ease-in-out_0.3s_infinite]" />
          </span>
        ) : tool.isError ? (
          <span className="text-destructive shrink-0 text-[10px]">failed</span>
        ) : (
          <span className="text-emerald-600 shrink-0 text-[10px]">done</span>
        )}
        <span className="shrink-0 text-[10px] opacity-40">{collapsed ? '▸' : '▾'}</span>
      </button>

      {isRunning && (
        <div className="mt-2 h-[2px] rounded-full bg-amber-200/50 overflow-hidden">
          <div className="h-full w-1/3 bg-amber-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
        </div>
      )}

      {!collapsed && tool.result !== undefined && (
        <div className="mt-2.5">
          <ToolResultContent tool={tool} />
        </div>
      )}

      {!collapsed && !isRunning && !['bash', 'file_read', 'web_search', 'firecrawl_search', 'firecrawl_scrape', 'web_fetch', 'glob', 'grep', 'image_generate', 'image_edit'].includes(tool.name) && (
        <details className="mt-2">
          <summary className="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground">Input</summary>
          <pre className="text-[10px] overflow-x-auto bg-background/50 rounded p-2 mt-1 border border-border/30 font-mono">
            {JSON.stringify(tool.input, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
