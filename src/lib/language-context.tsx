import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export type Language = "en" | "zh"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<string, Record<Language, string>> = {
  // ── Nav ──────────────────────────────────────────────────────────────────────
  "nav.home": { en: "Home", zh: "首页" },
  "nav.agenticCatalog": { en: "Agentic Catalog", zh: "智能目录" },
  "nav.yourProducts": { en: "Your Products", zh: "我的产品" },
  "nav.discover": { en: "Discover", zh: "发现" },
  "nav.brandContext": { en: "Brand Context", zh: "品牌背景" },
  "nav.channelControl": { en: "Channel Control", zh: "渠道管理" },
  "nav.analytics": { en: "Analytics", zh: "数据分析" },
  "nav.settings": { en: "Settings", zh: "设置" },
  "nav.seller": { en: "Seller Central", zh: "商家中心" },
  "nav.csvUpload": { en: "CSV Upload", zh: "CSV 导入" },
  "nav.connectors": { en: "Connectors", zh: "连接器" },
  "nav.products": { en: "Products", zh: "产品" },
  "nav.brands": { en: "Brands", zh: "品牌" },
  "nav.websites": { en: "Websites", zh: "网站" },
  "nav.categories": { en: "Categories", zh: "分类" },
  "nav.details": { en: "Details", zh: "详情" },
  "nav.guardrails": { en: "Guardrails", zh: "内容规范" },
  "nav.visualStyle": { en: "Visual Style", zh: "视觉风格" },
  "nav.brandStory": { en: "Brand Story", zh: "品牌故事" },
  "nav.postsUgc": { en: "Posts & UGC", zh: "帖子与 UGC" },
  "nav.fulfillment": { en: "Fulfillment", zh: "履约" },
  "nav.conversationalStorefront": { en: "Conversational Storefront", zh: "对话式店铺" },
  "nav.thirdPartyAgents": { en: "Third-Party Agents", zh: "第三方智能体" },
  "nav.creatorAgents": { en: "Creator Agents", zh: "创作者智能体" },

  // ── Common ───────────────────────────────────────────────────────────────────
  "common.save": { en: "Save", zh: "保存" },
  "common.cancel": { en: "Cancel", zh: "取消" },
  "common.edit": { en: "Edit", zh: "编辑" },
  "common.delete": { en: "Delete", zh: "删除" },
  "common.loading": { en: "Loading…", zh: "加载中…" },
  "common.demo": { en: "Demo", zh: "演示" },
  "common.freePlan": { en: "Free Plan", zh: "免费版" },
  "common.comingSoon": { en: "Coming Soon", zh: "即将推出" },
  "common.enabled": { en: "Enabled", zh: "已启用" },
  "common.disabled": { en: "Disabled", zh: "已禁用" },
  "common.connected": { en: "Connected", zh: "已连接" },
  "common.disconnected": { en: "Disconnected", zh: "未连接" },
  "common.active": { en: "Active", zh: "活跃" },
  "common.inactive": { en: "Inactive", zh: "未激活" },
  "common.alwaysOn": { en: "Always On", zh: "始终开启" },
  "common.search": { en: "Search…", zh: "搜索…" },
  "common.add": { en: "Add", zh: "添加" },
  "common.connect": { en: "Connect", zh: "连接" },
  "common.disconnect": { en: "Disconnect", zh: "断开" },
  "common.enable": { en: "Enable", zh: "启用" },
  "common.disable": { en: "Disable", zh: "禁用" },

  // ── Home ─────────────────────────────────────────────────────────────────────
  "home.buildAgentNative": { en: "Build Agent-Native Commerce", zh: "构建智能体原生电商" },
  "home.integrate130": { en: "Integrate with 130+ AI channels", zh: "接入 130+ AI 渠道" },
  "home.buildBrandOwned": { en: "Build brand-owned AI storefronts", zh: "打造品牌专属 AI 店铺" },
  "home.automatedListing": { en: "Automated listing enrichment", zh: "自动化商品描述优化" },
  "home.instantCheckout": { en: "Instant checkout via AI agents", zh: "AI 智能体即时结账" },
  "home.requestForPro": { en: "Request for PRO", zh: "申请 PRO 版" },
  "home.requestSent": { en: "Request Sent", zh: "申请已发送" },
  "home.proDisclaimer": {
    en: "PRO plan includes unlimited channels, priority enrichment, and dedicated support.",
    zh: "PRO 版包含无限渠道接入、优先内容优化及专属客户支持。",
  },
  "home.aboutNohi": { en: "About Nohi", zh: "关于 Nohi" },
  "home.channelDocs": { en: "Channel Docs", zh: "渠道文档" },
  "home.gettingStarted": { en: "Getting Started", zh: "快速开始" },
  "home.conversionRate": { en: "Conversion Rate", zh: "转化率" },
  "home.quickActions": { en: "Quick Actions", zh: "快捷操作" },
  "home.activityFeed": { en: "Activity Feed", zh: "动态" },
  "home.syncCatalog": { en: "Sync Catalog", zh: "同步目录" },
  "home.pushAllChannels": { en: "Push to All Channels", zh: "推送至所有渠道" },
  "home.aiWrite": { en: "AI Write", zh: "AI 写作" },
  "home.costReport": { en: "Cost Report", zh: "费用报告" },

  // ── Channel ──────────────────────────────────────────────────────────────────
  "channel.status": { en: "Status", zh: "状态" },
  "channel.enableDisable": { en: "Enable / Disable", zh: "启用 / 禁用" },
  "channel.enabled": { en: "Enabled", zh: "已启用" },
  "channel.disabled": { en: "Disabled", zh: "已禁用" },
  "channel.active": { en: "Active", zh: "活跃" },
  "channel.inactive": { en: "Inactive", zh: "未激活" },
  "channel.alwaysOn": { en: "Always On", zh: "始终开启" },
  "channel.coming": { en: "Coming Soon", zh: "即将推出" },
  "channel.disableWarningTitle": { en: "Disable channel?", zh: "确认禁用渠道？" },
  "channel.disableWarningDesc": {
    en: "Disabling this channel will stop all traffic and agent queries routed through it. You can re-enable it at any time.",
    zh: "禁用该渠道后，所有通过该渠道的流量和智能体查询将停止。您可以随时重新启用。",
  },
  "channel.keepEnabled": { en: "Keep Enabled", zh: "保持启用" },
  "channel.disableAnyway": { en: "Disable Anyway", zh: "仍然禁用" },
  "channel.activationNote": {
    en: "This channel will be activated upon connecting your account.",
    zh: "连接账号后该渠道将自动激活。",
  },

  // ── Storefront ───────────────────────────────────────────────────────────────
  "storefront.title": { en: "Conversational Storefront", zh: "对话式店铺" },
  "storefront.description": {
    en: "Configure your AI-powered storefront experience for shoppers.",
    zh: "配置您面向购物者的 AI 驱动店铺体验。",
  },
  "storefront.layoutVersion": { en: "Layout Version", zh: "布局版本" },
  "storefront.layoutDesc": {
    en: "Choose how the conversational interface appears on your storefront.",
    zh: "选择对话界面在店铺中的呈现方式。",
  },
  "storefront.splitScreen": { en: "Split Screen", zh: "分屏模式" },
  "storefront.splitScreenDesc": {
    en: "Product grid on the left, chat panel on the right.",
    zh: "左侧为商品列表，右侧为聊天面板。",
  },
  "storefront.inlineChat": { en: "Inline Chat", zh: "嵌入式聊天" },
  "storefront.inlineChatDesc": {
    en: "Chat interface embedded directly within the product listing.",
    zh: "聊天界面直接嵌入商品列表页。",
  },
  "storefront.entryPoints": { en: "Entry Points", zh: "入口配置" },
  "storefront.entryPointsDesc": {
    en: "Control where and how shoppers can start a conversation.",
    zh: "控制购物者发起对话的位置与方式。",
  },
  "storefront.searchAiMode": { en: "Search AI Mode", zh: "搜索 AI 模式" },
  "storefront.searchAiModeDesc": {
    en: "Replace the search bar with an AI-powered query interface.",
    zh: "将搜索框替换为 AI 智能问答界面。",
  },
  "storefront.chatBox": { en: "Chat Box", zh: "聊天框" },
  "storefront.chatBoxDesc": {
    en: "A persistent chat box visible on all storefront pages.",
    zh: "在所有店铺页面显示固定聊天框。",
  },
  "storefront.floatingBubble": { en: "Floating Bubble", zh: "悬浮按钮" },
  "storefront.floatingBubbleDesc": {
    en: "A floating button that opens the chat interface.",
    zh: "悬浮按钮点击后打开聊天界面。",
  },
  "storefront.scenarioQueries": { en: "Scenario Queries", zh: "场景问题" },
  "storefront.scenarioQueriesDesc": {
    en: "Pre-set queries to help shoppers explore your catalog.",
    zh: "预设问题帮助购物者探索您的商品目录。",
  },
  "storefront.addQuery": { en: "Add Query", zh: "添加问题" },
  "storefront.cardTheme": { en: "Card Theme", zh: "卡片样式" },
  "storefront.cardThemeDesc": {
    en: "Choose how product cards are displayed in chat responses.",
    zh: "选择聊天回复中商品卡片的展示风格。",
  },
  "storefront.minimal": { en: "Minimal", zh: "简约" },
  "storefront.detailed": { en: "Detailed", zh: "详细" },
  "storefront.visual": { en: "Visual", zh: "视觉" },
  "storefront.compact": { en: "Compact", zh: "紧凑" },
  "storefront.sellNonOwned": { en: "Sell Non-Owned Products", zh: "推荐非自营商品" },
  "storefront.sellNonOwnedDesc": {
    en: "Allow the AI to recommend products outside your catalog when relevant.",
    zh: "允许 AI 在相关时推荐您目录以外的商品。",
  },
  "storefront.watchDemo": { en: "Watch Demo", zh: "观看演示" },

  // ── Brand Context ─────────────────────────────────────────────────────────────
  "brandContext.title": { en: "Brand Context", zh: "品牌背景" },
  "brandContext.details": { en: "Brand Details", zh: "品牌详情" },
  "brandContext.guardrails": { en: "Guardrails", zh: "内容规范" },
  "brandContext.visualStyle": { en: "Visual Style", zh: "视觉风格" },
  "brandContext.brandStory": { en: "Brand Story", zh: "品牌故事" },
  "brandContext.postsUgc": { en: "Posts & UGC", zh: "帖子与 UGC" },
  "brandContext.fulfillment": { en: "Fulfillment", zh: "履约" },
  "brandContext.aiGenerate": { en: "AI Generate", zh: "AI 生成" },
  "brandContext.aiGenerating": { en: "Generating…", zh: "生成中…" },

  // ── Catalog ──────────────────────────────────────────────────────────────────
  "catalog.yourProducts": { en: "Your Products", zh: "我的产品" },
  "catalog.yourProductsDesc": {
    en: "Manage your product catalog and enrichment settings.",
    zh: "管理您的商品目录及内容优化设置。",
  },
  "catalog.importFromCsv": { en: "Import from CSV", zh: "从 CSV 导入" },
  "catalog.importFromCsvDesc": {
    en: "Upload a CSV file to bulk-import products into your catalog.",
    zh: "上传 CSV 文件批量导入商品到目录。",
  },
  "catalog.importProducts": { en: "Import Products", zh: "导入商品" },
  "catalog.csvTemplate": { en: "CSV Template", zh: "CSV 模板" },
  "catalog.csvTemplateDesc": {
    en: "Download the template to ensure your CSV is formatted correctly.",
    zh: "下载模板以确保您的 CSV 格式正确。",
  },
  "catalog.downloadTemplate": { en: "Download Template", zh: "下载模板" },
  "catalog.productsInCatalog": { en: "Products in Catalog", zh: "目录中的商品" },
  "catalog.importToStart": { en: "Import products to get started.", zh: "导入商品以开始使用。" },

  // ── Discover ─────────────────────────────────────────────────────────────────
  "discover.products": { en: "Products", zh: "产品" },
  "discover.productsDesc": { en: "Browse and add products from the Nohi database to your catalog.", zh: "浏览 Nohi 数据库中的产品并添加到您的目录。" },
  "discover.searchProducts": { en: "Search products…", zh: "搜索产品…" },
  "discover.addToCatalog": { en: "Add to Catalog", zh: "添加到目录" },
  "discover.brands": { en: "Brands", zh: "品牌" },
  "discover.brandsDesc": { en: "Browse brands available in the Nohi database.", zh: "浏览 Nohi 数据库中的品牌。" },
  "discover.searchBrands": { en: "Search brands…", zh: "搜索品牌…" },
  "discover.websites": { en: "Websites", zh: "网站" },
  "discover.random": { en: "Random", zh: "随机" },
  "discover.categoriesDesc": { en: "Browse all product categories in the Nohi taxonomy.", zh: "浏览 Nohi 分类中的所有产品类别。" },

  // legacy ai.* keys kept for backward compatibility
  "ai.console": { en: "AI Console", zh: "AI 控制台" },
  "ai.placeholder": { en: "Ask anything or type a command…", zh: "问任何问题或输入命令…" },
  "ai.planMode": { en: "Plan Mode", zh: "计划模式" },
  "ai.planModeDesc": { en: "AI will propose a plan before executing.", zh: "AI 将在执行前提出计划。" },
  "ai.approveRun": { en: "Approve & Run", zh: "批准并执行" },
  "ai.editPlan": { en: "Edit Plan", zh: "编辑计划" },
  "ai.cancelPlan": { en: "Cancel", zh: "取消" },
  "ai.tokensUsed": { en: "Tokens", zh: "Token" },
  "ai.sessionHistory": { en: "Session History", zh: "历史会话" },
  "ai.newSession": { en: "New Session", zh: "新会话" },
  "ai.noApiKey": {
    en: "No API key configured. Go to Settings → AI Providers.",
    zh: "未配置 API 密钥。请前往设置 → AI 提供商。",
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  "settings.title": { en: "Settings", zh: "设置" },
  "settings.storeInfo": { en: "Store Info", zh: "店铺信息" },
  "settings.aiProviders": { en: "AI Providers", zh: "AI 提供商" },
  "settings.primaryProvider": { en: "Primary Provider", zh: "主要提供商" },
  "settings.testConnection": { en: "Test Connection", zh: "测试连接" },
  "settings.connected": { en: "Connected", zh: "已连接" },
  "settings.notConfigured": { en: "Not Configured", zh: "未配置" },
  "settings.monthlyBudget": { en: "Monthly Budget", zh: "月度预算" },
  "settings.permissions": { en: "Permissions", zh: "权限" },
  "settings.notifications": { en: "Notifications", zh: "通知" },
  "settings.appearance": { en: "Appearance", zh: "外观" },
  "settings.theme": { en: "Theme", zh: "主题" },
  "settings.language": { en: "Language", zh: "语言" },
  "settings.paymentMethods": { en: "Payment Methods", zh: "支付方式" },
  "settings.addPayment": { en: "Add Payment", zh: "添加支付" },
  "settings.apiKey": { en: "API Key", zh: "API 密钥" },
  "settings.defaultModel": { en: "Default Model", zh: "默认模型" },

  // ── Quick Actions ─────────────────────────────────────────────────────────────
  "quickActions.title": { en: "Quick Actions", zh: "快捷操作" },
  "quickActions.syncCatalog": { en: "Sync Catalog", zh: "同步目录" },
  "quickActions.pushChannels": { en: "Push to Channels", zh: "推送到渠道" },
  "quickActions.aiWrite": { en: "AI Write", zh: "AI 写作" },
  "quickActions.costReport": { en: "Cost Report", zh: "费用报告" },
  "quickActions.productSearch": { en: "Product Search", zh: "产品搜索" },

  // ── Activity ──────────────────────────────────────────────────────────────────
  "activity.title": { en: "AI Activity", zh: "AI 动态" },
  "activity.noActivity": { en: "No recent activity", zh: "暂无近期活动" },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem("nohi-language") as Language) || "en"
  )

  const t = useCallback(
    (key: string): string => {
      const entry = translations[key]
      if (!entry) return key
      return entry[language] ?? entry.en ?? key
    },
    [language]
  )

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem("nohi-language", lang)
    setLanguageState(lang)
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error("useLanguage must be used within LanguageProvider")
  return context
}
