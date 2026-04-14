import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { useChatOutletContext } from './layout'
import type { Skill } from '../../../electron/main/engine/types'

interface EditingSkill {
  id?: string
  name: string
  description: string
  trigger: string
  content: string
}

export default function ChatSkillsPage() {
  const { language } = useLanguage()
  const { sidebarOpen, setSidebarOpen } = useChatOutletContext()
  const t = (en: string, zh: string) => language === 'zh' ? zh : en

  const [skills, setSkills] = useState<Skill[]>([])
  const [editing, setEditing] = useState<EditingSkill | null>(null)
  const [filter, setFilter] = useState<'all' | 'builtin' | 'custom'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (window.nohi?.skills) {
      window.nohi.skills.list().then(setSkills).catch(() => {})
    }
  }, [])

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    if (window.nohi?.skills) setSkills(await window.nohi.skills.toggle(id, enabled))
  }, [])

  const saveSkill = useCallback(async () => {
    if (!editing || !window.nohi?.skills) return
    if (editing.id) {
      setSkills(await window.nohi.skills.update({
        id: editing.id, name: editing.name, description: editing.description,
        trigger: editing.trigger, content: editing.content,
      }))
    } else {
      setSkills(await window.nohi.skills.create({
        name: editing.name, description: editing.description,
        trigger: editing.trigger, content: editing.content,
      }))
    }
    setEditing(null)
    toast.success(t('Skill saved', '已保存'))
  }, [editing, t])

  const deleteSkill = useCallback(async (id: string) => {
    if (window.nohi?.skills) {
      setSkills(await window.nohi.skills.delete(id))
      toast.success(t('Skill deleted', '已删除'))
    }
  }, [t])

  const filtered = skills.filter(s => {
    if (filter === 'builtin' && s.source !== 'builtin') return false
    if (filter === 'custom' && s.source !== 'custom') return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    }
    return true
  })

  const builtinCount = skills.filter(s => s.source === 'builtin').length
  const customCount = skills.filter(s => s.source === 'custom').length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={() => setSidebarOpen(v => !v)}
          className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <span className="text-sm">{sidebarOpen ? '←' : '→'}</span>
        </button>
        <h1 className="text-sm font-semibold text-foreground">{t('Skills', 'Skills')}</h1>
        <span className="text-xs text-muted-foreground">{skills.length} {t('available', '可用')}</span>
        <div className="flex-1" />
        <Button size="sm" className="text-xs h-7" onClick={() => setEditing({ name: '', description: '', trigger: '', content: '' })}>
          {t('+ Create', '+ 新建')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {(['all', 'builtin', 'custom'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? t(`All ${skills.length}`, `全部 ${skills.length}`)
                : f === 'builtin' ? t(`Built-in ${builtinCount}`, `内置 ${builtinCount}`)
                : t(`Custom ${customCount}`, `自定义 ${customCount}`)}
            </button>
          ))}
        </div>
        <Input
          placeholder={t('Search...', '搜索...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-[200px] text-xs h-7"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Editor */}
        {editing && (
          <div className="rounded-2xl border border-border p-4 space-y-3 bg-muted/10 mb-4">
            <p className="text-xs font-semibold">{editing.id ? t('Edit Skill', '编辑') : t('New Skill', '新建')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="text-xs h-8" />
              <Input placeholder="Triggers (pipe-separated)" value={editing.trigger} onChange={e => setEditing({ ...editing, trigger: e.target.value })} className="text-xs h-8 font-mono" />
            </div>
            <Input placeholder="Description" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="text-xs h-8" />
            <textarea
              placeholder="Prompt content..."
              value={editing.content}
              onChange={e => setEditing({ ...editing, content: e.target.value })}
              className="w-full min-h-[140px] rounded-xl border border-input bg-background p-3 text-xs font-mono resize-y"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={saveSkill} disabled={!editing.name.trim() || !editing.content.trim()}>{t('Save', '保存')}</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(null)}>{t('Cancel', '取消')}</Button>
            </div>
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            {search ? t('No skills match.', '无匹配结果。') : t('No skills.', '暂无 Skills。')}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {filtered.map(skill => (
              <div key={skill.id} className={cn(
                'rounded-xl border p-3 transition-colors',
                skill.enabled ? 'border-border bg-background' : 'border-border/50 bg-muted/10 opacity-50'
              )}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">/{skill.name}</span>
                      <Badge variant="secondary" className="text-[8px] px-1 py-0">
                        {skill.source === 'builtin' ? t('Built-in', '内置') : t('Custom', '自定义')}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{skill.description}</p>
                  </div>
                  <Switch checked={skill.enabled} onCheckedChange={v => toggle(skill.id, v)} />
                </div>
                {skill.trigger && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {skill.trigger.split('|').slice(0, 4).map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground">{kw.trim()}</span>
                    ))}
                  </div>
                )}
                {skill.source === 'custom' && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-border/30">
                    <button type="button" onClick={() => setEditing({ id: skill.id, name: skill.name, description: skill.description, trigger: skill.trigger, content: skill.content })} className="text-[10px] text-muted-foreground hover:text-foreground">{t('Edit', '编辑')}</button>
                    <button type="button" onClick={() => deleteSkill(skill.id)} className="text-[10px] text-destructive/70 hover:text-destructive">{t('Delete', '删除')}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
