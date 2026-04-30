
import { useState } from "react"
import { SectionWrapper, FormSection } from "@/components/seller/section-wrapper"
import { TagInput } from "@/components/seller/tag-input"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

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

export default function GuardrailsPage() {
  const { t } = useLanguage()
  const [excludedAudiences, setExcludedAudiences] = useState<string[]>(
    excludedAudienceDefaults.slice(0, 3)
  )
  const [prohibitedScenarios, setProhibitedScenarios] = useState<string[]>(
    prohibitedScenarioDefaults.slice(0, 4)
  )
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>(
    blockedKeywordDefaults.slice(0, 5)
  )

  return (
    <SectionWrapper
      title={t("guardrails.title")}
      subtitle={t("guardrails.pageDesc")}
    >
      {/* Excluded Audiences */}
      <FormSection
        title={t("guardrails.excludedAudiences")}
        description={t("guardrails.excludedAudiencesDesc")}
      >
        <TagInput
          allTags={excludedAudienceDefaults}
          selected={excludedAudiences}
          onSelectedChange={setExcludedAudiences}
          moreTags={excludedAudienceMore}
          placeholder={t("guardrails.excludedPlaceholder")}
        />
      </FormSection>

      {/* Prohibited Scenarios */}
      <FormSection
        title={t("guardrails.prohibitedScenarios")}
        description={t("guardrails.prohibitedScenariosDesc")}
      >
        <TagInput
          allTags={prohibitedScenarioDefaults}
          selected={prohibitedScenarios}
          onSelectedChange={setProhibitedScenarios}
          moreTags={prohibitedScenarioMore}
          placeholder={t("guardrails.scenarioPlaceholder")}
        />
      </FormSection>

      {/* Blocked Keywords */}
      <FormSection
        title={t("guardrails.blockedKeywords")}
        description={t("guardrails.blockedKeywordsDesc")}
      >
        <TagInput
          allTags={blockedKeywordDefaults}
          selected={blockedKeywords}
          onSelectedChange={setBlockedKeywords}
          moreTags={blockedKeywordMore}
          placeholder={t("guardrails.keywordPlaceholder")}
        />
      </FormSection>

      {/* Save */}
      <div className="flex justify-end pt-4">
        <Button className="rounded-full px-8">{t("common.saveChanges")}</Button>
      </div>
    </SectionWrapper>
  )
}
