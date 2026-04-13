"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function NohiWebsitesPage() {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<{ url: string; productCount: number }[] | null>(null)
  const { t, language } = useLanguage()

  const handleSearch = () => {
    if (search.trim()) {
      // Mock search results
      setResults([
        { url: search.includes(".") ? search : `${search}.com`, productCount: Math.floor(Math.random() * 500) + 50 },
      ])
    }
  }

  const handleFeelingLucky = () => {
    const randomSites = [
      { url: "williams-sonoma.com", productCount: 1247 },
      { url: "abercrombie.com", productCount: 892 },
      { url: "burberry.com", productCount: 654 },
      { url: "staples.com", productCount: 3421 },
    ]
    setResults([randomSites[Math.floor(Math.random() * randomSites.length)]])
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8 min-h-[70vh]">
      {/* Centered Search */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            {t("discover.websites")}
          </h1>
          <p className="text-base text-muted-foreground mt-3">
            {language === "zh" 
              ? "输入网站URL查看我们已索引的所有产品。"
              : "Type a website URL to see all the products we've indexed for it."}
          </p>
        </div>

        <div className="w-full max-w-lg">
          <div className="relative flex items-center">
            <Input
              placeholder={language === "zh" ? "通过URL搜索网站" : "Search websites by URL"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-12 pl-4 pr-28 rounded-xl text-base"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={handleFeelingLucky}
                className="px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                {t("discover.random")}
              </button>
              <button
                type="button"
                onClick={handleSearch}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              >
                <Search className="size-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="w-full max-w-lg mt-4">
            <div className="rounded-2xl bg-secondary/50 overflow-hidden">
              {results.map((result) => (
                <div
                  key={result.url}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <span className="text-sm font-medium text-foreground">{result.url}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {language === "zh" 
                        ? `已索引 ${result.productCount.toLocaleString()} 个产品`
                        : `${result.productCount.toLocaleString()} products indexed`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-full">
                    {language === "zh" ? "查看产品" : "View Products"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
