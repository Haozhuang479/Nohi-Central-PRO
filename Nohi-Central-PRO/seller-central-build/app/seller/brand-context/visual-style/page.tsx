"use client"

import { useState } from "react"
import { SectionWrapper, FormSection } from "@/components/seller/section-wrapper"
import { TagInput } from "@/components/seller/tag-input"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

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

export default function VisualStylePage() {
  const { t } = useLanguage()
  const [styleTags, setStyleTags] = useState<string[]>(
    styleDefaults.slice(0, 3)
  )

  return (
    <SectionWrapper
      title={t("visualStyle.title")}
      subtitle={t("visualStyle.pageDesc")}
    >
      <FormSection
        title={t("visualStyle.styleTags")}
        description={t("visualStyle.styleTagsDesc")}
      >
        <TagInput
          allTags={styleDefaults}
          selected={styleTags}
          onSelectedChange={setStyleTags}
          moreTags={styleMore}
          placeholder={t("visualStyle.placeholder")}
        />
      </FormSection>

      {/* Preview */}
      <FormSection title={t("visualStyle.preview")} description={t("visualStyle.previewDesc")}>
        <div className="rounded-2xl bg-secondary/50 p-6">
          {styleTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {styleTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("visualStyle.noTags")}
            </p>
          )}
        </div>
      </FormSection>

      <div className="flex justify-end pt-4">
        <Button className="rounded-full px-8">{t("common.saveChanges")}</Button>
      </div>
    </SectionWrapper>
  )
}
