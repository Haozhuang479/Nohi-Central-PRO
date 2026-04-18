// Shared body for the Automation page (templates + list + edit modal)
// Used by both /seller/automation and /chat/automation
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { useAutomations, Schedule, EditingAutomation } from '@/lib/use-automations'
import type { Automation } from '../../../electron/main/engine/automation/store'

const SCHEDULE_LABELS: Record<Schedule, { en: string; zh: string }> = {
  manual: { en: 'Manual only', zh: '仅手动' },
  hourly: { en: 'Every hour', zh: '每小时' },
  daily: { en: 'Daily', zh: '每天' },
  weekly: { en: 'Weekly', zh: '每周' },
}

const DAY_LABELS = [
  { en: 'Sun', zh: '周日' },
  { en: 'Mon', zh: '周一' },
  { en: 'Tue', zh: '周二' },
  { en: 'Wed', zh: '周三' },
  { en: 'Thu', zh: '周四' },
  { en: 'Fri', zh: '周五' },
  { en: 'Sat', zh: '周六' },
]

export const AUTOMATION_TEMPLATES = [
  {
    en: 'Daily inventory report',
    zh: '每日库存报告',
    prompt: 'Run a daily inventory check: list any products with stock below 10 units, summarize total inventory value, and flag any items that have sold out in the last 24 hours.',
    schedule: 'daily' as Schedule,
    timeOfDay: '09:00',
  },
  {
    en: 'Weekly competitor scan',
    zh: '每周竞品扫描',
    prompt: 'Use firecrawl_scrape on our top 3 competitor product pages to extract pricing, promotions, and any new product launches. Summarize changes vs last week.',
    schedule: 'weekly' as Schedule,
    timeOfDay: '08:00',
    dayOfWeek: 1,
  },
  {
    en: 'Hourly site uptime check',
    zh: '每小时站点检查',
    prompt: 'Use web_fetch on the storefront homepage. Confirm it returns 200 and the page contains the expected hero text. Alert if anything is off.',
    schedule: 'hourly' as Schedule,
  },
  {
    en: 'New product description draft',
    zh: '新品描述草稿',
    prompt: 'Read the products from our most recent CSV upload. For any product missing a description, draft a 2-paragraph SEO-friendly description following our brand voice.',
    schedule: 'manual' as Schedule,
  },
] as const

interface Props {
  language: 'en' | 'zh'
  state: ReturnType<typeof useAutomations>
  /** Padding preset — chat is denser than seller */
  density?: 'comfortable' | 'compact'
}

export function AutomationBody({ language, state, density = 'comfortable' }: Props) {
  const t = (en: string, zh: string) => (language === 'zh' ? zh : en)
  const { automations, editing, setEditing, busyId, save, togglePause, remove, runNow } = state
  const px = density === 'compact' ? 'px-4' : 'px-8'
  const py = density === 'compact' ? 'py-4' : 'py-6'

  const beginCreate = (template?: typeof AUTOMATION_TEMPLATES[number]) => {
    if (template) {
      setEditing({
        name: t(template.en, template.zh),
        description: '',
        prompt: template.prompt,
        schedule: template.schedule,
        timeOfDay: 'timeOfDay' in template ? template.timeOfDay! : '09:00',
        dayOfWeek: 'dayOfWeek' in template ? (template as { dayOfWeek?: number }).dayOfWeek ?? 1 : 1,
      })
    } else {
      setEditing({
        name: '',
        description: '',
        prompt: '',
        schedule: 'manual',
        timeOfDay: '09:00',
        dayOfWeek: 1,
      })
    }
  }

  const formatNextRun = (ts?: number) => {
    if (!ts) return t('Manual only', '仅手动')
    const date = new Date(ts)
    return date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <>
      {/* Templates */}
      {automations.length === 0 && !editing && (
        <div className={cn(px, py)}>
          <h3 className="text-sm font-medium text-foreground mb-3">
            {t('Quick start templates', '快速开始模板')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AUTOMATION_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => beginCreate(tpl)}
                className="text-left rounded-2xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/40 transition-colors"
              >
                <p className="text-sm font-medium text-foreground">{t(tpl.en, tpl.zh)}</p>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{tpl.prompt}</p>
                <Badge variant="secondary" className="mt-2 text-[10px]">
                  {t(SCHEDULE_LABELS[tpl.schedule].en, SCHEDULE_LABELS[tpl.schedule].zh)}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className={cn('flex-1 overflow-y-auto space-y-3', px, py)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            {t('Your automations', '我的自动化')}
            <span className="ml-2 text-xs text-muted-foreground">({automations.length})</span>
          </h3>
          <Button size="sm" onClick={() => beginCreate()}>
            + {t('New automation', '新建自动化')}
          </Button>
        </div>

        {automations.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {t('No automations yet. Pick a template above or create a new one.', '暂无自动化。可选用上面的模板或新建一个。')}
          </div>
        )}

        {automations.map((a: Automation) => (
          <div
            key={a.id}
            className={cn(
              'rounded-2xl border p-4 transition-colors',
              a.status === 'active' ? 'border-border/40 bg-muted/10' : 'border-border/30 bg-muted/5 opacity-60',
            )}
          >
            <div className="flex items-start gap-3">
              <Switch
                checked={a.status === 'active'}
                onCheckedChange={() => togglePause(a)}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {t(SCHEDULE_LABELS[a.schedule].en, SCHEDULE_LABELS[a.schedule].zh)}
                  </Badge>
                  {a.schedule === 'weekly' && a.dayOfWeek !== undefined && (
                    <Badge variant="outline" className="text-[10px]">
                      {t(DAY_LABELS[a.dayOfWeek].en, DAY_LABELS[a.dayOfWeek].zh)} {a.timeOfDay}
                    </Badge>
                  )}
                  {a.schedule === 'daily' && (
                    <Badge variant="outline" className="text-[10px]">{a.timeOfDay}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 whitespace-pre-wrap">
                  {a.prompt}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>{t('Next:', '下次:')} {formatNextRun(a.nextRunAt)}</span>
                  {a.lastRunAt && (
                    <span>{t('Last:', '上次:')} {formatNextRun(a.lastRunAt)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === a.id}
                  onClick={() => runNow(a.id)}
                  className="h-7 px-2.5 text-xs"
                >
                  {busyId === a.id ? t('Running…', '运行中…') : t('Run now', '立即运行')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing({
                    id: a.id,
                    name: a.name,
                    description: a.description ?? '',
                    prompt: a.prompt,
                    schedule: a.schedule,
                    timeOfDay: a.timeOfDay ?? '09:00',
                    dayOfWeek: a.dayOfWeek ?? 1,
                  })}
                  className="h-7 px-2.5 text-xs"
                >
                  {t('Edit', '编辑')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(a.id)}
                  className="h-7 px-2.5 text-xs text-destructive hover:text-destructive"
                >
                  {t('Delete', '删除')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl mx-4 rounded-2xl bg-background border border-border/40 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-border/40">
              <h2 className="text-lg font-semibold text-foreground">
                {editing.id ? t('Edit automation', '编辑自动化') : t('New automation', '新建自动化')}
              </h2>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <EditForm editing={editing} setEditing={setEditing} t={t} />
            </div>
            <div className="p-6 border-t border-border/40 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t('Cancel', '取消')}
              </Button>
              <Button onClick={save}>
                {editing.id ? t('Save changes', '保存修改') : t('Create automation', '创建自动化')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface EditFormProps {
  editing: EditingAutomation
  setEditing: (e: EditingAutomation) => void
  t: (en: string, zh: string) => string
}

function EditForm({ editing, setEditing, t }: EditFormProps) {
  return (
    <>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          {t('Name', '名称')}
        </label>
        <Input
          value={editing.name}
          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          placeholder={t('e.g. Daily inventory report', '例如：每日库存报告')}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          {t('Prompt (what should the agent do?)', '提示词（让 Agent 做什么？）')}
        </label>
        <textarea
          value={editing.prompt}
          onChange={(e) => setEditing({ ...editing, prompt: e.target.value })}
          rows={6}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={t(
            'Describe the recurring task. Be specific — the agent will run this on schedule.',
            '描述周期性任务。要具体 — Agent 会按计划执行。',
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {t('Schedule', '计划')}
          </label>
          <Select
            value={editing.schedule}
            onValueChange={(v) => setEditing({ ...editing, schedule: v as Schedule })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SCHEDULE_LABELS) as Schedule[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {t(SCHEDULE_LABELS[s].en, SCHEDULE_LABELS[s].zh)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(editing.schedule === 'daily' || editing.schedule === 'weekly') && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {t('Time of day', '时间')}
            </label>
            <Input
              type="time"
              value={editing.timeOfDay}
              onChange={(e) => setEditing({ ...editing, timeOfDay: e.target.value })}
            />
          </div>
        )}

        {editing.schedule === 'weekly' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {t('Day of week', '星期')}
            </label>
            <Select
              value={String(editing.dayOfWeek)}
              onValueChange={(v) => setEditing({ ...editing, dayOfWeek: parseInt(v, 10) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_LABELS.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {t(d.en, d.zh)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </>
  )
}
