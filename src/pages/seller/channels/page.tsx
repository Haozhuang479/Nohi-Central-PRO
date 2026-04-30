
import { useChannelState } from "@/lib/channel-state"
import { useLanguage } from "@/lib/language-context"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

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
    status === "active" || status === "always-on"
      ? "bg-green-500"
      : status === "inactive"
      ? "bg-yellow-400"
      : status === "disconnected"
      ? "bg-muted-foreground/30"
      : "bg-muted-foreground/30"
  return <span className={cn("size-2 rounded-full shrink-0", color)} />
}

function StatusLabel({ status, language }: { status: string; language: string }) {
  if (status === "active" || status === "always-on") {
    return (
      <span className="text-xs text-green-600 font-medium">
        {language === "zh" ? "已启用" : "Active"}
      </span>
    )
  }
  if (status === "inactive") {
    return (
      <span className="text-xs text-yellow-500 font-medium">
        {language === "zh" ? "已停用" : "Inactive"}
      </span>
    )
  }
  return (
    <span className="text-xs text-muted-foreground">
      {language === "zh" ? "未连接" : "Disconnected"}
    </span>
  )
}

function ChannelRow({
  id,
  name,
  nameZh,
}: {
  id: string
  name: string
  nameZh: string
}) {
  const { getChannelStatus, setChannelStatus } = useChannelState()
  const { language } = useLanguage()
  const status = getChannelStatus(id)
  const isOn = status === "active" || status === "always-on"

  const handleToggle = (checked: boolean) => {
    setChannelStatus(id, checked ? "active" : "inactive")
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <StatusDot status={status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {language === "zh" ? nameZh : name}
          </span>

        </div>
        <StatusLabel status={status} language={language} />
      </div>
      <Switch
        checked={isOn}
        onCheckedChange={handleToggle}
        className="shrink-0"
        aria-label={`Toggle ${name}`}
      />
    </div>
  )
}

export default function ChannelControlPage() {
  const { language } = useLanguage()
  const { channelStates } = useChannelState()

  const activeCount = Object.values(channelStates).filter(
    (s) => s === "active" || s === "always-on"
  ).length

  const totalCount = organicChannels.length + paidChannels.length

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {language === "zh" ? "渠道控制" : "Channel Control"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {language === "zh"
            ? `管理您的分发渠道。当前 ${activeCount} / ${totalCount} 个渠道已启用。`
            : `Manage your distribution channels. ${activeCount} of ${totalCount} channels active.`}
        </p>
      </div>

      {/* Organic */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {language === "zh" ? "自然流量" : "Organic"}
        </p>
        <div className="rounded-2xl bg-popover overflow-hidden divide-y divide-border">
          {organicChannels.map((ch) => (
            <ChannelRow key={ch.id} {...ch} />
          ))}
        </div>
      </div>

      {/* Paid */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {language === "zh" ? "付费渠道" : "Paid"}
        </p>
        <div className="rounded-2xl bg-popover overflow-hidden divide-y divide-border">
          {paidChannels.map((ch) => (
            <ChannelRow key={ch.id} {...ch} />
          ))}
        </div>
      </div>
    </div>
  )
}
