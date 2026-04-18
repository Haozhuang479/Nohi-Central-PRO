import { useLanguage } from '@/lib/language-context'
import { useAutomations } from '@/lib/use-automations'
import { AutomationBody } from '@/components/automation/automation-body'
import { useChatOutletContext } from './layout'

export default function ChatAutomationPage() {
  const { language } = useLanguage()
  const { sidebarOpen, setSidebarOpen } = useChatOutletContext()
  const t = (en: string, zh: string) => (language === 'zh' ? zh : en)
  const state = useAutomations(language)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat-style top bar with sidebar toggle */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <span className="text-sm">{sidebarOpen ? '←' : '→'}</span>
        </button>
        <h1 className="text-sm font-semibold text-foreground">
          {t('Automation', '自动化')}
        </h1>
        <span className="text-xs text-muted-foreground">
          {state.automations.length} {t('scheduled', '个计划')}
        </span>
      </div>
      <AutomationBody language={language} state={state} density="compact" />
    </div>
  )
}
