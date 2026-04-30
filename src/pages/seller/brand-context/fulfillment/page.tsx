
import { useState } from "react"
import { SectionWrapper, FormSection } from "@/components/seller/section-wrapper"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/language-context"

export default function FulfillmentPage() {
  const { t } = useLanguage()
  
  const shippingRanks = [
    { value: "platinum", label: t("fulfillment.platinum"), description: t("fulfillment.platinumDesc"), highlight: true },
    { value: "gold", label: t("fulfillment.gold"), description: t("fulfillment.goldDesc"), highlight: false },
    { value: "silver", label: t("fulfillment.silver"), description: t("fulfillment.silverDesc"), highlight: false },
    { value: "standard", label: t("fulfillment.standard"), description: t("fulfillment.standardDesc"), highlight: false },
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

  return (
    <SectionWrapper
      title={t("fulfillment.title")}
      subtitle={t("fulfillment.pageDesc")}
    >
      {/* Shipping SLA / Rank */}
      <FormSection title={t("fulfillment.shippingSla")} description={t("fulfillment.shippingSlaDesc")}>
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
                  <Badge variant="secondary" className="text-xs">{t("common.recommended")}</Badge>
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
          label={t("fulfillment.processingTime")}
          value={processingTime}
          onChange={setProcessingTime}
          suffix={t("fulfillment.days")}
        />
        <MetricInput
          label={t("fulfillment.onTimeRate")}
          value={onTimeRate}
          onChange={setOnTimeRate}
          suffix="%"
        />
        <MetricInput
          label={t("fulfillment.returnRate")}
          value={returnRate}
          onChange={setReturnRate}
          suffix="%"
        />
        <MetricInput
          label={t("fulfillment.damageRate")}
          value={damageRate}
          onChange={setDamageRate}
          suffix="%"
        />
      </div>

      {/* Refund Time */}
      <FormSection title={t("fulfillment.refundTime")} description={t("fulfillment.refundTimeDesc")}>
        <Select value={refundTime} onValueChange={setRefundTime}>
          <SelectTrigger className="rounded-xl bg-secondary border-border w-full md:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1-3">1-3 {t("fulfillment.businessDays")}</SelectItem>
            <SelectItem value="3-5">3-5 {t("fulfillment.businessDays")}</SelectItem>
            <SelectItem value="5-7">5-7 {t("fulfillment.businessDays")}</SelectItem>
            <SelectItem value="7-14">7-14 {t("fulfillment.businessDays")}</SelectItem>
          </SelectContent>
        </Select>
      </FormSection>

      {/* Return Policy */}
      <FormSection title={t("fulfillment.returnPolicy")} description={t("fulfillment.returnPolicyDesc")}>
        <Textarea
          value={returnPolicy}
          onChange={(e) => setReturnPolicy(e.target.value)}
          rows={4}
          className="rounded-xl bg-secondary border-border resize-none text-sm"
          placeholder={t("fulfillment.returnPolicyPlaceholder")}
        />
      </FormSection>

      {/* Note */}
      <div className="rounded-2xl bg-secondary/50 p-4">
        <p className="text-xs text-muted-foreground">
          {t("fulfillment.note")}
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <Button className="rounded-full px-8">{t("common.saveChanges")}</Button>
      </div>
    </SectionWrapper>
  )
}

function MetricInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix: string
}) {
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
