// Tool-consent dialog.
// Subscribes to agent events, filters for `tool_approval_request`, and
// surfaces a modal so the user can approve / deny before the agent proceeds.
//
// Replies go back via window.nohi.agent.approve(toolUseId, decision). Main
// process correlates by toolUseId and resolves the pending promise.
//
// This component is a separate subscriber to window.nohi.agent.onEvent —
// chat/page.tsx also subscribes for its own streaming, and both coexist
// because onEvent is additive.

import { useEffect, useState } from 'react'
import type { AgentEvent } from '../../../electron/main/engine/types'
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

type ApprovalRequest = Extract<AgentEvent, { type: 'tool_approval_request' }>

export function ToolConsent(): JSX.Element | null {
  const [request, setRequest] = useState<ApprovalRequest | null>(null)

  useEffect(() => {
    const unsub = window.nohi.agent.onEvent((event: AgentEvent) => {
      if (event.type === 'tool_approval_request') {
        setRequest(event)
      } else if (event.type === 'done' || event.type === 'error') {
        // Agent finished — any stale modal is moot because main/index.ts
        // drains unresolved approvals with a deny verdict in its finally.
        setRequest(null)
      }
    })
    return () => {
      unsub()
    }
  }, [])

  if (!request) return null

  const respond = (decision: 'approve' | 'deny'): void => {
    window.nohi.agent.approve(request.toolUseId, decision)
    setRequest(null)
  }

  const inputSummary =
    typeof request.input === 'object' && request.input
      ? JSON.stringify(request.input, null, 2).slice(0, 600)
      : String(request.input)

  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve tool call: {request.toolName}</AlertDialogTitle>
          <AlertDialogDescription>
            {request.reason}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <pre className="text-xs bg-muted/60 rounded-md p-3 max-h-60 overflow-auto whitespace-pre-wrap break-all">
          {inputSummary}
        </pre>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => respond('deny')}>Deny</AlertDialogCancel>
          <AlertDialogAction onClick={() => respond('approve')}>Approve</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
