"use client"

import { useState } from "react"
import { SectionWrapper, FormSection } from "@/components/seller/section-wrapper"
import { TagInput } from "@/components/seller/tag-input"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

const categoryOptions = [
  "Fashion & Apparel", "Beauty & Personal Care", "Electronics", "Home & Living",
  "Health & Wellness", "Sports & Outdoors", "Toys & Games", "Food & Beverage",
  "Pet Supplies", "Jewelry & Accessories", "Baby & Kids", "Office & Stationery",
]

const aovTiers = ["< $50", "$50 - $120", "$120 - $300", "$300+"]

const purchaseTypes = ["Impulse", "Considered", "Gifting"]

const audienceDefaults = [
  "Gen Z Women", "Millennials", "Working Professionals",
  "College Students", "Parents", "Fitness Enthusiasts",
  "Tech Savvy", "Eco-Conscious", "Luxury Seekers",
  "Budget Shoppers", "Gift Buyers", "Home Makers",
  "Urban Dwellers", "Trendsetters", "Digital Natives",
]
const audienceMore = [
  "Outdoor Lovers", "Frequent Travelers", "New Parents",
  "Remote Workers", "Hobbyists", "Fashion Enthusiasts",
  "Gamers", "Foodies", "Pet Owners", "DIY Makers",
]

const scenarioDefaults = [
  "Self-Care", "Date Night", "Back to School", "Holiday Gifting",
  "Workwear", "Travel", "Home Office", "Outdoor Activities",
  "Wedding", "Baby Shower", "Housewarming", "Graduation",
  "Weekend Casual", "Gym & Fitness",
]
const scenarioMore = [
  "Beach Vacation", "Music Festival", "Job Interview",
  "Dinner Party", "Movie Night", "Game Day",
  "Road Trip", "Picnic", "Anniversary", "Birthday",
]

const intentDefaults = [
  "Trendy & New", "Affordable Basics", "Premium Quality",
  "Sustainable Choice", "Gift Under $50", "Bulk Order",
  "Subscription", "Try Before Buy", "Last Minute Gift",
  "Seasonal Must-Have", "Everyday Essential", "Luxury Treat",
]
const intentMore = [
  "Exclusive Drop", "Limited Edition", "Value Pack",
  "Restock Favorite", "Clearance Find", "Bundle Deal",
  "Free Shipping", "Next-Day Delivery", "Eco-Friendly",
]

export default function DetailsPage() {
  const { t } = useLanguage()
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Fashion & Apparel"])
  const [selectedAov, setSelectedAov] = useState("$50 - $120")
  const [selectedPurchaseType, setSelectedPurchaseType] = useState("Considered")
  const [audienceTags, setAudienceTags] = useState<string[]>(audienceDefaults.slice(0, 3))
  const [scenarioTags, setScenarioTags] = useState<string[]>(scenarioDefaults.slice(0, 4))
  const [intentTags, setIntentTags] = useState<string[]>(intentDefaults.slice(0, 3))

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  return (
    <SectionWrapper
      title={t("details.title")}
      subtitle={t("details.pageDesc")}
    >
      {/* Core Category */}
      <FormSection title={t("details.coreCategory")} description={t("details.coreCategoryDesc")}>
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
      <FormSection title={t("details.aovTier")} description={t("details.aovTierDesc")}>
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
      <FormSection title={t("details.purchaseType")} description={t("details.purchaseTypeDesc")}>
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
      <FormSection title={t("details.primaryAudience")} description={t("details.primaryAudienceDesc")}>
        <TagInput
          allTags={audienceDefaults}
          selected={audienceTags}
          onSelectedChange={setAudienceTags}
          moreTags={audienceMore}
          placeholder={t("details.audiencePlaceholder")}
        />
      </FormSection>

      {/* Scenario Tags */}
      <FormSection title={t("details.scenarioTags")} description={t("details.scenarioTagsDesc")}>
        <TagInput
          allTags={scenarioDefaults}
          selected={scenarioTags}
          onSelectedChange={setScenarioTags}
          moreTags={scenarioMore}
          placeholder={t("details.scenarioPlaceholder")}
        />
      </FormSection>

      {/* Intent Tags */}
      <FormSection title={t("details.intentTags")} description={t("details.intentTagsDesc")}>
        <TagInput
          allTags={intentDefaults}
          selected={intentTags}
          onSelectedChange={setIntentTags}
          moreTags={intentMore}
          placeholder={t("details.intentPlaceholder")}
        />
      </FormSection>

      {/* Save */}
      <div className="flex justify-end pt-4">
        <Button className="rounded-full px-8">{t("common.saveChanges")}</Button>
      </div>
    </SectionWrapper>
  )
}
