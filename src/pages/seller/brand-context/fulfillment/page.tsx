import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/lib/language-context"

// ── FormSection ───────────────────────────────────────────────────────────────

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-secondary/50 p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// ── MetricInput ───────────────────────────────────────────────────────────────

function MetricInput({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) {
  return (
    <div className="rounded-2xl bg-secondary/50 p-4 flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-xl font-semibold text-foreground tabular-nums w-full outline-none"
        />
        <span className="text-sm text-muted-foreground shrink-0">{suffix}</span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const REGIONS = ["US", "CA", "EU", "UK", "AU", "Global"] as const
type Region = (typeof REGIONS)[number]

export default function FulfillmentPage() {
  const { language } = useLanguage()
  const zh = language === "zh"

  // Shipping rank cards
  const shippingRanks = [
    {
      value: "platinum",
      label: zh ? "铂金" : "Platinum",
      description: zh ? "1-2 个工作日送达，退货率 <3%，准时率 >99%" : "1–2 business day dispatch, <3% return rate, >99% on-time",
      highlight: true,
    },
    {
      value: "gold",
      label: zh ? "黄金" : "Gold",
      description: zh ? "1-3 个工作日送达，退货率 <5%，准时率 >97%" : "1–3 business day dispatch, <5% return rate, >97% on-time",
      highlight: false,
    },
    {
      value: "silver",
      label: zh ? "白银" : "Silver",
      description: zh ? "3-5 个工作日送达，退货率 <8%，准时率 >93%" : "3–5 business day dispatch, <8% return rate, >93% on-time",
      highlight: false,
    },
    {
      value: "standard",
      label: zh ? "标准" : "Standard",
      description: zh ? "5+ 个工作日送达，基础履约能力" : "5+ business day dispatch, basic fulfillment",
      highlight: false,
    },
  ]

  const [shippingRank, setShippingRank] = useState("silver")
  const [processingTime, setProcessingTime] = useState("3-5")
  const [onTimeRate, setOnTimeRate] = useState("96")
  const [returnRate, setReturnRate] = useState("4.2")
  const [damageRate, setDamageRate] = useState("0.8")
  const [refundTime, setRefundTime] = useState("5-7")
  const [returnPolicy, setReturnPolicy] = useState(
    "30-day return policy. Items must be unused and in original packaging. Free return shipping for defective items. Customer pays return shipping for change-of-mind returns."
  )
  const [supportEmail, setSupportEmail] = useState("support@yourbrand.com")
  const [selectedRegions, setSelectedRegions] = useState<Region[]>(["US", "CA"])

  const toggleRegion = (r: Region) => {
    setSelectedRegions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    )
  }

  const currentRank = shippingRanks.find((r) => r.value === shippingRank)

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {zh ? "履约" : "Fulfillment"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {zh
              ? "配送SLA、退换政策、处理时间和区域设置。"
              : "Shipping SLA, return policy, processing time, and regional settings."}
          </p>
        </div>
        {currentRank && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{zh ? "当前等级：" : "Rank:"}</span>
            <Badge className="bg-foreground text-background text-xs capitalize">
              {currentRank.label}
            </Badge>
          </div>
        )}
      </div>

      {/* Shipping SLA / Rank */}
      <FormSection
        title={zh ? "配送等级 (SLA)" : "Shipping SLA"}
        description={zh ? "您的履约表现将被智能体用于推荐排序。" : "Your fulfillment performance is used by agents for recommendation ranking."}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shippingRanks.map((rank) => (
            <button
              key={rank.value}
              type="button"
              onClick={() => setShippingRank(rank.value)}
              className={cn(
                "p-4 rounded-xl border text-left transition-all",
                shippingRank === rank.value
                  ? "border-foreground bg-foreground/5"
                  : "border-border bg-secondary hover:bg-secondary/80"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{rank.label}</span>
                {rank.highlight && (
                  <Badge variant="secondary" className="text-xs">
                    {zh ? "推荐" : "Recommended"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{rank.description}</p>
            </button>
          ))}
        </div>
      </FormSection>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricInput
          label={zh ? "处理时间" : "Processing Time"}
          value={processingTime}
          onChange={setProcessingTime}
          suffix={zh ? "天" : "days"}
        />
        <MetricInput
          label={zh ? "准时率" : "On-Time Rate"}
          value={onTimeRate}
          onChange={setOnTimeRate}
          suffix="%"
        />
        <MetricInput
          label={zh ? "退货率" : "Return Rate"}
          value={returnRate}
          onChange={setReturnRate}
          suffix="%"
        />
        <MetricInput
          label={zh ? "损坏率" : "Damage Rate"}
          value={damageRate}
          onChange={setDamageRate}
          suffix="%"
        />
      </div>

      {/* Refund Time */}
      <FormSection
        title={zh ? "退款时效" : "Refund Time"}
        description={zh ? "从收到退货到处理退款的时间。" : "Time from receiving a return to processing the refund."}
      >
        <Select value={refundTime} onValueChange={setRefundTime}>
          <SelectTrigger className="rounded-xl bg-secondary border-border w-full md:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1-3">1-3 {zh ? "个工作日" : "business days"}</SelectItem>
            <SelectItem value="3-5">3-5 {zh ? "个工作日" : "business days"}</SelectItem>
            <SelectItem value="5-7">5-7 {zh ? "个工作日" : "business days"}</SelectItem>
            <SelectItem value="7-14">7-14 {zh ? "个工作日" : "business days"}</SelectItem>
          </SelectContent>
        </Select>
      </FormSection>

      {/* Return Policy */}
      <FormSection
        title={zh ? "退换政策" : "Return Policy"}
        description={zh ? "智能体在推荐您的产品时会引用此退换政策。" : "Agents will reference this when recommending your products."}
      >
        <Textarea
          value={returnPolicy}
          onChange={(e) => setReturnPolicy(e.target.value)}
          rows={4}
          className="rounded-xl bg-secondary border-border resize-none text-sm"
          placeholder={zh ? "描述您的退换政策…" : "Describe your return and exchange policy…"}
        />
      </FormSection>

      {/* Regional Settings */}
      <FormSection
        title={zh ? "配送地区" : "Regional Settings"}
        description={zh ? "选择您目前支持配送的地区。" : "Select regions where you currently ship."}
      >
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => toggleRegion(region)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                selectedRegions.includes(region)
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary border-border text-foreground hover:bg-secondary/80"
              )}
            >
              {region}
            </button>
          ))}
        </div>
        {selectedRegions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {zh ? "请至少选择一个地区。" : "Please select at least one region."}
          </p>
        )}
      </FormSection>

      {/* Support Contact */}
      <FormSection
        title={zh ? "客服联系邮箱" : "Support Contact"}
        description={zh ? "客户遇到履约问题时智能体可引用的联系方式。" : "Contact email agents can surface for fulfillment-related questions."}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="support-email" className="text-xs text-muted-foreground">
            {zh ? "邮箱地址" : "Email address"}
          </Label>
          <Input
            id="support-email"
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="support@yourbrand.com"
            className="rounded-xl bg-secondary border-border md:max-w-sm"
          />
        </div>
      </FormSection>

      {/* Note */}
      <div className="rounded-2xl bg-secondary/50 p-4">
        <p className="text-xs text-muted-foreground">
          {zh
            ? "履约数据将影响您在 AI 渠道中的推荐排名。准确填写可提升曝光率。"
            : "Fulfillment data influences your recommendation ranking across AI channels. Accurate data improves your visibility."}
        </p>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" className="rounded-full px-6">
          {zh ? "取消" : "Cancel"}
        </Button>
        <Button className="rounded-full px-8">
          {zh ? "保存更改" : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
