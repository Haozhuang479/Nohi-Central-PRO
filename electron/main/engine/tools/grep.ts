// GrepTool — regex content search, adapted from Claude Code GrepTool

import { exec } from 'child_process'
import { promisify } from 'util'
import { resolve } from 'path'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

const execAsync = promisify(exec)

export const GrepTool: ToolDef = {
  name: 'grep',
  description:
    'Search file contents using a regex pattern. Returns matching lines with file and line number.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Regex pattern to search for.' },
      path: { type: 'string', description: 'File or directory to search. Defaults to working dir.' },
      glob: { type: 'string', description: 'Glob pattern to filter files, e.g. "*.ts".' },
      case_insensitive: { type: 'boolean', description: 'Case-insensitive search.' },
    },
    required: ['pattern'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const pattern = input.pattern as string
    const searchPath = input.path
      ? resolve(opts.workingDir, input.path as string)
      : opts.workingDir
    const globPattern = input.glob as string | undefined
    const caseFlag = input.case_insensitive ? '-i' : ''

    const includeArg = globPattern ? `--include="${globPattern}"` : ''
    const cmd = `grep -r -n --color=never ${caseFlag} ${includeArg} -e ${JSON.stringify(pattern)} ${JSON.stringify(searchPath)} 2>/dev/null | head -200`

    try {
      const { stdout } = await execAsync(cmd, { cwd: opts.workingDir, timeout: 30_000 })
      return { output: stdout.trim() || 'No matches found.' }
    } catch (err: unknown) {
      const e = err as { code?: number; stdout?: string }
      // grep exits 1 when no matches — not an error
      if (e.code === 1) return { output: 'No matches found.' }
      return { error: 'Grep failed' }
    }
  },
}
