
import { useState } from "react"
import { SectionWrapper, FormSection } from "@/components/seller/section-wrapper"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

export default function BrandStoryPage() {
  const { t } = useLanguage()
  const [brandStory, setBrandStory] = useState(
    "We started with a simple idea: everyday essentials should look and feel intentional. Born in 2022, our brand combines clean design with sustainable materials, creating products that fit naturally into modern life. Every piece is designed in-house, with a focus on quality over quantity."
  )
  const [founderNote, setFounderNote] = useState(
    "I launched this brand after years in the fashion industry feeling frustrated by the gap between fast fashion and inaccessible luxury. I believe great design should be available to everyone, made responsibly, and built to last. - Alex Chen, Founder"
  )

  const wordCount = (text: string) =>
    text
      .trim()
      .split(/\s+/)
      .filter((w) => w).length

  const storyWords = wordCount(brandStory)
  const noteWords = wordCount(founderNote)

  return (
    <SectionWrapper
      title={t("brandStory.title")}
      subtitle={t("brandStory.pageDesc")}
    >
      {/* Brand Story */}
      <FormSection
        title={t("brandStory.storyTitle")}
        description={t("brandStory.storyDesc")}
      >
        <div className="flex flex-col gap-2">
          <Textarea
            value={brandStory}
            onChange={(e) => setBrandStory(e.target.value)}
            rows={6}
            className="rounded-xl bg-secondary border-border resize-none text-sm"
            placeholder={t("brandStory.storyPlaceholder")}
          />
          <div className="flex justify-end">
            <span className={`text-xs tabular-nums ${storyWords > 150 ? "text-destructive" : "text-muted-foreground"}`}>
              {storyWords} / 150 {t("common.words")}
            </span>
          </div>
        </div>
      </FormSection>

      {/* Founder Note */}
      <FormSection
        title={t("brandStory.founderNote")}
        description={t("brandStory.founderNoteDesc")}
      >
        <div className="flex flex-col gap-2">
          <Textarea
            value={founderNote}
            onChange={(e) => setFounderNote(e.target.value)}
            rows={4}
            className="rounded-xl bg-secondary border-border resize-none text-sm"
            placeholder={t("brandStory.founderNotePlaceholder")}
          />
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground tabular-nums">
              {noteWords} {t("common.words")}
            </span>
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end pt-4">
        <Button className="rounded-full px-8">{t("common.saveChanges")}</Button>
      </div>
    </SectionWrapper>
  )
}
