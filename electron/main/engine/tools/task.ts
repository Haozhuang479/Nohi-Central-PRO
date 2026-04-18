// Task tool — spawn a subagent for isolated, parallel work
// Mirrors Claude Code's Task tool. The subagent runs in its own session with its own
// tool loop, returns a single text result, and protects the main context window.

import type { ToolDef, ToolResult, ToolCallOpts, Session, Message } from '../types'

// Forward-declared: set by agent.ts at module load to avoid circular import
let runAgentImpl:
  | ((
      session: Session,
      settings: import('../types').NohiSettings,
      activeSkills: import('../types').Skill[],
      onEvent: (e: import('../types').AgentEvent) => void,
    ) => AsyncGenerator<import('../types').AgentEvent>)
  | null = null

let activeSkillsRef: import('../types').Skill[] = []

export function registerSubagentRunner(
  runner: typeof runAgentImpl,
  skills: import('../types').Skill[],
): void {
  runAgentImpl = runner
  activeSkillsRef = skills
}

export const TaskTool: ToolDef = {
  name: 'task',
  description:
    'Launch a subagent to handle a focused task autonomously. Use for: research that may take many tool calls, parallel exploration of multiple paths, or any work whose intermediate output would bloat your context. The subagent runs an independent tool loop and returns a single summary text. Do NOT use for trivial tasks (one or two tool calls) — call those tools yourself.',
  inputSchema: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'Short description (3-5 words) of what the subagent will do.',
      },
      prompt: {
        type: 'string',
        description:
          'The complete task for the subagent. Be specific — the subagent has no memory of this conversation. Include file paths, what to look for, and what kind of summary you want back.',
      },
    },
    required: ['description', 'prompt'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const description = input.description as string
    const prompt = input.prompt as string

    if (!prompt?.trim()) return { error: 'Subagent prompt cannot be empty.' }
    if (!runAgentImpl) return { error: 'Subagent runner not initialized.' }
    if (!opts.settings) return { error: 'Settings not available to subagent.' }

    opts.onProgress?.(`[subagent: ${description}]`)

    const subSession: Session = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: `[Sub] ${description}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: opts.settings.defaultModel,
      workingDir: opts.workingDir,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
        },
      ],
    }

    let resultText = ''
    let iterCount = 0
    const MAX_SUB_ITERATIONS = 30

    try {
      for await (const event of runAgentImpl(subSession, opts.settings, activeSkillsRef, () => {})) {
        if (event.type === 'text_delta') resultText += event.delta
        if (event.type === 'tool_start') {
          iterCount++
          opts.onProgress?.(`[subagent step ${iterCount}: ${event.name}]`)
        }
        if (event.type === 'error') {
          return { error: `Subagent error: ${event.message}` }
        }
        if (event.type === 'done') break
        if (iterCount > MAX_SUB_ITERATIONS) {
          return { error: 'Subagent exceeded max iterations.' }
        }
      }
    } catch (err) {
      return { error: `Subagent crashed: ${err instanceof Error ? err.message : String(err)}` }
    }

    if (!resultText.trim()) return { output: '(subagent produced no output)' }

    // Forward conversation history isn't returned — only the final text, mirroring Claude Code
    return { output: resultText }
  },
}

// Re-export message type for typing
export type { Message }
