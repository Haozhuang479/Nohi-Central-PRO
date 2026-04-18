import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import type { NohiSettings } from '../../../../electron/main/engine/types'

// ─── Types ────────────────────────────────────────────────────────────────

interface SettingsPageProps {
  settings: NohiSettings
  onSave: (s: NohiSettings) => void
}

type ProviderId = 'anthropic' | 'openai' | 'kimi' | 'minimax' | 'deepseek'
type TestStatus = 'idle' | 'testing' | 'success' | 'failure'

interface ProviderDef {
  id: ProviderId
  name: string
  recommended?: boolean
  description: string
  models: string[]
  keyField: keyof NohiSettings
}

// ─── Constants ────────────────────────────────────────────────────────────

const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    recommended: true,
    description: 'Most capable for complex reasoning and code',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    keyField: 'anthropicApiKey',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4.1, and o-series models',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini', 'o4-mini'],
    keyField: 'openaiApiKey',
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    description: 'Long context Chinese AI',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    keyField: 'kimiApiKey',
  },
  {
    id: 'minimax',
    name: 'Minimax',
    description: 'Fast Chinese language model',
    models: ['abab6.5s-chat'],
    keyField: 'minimaxApiKey',
  },
  {
    id: 'deepseek',
    name: 'Deepseek',
    description: 'Efficient open-source model',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyField: 'deepseekApiKey',
  },
]

const MOCK_CARDS = [
  { id: '1', brand: 'Visa', last4: '4242', expiry: '12/27' },
  { id: '2', brand: 'Mastercard', last4: '5555', expiry: '08/26' },
]

const STORE_CATEGORIES = [
  'Fashion & Apparel',
  'Electronics',
  'Home & Garden',
  'Beauty & Personal Care',
  'Sports & Outdoors',
  'Food & Beverage',
  'Toys & Games',
  'Books & Media',
  'Other',
]

const GMV_RANGES = [
  'Under $10k/month',
  '$10k–$50k/month',
  '$50k–$200k/month',
  '$200k–$1M/month',
  'Over $1M/month',
]

const TEAM_SIZES = ['1 (Solo)', '2–5', '6–20', '21–50', '50+']

// ─── Section wrapper ──────────────────────────────────────────────────────

function SettingsSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-2xl bg-background overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full px-6 py-4 hover:bg-secondary/30 transition-colors"
          >
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className="text-xs text-muted-foreground">{open ? '▴' : '▾'}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div>{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// ─── Toggle row ───────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 px-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

// ─── Provider card ────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  apiKey,
  onApiKeyChange,
  selectedModel,
  onModelChange,
  isPrimary,
  onSetPrimary,
  monthlyBudget,
  onBudgetChange,
  onSaveAll,
  language,
}: {
  provider: ProviderDef
  apiKey: string
  onApiKeyChange: (v: string) => void
  selectedModel: string
  onModelChange: (v: string) => void
  isPrimary: boolean
  onSetPrimary: () => void
  monthlyBudget: string
  onBudgetChange: (v: string) => void
  onSaveAll: () => void
  language: string
}) {
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')

  const testConnection = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error(language === 'zh' ? '请先输入 API Key' : 'Please enter an API key first')
      return
    }
    setTestStatus('testing')
    try {
      const result = await window.nohi.testApiKey(provider.id, apiKey.trim())
      setTestStatus(result.success ? 'success' : 'failure')
      if (result.success) {
        // Auto-save settings when test passes so key is persisted immediately
        onSaveAll()
        toast.success(
          language === 'zh'
            ? `${provider.name} 连接成功，已自动保存`
            : `${provider.name} connected — settings auto-saved`
        )
      } else {
        toast.error(
          language === 'zh'
            ? `${provider.name} 连接失败：${result.error ?? '请检查 API Key'}`
            : `${provider.name} connection failed: ${result.error ?? 'check your key'}`
        )
      }
    } catch {
      setTestStatus('failure')
      toast.error(language === 'zh' ? '测试失败' : 'Test failed')
    }
  }, [apiKey, provider, language])

  return (
    <div
      className={cn(
        'rounded-2xl p-4 transition-all',
        isPrimary
          ? 'bg-secondary/30'
          : 'bg-background'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{provider.name}</span>
            {provider.recommended && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {language === 'zh' ? '推荐' : 'Recommended'}
              </Badge>
            )}
            {isPrimary && (
              <Badge className="text-[10px] px-1.5 py-0">
                {language === 'zh' ? '主要' : 'Primary'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
        </div>
      </div>

      {/* API Key */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {language === 'zh' ? 'API 密钥' : 'API Key'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder={`Enter ${provider.name} API key…`}
                className="pr-10 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-xs">{showKey ? 'Hide' : 'Show'}</span>
              </button>
            </div>

            {/* Test connection */}
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testStatus === 'testing' || !apiKey.trim()}
              className="shrink-0 text-xs gap-1.5"
            >
              {testStatus === 'success' && <span className="text-emerald-500 text-xs">✓</span>}
              {testStatus === 'failure' && <span className="text-destructive text-xs">✗</span>}
              {testStatus === 'idle'
                ? language === 'zh' ? '测试连接' : 'Test'
                : testStatus === 'testing'
                  ? language === 'zh' ? '测试中…' : 'Testing…'
                  : testStatus === 'success'
                    ? language === 'zh' ? '已连接' : 'Connected'
                    : language === 'zh' ? '失败' : 'Failed'}
            </Button>
          </div>
        </div>

        {/* Model selector — only shown when key is set */}
        {apiKey && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {language === 'zh' ? '模型' : 'Model'}
            </label>
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {provider.models.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Monthly budget */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {language === 'zh' ? '月度预算（可选，USD）' : 'Monthly Budget (optional, USD)'}
          </label>
          <Input
            type="number"
            min="0"
            step="1"
            value={monthlyBudget}
            onChange={(e) => onBudgetChange(e.target.value)}
            placeholder="e.g. 50"
            className="text-xs h-8 w-32"
          />
        </div>

        {/* Set as primary */}
        {!isPrimary && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSetPrimary}
            className="gap-1.5 text-xs mt-1"
          >
            {language === 'zh' ? '设为主要提供商' : 'Set as Primary'}
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────

export default function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const { language, setLanguage } = useLanguage()

  // ── Local draft state ────────────────────────────────────────────────
  const [draft, setDraft] = useState<NohiSettings>(() => ({ ...settings }))
  const [storeEditing, setStoreEditing] = useState(false)

  // Provider-specific local state (api keys, models, budgets)
  const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>({
    anthropic: settings.anthropicApiKey ?? '',
    openai: settings.openaiApiKey ?? '',
    kimi: settings.kimiApiKey ?? '',
    minimax: settings.minimaxApiKey ?? '',
    deepseek: settings.deepseekApiKey ?? '',
  })
  const [providerModels, setProviderModels] = useState<Record<ProviderId, string>>({
    anthropic: settings.defaultModel && settings.primaryProvider === 'anthropic' ? settings.defaultModel : PROVIDERS[0].models[0],
    openai: PROVIDERS[1].models[0],
    kimi: PROVIDERS[2].models[0],
    minimax: PROVIDERS[3].models[0],
    deepseek: PROVIDERS[4].models[0],
  })
  const [providerBudgets, setProviderBudgets] = useState<Record<ProviderId, string>>({
    anthropic: '',
    openai: '',
    kimi: '',
    minimax: '',
    deepseek: '',
  })
  const [primaryProvider, setPrimaryProvider] = useState<ProviderId>(
    (settings.primaryProvider as ProviderId) ?? 'anthropic'
  )

  const patch = useCallback(<K extends keyof NohiSettings>(key: K, value: NohiSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const saveStore = () => {
    onSave(draft)
    setStoreEditing(false)
    toast.success(language === 'zh' ? '店铺信息已保存' : 'Store info saved')
  }

  const saveProviders = () => {
    const next: NohiSettings = {
      ...draft,
      anthropicApiKey: apiKeys.anthropic || undefined,
      openaiApiKey: apiKeys.openai || undefined,
      kimiApiKey: apiKeys.kimi || undefined,
      minimaxApiKey: apiKeys.minimax || undefined,
      deepseekApiKey: apiKeys.deepseek || undefined,
      primaryProvider: primaryProvider,
      defaultModel: providerModels[primaryProvider],
    }
    setDraft(next)
    onSave(next)
    toast.success(language === 'zh' ? 'AI 提供商设置已保存' : 'AI provider settings saved')
  }

  const savePermissions = () => {
    onSave(draft)
    toast.success(language === 'zh' ? '权限设置已保存' : 'Permissions saved')
  }

  const saveNotifications = () => {
    onSave(draft)
    toast.success(language === 'zh' ? '通知设置已保存' : 'Notifications saved')
  }

  const saveAppearance = () => {
    onSave(draft)
    toast.success(language === 'zh' ? '外观设置已保存' : 'Appearance saved')
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {language === 'zh' ? '设置' : 'Settings'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {language === 'zh'
            ? '管理您的店铺、AI 提供商及应用偏好'
            : 'Manage your store, AI providers, and app preferences'}
        </p>
      </div>

      {/* ── 1. Store Information ────────────────────────────────────────── */}
      <SettingsSection
        title={language === 'zh' ? '店铺信息' : 'Store Information'}
        defaultOpen
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {language === 'zh' ? '品牌名称' : 'Brand Name'}
              </label>
              <Input
                value={draft.storeName ?? ''}
                onChange={(e) => { patch('storeName', e.target.value); setStoreEditing(true) }}
                placeholder={language === 'zh' ? '您的品牌名称' : 'Your brand name'}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {language === 'zh' ? '店铺 URL' : 'Store URL'}
              </label>
              <Input
                type="url"
                value={draft.storeUrl ?? ''}
                onChange={(e) => { patch('storeUrl', e.target.value); setStoreEditing(true) }}
                placeholder="https://yourstore.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {language === 'zh' ? '品类' : 'Category'}
              </label>
              <Select
                value={draft.storeCategory ?? ''}
                onValueChange={(v) => { patch('storeCategory', v); setStoreEditing(true) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'zh' ? '选择品类' : 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  {STORE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {language === 'zh' ? 'GMV 范围' : 'GMV Range'}
              </label>
              <Select
                value={draft.storeGmvRange ?? ''}
                onValueChange={(v) => { patch('storeGmvRange', v); setStoreEditing(true) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'zh' ? '选择 GMV 范围' : 'Select GMV range'} />
                </SelectTrigger>
                <SelectContent>
                  {GMV_RANGES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {language === 'zh' ? '团队规模' : 'Team Size'}
              </label>
              <Select
                value={draft.teamSize ?? ''}
                onValueChange={(v) => { patch('teamSize', v); setStoreEditing(true) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'zh' ? '选择团队规模' : 'Select team size'} />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={saveStore}>
              {language === 'zh' ? '保存' : 'Save'}
            </Button>
            {storeEditing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setDraft({ ...settings }); setStoreEditing(false) }}
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </Button>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* ── 2. AI Providers ─────────────────────────────────────────────── */}
      <SettingsSection
        title={language === 'zh' ? 'AI 提供商' : 'AI Providers'}
        defaultOpen
      >
        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            {language === 'zh'
              ? '配置您的 AI 提供商 API 密钥，并设置主要提供商用于智能体任务。'
              : 'Configure your AI provider API keys and set a primary provider for agentic tasks.'}
          </p>

          <div className="flex flex-col gap-3">
            {PROVIDERS.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                apiKey={apiKeys[provider.id]}
                onApiKeyChange={(v) => setApiKeys((prev) => ({ ...prev, [provider.id]: v }))}
                selectedModel={providerModels[provider.id]}
                onModelChange={(v) => setProviderModels((prev) => ({ ...prev, [provider.id]: v }))}
                isPrimary={primaryProvider === provider.id}
                onSetPrimary={() => setPrimaryProvider(provider.id)}
                monthlyBudget={providerBudgets[provider.id]}
                onBudgetChange={(v) => setProviderBudgets((prev) => ({ ...prev, [provider.id]: v }))}
                onSaveAll={saveProviders}
                language={language}
              />
            ))}
          </div>

          <Button size="sm" onClick={saveProviders} className="mt-2">
            {language === 'zh' ? '保存提供商设置' : 'Save Provider Settings'}
          </Button>
        </div>
      </SettingsSection>

      {/* ── 3. Permissions ──────────────────────────────────────────────── */}
      <SettingsSection title={language === 'zh' ? '权限' : 'Permissions'}>
        <div>
          <ToggleRow
            label={language === 'zh' ? '自动同步目录' : 'Auto-sync catalog'}
            description={
              language === 'zh'
                ? 'AI 可自动触发目录同步，无需手动确认'
                : 'AI can auto-trigger catalog syncs without manual confirmation'
            }
            checked={draft.autoSyncCatalog ?? false}
            onCheckedChange={(v) => patch('autoSyncCatalog', v)}
          />
          <ToggleRow
            label={language === 'zh' ? '自动推送至渠道' : 'Auto-push to channels'}
            description={
              language === 'zh'
                ? '允许 AI 在无需批准的情况下将更新推送至分发渠道'
                : 'Allow AI to push updates to distribution channels without approval'
            }
            checked={draft.autoPushChannels ?? false}
            onCheckedChange={(v) => patch('autoPushChannels', v)}
          />
          <ToggleRow
            label={language === 'zh' ? '自动生成产品描述' : 'Auto-generate descriptions'}
            description={
              language === 'zh'
                ? 'AI 可自动为新产品生成和更新描述'
                : 'AI can automatically generate and update descriptions for new products'
            }
            checked={draft.autoGenerateDescriptions ?? false}
            onCheckedChange={(v) => patch('autoGenerateDescriptions', v)}
          />
          <ToggleRow
            label={language === 'zh' ? '自动更新品牌背景' : 'Auto-update brand context'}
            description={
              language === 'zh'
                ? '允许 AI 自主优化和更新您的品牌背景资料'
                : 'Allow AI to autonomously refine and update your brand context'
            }
            checked={draft.autoUpdateBrandContext ?? false}
            onCheckedChange={(v) => patch('autoUpdateBrandContext', v)}
          />
          <div className="px-6 py-4">
            <Button size="sm" onClick={savePermissions}>
              {language === 'zh' ? '保存权限' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ── 4. Notifications ────────────────────────────────────────────── */}
      <SettingsSection title={language === 'zh' ? '通知' : 'Notifications'}>
        <div>
          <ToggleRow
            label={language === 'zh' ? '桌面通知' : 'Desktop notifications'}
            description={
              language === 'zh'
                ? '当 AI 任务完成或需要关注时显示系统通知'
                : 'Show system notifications when AI tasks complete or need attention'
            }
            checked={draft.notifyDesktop ?? true}
            onCheckedChange={(v) => patch('notifyDesktop', v)}
          />
          <ToggleRow
            label={language === 'zh' ? '低库存预警' : 'Low stock alerts'}
            description={
              language === 'zh'
                ? '当产品库存低于阈值时收到提醒'
                : 'Get notified when product stock falls below threshold'
            }
            checked={false}
            onCheckedChange={() => {}}
          />
          <ToggleRow
            label={language === 'zh' ? '渠道同步完成' : 'Channel sync complete'}
            description={
              language === 'zh'
                ? '渠道同步操作完成后收到通知'
                : 'Receive a notification when a channel sync operation finishes'
            }
            checked={draft.notifyChannelSync ?? true}
            onCheckedChange={(v) => patch('notifyChannelSync', v)}
          />

          {/* Cost threshold */}
          <div className="flex items-center justify-between gap-4 py-3.5 px-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {language === 'zh' ? '费用阈值提醒' : 'Cost threshold alert'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'zh'
                  ? '当 AI 费用超过指定金额时提醒（USD）'
                  : 'Alert when AI spend exceeds the specified amount (USD)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(draft.notifyCostThreshold ?? 0) > 0}
                onCheckedChange={(v) => patch('notifyCostThreshold', v ? 10 : 0)}
              />
              {(draft.notifyCostThreshold ?? 0) > 0 && (
                <div className="relative w-20">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="1"
                    value={draft.notifyCostThreshold ?? 10}
                    onChange={(e) => patch('notifyCostThreshold', Number(e.target.value))}
                    className="pl-6 text-xs h-8"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4">
            <Button size="sm" onClick={saveNotifications}>
              {language === 'zh' ? '保存通知设置' : 'Save Notifications'}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ── 5. Appearance ───────────────────────────────────────────────── */}
      <SettingsSection title={language === 'zh' ? '外观' : 'Appearance'}>
        <div className="p-6 space-y-6">
          {/* Theme */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              {language === 'zh' ? '主题' : 'Theme'}
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => patch('theme', t)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all hover:bg-secondary/30',
                    draft.theme === t
                      ? 'border-foreground/40 bg-secondary/30'
                      : 'border-border bg-background'
                  )}
                >
                  <div
                    className={cn(
                      'size-10 rounded-xl border border-border flex items-center justify-center text-xs font-medium',
                      t === 'dark' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'
                    )}
                  >
                    Aa
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {t === 'light'
                      ? language === 'zh' ? '浅色' : 'Light'
                      : language === 'zh' ? '深色' : 'Dark'}
                  </span>
                  {draft.theme === t && (
                    <span className="text-emerald-500 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              {language === 'zh' ? '语言' : 'Language'}
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {([
                { value: 'en', label: 'English', sublabel: 'English' },
                { value: 'zh', label: '中文', sublabel: 'Chinese' },
              ] as const).map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.value)
                    patch('language', lang.value)
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl border p-4 transition-all hover:bg-secondary/30',
                    language === lang.value
                      ? 'border-foreground/40 bg-secondary/30'
                      : 'border-border bg-background'
                  )}
                >
                  <span className="text-2xl">{lang.value === 'en' ? '🇺🇸' : '🇨🇳'}</span>
                  <span className="text-sm font-semibold text-foreground">{lang.label}</span>
                  <span className="text-xs text-muted-foreground">{lang.sublabel}</span>
                  {language === lang.value && (
                    <span className="text-emerald-500 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button size="sm" onClick={saveAppearance}>
            {language === 'zh' ? '保存外观设置' : 'Save Appearance'}
          </Button>
        </div>
      </SettingsSection>

      {/* ── 5b. Privacy & Diagnostics ────────────────────────────────── */}
      <SettingsSection title={language === 'zh' ? '隐私与诊断' : 'Privacy & Diagnostics'}>
        <div className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {language === 'zh' ? '本地遥测' : 'Local telemetry'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'zh'
                  ? '记录会话摘要到 ~/.nohi/telemetry/ — 仅本地，不上传，可随时查看或删除。用于自我诊断与 bug 报告。'
                  : 'Record per-session summaries to ~/.nohi/telemetry/. Local only — never uploaded. Useful for self-diagnostics and bug reports.'}
              </p>
            </div>
            <Switch
              checked={draft.telemetryEnabled ?? false}
              onCheckedChange={(v) => { patch('telemetryEnabled', v); onSave({ ...draft, telemetryEnabled: v }) }}
            />
          </div>
        </div>
      </SettingsSection>

      {/* ── 6. Web Search ────────────────────────────────────────────── */}
      <SettingsSection title={language === 'zh' ? '网页搜索' : 'Web Search'}>
        <div className="p-6 space-y-3">
          <p className="text-xs text-muted-foreground">
            {language === 'zh'
              ? '配置 Brave Search API 密钥以获得更好的搜索结果。无密钥时将使用 DuckDuckGo 作为备选。'
              : 'Configure a Brave Search API key for better search results. Falls back to DuckDuckGo without a key.'}
          </p>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Brave Search API Key
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={draft.braveSearchApiKey ?? ''}
                onChange={(e) => patch('braveSearchApiKey', e.target.value || undefined)}
                placeholder="BSA-..."
                className="flex-1 text-xs font-mono"
              />
              <Button size="sm" onClick={() => { onSave(draft); toast.success(language === 'zh' ? '已保存' : 'Saved') }}>
                {language === 'zh' ? '保存' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ── 6b. Firecrawl ───────────────────────────────────────────────── */}
      <SettingsSection title="Firecrawl">
        <div className="p-6 space-y-3">
          <p className="text-xs text-muted-foreground">
            {language === 'zh'
              ? 'Firecrawl 是高级网页抓取与爬虫服务，支持 JavaScript 渲染、内容提取和全站爬取。获取 API 密钥：firecrawl.dev'
              : 'Firecrawl provides advanced web scraping with JavaScript rendering, clean content extraction, and full-site crawling. Get an API key at firecrawl.dev'}
          </p>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Firecrawl API Key
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={draft.firecrawlApiKey ?? ''}
                onChange={(e) => patch('firecrawlApiKey', e.target.value || undefined)}
                placeholder="fc-..."
                className="flex-1 text-xs font-mono"
              />
              <Button size="sm" onClick={() => { onSave(draft); toast.success(language === 'zh' ? '已保存' : 'Saved') }}>
                {language === 'zh' ? '保存' : 'Save'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {language === 'zh' ? '自托管实例 URL（可选）' : 'Self-hosted Instance URL (optional)'}
            </label>
            <Input
              type="text"
              value={draft.firecrawlApiUrl ?? ''}
              onChange={(e) => patch('firecrawlApiUrl', e.target.value || undefined)}
              placeholder="https://api.firecrawl.dev"
              className="text-xs font-mono"
            />
          </div>
        </div>
      </SettingsSection>

      {/* ── 6c. Agentic Catalog ─────────────────────────────────────────── */}
      <SettingsSection title={language === 'zh' ? 'Agentic Catalog' : 'Agentic Catalog'}>
        <div className="p-6 space-y-3">
          <p className="text-xs text-muted-foreground">
            {language === 'zh'
              ? 'Agentic Catalog 是 Nohi 协议下的商品上下文基础设施。连接到你的目录 API 端点。'
              : 'The Agentic Catalog is Nohi\'s product context infrastructure. Configure the API endpoint your merchant catalog lives on.'}
          </p>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {language === 'zh' ? 'API 端点 URL' : 'API Base URL'}
            </label>
            <Input
              type="text"
              value={draft.catalogApiUrl ?? ''}
              onChange={(e) => patch('catalogApiUrl', e.target.value || undefined)}
              placeholder="https://api.nohi.art or your self-hosted endpoint"
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {language === 'zh' ? 'API Token' : 'API Token'}
            </label>
            <Input
              type="password"
              value={draft.catalogApiToken ?? ''}
              onChange={(e) => patch('catalogApiToken', e.target.value || undefined)}
              placeholder="nohi_sk_..."
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {language === 'zh' ? 'Merchant ID' : 'Merchant ID'}
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={draft.merchantId ?? ''}
                onChange={(e) => patch('merchantId', e.target.value || undefined)}
                placeholder="uuid"
                className="flex-1 text-xs font-mono"
              />
              <Button size="sm" onClick={() => { onSave(draft); toast.success(language === 'zh' ? '已保存' : 'Saved') }}>
                {language === 'zh' ? '保存' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ── 7. Payment Methods ──────────────────────────────────────────── */}
      <SettingsSection title={language === 'zh' ? '支付方式' : 'Payment Methods'}>
        <div className="p-6 space-y-4">
          {/* Saved cards */}
          <div className="space-y-2">
            {MOCK_CARDS.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 rounded-xl p-3 bg-muted/40"
              >
                <div className="size-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-xs text-muted-foreground font-medium">
                  ••
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {card.brand} •••• {card.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' ? '到期' : 'Expires'} {card.expiry}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {language === 'zh' ? '已保存' : 'Saved'}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {language === 'zh'
              ? '如需添加支付方式，请前往账户门户完成操作。'
              : 'To add a payment method, please complete the action in the account portal.'}
          </p>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              toast.info(
                language === 'zh'
                  ? '支付门户即将推出'
                  : 'Payment portal coming soon'
              )
            }
          >
            {language === 'zh' ? '+ 添加支付方式' : '+ Add Payment Method'}
          </Button>
        </div>
      </SettingsSection>
    </div>
  )
}
