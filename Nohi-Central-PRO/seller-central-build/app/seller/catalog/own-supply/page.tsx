"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet } from "lucide-react"
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

      {/* Import Options */}
      <div className="flex flex-col gap-6">
        {/* CSV Upload */}
        <div className="rounded-2xl bg-secondary/50 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="size-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <FileSpreadsheet className="size-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-base font-medium text-foreground">{t("catalog.importFromCsv")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("catalog.importFromCsvDesc")}
                </p>
              </div>
            </div>
            <Link href="/seller/catalog/own-supply/import">
              <Button variant="outline" className="rounded-full shrink-0 gap-2">
                <Upload className="size-4" />
                {t("catalog.importProducts")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Download Template */}
        <div className="rounded-2xl bg-secondary/50 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="size-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <FileSpreadsheet className="size-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base font-medium text-foreground">{t("catalog.csvTemplate")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("catalog.csvTemplateDesc")}
                </p>
              </div>
            </div>
            <Button variant="ghost" className="rounded-full shrink-0 text-muted-foreground hover:text-foreground">
              {t("catalog.downloadTemplate")}
            </Button>
          </div>
        </div>
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
