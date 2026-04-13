// FileEditTool — adapted from Claude Code FileEditTool
// Performs exact string replacement in files (old_string → new_string)

import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

export const FileEditTool: ToolDef = {
  name: 'edit_file',
  description:
    'Edit a file by replacing an exact string with a new string. The old_string must appear exactly once in the file.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Path to the file to edit.' },
      old_string: { type: 'string', description: 'The exact text to replace.' },
      new_string: { type: 'string', description: 'The replacement text.' },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const filePath = resolve(opts.workingDir, input.file_path as string)
    const oldString = input.old_string as string
    const newString = input.new_string as string

    if (oldString === newString) {
      return { error: 'old_string and new_string are identical — no change made.' }
    }

    try {
      const content = await readFile(filePath, 'utf-8')
      const occurrences = content.split(oldString).length - 1

      if (occurrences === 0) {
        return { error: `old_string not found in ${filePath}` }
      }
      if (occurrences > 1) {
        return {
          error: `old_string appears ${occurrences} times. Provide more context to make it unique.`,
        }
      }

      const updated = content.replace(oldString, newString)
      await writeFile(filePath, updated, 'utf-8')
      return { output: `Edited ${filePath}` }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'ENOENT') return { error: `File not found: ${filePath}` }
      return { error: e.message ?? 'Edit failed' }
    }
  },
}
