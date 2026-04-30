
import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronUp, ChevronDown } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

function FaqItem({
  q, a, table, colCurrency, colMin, colMax,
}: {
  q: string
  a: string
  table?: { currency: string; min: string; max: string }[]
  colCurrency: string
  colMin: string
  colMax: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-2xl bg-popover overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-6 py-5 text-left hover:bg-secondary/40 transition-colors"
      >
        {open
          ? <ChevronUp className="size-4 text-muted-foreground mt-0.5 shrink-0" />
          : <ChevronDown className="size-4 text-muted-foreground mt-0.5 shrink-0" />
        }
        <span className="text-base font-semibold text-foreground leading-snug">{q}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 pl-[3.25rem] flex flex-col gap-3">
          {a.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm text-foreground/80 leading-relaxed">{para}</p>
          ))}
          {table && (
            <div className="mt-2 rounded-xl overflow-hidden bg-secondary/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    <th className="text-left px-4 py-2.5 font-medium text-foreground text-xs">{colCurrency}</th>
                    <th className="text-left px-4 py-2.5 font-medium text-foreground text-xs">{colMin}</th>
                    <th className="text-left px-4 py-2.5 font-medium text-foreground text-xs">{colMax}</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, i) => (
                    <tr key={row.currency} className={i > 0 ? "border-t border-border" : ""}>
                      <td className="px-4 py-3 text-foreground">{row.currency}</td>
                      <td className="px-4 py-3 text-foreground">{row.min}</td>
                      <td className="px-4 py-3 text-foreground">{row.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PromotionalCreditsFaqPage() {
  const { t } = useLanguage()

  const currencyTable = [
    { currency: "USD", min: "$400", max: "$1,200" },
    { currency: "GBP", min: "£320", max: "£960" },
    { currency: "EUR", min: "€360", max: "€1,080" },
  ]

  const faqs = [
    { qKey: "faq.q1", aKey: "faq.a1" },
    { qKey: "faq.q2", aKey: "faq.a2" },
    { qKey: "faq.q3", aKey: "faq.a3" },
    { qKey: "faq.q4", aKey: "faq.a4" },
    { qKey: "faq.q5", aKey: "faq.a5" },
    { qKey: "faq.q6", aKey: "faq.a6" },
    { qKey: "faq.q7", aKey: "faq.a7", hasTable: true },
    { qKey: "faq.q8", aKey: "faq.a8" },
  ]

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-1">
        <Link
          href="/seller/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          {t("faq.back")}
        </Link>
        <p className="text-xs text-muted-foreground">{t("faq.breadcrumb")}</p>
      </div>

      <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t("faq.title")}</h1>

      <div className="flex flex-col gap-3">
        {faqs.map(({ qKey, aKey, hasTable }) => (
          <FaqItem
            key={qKey}
            q={t(qKey)}
            a={t(aKey)}
            table={hasTable ? currencyTable : undefined}
            colCurrency={t("faq.tableColCurrency")}
            colMin={t("faq.tableColMin")}
            colMax={t("faq.tableColMax")}
          />
        ))}
      </div>
    </div>
  )
}
