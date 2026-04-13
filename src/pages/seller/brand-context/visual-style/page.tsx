import { useState, useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sparkles, X, Plus, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// ── Data ──────────────────────────────────────────────────────────────────────

const styleDefaults = [
  "Minimalist", "Maximalist", "Scandinavian", "Bohemian", "Industrial",
  "Streetwear", "Classic", "Retro", "Futuristic", "Organic",
  "Luxury", "Casual", "Sporty", "Elegant", "Playful",
  "Earthy Tones", "Monochrome", "Pastel",
]
const styleMore = [
  "Bold & Bright", "Neutral", "Clean Lines", "Textured",
  "Matte Finish", "Glossy", "Handcrafted", "Art Deco",
  "Brutalist", "Cottagecore", "Y2K", "Grunge",
]

const typographyOptions = [
  "Serif / Editorial", "Sans-serif / Modern", "Monospace / Technical",
  "Handwritten / Organic", "Display / Bold", "Mixed",
]

const imageStyleDefaults = [
  "Studio Clean", "Lifestyle", "Flat Lay", "Editorial", "Street", "Nature",
  "Candid", "Product Close-up", "Campaign Hero", "Minimalist White BG",
]
const imageStyleMore = [
  "Dark & Moody", "Bright & Airy", "Vintage Film", "High Contrast",
  "Soft Focus", "Graphic", "Illustrated",
]

const BRAND_COLOR_DEFAULTS = ["#1a1a1a", "#f5f0eb", "#c8a97e"]

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

export default function VisualStylePage() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [styleTags, setStyleTags] = useState<string[]>(styleDefaults.slice(0, 3))
  const [colors, setColors] = useState<string[]>(BRAND_COLOR_DEFAULTS)
  const [typography, setTypography] = useState("Sans-serif / Modern")
  const [imageStyleTags, setImageStyleTags] = useState<string[]>(imageStyleDefaults.slice(0, 3))
  const [analyzing, setAnalyzing] = useState(false)

  const handleAiAnalyze = () => {
    setAnalyzing(true)
    setTimeout(() => {
      setStyleTags(["Minimalist", "Organic", "Elegant", "Earthy Tones"])
      setColors(["#2d2926", "#f2ede8", "#a67c52"])
      setTypography("Serif / Editorial")
      setImageStyleTags(["Studio Clean", "Lifestyle", "Flat Lay", "Bright & Airy"])
      setAnalyzing(false)
    }, 2000)
  }

  const updateColor = (idx: number, val: string) => {
    const next = [...colors]
    next[idx] = val
    setColors(next)
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {zh ? "视觉风格" : "Visual Style"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {zh
              ? "帮助智能体理解您品牌美学的风格标签、色彩和排版偏好。"
              : "Style tags, color palette, and typography that help agents understand your brand aesthetic."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5 shrink-0"
          onClick={handleAiAnalyze}
          disabled={analyzing}
        >
          {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {analyzing ? (zh ? "分析中…" : "Analyzing…") : (zh ? "AI 分析" : "AI Analyze")}
        </Button>
      </div>

      {/* Style Tags */}
      <FormSection
        title={zh ? "风格标签" : "Style Tags"}
        description={zh ? "选择最能代表您品牌视觉风格的标签。" : "Select tags that best represent your brand's visual style."}
      >
        <TagInput
          allTags={styleDefaults}
          moreTags={styleMore}
          selected={styleTags}
          onSelectedChange={setStyleTags}
          placeholder={zh ? "添加风格标签…" : "Add style tag…"}
        />
      </FormSection>

      {/* Color Palette */}
      <FormSection
        title={zh ? "品牌色板" : "Color Palette"}
        description={zh ? "定义您品牌的3个核心颜色。" : "Define up to 3 core brand colors."}
      >
        <div className="flex flex-wrap gap-4">
          {colors.map((color, idx) => (
            <div key={idx} className="flex flex-col gap-2 items-center">
              <label
                className="relative size-14 rounded-xl border border-border cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: color }}
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => updateColor(idx, e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {color.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground">
                {zh
                  ? idx === 0 ? "主色" : idx === 1 ? "辅色" : "强调色"
                  : idx === 0 ? "Primary" : idx === 1 ? "Secondary" : "Accent"}
              </span>
            </div>
          ))}
        </div>
      </FormSection>

      {/* Typography */}
      <FormSection
        title={zh ? "排版偏好" : "Typography Preference"}
        description={zh ? "您品牌倾向的字体风格。" : "The typography style that best represents your brand."}
      >
        <div className="flex flex-wrap gap-2">
          {typographyOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setTypography(opt)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                typography === opt
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary border-border text-foreground hover:bg-secondary/80"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </FormSection>

      {/* Image Style */}
      <FormSection
        title={zh ? "图像风格" : "Image Style"}
        description={zh ? "您的品牌视觉内容通常呈现的摄影或插图风格。" : "The photography or illustration style your brand content typically uses."}
      >
        <TagInput
          allTags={imageStyleDefaults}
          moreTags={imageStyleMore}
          selected={imageStyleTags}
          onSelectedChange={setImageStyleTags}
          placeholder={zh ? "添加图像风格标签…" : "Add image style tag…"}
        />
      </FormSection>

      {/* Preview */}
      <FormSection
        title={zh ? "风格预览" : "Style Preview"}
        description={zh ? "智能体将看到的您的品牌风格摘要。" : "A summary of your brand style as agents will see it."}
      >
        <div className="rounded-xl bg-secondary p-4 flex flex-col gap-3">
          {styleTags.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {styleTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-lg bg-foreground text-background text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{zh ? "色板：" : "Colors:"}</span>
                <div className="flex gap-1.5">
                  {colors.map((c, i) => (
                    <div
                      key={i}
                      className="size-5 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{zh ? "排版：" : "Typography:"}</span>
                <span className="text-xs text-foreground">{typography}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {zh ? "请选择风格标签以预览。" : "Select style tags above to see a preview."}
            </p>
          )}
        </div>
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
