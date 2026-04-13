import { useState, useRef, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, X, Plus, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// ── Data ──────────────────────────────────────────────────────────────────────

const excludedAudienceDefaults = [
  "Minors", "Children Under 13", "Pregnant Women", "Elderly",
  "Medical Patients", "Allergy Sensitive", "Visually Impaired",
  "Hearing Impaired", "Mental Health Sensitive", "Immunocompromised",
  "Substance Recovery", "Eating Disorder Recovery",
]
const excludedAudienceMore = [
  "Mobility Challenged", "Photosensitive", "Lactose Intolerant",
  "Gluten Sensitive", "Fragrance Sensitive", "UV Sensitive",
  "Chemotherapy Patients", "Post-Surgery Recovery",
]

const prohibitedScenarioDefaults = [
  "Medical Treatment", "Legal Advice", "Financial Investment",
  "Children's Unsupervised Use", "Hazardous Environments", "Emergency Situations",
  "Driving While Using", "Heavy Machinery Operation", "Underwater Use",
  "Extreme Heat Exposure", "Aviation Context", "Military Context",
  "Gambling Context", "Political Campaigning",
]
const prohibitedScenarioMore = [
  "Religious Ceremony", "Court Proceeding", "Lab Environment",
  "Construction Site", "Mining Operation", "Chemical Handling",
  "Nuclear Facility", "Space Application",
]

const blockedKeywordDefaults = [
  "cheap", "knockoff", "counterfeit", "diet pill", "miracle cure",
  "get rich quick", "weight loss", "anti-aging miracle", "fake",
  "bootleg", "replica", "scam", "spam", "hoax", "fraud",
]
const blockedKeywordMore = [
  "pyramid scheme", "ponzi", "snake oil", "quack",
  "placebo", "unregulated", "banned substance", "black market",
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

export default function GuardrailsPage() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [excludedAudiences, setExcludedAudiences] = useState<string[]>(
    excludedAudienceDefaults.slice(0, 3)
  )
  const [prohibitedScenarios, setProhibitedScenarios] = useState<string[]>(
    prohibitedScenarioDefaults.slice(0, 4)
  )
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>(
    blockedKeywordDefaults.slice(0, 5)
  )
  const [suggesting, setSuggesting] = useState(false)

  const handleAiSuggest = () => {
    setSuggesting(true)
    setTimeout(() => {
      setExcludedAudiences([
        "Minors", "Children Under 13", "Pregnant Women", "Elderly", "Medical Patients",
      ])
      setProhibitedScenarios([
        "Medical Treatment", "Legal Advice", "Children's Unsupervised Use",
        "Emergency Situations", "Hazardous Environments",
      ])
      setBlockedKeywords([
        "cheap", "knockoff", "counterfeit", "miracle cure", "get rich quick", "fake", "scam",
      ])
      setSuggesting(false)
    }, 1800)
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {zh ? "内容规范" : "Guardrails"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {zh
              ? "定义排除的受众、禁止的场景和屏蔽的关键词，保护品牌安全。"
              : "Define excluded audiences, prohibited scenarios, and blocked keywords to protect your brand."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5 shrink-0"
          onClick={handleAiSuggest}
          disabled={suggesting}
        >
          {suggesting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {suggesting
            ? (zh ? "建议中…" : "Suggesting…")
            : (zh ? "AI 智能建议" : "AI Suggest Guardrails")}
        </Button>
      </div>

      {/* Excluded Audiences */}
      <FormSection
        title={zh ? "排除受众" : "Excluded Audiences"}
        description={zh
          ? "您的产品不适合或不应向其推广的受众群体。"
          : "Audience groups your product is not suitable for or should not be promoted to."}
      >
        <TagInput
          allTags={excludedAudienceDefaults}
          moreTags={excludedAudienceMore}
          selected={excludedAudiences}
          onSelectedChange={setExcludedAudiences}
          placeholder={zh ? "添加排除受众…" : "Add excluded audience…"}
        />
      </FormSection>

      {/* Prohibited Scenarios */}
      <FormSection
        title={zh ? "禁止场景" : "Prohibited Scenarios"}
        description={zh
          ? "您的产品不应在这些场景下被推荐或使用。"
          : "Scenarios where your product should not be recommended or used."}
      >
        <TagInput
          allTags={prohibitedScenarioDefaults}
          moreTags={prohibitedScenarioMore}
          selected={prohibitedScenarios}
          onSelectedChange={setProhibitedScenarios}
          placeholder={zh ? "添加禁止场景…" : "Add prohibited scenario…"}
        />
      </FormSection>

      {/* Blocked Keywords */}
      <FormSection
        title={zh ? "屏蔽关键词" : "Blocked Keywords"}
        description={zh
          ? "在智能体生成的内容中应避免出现的词汇或短语。"
          : "Words or phrases that should never appear in agent-generated content for your brand."}
      >
        <TagInput
          allTags={blockedKeywordDefaults}
          moreTags={blockedKeywordMore}
          selected={blockedKeywords}
          onSelectedChange={setBlockedKeywords}
          placeholder={zh ? "添加屏蔽关键词…" : "Add blocked keyword…"}
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
