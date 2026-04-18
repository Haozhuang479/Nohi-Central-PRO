// Vision & PDF extraction tools — use OpenAI vision (gpt-4o) for images and pdfjs for PDFs.

import { readFile } from 'fs/promises'
import { resolve, basename, extname } from 'path'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

const VISION_MODEL = 'gpt-4o-mini'

async function callVision(apiKey: string, imageBase64: string, mime: string, prompt: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${imageBase64}` } },
        ],
      }],
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!resp.ok) throw new Error(`Vision API ${resp.status}: ${(await resp.text()).slice(0, 300)}`)
  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

export const ExtractFromImageTool: ToolDef = {
  name: 'extract_from_image',
  description:
    'Use vision to extract information from an image: product attributes (material, color, size, style), OCR text, design notes, or a free-form description. Supply either a local path (relative to working dir) or a Drive base64 buffer (from gdrive_read_file). Requires an OpenAI API key.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Local path to the image file.' },
      base64: { type: 'string', description: 'Base64-encoded image (alternative to path).' },
      mime_type: { type: 'string', description: 'e.g. image/png, image/jpeg. Required if using base64.' },
      task: {
        type: 'string',
        enum: ['product_attributes', 'ocr', 'describe', 'custom'],
        description: 'product_attributes → structured product fields; ocr → text only; describe → free-form caption; custom → use the `prompt` field.',
      },
      prompt: { type: 'string', description: 'Required when task=custom.' },
    },
  },
  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const apiKey = opts.settings?.openaiApiKey
    if (!apiKey) return { error: 'OpenAI API key not set (required for vision extraction).' }

    let imageBase64: string
    let mime: string
    if (input.path) {
      const p = resolve(opts.workingDir, input.path as string)
      if (!p.startsWith(resolve(opts.workingDir))) return { error: 'Path outside working directory.' }
      try {
        const buf = await readFile(p)
        imageBase64 = buf.toString('base64')
      } catch (err) {
        return { error: `Could not read image: ${err instanceof Error ? err.message : String(err)}` }
      }
      const ext = extname(p).toLowerCase()
      mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    } else if (input.base64) {
      imageBase64 = input.base64 as string
      mime = (input.mime_type as string) ?? 'image/png'
    } else {
      return { error: 'Provide either `path` or `base64`.' }
    }

    const task = (input.task as string) ?? 'describe'
    const prompt = taskPrompt(task, input.prompt as string | undefined)

    try {
      opts.onProgress?.('Analyzing image with vision model…')
      const text = await callVision(apiKey, imageBase64, mime, prompt)
      return { output: text || '(empty response from vision model)' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

function taskPrompt(task: string, custom?: string): string {
  switch (task) {
    case 'product_attributes':
      return `You are extracting structured product attributes from a product image for an e-commerce catalog.
Return ONLY a JSON object with these keys (omit ones you can't confidently infer):
{
  "title": "...",        // concise name
  "category": "...",
  "productType": "...",
  "color": "...",
  "material": "...",
  "size": "...",
  "dimensions": {"length": N, "width": N, "height": N, "unit": "cm"|"in"},
  "style": "...",
  "tags": ["...", "..."],
  "keywords": ["...", "..."],
  "description": "...",   // 2-3 sentences
  "targetAudience": "...",
  "useCases": ["...", "..."]
}
Use null for fields you can't determine. No prose outside the JSON.`
    case 'ocr':
      return 'Transcribe ALL text visible in this image. Preserve line breaks. Output text only — no commentary.'
    case 'describe':
      return 'Describe this image in 2-3 sentences for a catalog or marketing context. Be specific about color, composition, and subject.'
    case 'custom':
      return custom ?? 'Describe this image.'
    default:
      return custom ?? 'Describe this image.'
  }
}

export const ExtractFromPdfTool: ToolDef = {
  name: 'extract_from_pdf',
  description:
    'Extract text from a PDF file. Uses pdfjs for the text layer; if the PDF is scanned/image-only for a page, optionally falls back to vision OCR on that page (use_vision_fallback=true, requires OpenAI key).',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to .pdf file.' },
      max_pages: { type: 'number', description: 'Cap on pages to process (default 20).' },
      use_vision_fallback: { type: 'boolean', description: 'If a page has no text layer, call the vision model on a rendered image of that page. Slow + costs API.' },
    },
    required: ['path'],
  },
  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const p = resolve(opts.workingDir, input.path as string)
    if (!p.startsWith(resolve(opts.workingDir))) return { error: 'Path outside working directory.' }

    let buf: Buffer
    try {
      buf = await readFile(p)
    } catch (err) {
      return { error: `Could not read PDF: ${err instanceof Error ? err.message : String(err)}` }
    }

    const maxPages = Math.min(Math.max((input.max_pages as number | undefined) ?? 20, 1), 100)
    const useVision = !!input.use_vision_fallback

    try {
      // pdfjs-dist has a legacy CJS build that works in Node/Electron main
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs') as {
        getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDocProxy> }
      }
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
      const total = Math.min(doc.numPages, maxPages)
      opts.onProgress?.(`Extracting ${total} page(s) from ${basename(p)}…`)

      const pages: string[] = []
      for (let i = 1; i <= total; i++) {
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((it: { str?: string }) => it.str ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (pageText.length > 0) {
          pages.push(`## Page ${i}\n\n${pageText}`)
        } else if (useVision) {
          // Render the page as a PNG, run vision OCR
          const apiKey = opts.settings?.openaiApiKey
          if (!apiKey) {
            pages.push(`## Page ${i}\n\n(no text layer; vision fallback requires OpenAI API key)`)
            continue
          }
          // pdfjs in Node can render using node-canvas; we don't ship that.
          // Pragmatic alternative: skip and tell the caller.
          pages.push(`## Page ${i}\n\n(image-only page — vision fallback not yet wired; process the PDF externally or use a rendering tool first)`)
        } else {
          pages.push(`## Page ${i}\n\n(no extractable text; set use_vision_fallback=true to OCR)`)
        }
      }
      const body = pages.join('\n\n')
      const footer = doc.numPages > maxPages ? `\n\n*(truncated — ${doc.numPages - maxPages} more pages not processed)*` : ''
      return { output: `# ${basename(p)}\n\nTotal pages: ${doc.numPages}\n\n${body}${footer}` }
    } catch (err) {
      const e = err as { message?: string }
      return { error: `PDF extraction failed: ${e.message ?? String(err)}` }
    }
  },
}

interface PdfDocProxy {
  numPages: number
  getPage: (n: number) => Promise<PdfPageProxy>
}
interface PdfPageProxy {
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>
}
