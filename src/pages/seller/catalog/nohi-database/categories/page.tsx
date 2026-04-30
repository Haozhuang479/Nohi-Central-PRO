
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

export default function NohiCategoriesPage() {
  const [showAll, setShowAll] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { t, language } = useLanguage()

  const categories = [
    { id: "QH6", name: language === "zh" ? "动物与宠物用品" : "Animals & Pet Supplies" },
    { id: "xoN", name: language === "zh" ? "服装与配饰" : "Apparel & Accessories" },
    { id: "YmF", name: language === "zh" ? "艺术与娱乐" : "Arts & Entertainment" },
    { id: "rXe", name: language === "zh" ? "婴幼儿用品" : "Baby & Toddler" },
    { id: "EG0", name: language === "zh" ? "商业与工业" : "Business & Industrial" },
    { id: "H3U", name: language === "zh" ? "相机与光学设备" : "Cameras & Optics" },
    { id: "SJ1", name: language === "zh" ? "电子产品" : "Electronics" },
    { id: "eih", name: language === "zh" ? "食品、饮料与烟草" : "Food, Beverages & Tobacco" },
    { id: "kL2", name: language === "zh" ? "家具" : "Furniture" },
    { id: "mN3", name: language === "zh" ? "五金" : "Hardware" },
    { id: "pQ4", name: language === "zh" ? "健康与美容" : "Health & Beauty" },
    { id: "rS5", name: language === "zh" ? "家居与园艺" : "Home & Garden" },
    { id: "tU6", name: language === "zh" ? "行李箱与包袋" : "Luggage & Bags" },
    { id: "vW7", name: language === "zh" ? "媒体" : "Media" },
    { id: "xY8", name: language === "zh" ? "办公用品" : "Office Supplies" },
    { id: "zA9", name: language === "zh" ? "宗教与礼仪用品" : "Religious & Ceremonial" },
    { id: "bC0", name: language === "zh" ? "软件" : "Software" },
    { id: "dE1", name: language === "zh" ? "运动用品" : "Sporting Goods" },
    { id: "fG2", name: language === "zh" ? "玩具与游戏" : "Toys & Games" },
    { id: "hI3", name: language === "zh" ? "车辆与配件" : "Vehicles & Parts" },
  ]

  const sampleProducts = [
    { id: "1", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=60&h=60&fit=crop", title: "Staples Pressboard Classification Folder, 1-divider, 1 3/4\" Expansion, Legal Size, Bri...", brand: "Staples" },
    { id: "2", image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=60&h=60&fit=crop", title: "Hot Wheels City Pista De Brinquedo Lava-rapido Mega Tubarao", brand: "Hot Wheels" },
    { id: "3", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=60&h=60&fit=crop", title: "Pantry Glassware Collection", brand: "Williams Sonoma" },
    { id: "4", image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=60&h=60&fit=crop", title: "Dessau Counter & Bar Stool", brand: "Williams Sonoma" },
    { id: "5", image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=60&h=60&fit=crop", title: "Women's Funnel Neck Wool-blend Short Coat", brand: "Abercrombie & Fitch" },
    { id: "6", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=60&h=60&fit=crop", title: "Wella Colorcharm Permanent Liquid Hair Color", brand: "Wella" },
  ]

  const visibleCategories = showAll ? categories : categories.slice(0, 8)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {language === "zh" ? "所有品类" : "All Categories"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("discover.categoriesDesc")}
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visibleCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={cn(
              "rounded-xl bg-secondary/50 p-4 text-left transition-all hover:bg-secondary/80",
              selectedCategory === cat.id ? "ring-1 ring-foreground" : ""
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground leading-tight">{cat.name}</h3>
                <span className="text-xs text-muted-foreground font-mono mt-1 block">{cat.id}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  copyToClipboard(cat.id)
                }}
                className="p-1 hover:bg-secondary rounded transition-colors shrink-0"
              >
                <Copy className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          </button>
        ))}
      </div>

      {/* Show More Button */}
      {!showAll && categories.length > 8 && (
        <Button
          variant="outline"
          onClick={() => setShowAll(true)}
          className="w-fit rounded-full"
        >
          {language === "zh" 
            ? `显示更多 ${categories.length - 8} 个品类`
            : `Show ${categories.length - 8} More Categories`}
          <ChevronDown className="size-4 ml-1" />
        </Button>
      )}

      {/* Products Table */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t("discover.products")}
        </h2>
        <div className="rounded-2xl bg-secondary/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[60px_1fr_180px] gap-4 px-4 py-3 bg-secondary/30 border-b border-secondary">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {language === "zh" ? "图片" : "Image"}
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {language === "zh" ? "标题" : "Title"}
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {language === "zh" ? "品牌" : "Brand"}
            </span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-secondary">
            {sampleProducts.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-[60px_1fr_180px] gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="size-[60px] rounded-lg bg-secondary overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-foreground line-clamp-2">{product.title}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground">{product.brand}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
