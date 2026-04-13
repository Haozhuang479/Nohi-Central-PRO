"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, CreditCard, Plus, Check, ExternalLink, Coins, ChevronDown, Globe } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

const categories = [
  "Fashion & Apparel",
  "Beauty & Personal Care",
  "Electronics",
  "Home & Garden",
  "Sports & Outdoors",
  "Toys & Games",
  "Food & Beverages",
  "Health & Wellness",
  "Books & Media",
  "Jewelry & Accessories",
]

const gmvRanges = [
  "Less than $100K",
  "$100K - $500K",
  "$500K - $1M",
  "$1M - $5M",
  "$5M - $10M",
  "More than $10M",
]

const tokenPlans = [
  { id: "starter", name: "Starter", tokens: 10000, price: 49, popular: false },
  { id: "growth", name: "Growth", tokens: 50000, price: 199, popular: true },
  { id: "scale", name: "Scale", tokens: 200000, price: 699, popular: false },
]

export default function SettingsPage() {
  const [brandName, setBrandName] = useState("Nohi Demo Store")
  const [storeLink, setStoreLink] = useState("https://nohi-demo.myshopify.com")
  const [category, setCategory] = useState("Fashion & Apparel")
  const [gmvRange, setGmvRange] = useState("$500K - $1M")
  const [teamSize, setTeamSize] = useState("8")
  const [isSaving, setIsSaving] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; type: string; last4: string; isDefault: boolean }>>([
    { id: "1", type: "visa", last4: "4242", isDefault: true }
  ])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const { language, setLanguage, t } = useLanguage()

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
    }, 800)
  }

  const handleAddPayment = () => {
    // Simulate adding a payment method
    const newMethod = {
      id: String(paymentMethods.length + 1),
      type: "mastercard",
      last4: "8888",
      isDefault: false
    }
    setPaymentMethods([...paymentMethods, newMethod])
    setShowAddPayment(false)
  }

  const handleSetDefault = (id: string) => {
    setPaymentMethods(paymentMethods.map(pm => ({
      ...pm,
      isDefault: pm.id === id
    })))
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/seller"
          className="flex size-8 items-center justify-center rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("settings.description")}
          </p>
        </div>
      </div>

      {/* Language Settings */}
      <div className="flex flex-col gap-4 rounded-2xl bg-secondary/50 p-6">
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-foreground" />
          <h2 className="text-base font-medium text-foreground">{t("settings.language")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("settings.languageDesc")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl transition-all",
              language === "en"
                ? "bg-foreground text-background"
                : "bg-secondary/50 hover:bg-secondary text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">EN</span>
              <span className="text-sm font-medium">English</span>
            </div>
            {language === "en" && <Check className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => setLanguage("zh")}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl transition-all",
              language === "zh"
                ? "bg-foreground text-background"
                : "bg-secondary/50 hover:bg-secondary text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">中</span>
              <span className="text-sm font-medium">简体中文</span>
            </div>
            {language === "zh" && <Check className="size-4" />}
          </button>
        </div>
        {language === "zh" && (
          <p className="text-xs text-muted-foreground">
            {t("settings.languageNote")}
          </p>
        )}
      </div>

      {/* Store Information Form - Collapsible */}
      <Collapsible defaultOpen={false} className="rounded-2xl bg-secondary/50 bg-popover">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-6 text-left">
          <h2 className="text-base font-medium text-foreground">{t("settings.storeInfo")}</h2>
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-6 pb-6">
          <div className="flex flex-col gap-6">
            {/* Brand Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="brand-name" className="text-sm font-medium">
                {t("settings.brandName")}
              </Label>
              <Input
                id="brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Your brand name"
                className="rounded-xl"
              />
            </div>

            {/* Store Link */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="store-link" className="text-sm font-medium">
                {t("settings.storeLink")}
              </Label>
              <Input
                id="store-link"
                value={storeLink}
                onChange={(e) => setStoreLink(e.target.value)}
                placeholder="https://your-store.myshopify.com"
                className="rounded-xl"
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="category" className="text-sm font-medium">
                {t("settings.category")}
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" className="rounded-xl">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Yearly GMV Range */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="gmv-range" className="text-sm font-medium">
                {t("settings.gmvRange")}
              </Label>
              <Select value={gmvRange} onValueChange={setGmvRange}>
                <SelectTrigger id="gmv-range" className="rounded-xl">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {gmvRanges.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Size */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="team-size" className="text-sm font-medium">
                {t("settings.teamSize")}
              </Label>
              <Input
                id="team-size"
                type="number"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                placeholder="e.g. 5"
                className="rounded-xl"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="rounded-xl"
              >
                {t("settings.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-xl"
              >
                {isSaving ? t("settings.saving") : t("settings.saveChanges")}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Payment Methods */}
      <div className="flex flex-col gap-4 rounded-2xl bg-secondary/50 bg-popover p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">{t("settings.paymentMethods")}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddPayment(true)}
            className="rounded-full text-xs"
          >
            <Plus className="size-3.5 mr-1.5" />
            {t("settings.addPaymentMethod")}
          </Button>
        </div>

        {/* Payment Methods List */}
        <div className="flex flex-col gap-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border",
                method.isDefault ? "border-foreground bg-secondary/30" : "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-secondary flex items-center justify-center">
                  <CreditCard className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground capitalize">
                      {method.type}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("settings.endingIn")} {method.last4}
                    </span>
                    {method.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">{t("settings.default")}</Badge>
                    )}
                  </div>
                </div>
              </div>
              {!method.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetDefault(method.id)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("settings.setAsDefault")}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Add Payment Modal/Form */}
        {showAddPayment && (
          <div className="rounded-xl bg-secondary/50 bg-secondary/30 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">{t("settings.cardNumber")}</Label>
                <Input placeholder="1234 5678 9012 3456" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">{t("settings.expiryDate")}</Label>
                  <Input placeholder="MM/YY" className="rounded-xl" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">CVC</Label>
                  <Input placeholder="123" className="rounded-xl" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddPayment(false)}
                  className="rounded-xl"
                >
                  {t("settings.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddPayment}
                  className="rounded-xl"
                >
                  {t("settings.addCard")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Buy Extra Tokens */}
      <div className="flex flex-col gap-4 rounded-2xl bg-secondary/50 bg-popover p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="size-5 text-foreground" />
              <h2 className="text-base font-medium text-foreground">{t("settings.buyTokens")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("settings.tokensDesc")}
            </p>
          </div>
          <Link
            href="#"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("settings.learnTokens")}
            <ExternalLink className="size-3" />
          </Link>
        </div>

        {/* Current Balance */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 bg-secondary/50">
          <span className="text-sm text-muted-foreground">{t("settings.currentBalance")}</span>
          <span className="text-lg font-semibold text-foreground tabular-nums">2,450 {t("settings.tokens")}</span>
        </div>

        {/* Token Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tokenPlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
              className={cn(
                "relative flex flex-col p-4 rounded-xl border text-left transition-all",
                selectedPlan === plan.id
                  ? "border-foreground ring-1 ring-foreground"
                  : "border-border hover:border-foreground/30"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-2 right-3 text-[10px] bg-foreground text-background">
                  {t("settings.popular")}
                </Badge>
              )}
              <span className="text-sm font-medium text-foreground">{plan.name}</span>
              <span className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
                {plan.tokens.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">{t("settings.tokens")}</span>
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-sm font-medium text-foreground">${plan.price}</span>
                <span className="text-xs text-muted-foreground ml-1">USD</span>
              </div>
              {selectedPlan === plan.id && (
                <div className="absolute top-3 left-3">
                  <Check className="size-4 text-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Purchase Button */}
        <Button
          disabled={!selectedPlan}
          className="rounded-xl w-full"
        >
          {selectedPlan 
            ? `${t("settings.purchase")} ${tokenPlans.find(p => p.id === selectedPlan)?.tokens.toLocaleString()} ${t("settings.tokens")}`
            : t("settings.selectPlan")
          }
        </Button>
      </div>

      {/* Additional Info */}
      <div className="rounded-xl bg-secondary/50 bg-secondary/50 p-4">
        <p className="text-xs text-muted-foreground">
          {t("settings.additionalInfo")}
        </p>
      </div>
    </div>
  )
}
