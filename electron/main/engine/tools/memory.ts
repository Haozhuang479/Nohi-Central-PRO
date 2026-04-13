// Memory tools — allow the agent to read and write persistent cross-session memory

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'
import { listMemories, writeMemory, deleteMemory } from '../memory/store'

export const MemoryReadTool: ToolDef = {
  name: 'memory_read',
  description:
    'Read all persistent memories from previous conversations. Returns saved user preferences, project context, feedback, and reference notes. Use this to recall past context.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by category: "user", "project", "feedback", "reference". Omit to get all.',
      },
    },
    required: [],
  },

  async call(input, _opts: ToolCallOpts): Promise<ToolResult> {
    const cat = input.category as string | undefined
    const entries = await listMemories()
    const filtered = cat ? entries.filter(e => e.category === cat) : entries

    if (filtered.length === 0) {
      return { output: 'No memories stored yet.' }
    }

    const formatted = filtered.map(e =>
      `**${e.id}** (${e.category}) — updated ${e.updated.split('T')[0]}\n${e.content}`
    ).join('\n\n---\n\n')

    return { output: `${filtered.length} memories found:\n\n${formatted}` }
  },
}

export const MemoryWriteTool: ToolDef = {
  name: 'memory_write',
  description:
    'Save a persistent memory that will be available in future conversations. Use this when you learn something important about the user, their project, or receive feedback on your approach. Categories: "user" (preferences/role), "project" (ongoing work context), "feedback" (corrections/confirmed approaches), "reference" (external resource locations).',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The memory content to save. Be specific and actionable.',
      },
      category: {
        type: 'string',
        description: 'Category: "user", "project", "feedback", or "reference".',
      },
      tags: {
        type: 'string',
        description: 'Comma-separated tags for retrieval, e.g. "react,testing,preferences".',
      },
    },
    required: ['content', 'category'],
  },

  async call(input, _opts: ToolCallOpts): Promise<ToolResult> {
    const content = input.content as string
    const category = input.category as 'user' | 'project' | 'feedback' | 'reference'
    const tags = ((input.tags as string | undefined) ?? '').split(',').map(t => t.trim()).filter(Boolean)

    if (!content.trim()) return { error: 'Memory content cannot be empty.' }
    if (!['user', 'project', 'feedback', 'reference'].includes(category)) {
      return { error: `Invalid category "${category}". Use: user, project, feedback, reference.` }
    }

    const entry = await writeMemory(content, category, tags)
    return { output: `Memory saved: ${entry.id} (${entry.category})` }
  },
}

export const MemoryDeleteTool: ToolDef = {
  name: 'memory_delete',
  description: 'Delete a persistent memory by its ID. Use memory_read first to find the ID.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The memory ID to delete.' },
    },
    required: ['id'],
  },

  async call(input, _opts: ToolCallOpts): Promise<ToolResult> {
    const id = input.id as string
    if (!id.trim()) return { error: 'Memory ID is required.' }
    await deleteMemory(id)
    return { output: `Memory "${id}" deleted.` }
  },
}
