// Plan-approval dialog (v3.1.0).
//
// Mirrors tool-consent.tsx but for plan_approval_request events: when
// plan mode is on and the agent's first iteration wants to run tools,
// the main process emits this event and blocks the agent loop until the
// renderer replies via window.nohi.agent.approvePlan(sessionId, kind, reviseText?).
//
// v3.1.0 additions over v3.0.0:
//   P1 — Map<sessionId, request> queue so a second request never overwrites
//        the first. Only one modal visible at a time; FIFO insertion order.
//   P2 — Approve auto-disables session.planMode (the user said "approve =
//        I'm good to proceed normally"). Cancel/Revise leave it on.
//   P3 — When a revised plan arrives for the same session, default to a
//        unified line-by-line diff against the previous plan.
//   P4 — Each decision writes session's latest assistant message
//        metadata.planDecision so the chat history shows a chip.

import { useEffect, useState, useRef, useCallback } from 'react'
import type { AgentEvent, Session } from '../../../electron/main/engine/types'
import { renderMarkdown } from '@/lib/chat-markdown'
import { diffLines, hasChanges } from '@/lib/plan-diff'
import { useLanguage } from '@/lib/language-context'
import { useAIStore } from '@/store/ai-store'
import { cn } from '@/lib/utils'
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

/** Annotate the latest assistant message in the active session with a
 *  plan decision so the chat history can render a chip. Persists via
 *  window.nohi.sessions.save. No-op if the active session doesn't match. */
function tagLatestAssistant(sessionId: string, decision: 'approved' | 'denied' | 'revised'): void {
  const store = useAIStore.getState()
  const cur = store.session
  if (!cur || cur.id !== sessionId) return
  // Walk backwards to find the last assistant message (there should be
  // exactly one — the plan response that triggered the modal).
  const idx = [...cur.messages].reverse().findIndex((m) => m.role === 'assistant')
  if (idx === -1) return
  const realIdx = cur.messages.length - 1 - idx
  const target = cur.messages[realIdx]
  const updated: Session = {
    ...cur,
    messages: cur.messages.map((m, i) => i === realIdx
      ? { ...target, metadata: { ...(target.metadata ?? {}), planDecision: decision } }
      : m,
    ),
    updatedAt: Date.now(),
  }
  store.setSession(updated)
  // Best-effort persist — error toast would be noisy here, the in-memory
  // update already shows the chip.
  if (typeof window !== 'undefined' && window.nohi?.sessions) {
    window.nohi.sessions.save(updated).catch(() => { /* chip still renders from memory */ })
  }
}

/** Auto-disable plan mode for the active session after Approve (v3.1.0
 *  P2 decision). The user opted out of an extra "approve & exit" button —
 *  Approve itself means "I'm good to proceed normally". */
function exitPlanModeIfActive(sessionId: string): void {
  const store = useAIStore.getState()
  const cur = store.session
  if (!cur || cur.id !== sessionId || !cur.planMode) return
  const updated: Session = { ...cur, planMode: false, updatedAt: Date.now() }
  store.setSession(updated)
  if (typeof window !== 'undefined' && window.nohi?.sessions) {
    window.nohi.sessions.save(updated).catch(() => { /* in-memory update already cleared the pill */ })
  }
}

export function PlanApproval(): JSX.Element | null {
  const { language } = useLanguage()
  // P1: queue of pending requests keyed by sessionId. Map preserves
  // insertion order, so the first entry is FIFO-active. Today the UI
  // only triggers one agent:run at a time so this is defensive — when
  // background sessions ship, this already handles the fan-in.
  const [queue, setQueue] = useState<Map<string, PlanRequest>>(() => new Map())
  const [revising, setRevising] = useState(false)
  const [reviseText, setReviseText] = useState('')
  const [showDiff, setShowDiff] = useState(true)

  // P3: remember the previous plan per session so a revised plan can be
  // diffed against it. Cleared when the session's queue entry resolves.
  const prevPlanBySessionRef = useRef<Map<string, string>>(new Map())

  // First entry of the queue is the active modal target.
  const active: PlanRequest | undefined = queue.values().next().value

  useEffect(() => {
    const unsub = window.nohi.agent.onEvent((event: AgentEvent) => {
      if (event.type === 'plan_approval_request') {
        setQueue((prev) => {
          const next = new Map(prev)
          next.set(event.sessionId, event)
          return next
        })
        // Reset per-modal state when a new active request arrives.
        setRevising(false)
        setReviseText('')
        setShowDiff(true)
      } else if (event.type === 'done' || event.type === 'error') {
        // Done/error doesn't carry a sessionId, but in the single-session
        // UI it always refers to the active one. Drop the active entry +
        // clear its prev-plan memory.
        setQueue((prev) => {
          if (prev.size === 0) return prev
          const next = new Map(prev)
          const firstKey = next.keys().next().value
          if (firstKey) {
            next.delete(firstKey)
            prevPlanBySessionRef.current.delete(firstKey)
          }
          return next
        })
      }
    })
    return () => { unsub() }
  }, [])

  // Rebuild close handler each render so it captures the current `active`.
  const closeActive = useCallback((): void => {
    if (!active) return
    setQueue((prev) => {
      const next = new Map(prev)
      next.delete(active.sessionId)
      return next
    })
    setRevising(false)
    setReviseText('')
  }, [active])

  if (!active) return null

  const approve = (): void => {
    window.nohi.agent.approvePlan(active.sessionId, 'approve')
    tagLatestAssistant(active.sessionId, 'approved')
    exitPlanModeIfActive(active.sessionId)
    prevPlanBySessionRef.current.delete(active.sessionId)
    closeActive()
  }
  const deny = (): void => {
    window.nohi.agent.approvePlan(active.sessionId, 'deny')
    tagLatestAssistant(active.sessionId, 'denied')
    prevPlanBySessionRef.current.delete(active.sessionId)
    closeActive()
  }
  const submitRevision = (): void => {
    const text = reviseText.trim()
    if (!text) return
    window.nohi.agent.approvePlan(active.sessionId, 'revise', text)
    tagLatestAssistant(active.sessionId, 'revised')
    // Stash the current plan as "previous" so the next plan_approval_request
    // for this session can diff against it.
    prevPlanBySessionRef.current.set(active.sessionId, active.planText ?? '')
    closeActive()
  }

  const planText = active.planText ?? ''
  const prevPlan = prevPlanBySessionRef.current.get(active.sessionId)
  const canShowDiff = !!prevPlan && hasChanges(prevPlan, planText)

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
          <AlertDialogTitle className="flex items-center gap-2">
            {language === 'zh' ? '审核计划' : 'Review plan'}
            {queue.size > 1 && (
              <span className="text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {language === 'zh' ? `还有 ${queue.size - 1} 个排队` : `+${queue.size - 1} queued`}
              </span>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {canShowDiff
              ? (language === 'zh' ? '智能体根据你的修订更新了计划。绿色 = 新增,红色 = 删除。' : 'The agent revised the plan based on your feedback. Green = added, red = removed.')
              : (language === 'zh' ? '智能体计划调用以下工具,执行前需要你的批准。' : 'The agent is about to run the tools below. Approve, revise, or cancel.')
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Plan body */}
        {planText.trim() ? (
          canShowDiff && showDiff ? (
            <PlanDiffView prev={prevPlan!} next={planText} />
          ) : (
            <div
              className="max-h-60 overflow-auto text-sm prose prose-sm dark:prose-invert max-w-none bg-muted/40 rounded-md p-3"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(planText) }}
            />
          )
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {language === 'zh'
              ? '(模型未提供计划文字,直接给出了工具调用。)'
              : '(Model gave no plan text — jumped straight to tool calls.)'}
          </p>
        )}

        {/* Diff / plain toggle, only when we have something to diff. */}
        {canShowDiff && (
          <button
            type="button"
            onClick={() => setShowDiff((v) => !v)}
            className="self-start text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            {showDiff
              ? (language === 'zh' ? '查看完整计划' : 'View full plan')
              : (language === 'zh' ? '查看修订差异' : 'View revision diff')}
          </button>
        )}

        {/* Tool preview */}
        {active.toolPreview.length > 0 && (
          <div className="rounded-md border border-border/60 overflow-hidden">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border/60">
              {language === 'zh'
                ? `工具调用 (${active.toolPreview.length})`
                : `Tool calls (${active.toolPreview.length})`}
            </div>
            <ul className="divide-y divide-border/40">
              {active.toolPreview.map((t, i) => {
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

// ── Diff view ─────────────────────────────────────────────────────────────

function PlanDiffView({ prev, next }: { prev: string; next: string }): JSX.Element {
  const lines = diffLines(prev, next)
  return (
    <div className="max-h-60 overflow-auto rounded-md border border-border/60 bg-muted/20 font-mono text-xs">
      {lines.map((l, i) => (
        <div
          key={i}
          className={cn(
            'flex gap-2 px-3 py-0.5',
            l.kind === 'add' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            l.kind === 'del' && 'bg-red-500/10 text-red-700 dark:text-red-400 line-through opacity-70',
            l.kind === 'same' && 'text-muted-foreground',
          )}
        >
          <span className="select-none w-3 shrink-0">
            {l.kind === 'add' ? '+' : l.kind === 'del' ? '−' : ' '}
          </span>
          <span className="whitespace-pre-wrap break-all">{l.line || ' '}</span>
        </div>
      ))}
    </div>
  )
}
