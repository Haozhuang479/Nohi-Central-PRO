import { useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { ChevronRight, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

export default function BrandContextPage() {
  const { t, language } = useLanguage()
  const [toastVisible, setToastVisible] = useState(false)

  const sections = [
    {
      title: t("brandContext.details"),
      description:
        language === "zh"
          ? "核心品类、客单价层级、购买类型、受众、场景和意图标签。"
          : "Core category, AOV tier, purchase type, audience, scenario and intent tags.",
      href: "/seller/brand-context/details",
      completed: true,
    },
    {
      title: t("brandContext.guardrails"),
      description:
        language === "zh"
          ? "定义排除的受众、禁止的场景和屏蔽的关键词。"
          : "Define excluded audiences, prohibited scenarios, and blocked keywords.",
      href: "/seller/brand-context/guardrails",
      completed: false,
    },
    {
      title: t("brandContext.visualStyle"),
      description:
        language === "zh"
          ? "帮助智能体理解您品牌美学的风格标签。"
          : "Style tags that help agents understand your brand aesthetic.",
      href: "/seller/brand-context/visual-style",
      completed: false,
    },
    {
      title: t("brandContext.brandStory"),
      description:
        language === "zh"
          ? "150字品牌故事和创始人寄语供智能体参考。"
          : "150-word brand story and founder note for agents to reference.",
      href: "/seller/brand-context/brand-story",
      completed: true,
    },
    {
      title: t("brandContext.postsUgc"),
      description:
        language === "zh"
          ? "管理帖子、已验证评价、品牌媒体和UGC内容。"
          : "Manage posts, verified reviews, brand media, and UGC content.",
      href: "/seller/brand-context/posts-ugc",
      completed: false,
    },
    {
      title: t("brandContext.fulfillment"),
      description:
        language === "zh"
          ? "配送SLA、退换政策、处理时间和区域设置。"
          : "Shipping SLA, return policy, processing time, and regional settings.",
      href: "/seller/brand-context/fulfillment",
      completed: false,
    },
  ]

  const completed = sections.filter((s) => s.completed).length

  const handleAiGenerateAll = () => {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-foreground text-background px-5 py-3 shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2">
          <Sparkles className="size-4 shrink-0" />
          {language === "zh"
            ? "AI 正在生成所有品牌背景…"
            : "AI is generating all brand context…"}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {t("brandContext.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "zh"
              ? `构建您的智能体原生品牌标识。已配置 ${completed} / ${sections.length} 个部分。`
              : `Build your agent-native brand identity. ${completed} of ${sections.length} sections configured.`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5 shrink-0"
          onClick={handleAiGenerateAll}
        >
          <Sparkles className="size-3.5" />
          {language === "zh" ? "AI 全部生成" : "AI Generate All"}
        </Button>
      </div>

      <div className="flex flex-col rounded-2xl overflow-hidden divide-y divide-secondary bg-secondary/50">
        {sections.map((section) => (
          <Link
            key={section.href}
            to={section.href}
            className="flex items-center gap-4 p-5 hover:bg-secondary/50 transition-colors group"
          >
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border",
                section.completed
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground"
              )}
            >
              {section.completed ? (
                <Check className="size-3.5" />
              ) : (
                <div className="size-2 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground block">
                {section.title}
              </span>
              <span className="text-xs text-muted-foreground">{section.description}</span>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  )
}
