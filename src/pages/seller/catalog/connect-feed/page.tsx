
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/language-context"
import { Rss, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export default function ConnectFeedPage() {
  const { language } = useLanguage()
  const [feedUrl, setFeedUrl] = useState("")
  const [status, setStatus] = useState<"idle" | "validating" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const translations = {
    title: language === "zh" ? "连接Feed" : "Connect Feed",
    description: language === "zh" 
      ? "粘贴您的产品Feed URL — 所有电商平台都会自动生成。" 
      : "Paste your product feed URL — every e-commerce platform generates one automatically.",
    placeholder: "https://yourstore.com/feeds/google-shopping.xml",
    connect: language === "zh" ? "连接Feed" : "Connect Feed",
    validating: language === "zh" ? "验证中..." : "Validating...",
    success: language === "zh" ? "Feed连接成功" : "Feed connected successfully",
    successDesc: language === "zh" 
      ? "我们正在导入您的产品，这可能需要几分钟。" 
      : "We are importing your products. This may take a few minutes.",
    helpTitle: language === "zh" ? "在哪里找到您的Feed URL？" : "Where to find your feed URL?",
  }

  const handleConnect = async () => {
    if (!feedUrl.trim()) return

    setStatus("validating")
    setErrorMessage("")

    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Simple URL validation
    try {
      new URL(feedUrl)
      if (feedUrl.includes(".xml") || feedUrl.includes("feed") || feedUrl.includes("rss")) {
        setStatus("success")
      } else {
        setStatus("error")
        setErrorMessage(language === "zh" 
          ? "URL看起来不像是有效的产品Feed。请检查并重试。" 
          : "URL doesn't look like a valid product feed. Please check and try again.")
      }
    } catch {
      setStatus("error")
      setErrorMessage(language === "zh" 
        ? "请输入有效的URL" 
        : "Please enter a valid URL")
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{translations.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {translations.description}
        </p>
      </div>

      {/* Main Card - Clean minimal design */}
      <div className="rounded-2xl bg-card border border-border p-8">
        {status === "success" ? (
          <div className="text-center py-8">
            <CheckCircle2 className="size-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-foreground">{translations.success}</h3>
            <p className="text-sm text-muted-foreground mt-2">{translations.successDesc}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Icon */}
            <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Rss className="size-6 text-muted-foreground" />
            </div>
            
            {/* Description */}
            <p className="text-muted-foreground text-center mb-8">
              {translations.description}
            </p>

            {/* Input */}
            <div className="w-full max-w-xl space-y-4">
              <Input
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder={translations.placeholder}
                className="h-12 rounded-full px-6 text-center"
                disabled={status === "validating"}
              />

              {status === "error" && (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                onClick={handleConnect}
                disabled={!feedUrl.trim() || status === "validating"}
                variant="ghost"
                className="w-full text-foreground font-medium"
              >
                {status === "validating" ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    {translations.validating}
                  </>
                ) : (
                  translations.connect
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Help Section - Simple list */}
      <div className="rounded-2xl bg-secondary/50 p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">{translations.helpTitle}</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><span className="text-foreground font-medium">Shopify:</span> {language === "zh" ? "设置 → 销售渠道 → Google → 产品Feed" : "Settings → Sales Channels → Google → Product Feed"}</p>
          <p><span className="text-foreground font-medium">WooCommerce:</span> {language === "zh" ? "安装 Google Product Feed 插件" : "Install Google Product Feed plugin"}</p>
          <p><span className="text-foreground font-medium">BigCommerce:</span> {language === "zh" ? "渠道管理 → Google Shopping" : "Channel Manager → Google Shopping"}</p>
          <p><span className="text-foreground font-medium">Magento:</span> {language === "zh" ? "营销 → SEO & 搜索 → 产品Feed" : "Marketing → SEO & Search → Product Feed"}</p>
        </div>
      </div>
    </div>
  )
}
