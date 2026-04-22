import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { toastIpcError } from '@/lib/ipc-toast'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton } from '@/components/ui/list-skeleton'
import type { Skill } from '../../../../electron/main/engine/types'

interface EditingSkill {
  id?: string
  name: string
  description: string
  trigger: string
  content: string
}

export default function SkillsPage() {
  const { language } = useLanguage()
  const t = (en: string, zh: string) => language === 'zh' ? zh : en

  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingSkill | null>(null)
  const [filter, setFilter] = useState<'all' | 'builtin' | 'custom'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (window.nohi?.skills) {
      window.nohi.skills.list()
        .then((list) => { setSkills(list); setLoading(false) })
        .catch((err) => { toastIpcError('skills:list')(err); setLoading(false) })
    } else {
      setLoading(false)
    }
  }, [])

  const openCreate = useCallback(() => {
    setEditing({ name: '', description: '', trigger: '', content: '' })
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
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {t('Skills', 'Skills')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              `${skills.length} skills available. Type / in chat to trigger. Custom skills live in ~/.nohi/skills/.`,
              `${skills.length} 个 Skills。聊天中输入 / 触发。自定义 Skills 位于 ~/.nohi/skills/。`
            )}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditing({ name: '', description: '', trigger: '', content: '' })}
        >
          {t('+ Create Skill', '+ 新建 Skill')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {(['all', 'builtin', 'custom'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? t(`All (${skills.length})`, `全部 (${skills.length})`)
                : f === 'builtin' ? t(`Built-in (${builtinCount})`, `内置 (${builtinCount})`)
                : t(`Custom (${customCount})`, `自定义 (${customCount})`)}
            </button>
          ))}
        </div>
        <Input
          placeholder={t('Search skills...', '搜索 Skills...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-[240px] text-xs h-8"
        />
      </div>

      {/* Editor */}
      {editing && (
        <div className="rounded-2xl border border-border p-5 space-y-4 bg-muted/10">
          <p className="text-sm font-semibold text-foreground">
            {editing.id ? t('Edit Skill', '编辑 Skill') : t('Create New Skill', '新建 Skill')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t('Name', '名称')}</label>
              <Input
                placeholder="e.g. code-review"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t('Trigger Keywords', '触发关键词')}</label>
              <Input
                placeholder="review code|code review|bug check"
                value={editing.trigger}
                onChange={e => setEditing({ ...editing, trigger: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t('Description', '描述')}</label>
            <Input
              placeholder={t('Brief description of what this skill does', '简要描述此 Skill 的功能')}
              value={editing.description}
              onChange={e => setEditing({ ...editing, description: e.target.value })}
              className="text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t('Prompt Content', '提示词内容')}</label>
            <textarea
              placeholder={t('The full prompt that gets injected into the system prompt when triggered...', '触发时注入系统提示词的完整内容...')}
              value={editing.content}
              onChange={e => setEditing({ ...editing, content: e.target.value })}
              className="w-full min-h-[200px] rounded-xl border border-input bg-background p-4 text-xs font-mono resize-y leading-relaxed"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveSkill} disabled={!editing.name.trim() || !editing.content.trim()}>
              {t('Save', '保存')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
              {t('Cancel', '取消')}
            </Button>
          </div>
        </div>
      )}

      {/* Skills Grid */}
      {loading ? (
        <ListSkeleton rows={4} rowHeightClass="h-28" />
      ) : filtered.length === 0 ? (
        search ? (
          <EmptyState
            title={t('No skills match your search.', '没有匹配的 Skill。')}
            description={t('Try a different name or trigger keyword.', '换个名称或触发词试试。')}
          />
        ) : (
          <EmptyState
            title={t('No skills yet', '还没有 Skills')}
            description={t('Create a skill to trigger custom prompts with a slash command.', '创建一个 Skill,用斜杠命令触发自定义提示词。')}
            ctaLabel={t('Create your first skill', '创建第一个 Skill')}
            onCta={openCreate}
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(skill => (
            <div
              key={skill.id}
              className={cn(
                'rounded-2xl border p-4 transition-colors',
                skill.enabled ? 'border-border bg-background' : 'border-border/50 bg-muted/20 opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">/{skill.name}</span>
                    <Badge variant="secondary" className="text-[9px] shrink-0">
                      {skill.source === 'builtin' ? t('Built-in', '内置') : t('Custom', '自定义')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{skill.description}</p>
                </div>
                <Switch checked={skill.enabled} onCheckedChange={v => toggle(skill.id, v)} />
              </div>
              {skill.trigger && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {skill.trigger.split('|').slice(0, 5).map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
                      {kw.trim()}
                    </span>
                  ))}
                </div>
              )}
              {skill.source === 'custom' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setEditing({
                      id: skill.id, name: skill.name, description: skill.description,
                      trigger: skill.trigger, content: skill.content,
                    })}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('Edit', '编辑')}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSkill(skill.id)}
                    className="text-[11px] text-destructive/70 hover:text-destructive transition-colors"
                  >
                    {t('Delete', '删除')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
