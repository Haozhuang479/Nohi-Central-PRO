
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

const portfolioAccounts = [
  { name: "Demo Store", current: true, role: "Administrator", type: "Advertiser" },
]

export default function AccountPage() {
  const { language } = useLanguage()
  const [search, setSearch] = useState("")
  const [itemsPerPage, setItemsPerPage] = useState(25)

  const filtered = portfolioAccounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-10">

      {/* User profile */}
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {language === "zh" ? "用户资料" : "User profile"}
        </h1>

        {/* Details */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            {language === "zh" ? "详细信息" : "Details"}
          </h2>
          <div className="rounded-xl bg-popover px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Haozhuang Dai</span>
              <span className="text-sm text-muted-foreground">haozhuang@venvia.store</span>
            </div>
            <Button className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              <ArrowRight className="size-4" />
              {language === "zh" ? "编辑账号" : "Edit your account"}
            </Button>
          </div>
        </div>

        {/* Personal settings rows */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            {language === "zh" ? "个人设置" : "Personal settings"}
          </h2>
          <div className="rounded-xl bg-popover overflow-hidden">
            {[
              { label: language === "zh" ? "货币" : "Currency", value: "EUR" },
              { label: language === "zh" ? "时区" : "Timezone", value: "GMT" },
              { label: language === "zh" ? "语言" : "Language", value: "English" },
            ].map((row) => (
              <div key={row.label} className="flex items-center min-h-[72px] border-b border-border last:border-b-0">
                <div className="w-64 shrink-0 px-6 py-4">
                  <span className="text-sm font-semibold text-foreground">{row.label}</span>
                </div>
                <div className="w-px self-stretch bg-border shrink-0" />
                <div className="flex-1 px-6 py-4">
                  <span className="text-sm text-muted-foreground">{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            {language === "zh" ? "账号组合" : "Portfolio"}
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder=""
              className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-popover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">
                  {language === "zh" ? "账号" : "Account"}
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">
                  {language === "zh" ? "角色" : "Role"}
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">
                  {language === "zh" ? "账号类型" : "Account type"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => (
                <tr key={acc.name} className="border-t border-border hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-foreground">{acc.name}</span>
                    {acc.current && (
                      <span className="text-sm text-muted-foreground ml-1">( {language === "zh" ? "当前" : "current"} )</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {language === "zh" ? "管理员" : acc.role}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary" className="rounded-md text-xs font-medium">
                      {acc.type}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{language === "zh" ? "每页条数" : "Items per page"}</span>
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="appearance-none bg-popover border border-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 pointer-events-none text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>1 – 1 {language === "zh" ? "共" : "of"} 1</span>
            <button disabled className="size-7 rounded-lg border border-border flex items-center justify-center opacity-40">
              <ChevronLeft className="size-3.5" />
            </button>
            <button className="size-7 rounded-lg border border-border bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
              1
            </button>
            <button disabled className="size-7 rounded-lg border border-border flex items-center justify-center opacity-40">
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer links */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border pt-6">
        {["Home", "Terms of sale", "Privacy policy", "Cookie Management", "Contact"].map((l) => (
          <a key={l} href="#" className="hover:text-foreground transition-colors">{l}</a>
        ))}
        <span className="ml-auto">Copyright ©2026 Nohi. All rights reserved.</span>
      </div>
    </div>
  )
}
