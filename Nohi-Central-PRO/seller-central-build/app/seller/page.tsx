"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ExternalLink, FileText } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function SellerHomePage() {
  const [proRequested, setProRequested] = useState(false)
  const { t, language } = useLanguage()

  const channelDocs = [
    {
      id: "conversational-storefront",
      title: language === "zh" ? "对话式店面" : "Conversational Storefront",
      description: language === "zh" 
        ? "您的AI驱动店面，智能体直接在您的网站上与购物者互动。"
        : "Your AI-powered storefront where agents interact with shoppers directly on your site.",
      href: "/seller/channels/conversational-storefront",
    },
    {
      id: "chatgpt-acp",
      title: "ChatGPT ACP",
      description: language === "zh"
        ? "连接到ChatGPT的智能体商务协议，实现对话内购买。"
        : "Connect to ChatGPT's Agentic Commerce Protocol for in-conversation purchases.",
      href: "/seller/channels/chatgpt-acp",
    },
    {
      id: "google-ucp",
      title: "Google UCP",
      description: language === "zh"
        ? "将您的产品源提交到Google的通用商务协议。"
        : "Submit your product feed to Google's Universal Commerce Protocol.",
      href: "/seller/channels/google-ucp",
    },
    {
      id: "perplexity",
      title: "Perplexity",
      description: language === "zh"
        ? "通过Perplexity的AI搜索和答案引擎实现产品发现。"
        : "Enable product discovery through Perplexity's AI search and answer engine.",
      href: "/seller/channels/perplexity",
    },
    {
      id: "third-party",
      title: language === "zh" ? "第三方智能体" : "Third Party Agents",
      description: language === "zh"
        ? "连接独立的AI购物智能体和商务机器人。"
        : "Connect with independent AI shopping agents and commerce bots.",
      href: "/seller/channels/third-party",
    },
  ]

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t("nav.home")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {language === "zh" ? "欢迎回到您的商家中心控制台。" : "Welcome back to your Seller Central dashboard."}
        </p>
      </div>

      {/* Brief Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnalyticCard 
          label={language === "zh" ? "Nohi销售额" : "Nohi Sales"} 
          value="$1,284" 
          change="+12.3%" 
          positive 
        />
        <AnalyticCard 
          label={language === "zh" ? "智能体订单" : "Agent Orders"} 
          value="42" 
          change="+8" 
          positive 
        />
        <AnalyticCard 
          label={t("home.conversionRate")} 
          value="3.2%" 
          change="-0.4%" 
          positive={false} 
        />
        <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {language === "zh" ? "履约排名" : "Fulfillment Ranking"}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground tabular-nums">#127</span>
            <Badge variant="secondary" className="text-xs">
              {language === "zh" ? "银牌" : "Silver"}
            </Badge>
          </div>
          <Link href="/seller/brand-context/fulfillment" className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-auto">
            {language === "zh" ? "更改计划" : "Change plan"}
          </Link>
        </div>
      </div>

      {/* Nohi Central Pro CTA */}
      <section className="rounded-2xl bg-secondary/50 bg-popover p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-1">
            <span className="text-base font-bold uppercase tracking-widest text-foreground drop-shadow-sm">
              PRO
            </span>
            <h2 className="text-xl font-semibold text-foreground mt-2">
              {t("home.buildAgentNative")}
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex items-start gap-3">
                <span className="size-1.5 rounded-full bg-foreground shrink-0 mt-2" />
                <span className="text-sm text-foreground">{t("home.integrate130")}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="size-1.5 rounded-full bg-foreground shrink-0 mt-2" />
                <span className="text-sm text-foreground">{t("home.buildBrandOwned")}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="size-1.5 rounded-full bg-foreground shrink-0 mt-2" />
                <span className="text-sm text-foreground">{t("home.automatedListing")}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="size-1.5 rounded-full bg-foreground shrink-0 mt-2" />
                <span className="text-sm text-foreground">{t("home.instantCheckout")}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            {proRequested ? (
              <div className="text-sm text-muted-foreground">
                {t("home.requestSent")}
              </div>
            ) : (
              <Button 
                onClick={() => setProRequested(true)}
                className="rounded-full px-6"
              >
                {t("home.requestForPro")}
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-6 border-t border-border/50 pt-4">
          {t("home.proDisclaimer")}
        </p>
      </section>

      {/* Documentation Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Nohi Introduction */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("home.aboutNohi")}</h2>
            <p className="text-sm text-muted-foreground">
              {language === "zh" ? "了解Nohi如何将您的品牌与AI智能体连接。" : "Learn how Nohi connects your brand with AI agents."}
            </p>
          </div>

          <div className="rounded-2xl bg-secondary/50 bg-popover p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  {language === "zh" ? "什么是智能体商务？" : "What is Agentic Commerce?"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {language === "zh" 
                    ? "智能体商务是电子商务的下一代演进，AI智能体代表购物者发现、推荐和购买产品。Nohi将您的品牌连接到跨多个平台的这些智能体。"
                    : "Agentic commerce is the next evolution of e-commerce where AI agents discover, recommend, and purchase products on behalf of shoppers. Nohi connects your brand to these agents across multiple platforms."}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex flex-col gap-3">
              <DocLink 
                title={t("home.gettingStarted")}
                description={language === "zh" ? "了解通过AI智能体销售的基础知识" : "Learn the basics of selling through AI agents"}
                href="#"
              />
              <DocLink 
                title={language === "zh" ? "品牌上下文最佳实践" : "Brand Context Best Practices"}
                description={language === "zh" ? "优化您的品牌以便智能体发现" : "Optimize your brand for agent discovery"}
                href="/seller/brand-context"
              />
              <DocLink 
                title={language === "zh" ? "智能目录设置" : "Agentic Catalog Setup"}
                description={language === "zh" ? "导入和管理您的产品列表" : "Import and manage your product listings"}
                href="/seller/catalog"
              />
              <DocLink 
                title={language === "zh" ? "分析与洞察" : "Analytics & Insights"}
                description={language === "zh" ? "了解您的智能体商务表现" : "Understand your agent commerce performance"}
                href="/seller/analytics"
              />
            </div>
          </div>
        </section>

        {/* Channel Docs */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("home.channelDocs")}</h2>
            <p className="text-sm text-muted-foreground">
              {language === "zh" ? "探索可用的分发渠道。" : "Explore available distribution channels."}
            </p>
          </div>

          <div className="flex flex-col bg-secondary/50 rounded-2xl overflow-hidden divide-y divide-border">
            {channelDocs.map((channel) => (
              <Link
                key={channel.id}
                href={channel.href}
                className="flex items-center gap-4 p-4 text-left transition-colors hover:bg-secondary/50"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {channel.title}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {channel.description}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      </div>

    </div>
  )
}

function AnalyticCard({
  label,
  value,
  change,
  positive,
}: {
  label: string
  value: string
  change: string
  positive: boolean
}) {
  return (
    <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </span>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          positive ? "text-foreground" : "text-destructive"
        )}
      >
        {change}
      </span>
    </div>
  )
}

function DocLink({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 group"
    >
      <div>
        <span className="text-sm font-medium text-foreground group-hover:underline">
          {title}
        </span>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
    </Link>
  )
}
