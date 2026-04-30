
import { useState } from "react"
import { Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

const sampleProducts = [
  { id: "trench-coat", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300&h=300&fit=crop", title: "A-line Short Trench Coat", brand: "Abercrombie & Fitch" },
  { id: "aftercare-red", image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&h=300&fit=crop", title: "Aftercare Replacement In Parade Red - Women", brand: "Burberry" },
  { id: "pom-beanie", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop", title: "Baby Horse Fair Isle Pom Beanie", brand: "Janie and Jack" },
  { id: "sudadera-ekd", image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=300&h=300&fit=crop", title: "Sudadera En Algodon Con Ekd, Capucha Y Cremallera", brand: "Burberry" },
  { id: "roasting-rack", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop", title: "Stainless-steel Roasting Rack", brand: "Williams Sonoma" },
  { id: "dinner-plates", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop", title: "Famille Rose Scalloped Dinner Plates", brand: "Williams Sonoma" },
  { id: "rubber-bands", image: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=300&h=300&fit=crop", title: "Alliance Sterling Multi-purpose #12 Rubber Bands", brand: "Alliance Rubber Company" },
  { id: "smarties-candy", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop", title: "Smarties Hard Candy Assorted Flavors, 180 Count", brand: "Smarties" },
  { id: "teak-oil", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop", title: "Star Brite Outdoor Teak Oil, Cleaner And Brightener", brand: "Star brite" },
  { id: "wide-leg-pant", image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=300&fit=crop", title: "Becalm Mid-rise Wide-leg Pant", brand: "Lululemon" },
  { id: "clock-radio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop", title: "Alarm Clock Radio For Ipod", brand: "MEMOREX" },
  { id: "ballpoint-pens", image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&h=300&fit=crop", title: "Staples Ballpoint Pens", brand: "Staples" },
]

export default function NohiProductsPage() {
  const [search, setSearch] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const { language, t } = useLanguage()

  const filteredProducts = sampleProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
  )

  const toggleProduct = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {t("discover.products")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("discover.productsDesc")}
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("discover.searchProducts")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {/* Selected Count */}
      {selectedProducts.length > 0 && (
        <div className="rounded-xl bg-secondary/50 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-foreground">
            {selectedProducts.length} {language === "zh" ? "个商品已选择" : selectedProducts.length !== 1 ? "products selected" : "product selected"}
          </span>
          <Button size="sm" className="rounded-full">
            {t("discover.addToCatalog")}
          </Button>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredProducts.map((product) => {
          const isSelected = selectedProducts.includes(product.id)
          return (
            <Link
              key={product.id}
              href={`/seller/catalog/nohi-database/products/${product.id}`}
              className={cn(
                "group relative rounded-xl bg-secondary/50 overflow-hidden text-left transition-all",
                isSelected ? "ring-1 ring-foreground" : "hover:bg-secondary/80"
              )}
            >
              <div className="aspect-square relative bg-secondary">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => toggleProduct(product.id, e)}
                  className={cn(
                    "absolute top-2 right-2 size-6 rounded-full flex items-center justify-center transition-all",
                    isSelected 
                      ? "bg-foreground" 
                      : "bg-background/80 opacity-0 group-hover:opacity-100"
                  )}
                >
                  <Plus className={cn(
                    "size-3.5",
                    isSelected ? "text-background rotate-45" : "text-foreground"
                  )} />
                </button>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                  {product.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">{product.brand}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
