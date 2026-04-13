import { useState } from "react"
import { Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

const sampleBrands = [
  { id: "loewe", name: "Loewe", logo: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=40&h=40&fit=crop", commission: null },
  { id: "louis-vuitton", name: "Louis Vuitton", logo: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=40&h=40&fit=crop", commission: null },
  { id: "rolex", name: "Rolex", logo: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=40&h=40&fit=crop", commission: null },
  { id: "burberry", name: "Burberry", logo: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=40&h=40&fit=crop", commission: null },
  { id: "hermes", name: "Hermes", logo: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=40&h=40&fit=crop", commission: null },
  { id: "fendi", name: "Fendi", logo: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=40&h=40&fit=crop", commission: null },
  { id: "blundstone", name: "Blundstone", logo: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=40&h=40&fit=crop", commission: null },
  { id: "alexander-mcqueen", name: "Alexander McQueen", logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=40&h=40&fit=crop", commission: "Up to 1.75%" },
  { id: "dolce-gabbana", name: "Dolce and Gabbana", logo: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=40&h=40&fit=crop", commission: "Up to 2.8%" },
  { id: "balenciaga", name: "Balenciaga", logo: "https://images.unsplash.com/photo-1518894781321-630e638d0742?w=40&h=40&fit=crop", commission: null },
  { id: "bottega-veneta", name: "Bottega Veneta", logo: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=40&h=40&fit=crop", commission: null },
  { id: "gucci", name: "Gucci", logo: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=40&h=40&fit=crop", commission: null },
]

export default function NohiBrandsPage() {
  const [search, setSearch] = useState("")
  const { t, language } = useLanguage()

  const filteredBrands = sampleBrands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {t("discover.brands")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("discover.brandsDesc")}
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("discover.searchBrands")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {/* Brand List */}
      <div className="rounded-2xl bg-secondary/50 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 bg-secondary/30 border-b border-secondary">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {language === "zh" ? "品牌" : "Brand"}
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-32 text-right">
            {language === "zh" ? "佣金" : "Commission"}
          </span>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-secondary">
          {filteredBrands.map((brand) => (
            <Link
              key={brand.id}
              to={`/seller/catalog/nohi-database/brands/${brand.id}`}
              className="w-full grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-secondary overflow-hidden shrink-0">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-medium text-foreground">{brand.name}</span>
              </div>
              <div className="w-32 flex items-center justify-end">
                {brand.commission ? (
                  <span className="text-xs font-medium text-foreground bg-secondary px-2 py-1 rounded">
                    {language === "zh" ? `高达 ${brand.commission.replace("Up to ", "")}` : brand.commission}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
