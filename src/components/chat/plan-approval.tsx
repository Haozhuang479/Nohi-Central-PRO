// Plan-approval dialog (v3.0.0).
//
// Mirrors tool-consent.tsx but for plan_approval_request events: when
// plan mode is on and the agent's first iteration wants to run tools,
// the main process emits this event and blocks the agent loop until the
// renderer replies via window.nohi.agent.approvePlan(sessionId, kind, reviseText?).
//
// Three decisions:
//   - Approve  → tools dispatch as normal
//   - Revise   → user types feedback, appended as a new user turn; agent re-plans
//   - Deny/Esc → agent run ends (fail-closed by default, matches tool-consent)

import { useEffect, useState } from 'react'
import type { AgentEvent } from '../../../electron/main/engine/types'
import { renderMarkdown } from '@/lib/chat-markdown'
import { useLanguage } from '@/lib/language-context'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type PlanRequest = Extract<AgentEvent, { type: 'plan_approval_request' }>

export function PlanApproval(): JSX.Element | null {
  const { language } = useLanguage()
  const [pending, setPending] = useState<PlanRequest | null>(null)
  const [revising, setRevising] = useState(false)
  const [reviseText, setReviseText] = useState('')

  useEffect(() => {
    const unsub = window.nohi.agent.onEvent((event: AgentEvent) => {
      if (event.type === 'plan_approval_request') {
        setPending(event)
        setRevising(false)
        setReviseText('')
      } else if (event.type === 'done' || event.type === 'error') {
        // Agent finished/aborted — clear any stale modal. Main process
        // already drained the resolver map on done.
        setPending(null)
      }
    })
    return () => { unsub() }
  }, [])

  if (!pending) return null

  const approve = (): void => {
    window.nohi.agent.approvePlan(pending.sessionId, 'approve')
    setPending(null)
  }
  const deny = (): void => {
    window.nohi.agent.approvePlan(pending.sessionId, 'deny')
    setPending(null)
  }
  const submitRevision = (): void => {
    const text = reviseText.trim()
    if (!text) return
    window.nohi.agent.approvePlan(pending.sessionId, 'revise', text)
    setPending(null)
  }

  const planHtml = renderMarkdown(pending.planText || '')

  return (
    <AlertDialog
      open={true}
      // Esc / outside-click default to deny so an ambiguous dismiss doesn't
      // silently execute tools. Same fail-closed policy as tool-consent.
      onOpenChange={(open) => {
        if (!open) deny()
      }}
    >
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {language === 'zh' ? '审核计划' : 'Review plan'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {language === 'zh'
              ? '智能体计划调用以下工具,执行前需要你的批准。'
              : 'The agent is about to run the tools below. Approve, revise, or cancel.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Plan body — empty-plan case (model jumped straight to tools) is
            handled by showing a short fallback line so the modal isn't blank. */}
        {pending.planText?.trim() ? (
          <div
            className="max-h-60 overflow-auto text-sm prose prose-sm dark:prose-invert max-w-none bg-muted/40 rounded-md p-3"
            dangerouslySetInnerHTML={{ __html: planHtml }}
          />
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {language === 'zh'
              ? '(模型未提供计划文字,直接给出了工具调用。)'
              : '(Model gave no plan text — jumped straight to tool calls.)'}
          </p>
        )}

        {/* Tool preview — compact list of tool name + first 120 chars of
            stringified input. Full argument spam would bury the UI. */}
        {pending.toolPreview.length > 0 && (
          <div className="rounded-md border border-border/60 overflow-hidden">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border/60">
              {language === 'zh'
                ? `工具调用 (${pending.toolPreview.length})`
                : `Tool calls (${pending.toolPreview.length})`}
            </div>
            <ul className="divide-y divide-border/40">
              {pending.toolPreview.map((t, i) => {
                const inputPreview = JSON.stringify(t.input ?? {}).slice(0, 160)
                return (
                  <li key={i} className="px-3 py-2 text-xs">
                    <span className="font-mono font-medium text-foreground">{t.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground break-all">
                      {inputPreview}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {revising && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              {language === 'zh'
                ? '告诉智能体怎么改这个计划:'
                : 'Tell the agent how to revise:'}
            </label>
            <textarea
              autoFocus
              value={reviseText}
              onChange={(e) => setReviseText(e.target.value)}
              rows={3}
              placeholder={language === 'zh'
                ? '例如: 先列出当前内容,不要改文件'
                : 'e.g. First list the current contents, do not modify the file yet'}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  submitRevision()
                }
              }}
            />
            <p className="text-[10px] text-muted-foreground">
              {language === 'zh' ? '⌘/Ctrl + Enter 提交' : '⌘/Ctrl + Enter to submit'}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          {revising ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setRevising(false); setReviseText('') }}>
                {language === 'zh' ? '返回' : 'Back'}
              </Button>
              <AlertDialogAction
                onClick={submitRevision}
                disabled={!reviseText.trim()}
              >
                {language === 'zh' ? '提交修订' : 'Submit revision'}
              </AlertDialogAction>
            </>
          ) : (
            <>
              <AlertDialogCancel onClick={deny}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </AlertDialogCancel>
              <Button variant="outline" size="sm" onClick={() => setRevising(true)}>
                {language === 'zh' ? '修订…' : 'Revise…'}
              </Button>
              <AlertDialogAction onClick={approve}>
                {language === 'zh' ? '批准并执行' : 'Approve & Execute'}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
