
import { useLanguage } from "@/lib/language-context"

export default function OwnSupplyPage() {
  const { t } = useLanguage()

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t("catalog.yourProducts")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("catalog.yourProductsDesc")}
        </p>
      </div>

      {/* Product Count */}
      <div className="rounded-2xl bg-secondary/50 p-6 flex items-center justify-between">
        <div>
          <span className="text-sm text-muted-foreground">{t("catalog.productsInCatalog")}</span>
          <p className="text-2xl font-semibold text-foreground tabular-nums mt-1">0</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("catalog.importToStart")}
        </span>
      </div>
    </div>
  )
}
