import { useLanguage } from '@/lib/language-context'
import { useAutomations } from '@/lib/use-automations'
import { AutomationBody } from '@/components/automation/automation-body'

export default function AutomationPage() {
  const { language } = useLanguage()
  const t = (en: string, zh: string) => (language === 'zh' ? zh : en)
  const state = useAutomations(language)

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Seller-style header */}
      <div className="px-8 py-6 border-b border-border/40">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('Automation', '自动化')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            'Schedule prompts to run automatically — daily reports, monitoring, recurring tasks.',
            '定时运行提示词 — 日报、监控、周期性任务。',
          )}
        </p>
      </div>
      <AutomationBody language={language} state={state} density="comfortable" />
    </div>
  )
}
