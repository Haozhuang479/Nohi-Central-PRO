"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface SimpleTagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
}

export function SimpleTagInput({
  tags,
  onTagsChange,
  suggestions = [],
  placeholder = "Type and press Enter...",
  className,
}: SimpleTagInputProps) {
  const [input, setInput] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  )

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed])
    }
    setInput("")
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (input.trim()) addTag(input)
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-secondary p-3 focus-within:ring-2 focus-within:ring-ring transition-all">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 pl-2.5 pr-1.5 py-1 bg-background border border-border text-foreground text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:text-destructive transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          placeholder={tags.length === 0 ? placeholder : "Add more..."}
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && input && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          {filteredSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-secondary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
