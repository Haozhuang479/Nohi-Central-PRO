// Agent Safety section of the Settings page.
// Exposes the BashTool consent policy (off / dangerous / always / allowlist)
// and the per-user allowlist of bypass regexes. This is the renderer half of
// the Phase B1 / B3 work — main process reads settings.bashConsentMode at
// each tool invocation and either passes through, asks, or fails closed.

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NohiSettings } from '../../../electron/main/engine/types'

type BashMode = NonNullable<NohiSettings['bashConsentMode']>

const MODE_LABELS: Record<BashMode, { en: string; zh: string; hint: { en: string; zh: string } }> = {
  off: {
    en: 'Off',
    zh: '关闭',
    hint: {
      en: 'Never ask. Legacy behaviour — not recommended.',
      zh: '永不询问。旧行为，不建议。',
    },
  },
  dangerous: {
    en: 'Dangerous commands only',
    zh: '仅危险命令',
    hint: {
      en: 'Ask only when the command matches a known-destructive pattern (rm -rf, dd, mkfs…). Default.',
      zh: '仅当命令命中已知破坏性模式（rm -rf、dd、mkfs 等）时询问。默认值。',
    },
  },
  always: {
    en: 'Always ask',
    zh: '全部询问',
    hint: {
      en: 'Ask before every single bash invocation. Safest, most interruptive.',
      zh: '每次调用 bash 都询问。最安全，也最打扰。',
    },
  },
  allowlist: {
    en: 'Allowlist only',
    zh: '仅允许列表',
    hint: {
      en: 'Ask unless the command matches one of your allowlist regexes.',
      zh: '除非命令命中您定义的正则，否则都询问。',
    },
  },
}

interface AgentSafetySectionProps {
  draft: NohiSettings
  patch: <K extends keyof NohiSettings>(key: K, value: NohiSettings[K]) => void
  onSave: (next: NohiSettings) => void
  language: 'en' | 'zh'
}

export function AgentSafetySection({
  draft,
  patch,
  onSave,
  language,
}: AgentSafetySectionProps): JSX.Element {
  const mode: BashMode = draft.bashConsentMode ?? 'dangerous'
  const allowlistText = (draft.bashAllowlist ?? []).join('\n')

  const onModeChange = (next: BashMode): void => {
    patch('bashConsentMode', next)
    onSave({ ...draft, bashConsentMode: next })
  }

  const onAllowlistChange = (text: string): void => {
    const lines = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    patch('bashAllowlist', lines)
  }

  const saveAllowlist = (): void => {
    onSave(draft)
    toast.success(language === 'zh' ? '已保存' : 'Saved')
  }

  return (
    <div className="p-6 space-y-5">
      <p className="text-xs text-muted-foreground">
        {language === 'zh'
          ? '控制智能体调用 bash 命令前是否需要您的确认。确认弹窗会显示命令原文。'
          : 'Require explicit approval before the agent runs shell commands. The confirmation modal shows the exact command.'}
      </p>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          {language === 'zh' ? '确认模式' : 'Consent mode'}
        </label>
        <Select value={mode} onValueChange={(v) => onModeChange(v as BashMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MODE_LABELS) as BashMode[]).map((m) => (
              <SelectItem key={m} value={m}>
                {language === 'zh' ? MODE_LABELS[m].zh : MODE_LABELS[m].en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {language === 'zh' ? MODE_LABELS[mode].hint.zh : MODE_LABELS[mode].hint.en}
        </p>
      </div>

      {mode === 'allowlist' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {language === 'zh'
              ? '允许列表（每行一个正则，命中则跳过询问）'
              : 'Allowlist (one regex per line — matches skip the prompt)'}
          </label>
          <textarea
            value={allowlistText}
            onChange={(e) => onAllowlistChange(e.target.value)}
            placeholder={'^git\\b\n^npm (test|run)\n^ls'}
            rows={5}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={saveAllowlist}>
              {language === 'zh' ? '保存' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
