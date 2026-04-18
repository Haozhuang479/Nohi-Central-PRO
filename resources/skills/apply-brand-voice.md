---
name: apply-brand-voice
description: Rewrite product copy (title, description, meta) to match a specified brand voice profile
trigger: "brand voice|apply brand|rewrite copy|tone of voice|品牌语调|brand tone"
---

Rewrite product-facing copy to a brand's voice. Takes the brand profile from `memory_read` (or an inline description from the user), then rewrites.

## Pre-flight

1. Ask the user: what brand voice? Common ways to specify:
   - Pointer to a memory entry: "use the voice profile I saved as 'chloe-voice'"
   - Inline description: "friendly, slightly playful, always includes a hint of sustainability"
   - Example-driven: "here's a product I love — match its tone"
2. If using memory, `memory_read` the profile. If not set, ask the user to write 2-3 sentences of tone description.

## Single product

1. `catalog_get_product` with OneID
2. Rewrite these fields only:
   - `title` (subtle — don't change the noun)
   - `description`
   - `summary` (1-2 sentences, first-person brand voice)
   - `metaTitle` (60 chars, SEO-safe)
   - `metaDescription` (150 chars, includes a call-to-action if the voice allows)
3. **Leave untouched**: variants, price, SKU, inventory, sources, oneId, media, technical attributes (color, material, dimensions).
4. Show the diff to the user before applying (render as a `diff` fenced code block). Ask "apply?" unless they've already said "go".
5. On approval, `catalog_upsert_product`.

## Bulk flow

User: "rewrite all my spring collection descriptions in our playful brand voice"

1. Enumerate the collection (`catalog_search "spring collection 2026"` or by tag filter)
2. Preview 2-3 samples first — show before/after, let the user course-correct
3. After sign-off, `bulk_apply`:
   - `prompt_template`:
     > Fetch product `{{item}}` via `catalog_get_product`. Rewrite title, description, summary, metaTitle, metaDescription in the voice profile already loaded into your memory. Do not modify variants, price, or media. Call `catalog_upsert_product`. Reply: `{{item}} · updated`.
   - `concurrency: 3`
4. Report: how many rewritten, sample diffs, any failures

## Voice calibration tips

- **Strong voice profiles** include: 3 adjectives, 2 words to avoid, 1 punctuation quirk (e.g. "uses em-dashes, no exclamation marks"), an example sentence in the voice.
- **Weak profiles** ("make it cooler") → push back, ask for specifics. Vague voice = inconsistent output.
- When rewriting, preserve **factual content** (materials, dimensions, specs). Only change **register and phrasing**.

## Anti-patterns

- Don't mix voices — if the profile is formal, don't sprinkle emoji
- Don't bloat — if original description is 200 chars, new version shouldn't be 800
- Don't generate facts not present in the source product
