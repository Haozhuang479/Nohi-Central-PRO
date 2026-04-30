
import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Bell, Search, Calendar, Download, ChevronDown } from "lucide-react"

export default function CampaignsPage() {
  const { language } = useLanguage()
  const [autopilotEnabled, setAutopilotEnabled] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="px-6 md:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{language === "zh" ? "Campaign和广告" : "Campaigns and Ads"}</span>
            <span>·</span>
            <span>Thevenvia US</span>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="size-5" />
          </button>
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-[1400px] mx-auto w-full flex flex-col gap-6">
        {/* Title + Actions */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {language === "zh" ? "Campaign" : "Campaigns"}
          </h1>
          <div className="flex items-center gap-3">
            {/* Autopilot Mode Toggle - prominent */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
                {language === "zh" ? "自动驾驶模式" : "Autopilot Mode"}
              </span>
              <Switch
                checked={autopilotEnabled}
                onCheckedChange={setAutopilotEnabled}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
            <Button className="rounded-xl">
              {language === "zh" ? "创建 Campaign" : "Create campaign"}
            </Button>
          </div>
        </div>

        {/* Credit Banner */}
        <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="text-violet-600 dark:text-violet-400 text-lg">🎁</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                {language === "zh"
                  ? "解锁高达 $1,500.00 的免费 Campaign 积分"
                  : "Unlock up to $1,500.00 in free campaign credits"}
              </p>
              <p className="text-xs text-violet-700 dark:text-violet-300 mt-1.5 leading-relaxed">
                {language === "zh"
                  ? "30天内最低每日消费 $16.67（总计 $500.00）。提高消费将最大化积分。"
                  : "Minimum spend of $16.67/day required over 30 days ($500.00 total). Increasing your spend will maximize credits."}
              </p>
            </div>
            <button className="text-xs text-violet-600 dark:text-violet-400 underline hover:opacity-80 transition-opacity whitespace-nowrap">
              {language === "zh" ? "了解更多" : "Learn more"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border">
          <button className="px-4 py-2.5 text-sm font-medium border-b-2 border-blue-500 text-blue-600 -mb-px">
            {language === "zh" ? "Campaign (0)" : "Campaigns (0)"}
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === "zh" ? "搜索 Campaign 名称" : "Search for a campaign name"}
              className="w-full bg-popover border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="relative">
            <select className="appearance-none bg-popover border border-border rounded-xl pl-4 pr-10 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer">
              <option>{language === "zh" ? "草稿、在线、未投放..." : "Draft, Live, Not delivering..."}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Calendar className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Download className="size-4" />
          </Button>
        </div>

        {/* Table Header */}
        <div className="rounded-t-xl border-x border-t border-border bg-popover">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold text-foreground">
            <span>{language === "zh" ? "Campaign 名称" : "Campaign name"}</span>
            <span>{language === "zh" ? "状态" : "Status"}</span>
            <span>{language === "zh" ? "开/关" : "Off / On"}</span>
            <span>{language === "zh" ? "预算" : "Budget"}</span>
            <span>{language === "zh" ? "已消费金额" : "Amount spent"}</span>
            <span>{language === "zh" ? "结果" : "Result"}</span>
            <span>{language === "zh" ? "单次结果成本" : "Cost per result"}</span>
          </div>
        </div>

        {/* Empty State */}
        <div className="rounded-b-xl border-x border-b border-border bg-popover flex flex-col items-center justify-center py-16 gap-6">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-EUu3m3KPKZVo2MXAf07cKNLibA8H6W.png"
            alt="Empty campaign illustration"
            width={200}
            height={120}
            className="opacity-60"
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-base font-semibold text-foreground">
              {language === "zh" ? "创建您的第一个 Campaign" : "Create your first campaign"}
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              {language === "zh"
                ? "设置目标以帮助实现增长并监控表现"
                : "Set objectives to help achieve growth and monitor performance"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
