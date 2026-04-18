// TodoWrite — structured task list for the agent
// Mirrors Claude Code's TodoWrite. State is per-session, held in memory by the agent runner
// and emitted to the renderer as agent events for live display.

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

export interface Todo {
  content: string
  activeForm: string
  status: 'pending' | 'in_progress' | 'completed'
}

// In-memory store of todos keyed by working dir (session-scoped per agent run)
// The agent loop pushes a `todos_updated` event after each call.
const todoStore = new Map<string, Todo[]>()

export function getTodos(key: string): Todo[] {
  return todoStore.get(key) ?? []
}

export function clearTodos(key: string): void {
  todoStore.delete(key)
}

export const TodoWriteTool: ToolDef = {
  name: 'todo_write',
  description:
    'Maintain a structured task list for complex multi-step work. Use proactively when (a) the task has 3+ steps, (b) the user gave multiple tasks, or (c) you want to demonstrate progress. Mark exactly ONE task as in_progress at a time. Update status immediately as you complete items — do not batch.',
  inputSchema: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        description: 'The complete updated todo list (replaces prior list).',
        items: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Imperative form, e.g. "Run tests"' },
            activeForm: { type: 'string', description: 'Present continuous, e.g. "Running tests"' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
          },
          required: ['content', 'activeForm', 'status'],
        },
      },
    },
    required: ['todos'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const todos = (input.todos ?? []) as Todo[]
    if (!Array.isArray(todos)) return { error: 'todos must be an array' }

    // Validation: at most one in_progress
    const inProgressCount = todos.filter((t) => t.status === 'in_progress').length
    if (inProgressCount > 1) {
      return { error: `Only one task may be in_progress at a time (found ${inProgressCount}).` }
    }

    // Validation: every entry has required fields
    for (const t of todos) {
      if (!t.content || !t.activeForm || !t.status) {
        return { error: 'Each todo must have content, activeForm, and status.' }
      }
      if (!['pending', 'in_progress', 'completed'].includes(t.status)) {
        return { error: `Invalid status: ${t.status}` }
      }
    }

    todoStore.set(opts.workingDir, todos)

    // Format a compact summary
    const lines: string[] = []
    for (const t of todos) {
      const mark = t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '◐' : '○'
      const display = t.status === 'in_progress' ? t.activeForm : t.content
      lines.push(`${mark} ${display}`)
    }
    return { output: `Todos updated (${todos.length}):\n${lines.join('\n')}` }
  },
}
