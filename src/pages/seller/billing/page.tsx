
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { Info, Plus, Pencil, CheckCircle2 } from "lucide-react"
import { Link } from "react-router-dom"

type BillingTab = "overview" | "invoices" | "transactions"

export default function BillingPage() {
  const { language, t } = useLanguage()
  const [tab, setTab] = useState<BillingTab>("overview")
  const [showAddMethod, setShowAddMethod] = useState(false)

  const tabs: { id: BillingTab; label: string }[] = [
    { id: "overview",      label: language === "zh" ? "概览"   : "Overview"     },
    { id: "invoices",      label: language === "zh" ? "发票"   : "Invoices"     },
    { id: "transactions",  label: language === "zh" ? "交易记录" : "Transactions" },
  ]

  return (
    <div className="flex flex-col min-h-full">

      <div className="p-6 md:p-10 flex flex-col gap-6 max-w-6xl mx-auto w-full">
        {/* Breadcrumb + title */}
        <div>

          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {language === "zh" ? "账单与付款" : "Billing and payments"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "zh" ? (
              <>在我们的 <Link to="/seller/billing/promotional-credits" className="underline hover:text-foreground">账单信息文章</Link> 中了解更多账单更新。</>
            ) : (
              <>Get more information on billing updates on our <Link to="/seller/billing/promotional-credits" className="underline hover:text-foreground">billing information article.</Link></>
            )}
          </p>
        </div>

        {/* Tabs + currency */}
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex gap-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                  tab === t.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

        </div>

        {tab === "overview" && (
          <>
            {/* Three metric cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Payment threshold */}
              <div className="rounded-xl bg-popover p-6 flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {language === "zh" ? "支付门槛" : "Payment threshold"}
                  <span className="relative group cursor-default">
                    <Info className="size-3.5 text-muted-foreground" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-foreground px-3 py-2 text-xs font-normal text-background opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                      {language === "zh"
                        ? "当您的账户消费达到此金额或自动到期日时，我们将向您收费。"
                        : "We'll charge you when you reach this amount spent on your account, or at your automatic due date."}
                    </span>
                  </span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground tabular-nums">$1,380</div>
                  <div className="text-sm text-muted-foreground tabular-nums">€1,202</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    0% {language === "zh" ? "已消耗" : "spent"}
                    <span className="text-muted-foreground font-normal"> ($0 - €0)</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full w-0 rounded-full bg-foreground" />
                  </div>
                </div>
              </div>

              {/* Credit limit */}
              <div className="rounded-xl bg-popover p-6 flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {language === "zh" ? "信用额度" : "Credit limit"}
                  <span className="relative group cursor-default">
                    <Info className="size-3.5 text-muted-foreground" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-foreground px-3 py-2 text-xs font-normal text-background opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                      {language === "zh"
                        ? "该账户可达到的最高未付金额（包括费用）。"
                        : "The maximum unpaid amount (including charges) you can reach for this account."}
                    </span>
                  </span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground tabular-nums">$3,000</div>
                  <div className="text-sm text-muted-foreground tabular-nums">€2,612</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    0% {language === "zh" ? "已消耗" : "spent"}
                    <span className="text-muted-foreground font-normal"> ($0 - €0)</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full w-0 rounded-full bg-foreground" />
                  </div>
                </div>
              </div>

              {/* Billing information */}
              <div className="rounded-xl bg-popover p-6 flex flex-col gap-4">
                <div className="text-sm font-medium text-foreground">
                  {language === "zh" ? "账单信息" : "Billing information"}
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === "zh" ? "计费方式" : "Billing method"}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {language === "zh" ? "动态计费" : "Dynamic billing"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {language === "zh" ? "计费日期" : "Billing date"}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {language === "zh" ? "门槛或月底" : "Threshold or end of month"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 -mt-2">
              <p className="text-xs text-muted-foreground">
                {language === "zh" ? "最多需24小时更新" : "May take up to 24h to update"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "zh" ? "最多需48小时更新" : "May take up to 48h to update"}
              </p>
            </div>

            {/* Payment methods + Billing address */}
            <div className="grid grid-cols-2 gap-8 mt-2">
              {/* Payment methods */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    {language === "zh" ? "支付方式" : "Payment methods"}
                  </h2>
                  <Button
                    size="sm"
                    onClick={() => setShowAddMethod(!showAddMethod)}
                    className="rounded-lg text-xs h-8"
                  >
                    <Plus className="size-3.5 mr-1" />
                    {language === "zh" ? "添加方式" : "Add method"}
                  </Button>
                </div>

                {/* Table */}
                <div className="rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        {(language === "zh"
                          ? ["名称", "方式", "信息", "状态", "操作"]
                          : ["Name", "Method", "Info", "Status", "Actions"]
                        ).map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-3">
                          <div className="text-sm font-medium text-foreground">Venvia</div>
                          <div className="text-xs text-muted-foreground">
                            {language === "zh" ? "主要" : "Primary"}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {/* Mastercard icon */}
                          <div className="flex items-center gap-0.5">
                            <div className="size-4 rounded-full bg-red-500 opacity-90" />
                            <div className="size-4 rounded-full bg-orange-400 opacity-80 -ml-2" />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-foreground tabular-nums">
                          <div>**** **** **** 7133</div>
                          <div className="text-xs text-muted-foreground">Exp. 07/31</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 className="size-3.5" />
                            {language === "zh" ? "有效" : "Valid"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {showAddMethod && (
                  <div className="rounded-xl bg-popover p-4 flex flex-col gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {language === "zh" ? "添加新卡" : "Add new card"}
                    </p>
                    <input
                      placeholder="1234 5678 9012 3456"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:border-foreground"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="MM/YY" className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:border-foreground" />
                      <input placeholder="CVC" className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:border-foreground" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowAddMethod(false)} className="rounded-lg">
                        {language === "zh" ? "取消" : "Cancel"}
                      </Button>
                      <Button size="sm" onClick={() => setShowAddMethod(false)} className="rounded-lg">
                        {language === "zh" ? "添加" : "Add card"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Billing address */}
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-foreground">
                  {language === "zh" ? "账单地址" : "Billing address"}
                </h2>
                <div className="flex flex-col gap-3">
                  {[
                    { label: language === "zh" ? "公司名称" : "Company name",   value: "FIFTEEN AI" },
                    { label: language === "zh" ? "国家"     : "Country",        value: "United States" },
                    { label: language === "zh" ? "州/省"    : "State",          value: "—" },
                    { label: language === "zh" ? "账单地址" : "Billing address", value: "1111B S Governors Ave STE 28655" },
                    { label: language === "zh" ? "邮政编码" : "Post code",      value: "19904" },
                    { label: language === "zh" ? "城市"     : "City",           value: "Dover" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-medium text-foreground text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "invoices" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground text-sm">
              {language === "zh" ? "暂无发票记录。" : "No invoices yet."}
            </p>
          </div>
        )}

        {tab === "transactions" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground text-sm">
              {language === "zh" ? "暂无交易记录。" : "No transactions yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
