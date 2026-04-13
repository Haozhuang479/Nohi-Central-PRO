// GlobTool — file pattern matching, adapted from Claude Code GlobTool

import { glob } from 'fs/promises'
import { resolve } from 'path'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

export const GlobTool: ToolDef = {
  name: 'glob',
  description: 'Find files matching a glob pattern. Returns matching file paths sorted by modification time.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern, e.g. "**/*.ts" or "src/**/*.json".' },
      path: { type: 'string', description: 'Directory to search in. Defaults to working directory.' },
    },
    required: ['pattern'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const pattern = input.pattern as string
    const searchDir = input.path
      ? resolve(opts.workingDir, input.path as string)
      : opts.workingDir

    try {
      const matches: string[] = []
      for await (const file of glob(pattern, { cwd: searchDir })) {
        matches.push(file)
      }

      if (matches.length === 0) {
        return { output: 'No files found matching pattern.' }
      }

      return { output: matches.sort().join('\n') }
    } catch (err: unknown) {
      const e = err as { message?: string }
      return { error: e.message ?? 'Glob failed' }
    }
  },
}
