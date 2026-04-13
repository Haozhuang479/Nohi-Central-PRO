import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// ── Helpers ───────────────────────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length
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

// ── Example story content ─────────────────────────────────────────────────────

const EXAMPLE_STORY =
  "We started with a simple idea: everyday essentials should look and feel intentional. Born in 2022, our brand combines clean design with sustainable materials, creating products that fit naturally into modern life. Every piece is designed in-house, with a focus on quality over quantity."

const EXAMPLE_FOUNDER_NOTE =
  "I launched this brand after years in the fashion industry feeling frustrated by the gap between fast fashion and inaccessible luxury. I believe great design should be available to everyone, made responsibly, and built to last. - Alex Chen, Founder"

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BrandStoryPage() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [brandStory, setBrandStory] = useState(EXAMPLE_STORY)
  const [founderNote, setFounderNote] = useState(EXAMPLE_FOUNDER_NOTE)
  const [generating, setGenerating] = useState(false)

  const storyWords = wordCount(brandStory)
  const noteWords = wordCount(founderNote)

  const handleAiGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      setBrandStory(
        "Born from a love of craftsmanship and a commitment to sustainability, our brand was founded in 2021 to bridge the gap between premium quality and everyday affordability. We design each product with intention — sourcing ethical materials, partnering with fair-trade manufacturers, and ensuring every detail tells a story. Our collections are built to last, to be worn, lived in, and loved across seasons."
      )
      setFounderNote(
        "Building this brand taught me that people don't just buy products — they buy into values. Everything we create reflects the belief that beautiful, responsible design shouldn't be a privilege. — Jamie Lee, Founder"
      )
      setGenerating(false)
    }, 2200)
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {zh ? "品牌故事" : "Brand Story"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {zh
              ? "150字品牌故事和创始人寄语供智能体参考，传递您的品牌价值观。"
              : "A 150-word brand story and founder note for agents to reference when representing your brand."}
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
          {generating
            ? (zh ? "生成中…" : "Generating…")
            : (zh ? "AI 生成故事" : "AI Generate Story")}
        </Button>
      </div>

      {/* Brand Story */}
      <FormSection
        title={zh ? "品牌故事" : "Brand Story"}
        description={zh
          ? "用 150 字以内描述您的品牌起源、价值观和使命。"
          : "Describe your brand's origin, values, and mission in 150 words or fewer."}
      >
        <div className="flex flex-col gap-2">
          <Textarea
            value={brandStory}
            onChange={(e) => setBrandStory(e.target.value)}
            rows={6}
            className="rounded-xl bg-secondary border-border resize-none text-sm"
            placeholder={zh
              ? "我们的品牌诞生于…"
              : "Our brand was born from a belief that…"}
          />
          <div className="flex justify-end">
            <span
              className={`text-xs tabular-nums ${
                storyWords > 150 ? "text-destructive font-medium" : "text-muted-foreground"
              }`}
            >
              {storyWords} / 150 {zh ? "字" : "words"}
            </span>
          </div>
        </div>
      </FormSection>

      {/* Founder Note */}
      <FormSection
        title={zh ? "创始人寄语" : "Founder Note"}
        description={zh
          ? "可选：来自创始人的个人留言，增添品牌温度（可留空）。"
          : "Optional: a personal message from the founder to add a human touch."}
      >
        <div className="flex flex-col gap-2">
          <Textarea
            value={founderNote}
            onChange={(e) => setFounderNote(e.target.value)}
            rows={4}
            className="rounded-xl bg-secondary border-border resize-none text-sm"
            placeholder={zh
              ? "作为创始人，我想告诉大家…"
              : "As the founder, I want customers to know…"}
          />
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground tabular-nums">
              {noteWords} {zh ? "字" : "words"}
            </span>
          </div>
        </div>
      </FormSection>

      {/* Usage hint */}
      <div className="rounded-2xl bg-secondary/50 p-4">
        <p className="text-xs text-muted-foreground">
          {zh
            ? "品牌故事将被所有接入您品牌的智能体读取，用于生成与您品牌声音一致的内容。"
            : "Your brand story will be read by all agents connected to your brand, helping them generate content that matches your voice and values."}
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
