// FileWriteTool — adapted from Claude Code FileWriteTool

import { writeFile, mkdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

export const FileWriteTool: ToolDef = {
  name: 'write_file',
  description: 'Write content to a file, creating it or overwriting if it exists.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Path to write to.' },
      content: { type: 'string', description: 'Content to write.' },
    },
    required: ['file_path', 'content'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const filePath = resolve(opts.workingDir, input.file_path as string)
    const content = input.content as string

    try {
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, content, 'utf-8')
      return { output: `Written to ${filePath}` }
    } catch (err: unknown) {
      const e = err as { message?: string }
      return { error: e.message ?? 'Write failed' }
    }
  },
}
