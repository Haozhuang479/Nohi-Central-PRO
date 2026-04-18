// Image Generation & Editing Tools — adapted from Jaaz image_generation_core
// Uses OpenAI Images API (gpt-image-1 / dall-e-3) for generation and editing
// Generated images are saved to ~/.nohi/images/ and returned as local file paths

import { writeFile, readFile, mkdir } from 'fs/promises'
import { join, resolve } from 'path'
import { homedir } from 'os'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

const IMAGES_DIR = join(homedir(), '.nohi', 'images')

async function ensureImagesDir(): Promise<void> {
  await mkdir(IMAGES_DIR, { recursive: true })
}

function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Aspect ratio → OpenAI size string (matching Jaaz size_map)
const SIZE_MAP: Record<string, string> = {
  '1:1': '1024x1024',
  '16:9': '1792x1024',
  '9:16': '1024x1792',
  '4:3': '1536x1024',
  '3:4': '1024x1536',
}

// ─── Image Generation Tool ─────────────────────────────────────────────────

export const ImageGenerateTool: ToolDef = {
  name: 'image_generate',
  description:
    'Generate an image from a text prompt using AI (OpenAI gpt-image-1). Supports multiple aspect ratios. Returns a local file path to the generated image. Use for creating product images, marketing visuals, logos, illustrations, UI mockups, and any visual design task.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed description of the image to generate. Be specific about style, composition, colors, lighting, and subject.',
      },
      aspect_ratio: {
        type: 'string',
        description: 'Aspect ratio: "1:1" (square), "16:9" (landscape), "9:16" (portrait/mobile), "4:3", "3:4". Default: "1:1".',
      },
      model: {
        type: 'string',
        description: 'Model to use: "gpt-image-1" (best quality) or "dall-e-3". Default: "gpt-image-1".',
      },
      quality: {
        type: 'string',
        description: 'Quality: "low", "medium", "high", or "auto". Default: "high".',
      },
    },
    required: ['prompt'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const prompt = input.prompt as string
    const aspectRatio = (input.aspect_ratio as string | undefined) ?? '1:1'
    const model = (input.model as string | undefined) ?? 'gpt-image-1'
    const quality = (input.quality as string | undefined) ?? 'high'

    if (!prompt.trim()) return { error: 'Prompt cannot be empty.' }

    const apiKey = opts.settings?.openaiApiKey
    if (!apiKey) return { error: 'OpenAI API key not set. Go to Settings to add it (required for image generation).' }

    const size = SIZE_MAP[aspectRatio] ?? '1024x1024'

    try {
      await ensureImagesDir()
      opts.onProgress?.('Generating image...')

      // gpt-image-1 always returns b64_json and rejects response_format param.
      // dall-e-3 needs response_format='b64_json' explicitly. Build body accordingly.
      const isGptImage = model.startsWith('gpt-image')
      const body: Record<string, unknown> = { model, prompt, n: 1, size }
      if (isGptImage) {
        // gpt-image-1 supports quality: low/medium/high/auto
        body.quality = quality
      } else {
        // dall-e-3 needs response_format and supports quality: standard/hd
        body.response_format = 'b64_json'
        body.quality = quality === 'high' ? 'hd' : 'standard'
      }

      const resp = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000), // 2 min for generation
      })

      if (!resp.ok) {
        const errText = await resp.text()
        return { error: `Image generation failed: ${resp.status} ${errText.slice(0, 200)}` }
      }

      const data = (await resp.json()) as {
        data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>
      }

      const imgData = data.data?.[0]
      if (!imgData) return { error: 'No image data returned from API.' }

      let filePath: string
      const imageId = generateImageId()

      if (imgData.b64_json) {
        const buffer = Buffer.from(imgData.b64_json, 'base64')
        filePath = join(IMAGES_DIR, `${imageId}.png`)
        await writeFile(filePath, buffer)
      } else if (imgData.url) {
        // Download from URL
        const imgResp = await fetch(imgData.url, { signal: AbortSignal.timeout(30_000) })
        if (!imgResp.ok) return { error: 'Failed to download generated image.' }
        const buffer = Buffer.from(await imgResp.arrayBuffer())
        filePath = join(IMAGES_DIR, `${imageId}.png`)
        await writeFile(filePath, buffer)
      } else {
        return { error: 'Invalid response: no image data.' }
      }

      const revisedPrompt = imgData.revised_prompt ? `\nRevised prompt: ${imgData.revised_prompt}` : ''
      return {
        output: `Image generated successfully.\nFile: ${filePath}\nSize: ${size}\nModel: ${model}${revisedPrompt}\n\n![Generated Image](file://${filePath})`,
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      if (e.name === 'TimeoutError') return { error: 'Image generation timed out (2 min limit).' }
      return { error: e.message ?? 'Image generation failed.' }
    }
  },
}

// ─── Image Edit Tool ───────────────────────────────────────────────────────

export const ImageEditTool: ToolDef = {
  name: 'image_edit',
  description:
    'Edit an existing image using AI. Provide a source image and a text prompt describing the desired changes. Use for modifying product photos, adding/removing elements, style transfer, background changes, and iterative design refinement.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Description of the edit to make, e.g. "change the background to a beach scene" or "remove the text and add a logo".',
      },
      image_path: {
        type: 'string',
        description: 'Path to the source image file to edit.',
      },
      model: {
        type: 'string',
        description: 'Model: "gpt-image-1" (default) or "dall-e-2".',
      },
    },
    required: ['prompt', 'image_path'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const prompt = input.prompt as string
    const imagePath = resolve(opts.workingDir, input.image_path as string)
    const model = (input.model as string | undefined) ?? 'gpt-image-1'

    if (!prompt.trim()) return { error: 'Edit prompt cannot be empty.' }

    const apiKey = opts.settings?.openaiApiKey
    if (!apiKey) return { error: 'OpenAI API key not set.' }

    // Path traversal check
    if (opts.workingDir && !imagePath.startsWith(resolve(opts.workingDir)) && !imagePath.startsWith(IMAGES_DIR)) {
      return { error: 'Access denied: image path is outside working directory.' }
    }

    try {
      await ensureImagesDir()
      opts.onProgress?.('Editing image...')

      // Read source image
      const imageBuffer = await readFile(imagePath)
      const imageBase64 = imageBuffer.toString('base64')

      // Use the images/edits endpoint
      // Build multipart form data
      const boundary = `----NohiEdit${Date.now()}`
      const parts: Buffer[] = []

      // model field
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`))
      // prompt field
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${prompt}\r\n`))
      // image field
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="source.png"\r\nContent-Type: image/png\r\n\r\n`))
      parts.push(imageBuffer)
      parts.push(Buffer.from('\r\n'))
      // closing
      parts.push(Buffer.from(`--${boundary}--\r\n`))

      const body = Buffer.concat(parts)

      const resp = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
        signal: AbortSignal.timeout(120_000),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        return { error: `Image edit failed: ${resp.status} ${errText.slice(0, 200)}` }
      }

      const data = (await resp.json()) as {
        data?: Array<{ b64_json?: string; url?: string }>
      }

      const imgData = data.data?.[0]
      if (!imgData) return { error: 'No image data returned.' }

      const imageId = generateImageId()
      const filePath = join(IMAGES_DIR, `${imageId}.png`)

      if (imgData.b64_json) {
        await writeFile(filePath, Buffer.from(imgData.b64_json, 'base64'))
      } else if (imgData.url) {
        const imgResp = await fetch(imgData.url, { signal: AbortSignal.timeout(30_000) })
        await writeFile(filePath, Buffer.from(await imgResp.arrayBuffer()))
      } else {
        return { error: 'Invalid response.' }
      }

      return {
        output: `Image edited successfully.\nFile: ${filePath}\nSource: ${imagePath}\n\n![Edited Image](file://${filePath})`,
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string; code?: string }
      if (e.code === 'ENOENT') return { error: `Source image not found: ${imagePath}` }
      if (e.name === 'TimeoutError') return { error: 'Image edit timed out.' }
      return { error: e.message ?? 'Image edit failed.' }
    }
  },
}
