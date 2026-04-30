
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Pencil, Check, X, Globe, ChevronDown } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useChannelState } from "@/lib/channel-state"
import { cn } from "@/lib/utils"

// ─── Editable Row ──────────────────────────────────────────────────────────────

interface EditableRowProps {
  label: string
  value: string
  onSave: (v: string) => void
  options?: string[]
}

function EditableRow({ label, value, onSave, options }: EditableRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const handleSave = () => { onSave(draft); setEditing(false) }
  const handleCancel = () => { setDraft(value); setEditing(false) }

  return (
    <div className="flex items-center min-h-[72px] border-b border-border last:border-b-0">
      <div className="w-64 shrink-0 px-6 py-4">
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <div className="w-px self-stretch bg-border shrink-0" />
      <div className="flex-1 px-6 py-4 flex items-center justify-between gap-4">
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            {options ? (
              <div className="relative flex-1 max-w-xs">
                <select
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full appearance-none bg-background border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none text-muted-foreground" />
              </div>
            ) : (
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="max-w-xs rounded-lg h-8 text-sm" autoFocus />
            )}
            <button onClick={handleSave} className="size-7 flex items-center justify-center rounded-lg bg-foreground text-background hover:opacity-80 transition-opacity">
              <Check className="size-3.5" />
            </button>
            <button onClick={handleCancel} className="size-7 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">{value}</span>
            <button onClick={() => { setDraft(value); setEditing(true) }} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
              <Pencil className="size-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Channel data ──────────────────────────────────────────────────────────────

const organicChannels = [
  { id: "conversational-storefront", name: "Conversational Storefront", nameZh: "对话式店面" },
  { id: "google-ai", name: "Google AI Mode", nameZh: "Google AI 模式" },
  { id: "chatgpt-acp", name: "ChatGPT ACP", nameZh: "ChatGPT ACP" },
  { id: "google-ucp", name: "Google UCP", nameZh: "Google UCP" },
  { id: "perplexity", name: "Perplexity", nameZh: "Perplexity" },
  { id: "copilot", name: "Microsoft Copilot", nameZh: "Microsoft Copilot" },
]

const paidChannels = [
  { id: "chatgpt-app", name: "ChatGPT App", nameZh: "ChatGPT App" },
  { id: "reddit", name: "Reddit", nameZh: "Reddit" },
  { id: "gemini", name: "Gemini", nameZh: "Gemini" },
  { id: "chatgpt", name: "ChatGPT", nameZh: "ChatGPT" },
  { id: "instagram", name: "Instagram", nameZh: "Instagram" },
  { id: "pinterest", name: "Pinterest", nameZh: "Pinterest" },
  { id: "snapchat", name: "Snapchat", nameZh: "Snapchat" },
  { id: "tiktok", name: "TikTok", nameZh: "TikTok" },
  { id: "third-party", name: "Third Party Agents", nameZh: "第三方智能体" },
  { id: "creator-agents", name: "Creator Agents", nameZh: "创作者智能体" },
  { id: "genspark", name: "Genspark", nameZh: "Genspark" },
  { id: "kimi", name: "Kimi", nameZh: "Kimi" },
  { id: "openclaw", name: "Openclaw", nameZh: "Openclaw" },
]

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active" || status === "always-on" ? "bg-green-500" :
    status === "inactive" ? "bg-yellow-400" : "bg-muted-foreground/30"
  return <span className={cn("size-2 rounded-full shrink-0", color)} />
}

function ChannelRow({ id, name, nameZh }: { id: string; name: string; nameZh: string }) {
  const { getChannelStatus, setChannelStatus } = useChannelState()
  const { language } = useLanguage()
  const status = getChannelStatus(id)
  const isOn = status === "active" || status === "always-on"

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
      <StatusDot status={status} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground">
          {language === "zh" ? nameZh : name}
        </span>
        <p className="text-xs text-muted-foreground">
          {status === "active" || status === "always-on"
            ? (language === "zh" ? "已启用" : "Active")
            : status === "inactive"
            ? (language === "zh" ? "已停用" : "Inactive")
            : (language === "zh" ? "未连接" : "Disconnected")}
        </p>
      </div>
      <Switch
        checked={isOn}
        onCheckedChange={(checked) => setChannelStatus(id, checked ? "active" : "inactive")}
        className="shrink-0"
        aria-label={`Toggle ${name}`}
      />
    </div>
  )
}

// ─── Options ───────────────────────────────────────────────────────────────────

const currencies = ["EUR", "USD", "GBP", "JPY", "CNY", "AUD", "CAD"]
const timezones = ["GMT", "GMT+1", "GMT+2", "GMT+8", "GMT-5", "GMT-8", "America/New_York", "Asia/Shanghai"]
const langOptions = ["English", "中文", "Français", "Deutsch", "Español", "日本語"]

// ─── Page ──────────────────────────────────────────────────────────────────────

type Tab = "store" | "personal" | "channels"

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage()
  const { channelStates } = useChannelState()
  const [activeTab, setActiveTab] = useState<Tab>("store")

  const [currency, setCurrency] = useState("EUR")
  const [timezone, setTimezone] = useState("GMT")
  const [lang, setLang] = useState("English")
  const [brandName, setBrandName] = useState("Nohi Demo Store")
  const [storeLink, setStoreLink] = useState("https://nohi-demo.myshopify.com")
  const [category, setCategory] = useState("Fashion & Apparel")

  const activeCount = Object.values(channelStates).filter(
    (s) => s === "active" || s === "always-on"
  ).length
  const totalCount = organicChannels.length + paidChannels.length

  const tabs: { id: Tab; label: string; labelZh: string }[] = [
    { id: "store", label: "Store", labelZh: "商店" },
    { id: "personal", label: "Personal", labelZh: "个人" },
    { id: "channels", label: "Channels", labelZh: "渠道" },
  ]

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">

      {/* Header */}
      <h1 className="text-2xl font-semibold text-foreground tracking-tight">
        {language === "zh" ? "设置" : "Settings"}
      </h1>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {language === "zh" ? tab.labelZh : tab.label}
          </button>
        ))}
      </div>

      {/* Store tab */}
      {activeTab === "store" && (
        <div className="flex flex-col gap-8">
          {/* Language toggle */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="size-4" />
              {language === "zh" ? "界面语言" : "Interface language"}
            </h2>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {(["en", "zh"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    language === l
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border text-foreground hover:bg-secondary"
                  )}
                >
                  <span>{l === "en" ? "English" : "中文"}</span>
                  {language === l && <Check className="size-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Store Info */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              {language === "zh" ? "商店信息" : "Store information"}
            </h2>
            <div className="rounded-xl bg-popover overflow-hidden">
              <EditableRow label={language === "zh" ? "商店名称" : "Store name"} value={brandName} onSave={setBrandName} />
              <EditableRow label={language === "zh" ? "商店链接" : "Store URL"} value={storeLink} onSave={setStoreLink} />
              <EditableRow
                label={language === "zh" ? "品类" : "Category"}
                value={category}
                onSave={setCategory}
                options={["Fashion & Apparel", "Beauty & Personal Care", "Electronics", "Home & Garden", "Sports & Outdoors"]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Personal tab */}
      {activeTab === "personal" && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {language === "zh" ? "个人偏好设置" : "Personal preferences"}
          </h2>
          <div className="rounded-xl bg-popover overflow-hidden">
            <EditableRow label={language === "zh" ? "货币" : "Currency"} value={currency} onSave={setCurrency} options={currencies} />
            <EditableRow label={language === "zh" ? "时区" : "Timezone"} value={timezone} onSave={setTimezone} options={timezones} />
            <EditableRow label={language === "zh" ? "语言" : "Language"} value={lang} onSave={setLang} options={langOptions} />
          </div>
        </div>
      )}

      {/* Channels tab */}
      {activeTab === "channels" && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            {language === "zh"
              ? `管理您的分发渠道。当前 ${activeCount} / ${totalCount} 个渠道已启用。`
              : `Manage your distribution channels. ${activeCount} of ${totalCount} channels active.`}
          </p>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {language === "zh" ? "自然流量" : "Organic"}
            </p>
            <div className="rounded-2xl bg-popover overflow-hidden">
              {organicChannels.map((ch) => <ChannelRow key={ch.id} {...ch} />)}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {language === "zh" ? "付费渠道" : "Paid"}
            </p>
            <div className="rounded-2xl bg-popover overflow-hidden">
              {paidChannels.map((ch) => <ChannelRow key={ch.id} {...ch} />)}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border pt-6">
        {["Home", "Terms of sale", "Privacy policy", "Cookie Management", "Contact"].map((l) => (
          <a key={l} href="#" className="hover:text-foreground transition-colors">{l}</a>
        ))}
        <span className="ml-auto">Copyright ©2026 Nohi. All rights reserved.</span>
      </div>
    </div>
  )
}
