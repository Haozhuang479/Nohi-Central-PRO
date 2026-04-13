import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Re-use the canonical NohiSettings type from the engine
import type { NohiSettings } from '../../../electron/main/engine/types'
export type { NohiSettings }

interface OnboardingPageProps {
  onComplete: (settings: NohiSettings) => Promise<void>
}

type ApiKeyStatus = "idle" | "testing" | "ok" | "error"

interface ApiKeyState {
  value: string
  status: ApiKeyStatus
}

interface StoreInfo {
  brandName: string
  storeUrl: string
  category: string
  gmvRange: string
}

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

interface Provider {
  id: keyof Pick<
    NohiSettings,
    | "anthropicApiKey"
    | "openaiApiKey"
    | "kimiApiKey"
    | "minimaxApiKey"
    | "deepseekApiKey"
  >
  name: string
  description: string
  recommended?: boolean
  placeholder: string
  defaultModel: string
  logo: string
}

const PROVIDERS: Provider[] = [
  {
    id: "anthropicApiKey",
    name: "Anthropic",
    description: "Claude models — highest quality reasoning & writing.",
    recommended: true,
    placeholder: "sk-ant-api03-…",
    defaultModel: "claude-opus-4-5",
    logo: "🧠",
  },
  {
    id: "openaiApiKey",
    name: "OpenAI",
    description: "GPT-4o, GPT-4.1, and o-series models.",
    placeholder: "sk-proj-…",
    defaultModel: "gpt-4.1",
    logo: "✦",
  },
  {
    id: "kimiApiKey",
    name: "Kimi",
    description: "Moonshot AI — long-context Chinese & English.",
    placeholder: "moonshot-…",
    defaultModel: "moonshot-v1-128k",
    logo: "🌙",
  },
  {
    id: "minimaxApiKey",
    name: "Minimax",
    description: "Fast multimodal models by MiniMax.",
    placeholder: "eyJhbGci…",
    defaultModel: "abab6.5s-chat",
    logo: "⚡",
  },
  {
    id: "deepseekApiKey",
    name: "Deepseek",
    description: "High-capability open-weight models.",
    placeholder: "sk-…",
    defaultModel: "deepseek-chat",
    logo: "🔍",
  },
]

// ---------------------------------------------------------------------------
// Onboarding Page
// ---------------------------------------------------------------------------

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 5

  // Step 2 — language
  const [language, setLanguage] = useState<"en" | "zh">("en")

  // Step 3 — store info
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    brandName: "",
    storeUrl: "",
    category: "",
    gmvRange: "",
  })

  // Step 4 — API keys
  const initialKeyState: ApiKeyState = { value: "", status: "idle" }
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyState>>(() =>
    Object.fromEntries(PROVIDERS.map((p) => [p.id, { ...initialKeyState }])),
  )
  const [primaryProvider, setPrimaryProvider] = useState<string>("anthropicApiKey")

  // Step 5 — catalog
  const [catalogChoice, setCatalogChoice] = useState<
    "shopify" | "csv" | "skip" | null
  >(null)

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const handleLanguageSelect = (lang: "en" | "zh") => {
    setLanguage(lang)
    next()
  }

  const handleTestKey = async (providerId: string) => {
    const key = apiKeys[providerId]?.value ?? ""
    if (!key.trim()) return
    setApiKeys((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], status: "testing" },
    }))
    // Map provider key field to provider ID for the test API
    const providerIdMap: Record<string, string> = {
      anthropicApiKey: 'anthropic',
      openaiApiKey: 'openai',
      kimiApiKey: 'kimi',
      minimaxApiKey: 'minimax',
      deepseekApiKey: 'deepseek',
    }
    const provId = providerIdMap[providerId] ?? providerId
    try {
      const result = await window.nohi.testApiKey(provId, key.trim())
      setApiKeys((prev) => ({
        ...prev,
        [providerId]: { ...prev[providerId], status: result.success ? "ok" : "error" },
      }))
    } catch {
      setApiKeys((prev) => ({
        ...prev,
        [providerId]: { ...prev[providerId], status: "error" },
      }))
    }
  }

  const hasAtLeastOneKey = PROVIDERS.some(
    (p) => (apiKeys[p.id]?.value ?? "").length > 0,
  )

  const resolvedPrimary =
    PROVIDERS.find((p) => (apiKeys[p.id]?.value ?? "").length > 0 && p.id === primaryProvider)
      ?.id ?? PROVIDERS.find((p) => (apiKeys[p.id]?.value ?? "").length > 0)?.id

  const handleFinish = async () => {
    const provider = PROVIDERS.find((p) => p.id === resolvedPrimary)
    // Map onboarding provider key field to provider ID for primaryProvider
    const providerIdMap: Record<string, 'anthropic' | 'openai' | 'kimi' | 'minimax' | 'deepseek'> = {
      anthropicApiKey: 'anthropic',
      openaiApiKey: 'openai',
      kimiApiKey: 'kimi',
      minimaxApiKey: 'minimax',
      deepseekApiKey: 'deepseek',
    }
    const resolvedProviderId = provider ? providerIdMap[provider.id] ?? 'anthropic' : 'anthropic'
    const settings: Partial<NohiSettings> = {
      anthropicApiKey: apiKeys["anthropicApiKey"]?.value || undefined,
      openaiApiKey: apiKeys["openaiApiKey"]?.value || undefined,
      kimiApiKey: apiKeys["kimiApiKey"]?.value || undefined,
      minimaxApiKey: apiKeys["minimaxApiKey"]?.value || undefined,
      deepseekApiKey: apiKeys["deepseekApiKey"]?.value || undefined,
      primaryProvider: resolvedProviderId,
      defaultModel: provider?.defaultModel ?? "claude-sonnet-4-6",
      theme: "light",
      language,
      storeName: storeInfo.brandName || undefined,
      storeUrl: storeInfo.storeUrl || undefined,
      storeCategory: storeInfo.category || undefined,
    }
    await onComplete(settings as NohiSettings)
    navigate("/chat", { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
      {/* Glassmorphism pill nav */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]">
        <nav className="flex items-center gap-1 px-2 py-2 rounded-full backdrop-blur-xl border bg-white/70 border-white/40 shadow-lg shadow-black/5">
          <span className="px-3 py-1.5 text-sm font-bold text-[#1a1a1a]">
            Nohi
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600 pr-2">
            PRO
          </span>
          <div className="w-px h-4 bg-black/10 mx-1" />
          <div className="flex items-center gap-0.5 px-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i + 1 === step
                    ? "w-5 h-2 bg-amber-500"
                    : i + 1 < step
                      ? "w-2 h-2 bg-amber-400/70"
                      : "w-2 h-2 bg-black/10",
                )}
              />
            ))}
          </div>
          <span className="text-[11px] text-black/40 px-2 tabular-nums">
            {step}/{TOTAL_STEPS}
          </span>
        </nav>
      </header>

      {/* Step content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-28 pb-16">
        {step === 1 && (
          <StepWelcome onNext={next} />
        )}
        {step === 2 && (
          <StepLanguage onSelect={handleLanguageSelect} selected={language} />
        )}
        {step === 3 && (
          <StepStoreInfo
            info={storeInfo}
            onChange={setStoreInfo}
            onNext={next}
            onBack={back}
            language={language}
          />
        )}
        {step === 4 && (
          <StepApiKeys
            apiKeys={apiKeys}
            primaryProvider={primaryProvider}
            onKeyChange={(id, value) =>
              setApiKeys((prev) => ({
                ...prev,
                [id]: { ...prev[id], value, status: "idle" },
              }))
            }
            onTest={handleTestKey}
            onPrimaryChange={setPrimaryProvider}
            onNext={next}
            onBack={back}
            hasAtLeastOneKey={hasAtLeastOneKey}
            language={language}
          />
        )}
        {step === 5 && (
          <StepCatalog
            choice={catalogChoice}
            onChoiceChange={setCatalogChoice}
            onFinish={handleFinish}
            onBack={back}
            language={language}
          />
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-10 max-w-xl w-full">
      {/* Wordmark */}
      <div className="flex flex-col items-center gap-3">
        <div className="size-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-md shadow-amber-200/50">
          <span className="text-3xl">N</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#1a1a1a]">
            Nohi Central{" "}
            <span className="text-amber-600 font-extrabold">PRO</span>
          </h1>
          <p className="mt-2 text-base text-[#6b6b6b] leading-relaxed">
            Your AI-powered commerce operations hub
          </p>
        </div>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          "AI Catalog Enrichment",
          "Multi-channel Distribution",
          "Live Analytics",
          "Brand Context AI",
          "Cost Intelligence",
        ].map((f) => (
          <span
            key={f}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-black/8 text-[#555] shadow-sm"
          >
            {f}
          </span>
        ))}
      </div>

      {/* CTA */}
      <Button
        size="lg"
        onClick={onNext}
        className="rounded-full px-10 h-12 text-base font-semibold bg-[#1a1a1a] hover:bg-[#333] text-white shadow-lg shadow-black/20 gap-2"
      >
        Get Started
        <span className="text-sm">›</span>
      </Button>

      <p className="text-xs text-[#aaa]">
        Takes about 2 minutes · No credit card required
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Language
// ---------------------------------------------------------------------------

function StepLanguage({
  onSelect,
  selected,
}: {
  onSelect: (lang: "en" | "zh") => void
  selected: "en" | "zh"
}) {
  return (
    <div className="flex flex-col items-center gap-8 max-w-lg w-full">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">
          Choose your language
        </h2>
        <p className="text-[#888] mt-2 text-lg">选择语言</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <LanguageCard
          emoji="🇺🇸"
          label="English"
          sublabel="English"
          selected={selected === "en"}
          onClick={() => onSelect("en")}
        />
        <LanguageCard
          emoji="🇨🇳"
          label="中文"
          sublabel="Chinese"
          selected={selected === "zh"}
          onClick={() => onSelect("zh")}
        />
      </div>

      <p className="text-xs text-[#bbb] text-center">
        You can change this later in Settings
      </p>
    </div>
  )
}

function LanguageCard({
  emoji,
  label,
  sublabel,
  selected,
  onClick,
}: {
  emoji: string
  label: string
  sublabel: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 p-8 rounded-3xl border-2 transition-all cursor-pointer",
        "bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5",
        selected
          ? "border-amber-500 shadow-amber-100 ring-2 ring-amber-200"
          : "border-transparent hover:border-black/10",
      )}
    >
      <span className="text-4xl">{emoji}</span>
      <span className="text-xl font-bold text-[#1a1a1a]">{label}</span>
      <span className="text-sm text-[#888]">{sublabel}</span>
      {selected && (
        <span className="text-amber-500 text-sm mt-1">✓</span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Store Info
// ---------------------------------------------------------------------------

function StepStoreInfo({
  info,
  onChange,
  onNext,
  onBack,
  language,
}: {
  info: StoreInfo
  onChange: (info: StoreInfo) => void
  onNext: () => void
  onBack: () => void
  language: "en" | "zh"
}) {
  const t = (en: string, zh: string) => (language === "zh" ? zh : en)

  const categories = [
    { value: "fashion", label: t("Fashion & Apparel", "时尚服饰") },
    { value: "electronics", label: t("Electronics", "电子产品") },
    { value: "beauty", label: t("Beauty & Personal Care", "美妆个护") },
    { value: "home", label: t("Home & Garden", "家居园艺") },
    { value: "sports", label: t("Sports & Outdoors", "运动户外") },
    { value: "food", label: t("Food & Beverage", "食品饮料") },
    { value: "toys", label: t("Toys & Games", "玩具游戏") },
    { value: "other", label: t("Other", "其他") },
  ]

  const gmvRanges = [
    { value: "0-10k", label: t("< $10K / year", "< $10K / 年") },
    { value: "10k-100k", label: t("$10K – $100K / year", "$10K – $100K / 年") },
    {
      value: "100k-1m",
      label: t("$100K – $1M / year", "$100K – $100万 / 年"),
    },
    { value: "1m+", label: t("> $1M / year", "> $100万 / 年") },
  ]

  return (
    <div className="flex flex-col gap-8 max-w-lg w-full">
      <div>
        <h2 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">
          {t("Tell us about your store", "介绍一下您的店铺")}
        </h2>
        <p className="text-[#888] mt-1.5">
          {t(
            "We'll personalise your experience around your brand.",
            "我们将根据您的品牌为您定制体验。",
          )}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-black/6 shadow-sm p-7 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-[#444]">
            {t("Brand Name", "品牌名称")}
          </Label>
          <Input
            placeholder={t("e.g. Naturelle", "例如：自然美")}
            value={info.brandName}
            onChange={(e) => onChange({ ...info, brandName: e.target.value })}
            className="rounded-xl h-11 border-black/10 focus:border-amber-400 focus:ring-amber-200 bg-[#fafafa]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-[#444]">
            {t("Store URL", "店铺网址")}
          </Label>
          <Input
            placeholder="https://mystore.com"
            value={info.storeUrl}
            onChange={(e) => onChange({ ...info, storeUrl: e.target.value })}
            className="rounded-xl h-11 border-black/10 focus:border-amber-400 focus:ring-amber-200 bg-[#fafafa]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-[#444]">
            {t("Category", "品类")}
          </Label>
          <Select
            value={info.category}
            onValueChange={(v) => onChange({ ...info, category: v })}
          >
            <SelectTrigger className="rounded-xl h-11 border-black/10 bg-[#fafafa]">
              <SelectValue
                placeholder={t("Select a category", "选择品类")}
              />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-[#444]">
            {t("Annual GMV Range", "年GMV范围")}
          </Label>
          <Select
            value={info.gmvRange}
            onValueChange={(v) => onChange({ ...info, gmvRange: v })}
          >
            <SelectTrigger className="rounded-xl h-11 border-black/10 bg-[#fafafa]">
              <SelectValue placeholder={t("Select a range", "选择范围")} />
            </SelectTrigger>
            <SelectContent>
              {gmvRanges.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} skipLabel={language === "zh" ? "跳过" : "Skip"} onSkip={onNext} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — API Keys
// ---------------------------------------------------------------------------

function StepApiKeys({
  apiKeys,
  primaryProvider,
  onKeyChange,
  onTest,
  onPrimaryChange,
  onNext,
  onBack,
  hasAtLeastOneKey,
  language,
}: {
  apiKeys: Record<string, ApiKeyState>
  primaryProvider: string
  onKeyChange: (id: string, value: string) => void
  onTest: (id: string) => void
  onPrimaryChange: (id: string) => void
  onNext: () => void
  onBack: () => void
  hasAtLeastOneKey: boolean
  language: "en" | "zh"
}) {
  const t = (en: string, zh: string) => (language === "zh" ? zh : en)

  return (
    <div className="flex flex-col gap-8 max-w-xl w-full">
      <div>
        <h2 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">
          {t("Connect AI Providers", "连接 AI 服务商")}
        </h2>
        <p className="text-[#888] mt-1.5">
          {t(
            "Add at least one API key to power AI features. Anthropic is recommended.",
            "请至少添加一个 API 密钥以启用 AI 功能。推荐使用 Anthropic。",
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PROVIDERS.map((provider) => {
          const keyState = apiKeys[provider.id] ?? {
            value: "",
            status: "idle",
          }
          const hasValue = keyState.value.length > 0
          const isPrimary = primaryProvider === provider.id && hasValue

          return (
            <ProviderCard
              key={provider.id}
              provider={provider}
              keyState={keyState}
              isPrimary={isPrimary}
              onKeyChange={(v) => onKeyChange(provider.id, v)}
              onTest={() => onTest(provider.id)}
              onSetPrimary={() => onPrimaryChange(provider.id)}
              t={t}
            />
          )
        })}
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextDisabled={false}
        nextLabel={t("Continue", "继续")}
        skipLabel={t("Skip", "跳过")}
        onSkip={onNext}
      />
    </div>
  )
}

function ProviderCard({
  provider,
  keyState,
  isPrimary,
  onKeyChange,
  onTest,
  onSetPrimary,
  t,
}: {
  provider: Provider
  keyState: ApiKeyState
  isPrimary: boolean
  onKeyChange: (v: string) => void
  onTest: () => void
  onSetPrimary: () => void
  t: (en: string, zh: string) => string
}) {
  const hasValue = keyState.value.length > 0

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border transition-all",
        provider.recommended
          ? "border-amber-300 shadow-amber-50 shadow-md ring-1 ring-amber-200/50"
          : "border-black/6 shadow-sm",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <span className="text-2xl">{provider.logo}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1a1a1a]">
              {provider.name}
            </span>
            {provider.recommended && (
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200 font-semibold">
                {t("Recommended", "推荐")}
              </Badge>
            )}
            {isPrimary && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 font-semibold"
              >
                {t("Primary", "主要")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#888] mt-0.5 truncate">
            {provider.description}
          </p>
        </div>
        {/* Status icon */}
        {keyState.status === "ok" && (
          <span className="text-emerald-500 shrink-0 text-xs">✓</span>
        )}
        {keyState.status === "error" && (
          <span className="text-destructive shrink-0 text-xs">✗</span>
        )}
        {keyState.status === "testing" && (
          <span className="text-amber-500 shrink-0 text-xs">···</span>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 px-5 pb-4">
        <Input
          type="password"
          placeholder={provider.placeholder}
          value={keyState.value}
          onChange={(e) => onKeyChange(e.target.value)}
          className="flex-1 rounded-xl h-10 text-sm border-black/10 focus:border-amber-400 focus:ring-amber-200 bg-[#fafafa] font-mono"
        />
        <button
          type="button"
          onClick={onTest}
          disabled={!hasValue || keyState.status === "testing"}
          className={cn(
            "shrink-0 text-xs font-medium px-3 h-10 rounded-xl border transition-colors",
            hasValue && keyState.status !== "testing"
              ? "border-black/15 text-[#444] hover:bg-[#f5f5f5] cursor-pointer"
              : "border-black/6 text-black/25 cursor-not-allowed",
          )}
        >
          {keyState.status === "testing" ? (
            <span className="text-xs">···</span>
          ) : (
            t("Test", "测试")
          )}
        </button>
        {hasValue && keyState.status !== "testing" && (
          <button
            type="button"
            onClick={onSetPrimary}
            className={cn(
              "shrink-0 text-xs font-medium px-3 h-10 rounded-xl border transition-colors cursor-pointer",
              isPrimary
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-black/10 text-[#666] hover:bg-[#f5f5f5]",
            )}
          >
            {isPrimary ? t("Primary ✓", "主要 ✓") : t("Set primary", "设为主要")}
          </button>
        )}
      </div>

      {keyState.status === "error" && (
        <p className="text-xs text-destructive px-5 pb-3 -mt-1">
          {t(
            "Invalid key — please double-check and try again.",
            "密钥无效，请检查后重试。",
          )}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — Connect Catalog
// ---------------------------------------------------------------------------

function StepCatalog({
  choice,
  onChoiceChange,
  onFinish,
  onBack,
  language,
}: {
  choice: "shopify" | "csv" | "skip" | null
  onChoiceChange: (c: "shopify" | "csv" | "skip") => void
  onFinish: () => void
  onBack: () => void
  language: "en" | "zh"
}) {
  const t = (en: string, zh: string) => (language === "zh" ? zh : en)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [shopifyValidating, setShopifyValidating] = useState(false)
  const [shopifyConnected, setShopifyConnected] = useState(false)

  const handleCsvClick = () => {
    if (
      typeof window !== "undefined" &&
      (window as Window & { nohi?: { dialog?: { openFile?: () => void } } }).nohi?.dialog?.openFile
    ) {
      ;(
        window as Window & { nohi?: { dialog?: { openFile?: () => void } } }
      ).nohi!.dialog!.openFile!()
    } else {
      fileInputRef.current?.click()
    }
    onChoiceChange("csv")
  }

  const handleShopifyInstall = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Open Shopify App Store listing for Nohi
    if (typeof window !== "undefined" && (window as Window & { nohi?: { openExternal?: (url: string) => void } }).nohi?.openExternal) {
      ;(window as Window & { nohi?: { openExternal?: (url: string) => void } }).nohi!.openExternal!("https://apps.shopify.com/nohi")
    } else {
      window.open("https://apps.shopify.com/nohi", "_blank")
    }
    onChoiceChange("shopify")
  }

  const handleShopifyValidate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShopifyValidating(true)
    // Simulate validation — in production this checks the OAuth callback
    await new Promise((r) => setTimeout(r, 1500))
    setShopifyConnected(true)
    setShopifyValidating(false)
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg w-full">
      <div>
        <h2 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">
          {t("Connect your catalog", "连接您的商品目录")}
        </h2>
        <p className="text-[#888] mt-1.5">
          {t(
            "Import your products to get started. You can always add more later.",
            "导入您的商品开始使用，稍后可随时添加更多。",
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Shopify */}
        <CatalogOption
          selected={choice === "shopify"}
          onClick={() => onChoiceChange("shopify")}
          icon="🛍️"
          title="Shopify"
          description={t(
            "Install the Nohi app from the Shopify App Store, then verify.",
            "从 Shopify 应用商店安装 Nohi 应用，然后验证连接。",
          )}
          action={
            choice === "shopify" ? (
              <div className="flex gap-2 flex-wrap">
                {shopifyConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="text-xs">✓</span>
                    {t("Connected", "已连接")}
                  </span>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs gap-1.5"
                      onClick={handleShopifyInstall}
                    >
                      {t("Install Shopify App", "安装 Shopify 应用")}
                      <span className="text-xs">›</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs gap-1.5"
                      onClick={handleShopifyValidate}
                      disabled={shopifyValidating}
                    >
                      {shopifyValidating ? (
                        <span className="text-xs">···</span>
                      ) : (
                        <span className="text-xs">✓</span>
                      )}
                      {shopifyValidating
                        ? t("Verifying…", "验证中…")
                        : t("Verify Connection", "验证连接")}
                    </Button>
                  </>
                )}
              </div>
            ) : null
          }
        />

        {/* CSV */}
        <CatalogOption
          selected={choice === "csv"}
          onClick={handleCsvClick}
          icon="📄"
          title={t("CSV Upload", "上传 CSV")}
          description={t(
            "Upload a product export from any platform.",
            "从任何平台上传商品导出文件。",
          )}
          action={
            choice === "csv" ? (
              <label className="shrink-0 cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-black/15 hover:bg-[#f5f5f5] transition-colors">
                  <span className="text-xs">↑</span>
                  {t("Choose file", "选择文件")}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onClick={(e) => e.stopPropagation()}
                />
              </label>
            ) : null
          }
        />

        {/* Skip */}
        <CatalogOption
          selected={choice === "skip"}
          onClick={() => onChoiceChange("skip")}
          icon="⏭️"
          title={t("Skip for now", "暂时跳过")}
          description={t(
            "You can import products later from the Catalog page.",
            "您可以稍后在目录页面导入商品。",
          )}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="rounded-full gap-1.5 text-[#888]"
        >
          <span className="text-sm">‹</span>
          {t("Back", "返回")}
        </Button>
        <Button
          onClick={onFinish}
          className="flex-1 rounded-full h-11 bg-[#1a1a1a] hover:bg-[#333] text-white font-semibold shadow-md shadow-black/10"
        >
          {t("Finish setup", "完成设置")}
          <span className="text-sm ml-1.5">›</span>
        </Button>
      </div>
    </div>
  )
}

function CatalogOption({
  selected,
  onClick,
  icon,
  title,
  description,
  action,
}: {
  selected: boolean
  onClick: () => void
  icon: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick()
      }}
      className={cn(
        "flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all bg-white",
        selected
          ? "border-amber-400 shadow-amber-50 shadow-md ring-1 ring-amber-200/50"
          : "border-transparent border-black/6 shadow-sm hover:border-black/10 hover:shadow-md",
      )}
    >
      <span className="text-2xl mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#1a1a1a]">{title}</span>
          {selected && (
            <span className="text-amber-500 shrink-0 text-xs">✓</span>
          )}
        </div>
        <p className="text-xs text-[#888] mt-0.5 leading-relaxed">
          {description}
        </p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared nav buttons
// ---------------------------------------------------------------------------

function StepNav({
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel,
  skipLabel,
  onSkip,
}: {
  onBack: () => void
  onNext: () => void
  nextDisabled?: boolean
  nextLabel?: string
  skipLabel?: string
  onSkip?: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        onClick={onBack}
        className="rounded-full gap-1.5 text-[#888]"
      >
        <span className="text-sm">‹</span>
        Back
      </Button>
      {skipLabel && onSkip && (
        <Button
          variant="ghost"
          onClick={onSkip}
          className="rounded-full text-[#aaa] text-sm hover:text-[#666]"
        >
          {skipLabel}
        </Button>
      )}
      <Button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 rounded-full h-11 bg-[#1a1a1a] hover:bg-[#333] text-white font-semibold shadow-md shadow-black/10 disabled:opacity-40 disabled:cursor-not-allowed gap-1.5"
      >
        {nextLabel ?? "Continue"}
        <span className="text-sm">›</span>
      </Button>
    </div>
  )
}
