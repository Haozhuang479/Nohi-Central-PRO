
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Check,
  Info,
  X,
  Plus,
  ChevronDown,
  Copy,
  Sparkles,
  ExternalLink,
  Bot,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "details" | "guardrails" | "visual-style" | "brand-story" | "fulfillment" | "clone"

// ─── Tag Chip helpers ─────────────────────────────────────────────────────────

function TagChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
        selected
          ? "bg-foreground text-background border-foreground"
          : "bg-secondary border-border text-foreground hover:bg-secondary/80"
      )}
    >
      {label}
      {selected && <X className="size-3 shrink-0 opacity-70" />}
    </button>
  )
}

function TagField({
  allTags,
  selected,
  onChange,
  moreTags,
  placeholder,
}: {
  allTags: string[]
  selected: string[]
  onChange: (v: string[]) => void
  moreTags?: string[]
  placeholder?: string
}) {
  const [showMore, setShowMore] = useState(false)
  const [custom, setCustom] = useState("")

  const toggle = (tag: string) =>
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag])

  const addCustom = () => {
    const val = custom.trim()
    if (val && !selected.includes(val)) onChange([...selected, val])
    setCustom("")
  }

  const displayed = showMore ? [...allTags, ...(moreTags ?? [])] : allTags

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {displayed.map((tag) => (
          <TagChip key={tag} label={tag} selected={selected.includes(tag)} onClick={() => toggle(tag)} />
        ))}
        {moreTags && moreTags.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMore ? "Show less" : `+${moreTags.length} more`}
            <ChevronDown className={cn("size-3 transition-transform", showMore && "rotate-180")} />
          </button>
        )}
      </div>
      {/* Custom input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder={placeholder ?? "Add custom tag…"}
          className="flex-1 max-w-xs bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-secondary text-sm text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-all"
        >
          <Plus className="size-3.5" />
          Add
        </button>
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────

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
]
const audienceMore = [
  "Urban Dwellers", "Trendsetters", "Digital Natives", "Outdoor Lovers",
  "Frequent Travelers", "New Parents", "Remote Workers",
]

const scenarioDefaults = [
  "Self-Care", "Date Night", "Back to School", "Holiday Gifting",
  "Workwear", "Travel", "Home Office", "Outdoor Activities",
  "Wedding", "Baby Shower", "Housewarming", "Graduation",
]
const scenarioMore = [
  "Weekend Casual", "Gym & Fitness", "Beach Vacation", "Music Festival",
  "Job Interview", "Dinner Party", "Road Trip",
]

const intentDefaults = [
  "Trendy & New", "Affordable Basics", "Premium Quality", "Sustainable Choice",
  "Gift Under $50", "Bulk Order", "Subscription", "Try Before Buy",
  "Last Minute Gift", "Seasonal Must-Have", "Everyday Essential", "Luxury Treat",
]
const intentMore = [
  "Exclusive Drop", "Limited Edition", "Value Pack", "Restock Favorite",
  "Clearance Find", "Bundle Deal", "Free Shipping",
]

const excludedAudienceDefaults = [
  "Minors", "Children Under 13", "Pregnant Women", "Elderly",
  "Medical Patients", "Allergy Sensitive", "Visually Impaired",
  "Mental Health Sensitive", "Immunocompromised", "Substance Recovery",
]
const excludedAudienceMore = [
  "Mobility Challenged", "Photosensitive", "Lactose Intolerant",
  "Gluten Sensitive", "Fragrance Sensitive",
]

const prohibitedScenarioDefaults = [
  "Medical Treatment", "Legal Advice", "Financial Investment",
  "Children's Unsupervised Use", "Hazardous Environments", "Emergency Situations",
  "Driving While Using", "Heavy Machinery Operation",
]
const prohibitedScenarioMore = [
  "Religious Ceremony", "Court Proceeding", "Lab Environment",
  "Construction Site", "Chemical Handling",
]

const blockedKeywordDefaults = [
  "cheap", "knockoff", "counterfeit", "diet pill", "miracle cure",
  "get rich quick", "weight loss", "anti-aging miracle", "fake", "bootleg",
]
const blockedKeywordMore = [
  "replica", "scam", "pyramid scheme", "snake oil", "quack",
]

const styleDefaults = [
  "Minimalist", "Maximalist", "Scandinavian", "Bohemian", "Industrial",
  "Streetwear", "Classic", "Retro", "Futuristic", "Organic",
  "Luxury", "Casual", "Sporty", "Elegant", "Playful",
]
const styleMore = [
  "Earthy Tones", "Monochrome", "Pastel", "Bold & Bright", "Neutral",
  "Clean Lines", "Textured", "Matte Finish", "Glossy", "Handcrafted",
]

// ─── Tab content components ───────────────────────────────────────────────────


function DetailsTab() {
  const { language } = useLanguage()
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Fashion & Apparel"])
  const [selectedAov, setSelectedAov] = useState("$50 - $120")
  const [selectedPurchaseType, setSelectedPurchaseType] = useState("Considered")
  const [audienceTags, setAudienceTags] = useState<string[]>(audienceDefaults.slice(0, 3))
  const [scenarioTags, setScenarioTags] = useState<string[]>(scenarioDefaults.slice(0, 4))
  const [intentTags, setIntentTags] = useState<string[]>(intentDefaults.slice(0, 3))

  const toggleCategory = (cat: string) =>
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-8">
        <FormSection
          title={language === "zh" ? "核心品类" : "Core Category"}
          description={language === "zh" ? "选择最能描述您商品的品类。" : "Select the categories that best describe your products."}
        >
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((cat) => (
              <TagChip key={cat} label={cat} selected={selectedCategories.includes(cat)} onClick={() => toggleCategory(cat)} />
            ))}
          </div>
        </FormSection>

        <FormSection
          title={language === "zh" ? "客单价层级" : "AOV Tier"}
          description={language === "zh" ? "您品牌的平均订单价格区间。" : "Your brand's average order value range."}
        >
          <div className="flex flex-wrap gap-2">
            {aovTiers.map((tier) => (
              <TagChip key={tier} label={tier} selected={selectedAov === tier} onClick={() => setSelectedAov(tier)} />
            ))}
          </div>
        </FormSection>

        <FormSection
          title={language === "zh" ? "购买类型" : "Purchase Type"}
          description={language === "zh" ? "描述典型的购买决策方式。" : "Describe the typical purchase decision pattern."}
        >
          <div className="flex flex-wrap gap-2">
            {purchaseTypes.map((type) => (
              <TagChip key={type} label={type} selected={selectedPurchaseType === type} onClick={() => setSelectedPurchaseType(type)} />
            ))}
          </div>
        </FormSection>

        <FormSection
          title={language === "zh" ? "主要受众" : "Primary Audience"}
          description={language === "zh" ? "您品牌商品的目标受众群体。" : "Target audience segments for your brand's products."}
        >
          <TagField allTags={audienceDefaults} selected={audienceTags} onChange={setAudienceTags} moreTags={audienceMore} placeholder={language === "zh" ? "添加受众标签…" : "Add audience tag…"} />
        </FormSection>

        <FormSection
          title={language === "zh" ? "场景标签" : "Scenario Tags"}
          description={language === "zh" ? "您的商品适合的使用场景。" : "Usage scenarios your products are suited for."}
        >
          <TagField allTags={scenarioDefaults} selected={scenarioTags} onChange={setScenarioTags} moreTags={scenarioMore} placeholder={language === "zh" ? "添加场景标签…" : "Add scenario tag…"} />
        </FormSection>

        <FormSection
          title={language === "zh" ? "意图标签" : "Intent Tags"}
          description={language === "zh" ? "购物者购买您商品时的典型意图。" : "Typical shopper intents when purchasing your products."}
        >
          <TagField allTags={intentDefaults} selected={intentTags} onChange={setIntentTags} moreTags={intentMore} placeholder={language === "zh" ? "添加意图标签…" : "Add intent tag…"} />
        </FormSection>

        <div className="flex justify-end pt-2">
          <Button className="rounded-full px-8">{language === "zh" ? "保存更改" : "Save changes"}</Button>
        </div>
      </div>

    </div>
  )
}

type RuleSensitivity = "high" | "medium" | "low"
type RuleCategory = "no-mention" | "no-compare" | "no-audience" | "compliance"

interface GuardrailRule {
  id: string
  text: string
  sensitivity: RuleSensitivity
}

interface GuardrailCategory {
  id: RuleCategory
  label: string
  labelZh: string
  description: string
  descriptionZh: string
  icon: React.ReactNode
  defaultRules: GuardrailRule[]
}

const SENSITIVITY_CONFIG: Record<RuleSensitivity, { label: string; labelZh: string; color: string; bg: string }> = {
  high: { label: "High", labelZh: "高", color: "text-red-600", bg: "bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-900" },
  medium: { label: "Medium", labelZh: "中", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900" },
  low: { label: "Low", labelZh: "低", color: "text-muted-foreground", bg: "bg-secondary border-border" },
}

const INITIAL_CATEGORIES: GuardrailCategory[] = [
  {
    id: "no-mention",
    label: "Never Mention",
    labelZh: "禁止提及",
    description: "Topics, claims, or facts the AI must never bring up.",
    descriptionZh: "AI 绝对不能提及的话题、声明或说法。",
    icon: <ShieldAlert className="size-4 text-red-500" />,
    defaultRules: [
      { id: "nm-1", text: "Competitor pricing or product comparisons", sensitivity: "high" },
      { id: "nm-2", text: "Medical or clinical efficacy claims", sensitivity: "high" },
      { id: "nm-3", text: "Guaranteed weight loss or transformation results", sensitivity: "high" },
    ],
  },
  {
    id: "no-compare",
    label: "No Comparisons",
    labelZh: "禁止比较",
    description: "Brands or products this brand should never be compared against.",
    descriptionZh: "AI 不应将本品牌与以下品牌或产品进行比较。",
    icon: <X className="size-4 text-orange-500" />,
    defaultRules: [
      { id: "nc-1", text: "Direct competitors by name", sensitivity: "high" },
      { id: "nc-2", text: "Price-based comparisons with budget alternatives", sensitivity: "medium" },
    ],
  },
  {
    id: "no-audience",
    label: "Excluded Audiences",
    labelZh: "排除受众",
    description: "Groups the AI must never target or recommend products to.",
    descriptionZh: "AI 绝对不能向其推荐商品的人群。",
    icon: <AlertTriangle className="size-4 text-amber-500" />,
    defaultRules: [
      { id: "na-1", text: "Minors under 18", sensitivity: "high" },
      { id: "na-2", text: "Pregnant or nursing individuals (without medical note)", sensitivity: "high" },
      { id: "na-3", text: "Substance recovery communities", sensitivity: "medium" },
    ],
  },
  {
    id: "compliance",
    label: "Compliance Statements",
    labelZh: "合规声明",
    description: "Mandatory disclaimers or legal statements AI must include in relevant contexts.",
    descriptionZh: "在特定场景下 AI 必须主动附加的免责声明或法律说明。",
    icon: <Info className="size-4 text-blue-500" />,
    defaultRules: [
      { id: "cp-1", text: "Include 'results may vary' when discussing outcomes", sensitivity: "medium" },
      { id: "cp-2", text: "Add regional availability note for international shoppers", sensitivity: "low" },
    ],
  },
]

function RuleCard({
  rule,
  onDelete,
  onChangeSensitivity,
  language,
}: {
  rule: GuardrailRule
  onDelete: () => void
  onChangeSensitivity: (s: RuleSensitivity) => void
  language: string
}) {
  const cfg = SENSITIVITY_CONFIG[rule.sensitivity]
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">{rule.text}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Sensitivity badge / cycle button */}
        <button
          type="button"
          onClick={() => {
            const order: RuleSensitivity[] = ["high", "medium", "low"]
            const next = order[(order.indexOf(rule.sensitivity) + 1) % order.length]
            onChangeSensitivity(next)
          }}
          title={language === "zh" ? "点击切换敏感度" : "Click to cycle sensitivity"}
          className={cn("text-xs font-medium px-2 py-0.5 rounded-full border transition-all", cfg.bg, cfg.color)}
        >
          {language === "zh" ? cfg.labelZh : cfg.label}
        </button>
        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function GuardrailCategoryCard({
  cat,
  rules,
  onAddRule,
  onDeleteRule,
  onChangeSensitivity,
  language,
}: {
  cat: GuardrailCategory
  rules: GuardrailRule[]
  onAddRule: (catId: RuleCategory, text: string, sensitivity: RuleSensitivity) => void
  onDeleteRule: (catId: RuleCategory, ruleId: string) => void
  onChangeSensitivity: (catId: RuleCategory, ruleId: string, s: RuleSensitivity) => void
  language: string
}) {
  const [newText, setNewText] = useState("")
  const [newSensitivity, setNewSensitivity] = useState<RuleSensitivity>("medium")

  const handleAdd = () => {
    const val = newText.trim()
    if (!val) return
    onAddRule(cat.id, val, newSensitivity)
    setNewText("")
  }

  const highCount = rules.filter((r) => r.sensitivity === "high").length

  return (
    <div className="rounded-2xl bg-popover p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {cat.icon}
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {language === "zh" ? cat.labelZh : cat.label}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === "zh" ? cat.descriptionZh : cat.description}
            </p>
          </div>
        </div>
        {highCount > 0 && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900 shrink-0">
            {highCount} {language === "zh" ? "高" : "high"}
          </span>
        )}
      </div>

      {/* Rules */}
      <div className="flex flex-col gap-2">
        {rules.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">
            {language === "zh" ? "暂无规则，请添加。" : "No rules yet — add one below."}
          </p>
        )}
        {rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            language={language}
            onDelete={() => onDeleteRule(cat.id, rule.id)}
            onChangeSensitivity={(s) => onChangeSensitivity(cat.id, rule.id, s)}
          />
        ))}
      </div>

      {/* Add rule input */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={language === "zh" ? "输入新规则…" : "Add a new rule…"}
          className="flex-1 min-w-0 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {/* Sensitivity picker for new rule */}
        <div className="flex gap-1">
          {(["high", "medium", "low"] as RuleSensitivity[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setNewSensitivity(s)}
              className={cn(
                "text-xs px-2 py-1 rounded-lg border transition-all",
                newSensitivity === s
                  ? cn(SENSITIVITY_CONFIG[s].bg, SENSITIVITY_CONFIG[s].color, "font-semibold")
                  : "border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              {language === "zh" ? SENSITIVITY_CONFIG[s].labelZh : SENSITIVITY_CONFIG[s].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40 transition-all hover:opacity-90"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function GuardrailsTab() {
  const { language } = useLanguage()
  const [rulesByCategory, setRulesByCategory] = useState<Record<RuleCategory, GuardrailRule[]>>(() => {
    const map = {} as Record<RuleCategory, GuardrailRule[]>
    INITIAL_CATEGORIES.forEach((cat) => { map[cat.id] = [...cat.defaultRules] })
    return map
  })

  const handleAddRule = (catId: RuleCategory, text: string, sensitivity: RuleSensitivity) => {
    setRulesByCategory((prev) => ({
      ...prev,
      [catId]: [...prev[catId], { id: `${catId}-${Date.now()}`, text, sensitivity }],
    }))
  }

  const handleDeleteRule = (catId: RuleCategory, ruleId: string) => {
    setRulesByCategory((prev) => ({
      ...prev,
      [catId]: prev[catId].filter((r) => r.id !== ruleId),
    }))
  }

  const handleChangeSensitivity = (catId: RuleCategory, ruleId: string, s: RuleSensitivity) => {
    setRulesByCategory((prev) => ({
      ...prev,
      [catId]: prev[catId].map((r) => r.id === ruleId ? { ...r, sensitivity: s } : r),
    }))
  }

  const totalRules = Object.values(rulesByCategory).reduce((a, b) => a + b.length, 0)
  const highRules = Object.values(rulesByCategory).flat().filter((r) => r.sensitivity === "high").length

  return (
    <div className="flex flex-col gap-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-secondary border border-border text-sm">
        <ShieldAlert className="size-4 text-muted-foreground shrink-0" />
        <span className="text-foreground font-medium">
          {totalRules} {language === "zh" ? "条规则" : "rules"}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-red-600 font-medium">
          {highRules} {language === "zh" ? "高敏感度" : "high sensitivity"}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {language === "zh" ? "AI 优先遵守高敏感度规则" : "AI enforces high-sensitivity rules first"}
        </span>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 gap-4">
        {INITIAL_CATEGORIES.map((cat) => (
          <GuardrailCategoryCard
            key={cat.id}
            cat={cat}
            rules={rulesByCategory[cat.id]}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
            onChangeSensitivity={handleChangeSensitivity}
            language={language}
          />
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button className="rounded-full px-8">{language === "zh" ? "保存更改" : "Save changes"}</Button>
      </div>
    </div>
  )
}

function VisualStyleTab() {
  const { language } = useLanguage()
  const [styleTags, setStyleTags] = useState<string[]>(styleDefaults.slice(0, 3))

  return (
    <div className="flex flex-col gap-8">
      <FormSection
        title={language === "zh" ? "风格标签" : "Style Tags"}
        description={language === "zh" ? "帮助智能体理解您品牌视觉风格的标签。" : "Tags that help agents understand your brand's visual aesthetic."}
      >
        <TagField allTags={styleDefaults} selected={styleTags} onChange={setStyleTags} moreTags={styleMore} placeholder={language === "zh" ? "添加风格标签…" : "Add style tag…"} />
      </FormSection>

      <FormSection
        title={language === "zh" ? "风格预览" : "Style Preview"}
        description={language === "zh" ? "智能体将如何展示您的品牌风格。" : "How agents will represent your brand aesthetic."}
      >
        <div className="rounded-2xl bg-secondary/50 p-6 min-h-[80px]">
          {styleTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {styleTags.map((tag) => (
                <span key={tag} className="px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{language === "zh" ? "尚未选择风格标签。" : "No style tags selected yet."}</p>
          )}
        </div>
      </FormSection>

      <div className="flex justify-end pt-2">
        <Button className="rounded-full px-8">{language === "zh" ? "保存更改" : "Save changes"}</Button>
      </div>
    </div>
  )
}

function BrandStoryTab() {
  const { language } = useLanguage()
  const [brandStory, setBrandStory] = useState(
    "We started with a simple idea: everyday essentials should look and feel intentional. Born in 2022, our brand combines clean design with sustainable materials, creating products that fit naturally into modern life. Every piece is designed in-house, with a focus on quality over quantity."
  )
  const [founderNote, setFounderNote] = useState(
    "I launched this brand after years in the fashion industry feeling frustrated by the gap between fast fashion and inaccessible luxury. I believe great design should be available to everyone, made responsibly, and built to last. - Alex Chen, Founder"
  )

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length
  const storyWords = wordCount(brandStory)
  const noteWords = wordCount(founderNote)

  return (
    <div className="flex flex-col gap-8">
      <FormSection
        title={language === "zh" ? "品牌故事" : "Brand Story"}
        description={language === "zh" ? "150字简介，供智能体参考和引用。" : "A 150-word overview for agents to reference and cite."}
      >
        <div className="flex flex-col gap-2">
          <Textarea
            value={brandStory}
            onChange={(e) => setBrandStory(e.target.value)}
            rows={6}
            className="rounded-xl bg-secondary border-border resize-none text-sm"
            placeholder={language === "zh" ? "请介绍您的品牌故事…" : "Tell your brand story…"}
          />
          <div className="flex justify-end">
            <span className={cn("text-xs tabular-nums", storyWords > 150 ? "text-destructive" : "text-muted-foreground")}>
              {storyWords} / 150 {language === "zh" ? "字" : "words"}
            </span>
          </div>
        </div>
      </FormSection>

      <FormSection
        title={language === "zh" ? "创始人寄语" : "Founder Note"}
        description={language === "zh" ? "创始人的个人寄语，供智能体在对话中引用。" : "A personal message from the founder for agents to reference."}
      >
        <div className="flex flex-col gap-2">
          <Textarea
            value={founderNote}
            onChange={(e) => setFounderNote(e.target.value)}
            rows={4}
            className="rounded-xl bg-secondary border-border resize-none text-sm"
            placeholder={language === "zh" ? "创始人的话…" : "A note from the founder…"}
          />
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground tabular-nums">
              {noteWords} {language === "zh" ? "字" : "words"}
            </span>
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end pt-2">
        <Button className="rounded-full px-8">{language === "zh" ? "保存更改" : "Save changes"}</Button>
      </div>
    </div>
  )
}


function FulfillmentTab() {
  const { language } = useLanguage()

  const shippingRanks = [
    { value: "platinum", label: "Platinum", description: language === "zh" ? "当日或次日达，99%+ 准时率" : "Same-day or next-day delivery, 99%+ on-time rate", highlight: true },
    { value: "gold", label: "Gold", description: language === "zh" ? "2 天内送达，97%+ 准时率" : "2-day delivery, 97%+ on-time rate", highlight: false },
    { value: "silver", label: "Silver", description: language === "zh" ? "3-5 天送达，95%+ 准时率" : "3-5 day delivery, 95%+ on-time rate", highlight: false },
    { value: "standard", label: "Standard", description: language === "zh" ? "5-7 天送达，标准准时率" : "5-7 day delivery, standard on-time rate", highlight: false },
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
    <div className="flex flex-col gap-8">
      <FormSection
        title={language === "zh" ? "配送 SLA" : "Shipping SLA"}
        description={language === "zh" ? "选择最符合您配送能力的等级。" : "Select the tier that best matches your shipping capabilities."}
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
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-foreground/10 text-muted-foreground">
                    {language === "zh" ? "推荐" : "Recommended"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{rank.description}</p>
            </button>
          ))}
        </div>
      </FormSection>

      {/* Metrics */}
      <FormSection
        title={language === "zh" ? "履约指标" : "Fulfillment Metrics"}
        description={language === "zh" ? "填写您的实际履约数据。" : "Enter your actual fulfillment performance data."}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: language === "zh" ? "处理时长" : "Processing Time", value: processingTime, onChange: setProcessingTime, suffix: language === "zh" ? "天" : "days" },
            { label: language === "zh" ? "准时率" : "On-Time Rate", value: onTimeRate, onChange: setOnTimeRate, suffix: "%" },
            { label: language === "zh" ? "退货率" : "Return Rate", value: returnRate, onChange: setReturnRate, suffix: "%" },
            { label: language === "zh" ? "损坏率" : "Damage Rate", value: damageRate, onChange: setDamageRate, suffix: "%" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-secondary/50 p-4 flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="text"
                  value={m.value}
                  onChange={(e) => m.onChange(e.target.value)}
                  className="bg-transparent text-xl font-semibold text-foreground tabular-nums w-full outline-none"
                />
                <span className="text-sm text-muted-foreground shrink-0">{m.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        title={language === "zh" ? "退款时限" : "Refund Turnaround"}
        description={language === "zh" ? "退款处理完成所需的工作日数。" : "Business days to process a refund."}
      >
        <Select value={refundTime} onValueChange={setRefundTime}>
          <SelectTrigger className="rounded-xl bg-secondary border-border w-full md:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["1-3", "3-5", "5-7", "7-14"].map((v) => (
              <SelectItem key={v} value={v}>
                {v} {language === "zh" ? "个工作日" : "business days"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormSection>

      <FormSection
        title={language === "zh" ? "退换政策" : "Return Policy"}
        description={language === "zh" ? "智能体将向购物者展示此政策内容。" : "Agents will surface this policy to shoppers when relevant."}
      >
        <Textarea
          value={returnPolicy}
          onChange={(e) => setReturnPolicy(e.target.value)}
          rows={4}
          className="rounded-xl bg-secondary border-border resize-none text-sm"
          placeholder={language === "zh" ? "描述您的退换货政策…" : "Describe your return and exchange policy…"}
        />
      </FormSection>

      <div className="flex justify-end pt-2">
        <Button className="rounded-full px-8">{language === "zh" ? "保存更改" : "Save changes"}</Button>
      </div>
    </div>
  )
}

// ─── Clone Tab ────────────────────────────────────────────────────────────────

const CLONE_PROMPT = `You are helping me migrate my brand's operating memory from a previous AI assistant to a new platform called Nohi.

Please extract and organize the following information based on our conversation history and any context you have about my brand:

1. **Brand Identity**
   - Brand name, founding story, and core mission
   - Tone of voice: adjectives that describe how the brand sounds (e.g., warm, witty, authoritative)
   - Visual identity notes: color palette descriptions, preferred aesthetics, style words

2. **Target Audience**
   - Primary customer personas (demographics, psychographics, lifestyle)
   - Key use cases and purchase motivations
   - Scenarios where customers typically buy

3. **Product & Offer**
   - Hero products or categories
   - Key differentiators and value propositions
   - Pricing positioning (budget / mid-market / premium / luxury)

4. **Guardrails & Sensitivities**
   - Topics or claims the brand never makes
   - Audiences the brand explicitly excludes
   - Scenarios where the product should NOT be recommended

5. **Marketing Memory**
   - Best-performing messaging themes or hooks
   - Seasonal or campaign moments that matter
   - Customer objections and how the brand handles them

6. **Operations**
   - Shipping speed and regions
   - Return / refund policy summary
   - Any fulfillment promises made to customers

Please output the result as a structured list under each heading above. Be concise but complete — this output will be imported directly into Nohi as my brand context.`

function CloneTab() {
  const { language } = useLanguage()
  const [source, setSource] = useState<"chatgpt" | "gemini" | "claude" | "other">("chatgpt")
  const [copied, setCopied] = useState(false)
  const [pastedMemory, setPastedMemory] = useState("")
  const [imported, setImported] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(CLONE_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sourceConfig = {
    chatgpt: {
      label: "ChatGPT",
      url: "https://chat.openai.com",
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
      hint: language === "zh"
        ? "在 ChatGPT 中打开任意包含品牌相关对话的会话，将上方提示词粘贴并发送，然后将 ChatGPT 的回复粘贴至下方。"
        : "Open any ChatGPT conversation where you've discussed your brand, paste the prompt above, send it, then paste the response below.",
    },
    gemini: {
      label: "Gemini",
      url: "https://gemini.google.com",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
      hint: language === "zh"
        ? "在 Gemini 中打开包含您品牌运营记忆的对话，粘贴提示词并发送，然后将回复粘贴至下方。"
        : "Open a Gemini conversation containing your brand context, paste the prompt, send it, then paste the response below.",
    },
    claude: {
      label: "Claude",
      url: "https://claude.ai",
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
      hint: language === "zh"
        ? "在 Claude 中找到包含品牌信息的对话，粘贴提示词并发送，然后将回复粘贴至下方。"
        : "Find a Claude conversation with your brand knowledge, paste the prompt, send it, then paste the response below.",
    },
    other: {
      label: language === "zh" ? "其他 AI" : "Other AI",
      url: "#",
      color: "text-muted-foreground",
      bg: "bg-secondary border-border",
      hint: language === "zh"
        ? "在任意 AI 助手中粘贴上方提示词，获取结构化品牌记忆后粘贴至下方。"
        : "Paste the prompt into any AI assistant, get the structured brand memory, then paste the response below.",
    },
  }

  const cfg = sourceConfig[source]

  return (
    <div className="flex flex-col gap-8">

      {/* Hero callout */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-blue-600 shrink-0" />
          <h2 className="text-base font-semibold text-foreground">
            {language === "zh" ? "从现有 AI 迁移品牌运营记忆" : "Migrate Brand Memory from Your AI"}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {language === "zh"
            ? "您已经在 ChatGPT、Gemini 或 Claude 中积累了大量品牌知识。通过下方步骤，将这些记忆一键转移至 Nohi，无需重新填写。"
            : "You've already built up valuable brand knowledge in ChatGPT, Gemini, or Claude. Use the steps below to transfer that memory into Nohi instantly — no need to start from scratch."}
        </p>
      </div>

      {/* Step 1 — Choose source */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold shrink-0">1</span>
          <h3 className="text-sm font-semibold text-foreground">
            {language === "zh" ? "选择来源 AI" : "Choose your source AI"}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["chatgpt", "gemini", "claude", "other"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={cn(
                "px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                source === s
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary border-border text-foreground hover:bg-secondary/80"
              )}
            >
              {sourceConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — Copy prompt */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold shrink-0">2</span>
          <h3 className="text-sm font-semibold text-foreground">
            {language === "zh" ? "复制提示词，粘贴至 " + cfg.label : `Copy the prompt and paste it into ${cfg.label}`}
          </h3>
        </div>

        {/* Hint banner */}
        <div className={cn("rounded-xl border px-4 py-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5", cfg.bg)}>
          <Info className="size-3.5 shrink-0 mt-0.5" />
          <span>{cfg.hint}</span>
          {source !== "other" && (
            <a
              href={cfg.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("ml-auto flex items-center gap-1 font-medium shrink-0", cfg.color)}
            >
              {language === "zh" ? "打开" : "Open"}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {/* Prompt box */}
        <div className="relative rounded-2xl bg-secondary overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/60">
            <span className="text-xs font-medium text-muted-foreground">
              {language === "zh" ? "品牌记忆提取提示词" : "Brand Memory Extraction Prompt"}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
                copied
                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                  : "bg-background border border-border text-foreground hover:bg-secondary"
              )}
            >
              <Copy className="size-3.5" />
              {copied
                ? (language === "zh" ? "已复制" : "Copied!")
                : (language === "zh" ? "复制" : "Copy")}
            </button>
          </div>
          <pre className="p-4 text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto max-h-72 overflow-y-auto">
            {CLONE_PROMPT}
          </pre>
        </div>
      </div>

      {/* Step 3 — Paste response */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold shrink-0">3</span>
          <h3 className="text-sm font-semibold text-foreground">
            {language === "zh" ? "将 AI 的回复粘贴至此" : "Paste the AI's response here"}
          </h3>
        </div>
        <Textarea
          value={pastedMemory}
          onChange={(e) => { setPastedMemory(e.target.value); setImported(false) }}
          rows={10}
          className="rounded-2xl bg-secondary border-border resize-none text-sm font-mono"
          placeholder={
            language === "zh"
              ? "将 " + cfg.label + " 的结构化回复粘贴至此处…"
              : `Paste ${cfg.label}'s structured response here…`
          }
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {language === "zh"
              ? "Nohi 将自动将内容映射至对应字段（Details、Guardrails 等）。"
              : "Nohi will automatically map the content to the relevant fields (Details, Guardrails, etc.)."}
          </p>
          <Button
            onClick={() => { if (pastedMemory.trim()) setImported(true) }}
            disabled={!pastedMemory.trim()}
            className="rounded-full px-8 gap-2"
          >
            <Sparkles className="size-4" />
            {language === "zh" ? "导入品牌记忆" : "Import Brand Memory"}
          </Button>
        </div>

        {imported && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 px-4 py-3">
            <Check className="size-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">
              {language === "zh"
                ? "品牌记忆已成功导入！请前往其他标签页核对并补充细节。"
                : "Brand memory imported successfully! Head to the other tabs to review and refine the details."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Brand Health Score ───────────────────────────────────────────────────────

function BrandHealthScore({ completedCount, total, language }: { completedCount: number; total: number; language: string }) {
  const score = Math.round((completedCount / total) * 100)
  const pct = score

  const suggestions: { tab: string; tabZh: string; tip: string; tipZh: string; boost: string }[] = [
    { tab: "Guardrails", tabZh: "护栏设置", tip: "Add structured guardrails", tipZh: "添加结构化护栏规则", boost: "+23%" },
    { tab: "Visual Style", tabZh: "视觉风格", tip: "Complete your visual identity", tipZh: "完善视觉风格设置", boost: "+15%" },
    { tab: "Fulfillment", tabZh: "履约配置", tip: "Set your fulfillment SLAs", tipZh: "配置履约 SLA 指标", boost: "+12%" },
  ].filter((_, i) => i < total - completedCount).slice(0, 2)

  const scoreColor = score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-red-500"
  const barColor = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="rounded-2xl bg-popover p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("text-3xl font-bold tabular-nums tracking-tight", scoreColor)}>{score}</div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {language === "zh" ? "品牌健康分" : "Brand Health Score"}
            </p>
            <p className="text-xs text-muted-foreground">
              {language === "zh" ? `已配置 ${completedCount} / ${total} 个模块` : `${completedCount} of ${total} sections configured`}
            </p>
          </div>
        </div>
        <TrendingUp className="size-5 text-muted-foreground shrink-0" />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <div key={s.tab} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary border border-border rounded-lg px-3 py-1.5">
              <Info className="size-3 shrink-0" />
              <span>
                {language === "zh"
                  ? `补充「${s.tabZh}」可提升 AI 推荐准确率 ${s.boost}`
                  : `Complete "${s.tab}" to boost AI accuracy ${s.boost}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Completion state per tab ─────────────────────────────────────────────────

const completionMap: Record<TabId, boolean> = {
  details: true,
  guardrails: false,
  "visual-style": false,
  "brand-story": true,
  fulfillment: false,
  clone: false,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandContextPage() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabId>("details")
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const tabs: { id: TabId; label: string; labelZh: string }[] = [
    { id: "details", label: "Details", labelZh: "品牌详情" },
    { id: "guardrails", label: "Guardrails", labelZh: "护栏设置" },
    { id: "visual-style", label: "Visual Style", labelZh: "视觉风格" },
    { id: "brand-story", label: "Brand Story", labelZh: "品牌故事" },
    { id: "fulfillment", label: "Fulfillment", labelZh: "履约配置" },
    { id: "clone", label: "Clone", labelZh: "迁移记忆" },
  ]

  const completedCount = Object.values(completionMap).filter(Boolean).length

  return (
    <div className="flex flex-col min-h-screen">
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {language === "zh" ? "品牌上下文" : "Brand Context"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "zh"
              ? `构建您的智能体原生品牌标识。已配置 ${completedCount} / ${tabs.length} 个部分。`
              : `Build your agent-native brand identity. ${completedCount} of ${tabs.length} sections configured.`}
          </p>
        </div>

        {/* Brand Health Score */}
        <BrandHealthScore completedCount={completedCount} total={tabs.length} language={language} />

        {/* Dismissible tip banner */}
        {!bannerDismissed && (
          <div className="flex items-start justify-between gap-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 px-5 py-3.5">
            <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
              {language === "zh"
                ? "通过向 Agentic Catalog 上传 UGC 和评价链接，提升产品级上下文。Nohi PRO 支持直接产品级管理和高级分群。"
                : "Enhance product-level context by uploading UGC and review links to the Agentic Catalog. Nohi PRO enables direct product-level management and advanced segmentation."}
              {" "}
              <a
                href="/seller/catalog/product-catalog"
                className="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                {language === "zh" ? "前往" : "Go"}
              </a>
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors shrink-0 mt-0.5"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const done = completionMap[tab.id]
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {done && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-foreground shrink-0">
                    <Check className="size-2.5 text-background" />
                  </span>
                )}
                {language === "zh" ? tab.labelZh : tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="max-w-4xl w-full">
          {activeTab === "details" && <DetailsTab />}
          {activeTab === "guardrails" && <GuardrailsTab />}
          {activeTab === "visual-style" && <VisualStyleTab />}
          {activeTab === "brand-story" && <BrandStoryTab />}
          {activeTab === "fulfillment" && <FulfillmentTab />}
          {activeTab === "clone" && <CloneTab />}
        </div>
      </div>
    </div>
  )
}
