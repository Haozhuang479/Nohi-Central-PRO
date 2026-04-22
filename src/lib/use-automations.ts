// Shared hook for automation state + IPC — used by both /seller/automation and /chat/automation
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { toastIpcError } from './ipc-toast'
import type { Automation } from '../../electron/main/engine/automation/store'

export type Schedule = Automation['schedule']

export interface EditingAutomation {
  id?: string
  name: string
  description: string
  prompt: string
  schedule: Schedule
  timeOfDay: string
  dayOfWeek: number
}

export function useAutomations(language: 'en' | 'zh') {
  const t = (en: string, zh: string) => (language === 'zh' ? zh : en)

  const [automations, setAutomations] = useState<Automation[]>([])
  const [editing, setEditing] = useState<EditingAutomation | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (window.nohi?.automation) {
      window.nohi.automation.list().then(setAutomations).catch(toastIpcError('automation:list'))
    }
    const unsub = window.nohi?.automation?.onCompleted(() => {
      window.nohi?.automation?.list().then(setAutomations).catch(toastIpcError('automation:list'))
    })
    return () => { unsub?.() }
  }, [])

  const save = useCallback(async () => {
    if (!editing || !window.nohi?.automation) return
    if (!editing.name.trim() || !editing.prompt.trim()) {
      toast.error(t('Name and prompt are required', '名称和提示词必填'))
      return
    }
    if (editing.id) {
      const next = await window.nohi.automation.update(editing.id, {
        name: editing.name,
        description: editing.description,
        prompt: editing.prompt,
        schedule: editing.schedule,
        timeOfDay: editing.timeOfDay,
        dayOfWeek: editing.dayOfWeek,
      })
      setAutomations(next)
    } else {
      const next = await window.nohi.automation.create({
        name: editing.name,
        description: editing.description,
        prompt: editing.prompt,
        schedule: editing.schedule,
        timeOfDay: editing.timeOfDay,
        dayOfWeek: editing.dayOfWeek,
      })
      setAutomations(next)
    }
    setEditing(null)
    toast.success(t('Automation saved', '已保存'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const togglePause = useCallback(async (a: Automation) => {
    if (!window.nohi?.automation) return
    const next = await window.nohi.automation.update(a.id, {
      status: a.status === 'active' ? 'paused' : 'active',
    })
    setAutomations(next)
  }, [])

  const remove = useCallback(async (id: string) => {
    if (!window.nohi?.automation) return
    if (!confirm(t('Delete this automation?', '删除此自动化？'))) return
    const next = await window.nohi.automation.delete(id)
    setAutomations(next)
    toast.success(t('Deleted', '已删除'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runNow = useCallback(async (id: string) => {
    if (!window.nohi?.automation) return
    setBusyId(id)
    toast.info(t('Running automation…', '正在运行自动化…'))
    const result = await window.nohi.automation.run(id)
    setBusyId(null)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success(t('Run complete — opened in chat history', '运行完成 — 已加入聊天历史'))
      window.nohi?.automation?.list().then(setAutomations).catch(toastIpcError('automation:list'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { automations, editing, setEditing, busyId, save, togglePause, remove, runNow }
}
