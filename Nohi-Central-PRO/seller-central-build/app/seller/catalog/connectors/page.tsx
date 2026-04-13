"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

export default function ConnectorsPage() {
  const { language } = useLanguage()

  const connectors = [
    { 
      id: "shopify", 
      name: "Shopify", 
      description: language === "zh" ? "连接您的Shopify店铺以自动同步产品。" : "Connect your Shopify store to sync products automatically.",
      status: "available",
      action: language === "zh" ? "安装Nohi应用" : "Install Nohi App"
    },
    { 
      id: "woocommerce", 
      name: "WooCommerce", 
      description: language === "zh" ? "从您的WooCommerce店铺同步产品。" : "Sync products from your WooCommerce store.",
      status: "coming"
    },
    { 
      id: "bigcommerce", 
      name: "BigCommerce", 
      description: language === "zh" ? "导入您的BigCommerce目录。" : "Import your BigCommerce catalog.",
      status: "coming"
    },
    { 
      id: "magento", 
      name: "Magento", 
      description: language === "zh" ? "连接您的Magento店铺。" : "Connect your Magento store.",
      status: "coming"
    },
    { 
      id: "amazon", 
      name: "Amazon Seller", 
      description: language === "zh" ? "从Amazon卖家中心同步产品。" : "Sync products from Amazon Seller Central.",
      status: "coming"
    },
    { 
      id: "custom", 
      name: language === "zh" ? "自定义API" : "Custom API", 
      description: language === "zh" ? "使用我们的API构建自定义集成。" : "Use our API to build a custom integration.",
      status: "coming"
    },
  ]

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {language === "zh" ? "平台连接器" : "Connectors"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {language === "zh" ? "从这些平台自动同步您的产品目录。" : "Sync your product catalog automatically from these platforms."}
        </p>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connectors.map((connector) => (
          <div
            key={connector.id}
            className={cn(
              "rounded-2xl bg-secondary/50 p-5 flex flex-col gap-3",
              connector.status === "coming" && "opacity-60"
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">{connector.name}</h3>
              {connector.status === "coming" && (
                <span className="text-xs text-muted-foreground">
                  {language === "zh" ? "即将推出" : "Coming"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex-1">{connector.description}</p>
            {connector.status === "available" ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full w-fit"
                onClick={() => window.open("https://apps.shopify.com", "_blank")}
              >
                {connector.action}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full w-fit"
                disabled
              >
                {language === "zh" ? "即将推出" : "Coming Soon"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
