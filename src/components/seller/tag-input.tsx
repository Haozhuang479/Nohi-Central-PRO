
import { useState, useEffect, useCallback, type KeyboardEvent } from "react"
import { Plus, Sparkles, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TagInputProps {
  /** All available tags (10-20 recommended). Component auto-selects first 3-5. */
  allTags: string[]
  /** Currently selected tags (controlled) */
  selected: string[]
  /** Callback when selection changes */
  onSelectedChange: (tags: string[]) => void
  /** Extra tags to show in "Generate more" overlay */
  moreTags?: string[]
  placeholder?: string
  className?: string
}

export function TagInput({
  allTags,
  selected,
  onSelectedChange,
  moreTags = [],
  placeholder = "Type a custom tag and press Enter...",
  className,
}: TagInputProps) {
  const [input, setInput] = useState("")
  const [customTags, setCustomTags] = useState<string[]>([])
  const [showOverlay, setShowOverlay] = useState(false)

  // All visible tags = preset + custom-added
  const visibleTags = [...allTags, ...customTags.filter((t) => !allTags.includes(t))]

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onSelectedChange(selected.filter((t) => t !== tag))
    } else {
      onSelectedChange([...selected, tag])
    }
  }

  const addCustomTag = () => {
    const trimmed = input.trim()
    if (trimmed && !visibleTags.includes(trimmed) && !selected.includes(trimmed)) {
      setCustomTags((prev) => [...prev, trimmed])
      onSelectedChange([...selected, trimmed])
      setInput("")
    } else if (trimmed && visibleTags.includes(trimmed) && !selected.includes(trimmed)) {
      onSelectedChange([...selected, trimmed])
      setInput("")
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addCustomTag()
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Tag cloud */}
      <div className="flex flex-wrap gap-2">
        {visibleTags.map((tag) => {
          const isSelected = selected.includes(tag)
          const isCustom = customTags.includes(tag) && !allTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "relative px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                isSelected
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary border-border text-foreground hover:bg-secondary/80"
              )}
            >
              <span className="flex items-center gap-1.5">
                {isSelected && <Check className="size-3" />}
                {tag}
                {isCustom && !isSelected && (
                  <span className="text-[10px] text-muted-foreground">custom</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Custom input row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-all">
          <Plus className="size-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder={placeholder}
          />
        </div>
        {moreTags.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowOverlay(true)}
            className="shrink-0 rounded-lg"
          >
            Generate
          </Button>
        )}
      </div>

      {/* Generate More Overlay */}
      {showOverlay && (
        <GenerateOverlay
          moreTags={moreTags}
          alreadySelected={selected}
          allVisible={visibleTags}
          onConfirm={(newTags, newCustomTags) => {
            const merged = [...new Set([...selected, ...newTags])]
            onSelectedChange(merged)
            if (newCustomTags.length > 0) {
              setCustomTags((prev) => [
                ...prev,
                ...newCustomTags.filter((t) => !prev.includes(t)),
              ])
            }
            setShowOverlay(false)
          }}
          onCancel={() => setShowOverlay(false)}
        />
      )}
    </div>
  )
}

/* ──────────────── Generate More Overlay ──────────────── */

function GenerateOverlay({
  moreTags,
  alreadySelected,
  allVisible,
  onConfirm,
  onCancel,
}: {
  moreTags: string[]
  alreadySelected: string[]
  allVisible: string[]
  onConfirm: (selected: string[], customTags: string[]) => void
  onCancel: () => void
}) {
  const [revealedCount, setRevealedCount] = useState(0)
  const [overlaySelected, setOverlaySelected] = useState<string[]>([])
  const [customInput, setCustomInput] = useState("")
  const [customOverlayTags, setCustomOverlayTags] = useState<string[]>([])
  const [fadeIn, setFadeIn] = useState(false)

  // Filter out tags that already exist in the main view
  const newTags = moreTags.filter((t) => !allVisible.includes(t) && !alreadySelected.includes(t))

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true))
  }, [])

  // Stagger reveal tags one by one
  useEffect(() => {
    if (revealedCount < newTags.length + customOverlayTags.length) {
      const timer = setTimeout(() => {
        setRevealedCount((c) => c + 1)
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [revealedCount, newTags.length, customOverlayTags.length])

  const toggleOverlayTag = (tag: string) => {
    setOverlaySelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const addCustomOverlayTag = () => {
    const trimmed = customInput.trim()
    if (
      trimmed &&
      !newTags.includes(trimmed) &&
      !customOverlayTags.includes(trimmed) &&
      !allVisible.includes(trimmed) &&
      !alreadySelected.includes(trimmed)
    ) {
      setCustomOverlayTags((prev) => [...prev, trimmed])
      setOverlaySelected((prev) => [...prev, trimmed])
      setCustomInput("")
    }
  }

  const handleOverlayKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addCustomOverlayTag()
    }
  }

  const allOverlayTags = [...newTags, ...customOverlayTags]

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-300",
        fadeIn ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Blurred backdrop - click to cancel */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-xl"
        onClick={onCancel}
      />

      {/* Floating content directly on backdrop - no card container */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center gap-8 w-full max-w-2xl mx-4 px-2 transition-all duration-500",
          fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )}
      >
        {/* Title */}
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-medium text-foreground/60 tracking-wide uppercase flex items-center gap-2">
            <Sparkles className="size-3.5" />
            Select or type custom tags
          </p>
        </div>

        {/* Floating tag cloud */}
        <div className="flex flex-wrap justify-center gap-2.5 min-h-[100px]">
          {allOverlayTags.map((tag, i) => {
            const revealed = i < revealedCount
            const isSelected = overlaySelected.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleOverlayTag(tag)}
                disabled={!revealed}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border backdrop-blur-sm",
                  !revealed && "opacity-0 scale-75 pointer-events-none",
                  revealed && "opacity-100 scale-100",
                  isSelected
                    ? "bg-foreground/90 text-background border-foreground/50 shadow-lg"
                    : "bg-foreground/[0.06] border-foreground/[0.12] text-foreground/80 hover:bg-foreground/[0.12] hover:border-foreground/20"
                )}
                style={{
                  transitionDelay: revealed ? "0ms" : `${i * 80}ms`,
                }}
              >
                <span className="flex items-center gap-1.5">
                  {isSelected && <Check className="size-3" />}
                  {tag}
                </span>
              </button>
            )
          })}
          {revealedCount < newTags.length && (
            <span className="flex items-center px-3 text-sm text-foreground/40 animate-pulse">
              generating...
            </span>
          )}
        </div>

        {/* Floating custom input */}
        <div className="w-full max-w-sm flex items-center gap-2 rounded-full border border-foreground/[0.12] bg-foreground/[0.06] backdrop-blur-sm px-4 py-2.5 focus-within:border-foreground/25 transition-all">
          <Plus className="size-3.5 text-foreground/40 shrink-0" />
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleOverlayKeyDown}
            className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none"
            placeholder="Type a custom tag..."
          />
        </div>

        {/* Floating action bar */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-foreground/40 tabular-nums">
            {overlaySelected.length} selected
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="rounded-full text-foreground/60 hover:text-foreground hover:bg-foreground/[0.08]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onConfirm(overlaySelected, customOverlayTags)}
            className="rounded-full px-6"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}
