import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { searchProducts, type NohiProduct } from "@/lib/nohi-api"

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-secondary/50 overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/3 mt-1" />
      </div>
    </div>
  )
}

export default function NohiProductsPage() {
  const [query, setQuery] = useState("")
  const [products, setProducts] = useState<NohiProduct[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { language, t } = useLanguage()

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setProducts(null)
    setSelectedIds([])
    try {
      const result = await searchProducts(q)
      setProducts(result.products)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {t("discover.products")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("discover.productsDesc")}
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("discover.searchProducts")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="rounded-xl h-11 px-5"
        >
          {loading
            ? language === "zh" ? "搜索中…" : "Searching…"
            : language === "zh" ? "搜索" : "Search"}
        </Button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-2xl bg-secondary/50 p-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="rounded-full" onClick={handleSearch}>
            {language === "zh" ? "重试" : "Retry"}
          </Button>
        </div>
      )}

      {/* Empty / initial state */}
      {!loading && !error && products === null && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="size-14 rounded-2xl bg-secondary/50 flex items-center justify-center">
            <Search className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {language === "zh" ? "搜索产品以发现更多…" : "Search for products to discover…"}
          </p>
        </div>
      )}

      {/* Empty results */}
      {!loading && !error && products !== null && products.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <p className="text-sm text-muted-foreground">
            {language === "zh" ? "未找到相关产品。" : "No products found for your search."}
          </p>
        </div>
      )}

      {/* Product grid */}
      {!loading && products !== null && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => {
            const isSelected = selectedIds.includes(product.id)
            return (
              <div
                key={product.id}
                onClick={() => toggleSelect(product.id)}
                className={cn(
                  "rounded-2xl bg-secondary/50 overflow-hidden group relative cursor-pointer transition-all",
                  isSelected ? "ring-2 ring-foreground" : ""
                )}
              >
                {/* Image area */}
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs text-muted-foreground truncate">{product.brand ?? ""}</p>
                  <p className="text-sm font-medium line-clamp-2 leading-snug mt-0.5">{product.title}</p>
                  {product.price != null && (
                    <p className="text-sm font-semibold mt-1">
                      {product.currency === "USD" || !product.currency ? "$" : product.currency + " "}
                      {product.price.toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isSelected) toggleSelect(product.id)
                    }}
                  >
                    {t("discover.addToCatalog")}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom toolbar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-2xl bg-secondary border border-secondary shadow-lg px-5 py-3 flex items-center gap-4">
            <span className="text-sm text-foreground">
              {selectedIds.length}{" "}
              {language === "zh"
                ? "个商品已选择"
                : selectedIds.length === 1 ? "product selected" : "products selected"}
            </span>
            <span className="text-muted-foreground">·</span>
            <Button size="sm" className="rounded-full">
              {t("discover.addToCatalog")}
            </Button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {language === "zh" ? "取消" : "Clear"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
