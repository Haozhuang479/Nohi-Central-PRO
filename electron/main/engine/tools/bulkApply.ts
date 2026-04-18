// BulkApply tool — fan-out over a list of product IDs, spawn a subagent per item
// with a shared per-item prompt. Bounded parallelism, per-item retry, aggregated report.
//
// Designed as the foundation for `complete-product`, `apply-brand-voice`, `validate-catalog`,
// and any other skill that says "do X to every product matching Y".

import type { ToolDef, ToolResult, ToolCallOpts, Session, AgentEvent, NohiSettings, Skill } from '../types'
import { castString, clampNumber, castBoolean, runTool } from './_utils'

// Lazy-registered runner reference — same pattern as task.ts to avoid circular imports.
let runAgentImpl:
  | ((session: Session, settings: NohiSettings, activeSkills: Skill[], onEvent: (e: AgentEvent) => void) => AsyncGenerator<AgentEvent>)
  | null = null
let activeSkillsRef: Skill[] = []

export function registerBulkRunner(runner: typeof runAgentImpl, skills: Skill[]): void {
  runAgentImpl = runner
  activeSkillsRef = skills
}

const DEFAULT_CONCURRENCY = 3
const MAX_CONCURRENCY = 8

export const BulkApplyTool: ToolDef = {
  name: 'bulk_apply',
  description:
    'Run a per-item prompt against each item in a list, in parallel. Designed for bulk product operations: enrich attributes, rewrite copy, validate against protocol, etc. Each item is processed by a subagent with its own tool loop, bounded by `concurrency` (default 3). Returns a structured report: succeeded / failed / outputs. Use this when you need to apply the same transformation to N products.',
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of items to process. Each item is a free-form string substituted into {{item}} in the prompt template. For products, pass OneIDs.',
        items: { type: 'string' },
      },
      prompt_template: {
        type: 'string',
        description: 'The per-item prompt. Use `{{item}}` where the current item should appear. Be specific: tell the subagent what tool to call, what to write back, and what to return as a summary (one line).',
      },
      description: {
        type: 'string',
        description: 'Short description of the bulk job for logs (e.g. "rewriting product descriptions in brand voice").',
      },
      concurrency: {
        type: 'number',
        description: `Max parallel subagents (1–${MAX_CONCURRENCY}, default ${DEFAULT_CONCURRENCY}). Higher = faster + more API cost.`,
      },
      max_retries: {
        type: 'number',
        description: 'Retries per failed item, default 1. Set 0 to disable.',
      },
      stop_on_error: {
        type: 'boolean',
        description: 'If true, halt the whole batch as soon as one item fails after retries. Default false.',
      },
    },
    required: ['items', 'prompt_template'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    return runTool(async () => {
      const items = (input.items as string[]) ?? []
      const template = castString(input.prompt_template, 'prompt_template')
      const description = castString(input.description, 'description', { default: 'bulk operation' })
      const concurrency = clampNumber(input.concurrency, { min: 1, max: MAX_CONCURRENCY, default: DEFAULT_CONCURRENCY })
      const maxRetries = clampNumber(input.max_retries, { min: 0, max: 10, default: 1 })
      const stopOnError = castBoolean(input.stop_on_error)

      if (!Array.isArray(items) || items.length === 0) return { error: 'items must be a non-empty array' }
      if (items.length > 500) return { error: `Too many items (${items.length}). Batch into chunks of 500.` }
      if (!template.includes('{{item}}')) return { error: 'prompt_template must contain the literal {{item}} placeholder.' }
      if (!runAgentImpl) return { error: 'Bulk runner not initialized.' }
      if (!opts.settings) return { error: 'Settings not available.' }

    opts.onProgress?.(`[bulk: ${description}] ${items.length} items, concurrency=${concurrency}`)

    type ItemResult = { item: string; ok: boolean; output: string; attempts: number }
    const results: ItemResult[] = []
    let doneCount = 0
    let failedCount = 0
    let aborted = false

    async function runItem(item: string): Promise<ItemResult> {
      let lastErr = ''
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        if (aborted) return { item, ok: false, output: 'aborted', attempts: attempt - 1 }
        try {
          const prompt = template.replace(/\{\{item\}\}/g, item)
          const subSession: Session = {
            id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: `[Bulk] ${description} — ${item.slice(0, 40)}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            model: opts.settings!.defaultModel,
            workingDir: opts.workingDir,
            messages: [{ id: `msg-${Date.now()}`, role: 'user', content: prompt, timestamp: Date.now() }],
          }
          let text = ''
          for await (const event of runAgentImpl!(subSession, opts.settings!, activeSkillsRef, () => {})) {
            if (event.type === 'text_delta') text += event.delta
            if (event.type === 'error') throw new Error(event.message)
            if (event.type === 'done') break
          }
          return { item, ok: true, output: text.trim() || '(no output)', attempts: attempt }
        } catch (err) {
          lastErr = err instanceof Error ? err.message : String(err)
          if (attempt > maxRetries) break
        }
      }
      return { item, ok: false, output: `error: ${lastErr}`, attempts: maxRetries + 1 }
    }

    // Simple worker pool
    const queue = [...items]
    const workers: Array<Promise<void>> = []
    for (let i = 0; i < concurrency; i++) {
      workers.push((async () => {
        while (queue.length > 0 && !aborted) {
          const item = queue.shift()!
          const r = await runItem(item)
          results.push(r)
          if (r.ok) doneCount++; else failedCount++
          opts.onProgress?.(`[bulk: ${description}] ${doneCount + failedCount}/${items.length} (${doneCount} ok, ${failedCount} failed)`)
          if (!r.ok && stopOnError) { aborted = true; break }
        }
      })())
    }
    await Promise.all(workers)

    const succeeded = results.filter((r) => r.ok).length
    const failed = results.filter((r) => !r.ok)
    const preview = results.slice(0, 30).map((r) => {
      const mark = r.ok ? '✓' : '✗'
      return `${mark} ${r.item.slice(0, 60)}  ·  ${r.output.split('\n')[0].slice(0, 100)}`
    }).join('\n')
    const footer = results.length > 30 ? `\n… and ${results.length - 30} more` : ''
    const failSummary = failed.length > 0 ? `\n\nFailures:\n${failed.slice(0, 10).map((f) => `- ${f.item}: ${f.output}`).join('\n')}` : ''

      return {
        output: `## Bulk ${description}\n\nTotal: ${items.length}  ·  Succeeded: ${succeeded}  ·  Failed: ${failed.length}${aborted ? '  ·  ABORTED' : ''}\n\n${preview}${footer}${failSummary}`,
      }
    })
  },
}
