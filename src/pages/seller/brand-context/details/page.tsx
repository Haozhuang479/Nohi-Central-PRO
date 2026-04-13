import { useState, useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sparkles, X, Plus, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// ── Data ──────────────────────────────────────────────────────────────────────

const categoryOptions = [
  "Fashion & Apparel", "Beauty & Personal Care", "Electronics", "Home & Living",
  "Health & Wellness", "Sports & Outdoors", "Toys & Games", "Food & Beverage",
  "Pet Supplies", "Jewelry & Accessories", "Baby & Kids", "Office & Stationery",
]

const aovTiers = ["< $50", "$50 - $120", "$120 - $300", "$300+"]
const purchaseTypes = ["Impulse", "Considered", "Gifting"]

const audienceDefaults = [
  "Gen Z Women", "Millennials", "Working Professionals", "College Students",
  "Parents", "Fitness Enthusiasts", "Tech Savvy", "Eco-Conscious",
  "Luxury Seekers", "Budget Shoppers", "Gift Buyers", "Home Makers",
  "Urban Dwellers", "Trendsetters", "Digital Natives",
]
const audienceMore = [
  "Outdoor Lovers", "Frequent Travelers", "New Parents", "Remote Workers",
  "Hobbyists", "Fashion Enthusiasts", "Gamers", "Foodies", "Pet Owners", "DIY Makers",
]

const scenarioDefaults = [
  "Self-Care", "Date Night", "Back to School", "Holiday Gifting", "Workwear",
  "Travel", "Home Office", "Outdoor Activities", "Wedding", "Baby Shower",
  "Housewarming", "Graduation", "Weekend Casual", "Gym & Fitness",
]
const scenarioMore = [
  "Beach Vacation", "Music Festival", "Job Interview", "Dinner Party",
  "Movie Night", "Game Day", "Road Trip", "Picnic", "Anniversary", "Birthday",
]

const intentDefaults = [
  "Trendy & New", "Affordable Basics", "Premium Quality", "Sustainable Choice",
  "Gift Under $50", "Bulk Order", "Subscription", "Try Before Buy",
  "Last Minute Gift", "Seasonal Must-Have", "Everyday Essential", "Luxury Treat",
]
const intentMore = [
  "Exclusive Drop", "Limited Edition", "Value Pack", "Restock Favorite",
  "Clearance Find", "Bundle Deal", "Free Shipping", "Next-Day Delivery", "Eco-Friendly",
]

// ── TagInput ──────────────────────────────────────────────────────────────────

interface TagInputProps {
  allTags: string[]
  moreTags?: string[]
  selected: string[]
  onSelectedChange: (tags: string[]) => void
  placeholder?: string
}

function TagInput({ allTags, moreTags, selected, onSelectedChange, placeholder }: TagInputProps) {
  const [showMore, setShowMore] = useState(false)
  const [inputVal, setInputVal] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const toggle = (tag: string) => {
    onSelectedChange(
      selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]
    )
  }

  const addCustom = () => {
    const val = inputVal.trim()
    if (val && !selected.includes(val)) onSelectedChange([...selected, val])
    setInputVal("")
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addCustom() }
    if (e.key === "Backspace" && !inputVal && selected.length > 0)
      onSelectedChange(selected.slice(0, -1))
  }

  const suggestions = showMore ? [...allTags, ...(moreTags ?? [])] : allTags

  return (
    <div className="flex flex-col gap-3">
      <div
        className="min-h-10 flex flex-wrap gap-1.5 rounded-xl bg-secondary border border-border px-3 py-2 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-foreground text-background text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(tag) }}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-24 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.filter((t) => !selected.includes(t)).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-secondary text-xs text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Plus className="size-3 text-muted-foreground" />
            {tag}
          </button>
        ))}
        {moreTags && moreTags.length > 0 && !showMore && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="px-2.5 py-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            +{moreTags.length} more
          </button>
        )}
      </div>
    </div>
  )
}

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DetailsPage() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Fashion & Apparel"])
  const [selectedAov, setSelectedAov] = useState("$50 - $120")
  const [selectedPurchaseType, setSelectedPurchaseType] = useState("Considered")
  const [audienceTags, setAudienceTags] = useState<string[]>(audienceDefaults.slice(0, 3))
  const [scenarioTags, setScenarioTags] = useState<string[]>(scenarioDefaults.slice(0, 4))
  const [intentTags, setIntentTags] = useState<string[]>(intentDefaults.slice(0, 3))
  const [generating, setGenerating] = useState(false)

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handleAiGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      setSelectedCategories(["Fashion & Apparel", "Home & Living"])
      setSelectedAov("$50 - $120")
      setSelectedPurchaseType("Considered")
      setAudienceTags(["Gen Z Women", "Millennials", "Eco-Conscious", "Urban Dwellers"])
      setScenarioTags(["Self-Care", "Date Night", "Weekend Casual", "Holiday Gifting"])
      setIntentTags(["Sustainable Choice", "Premium Quality", "Trendy & New"])
      setGenerating(false)
    }, 1800)
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {zh ? "品牌详情" : "Brand Details"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {zh
              ? "核心品类、客单价层级、购买类型、受众、场景和意图标签。"
              : "Core category, AOV tier, purchase type, audience, scenario and intent tags."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5 shrink-0"
          onClick={handleAiGenerate}
          disabled={generating}
        >
          {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {generating ? (zh ? "生成中…" : "Generating…") : (zh ? "AI 生成" : "AI Generate")}
        </Button>
      </div>

      {/* Core Category */}
      <FormSection
        title={zh ? "核心品类" : "Core Category"}
        description={zh ? "选择最能代表您品牌的品类（可多选）。" : "Select categories that best represent your brand (multi-select)."}
      >
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                selectedCategories.includes(cat)
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary border-border text-foreground hover:bg-secondary/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </FormSection>

      {/* AOV Tier */}
      <FormSection
        title={zh ? "客单价层级" : "AOV Tier"}
        description={zh ? "您的平均订单价值范围。" : "Your average order value range."}
      >
        <div className="flex flex-wrap gap-2">
          {aovTiers.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedAov(tier)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                selectedAov === tier
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary border-border text-foreground hover:bg-secondary/80"
              )}
            >
              {tier}
            </button>
          ))}
        </div>
      </FormSection>

      {/* Purchase Type */}
      <FormSection
        title={zh ? "购买类型" : "Purchase Type"}
        description={zh ? "顾客通常如何决定购买您的产品。" : "How customers typically decide to buy your products."}
      >
        <div className="flex flex-wrap gap-2">
          {purchaseTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedPurchaseType(type)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                selectedPurchaseType === type
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary border-border text-foreground hover:bg-secondary/80"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </FormSection>

      {/* Primary Audience */}
      <FormSection
        title={zh ? "目标受众" : "Primary Audience"}
        description={zh ? "描述您的目标客户群体。" : "Describe your target customer segments."}
      >
        <TagInput
          allTags={audienceDefaults}
          moreTags={audienceMore}
          selected={audienceTags}
          onSelectedChange={setAudienceTags}
          placeholder={zh ? "添加受众标签…" : "Add audience tag…"}
        />
      </FormSection>

      {/* Scenario Tags */}
      <FormSection
        title={zh ? "使用场景" : "Scenario Tags"}
        description={zh ? "您的产品在哪些场景下使用或作为礼物赠送。" : "Scenarios where your product is used or gifted."}
      >
        <TagInput
          allTags={scenarioDefaults}
          moreTags={scenarioMore}
          selected={scenarioTags}
          onSelectedChange={setScenarioTags}
          placeholder={zh ? "添加场景标签…" : "Add scenario tag…"}
        />
      </FormSection>

      {/* Intent Tags */}
      <FormSection
        title={zh ? "购买意图" : "Intent Tags"}
        description={zh ? "购物者搜索您产品时的购买意图。" : "Purchase intent signals associated with your products."}
      >
        <TagInput
          allTags={intentDefaults}
          moreTags={intentMore}
          selected={intentTags}
          onSelectedChange={setIntentTags}
          placeholder={zh ? "添加意图标签…" : "Add intent tag…"}
        />
      </FormSection>

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
