// GrepTool — regex content search, adapted from Claude Code GrepTool

import { execFile } from 'child_process'
import { promisify } from 'util'
import { resolve } from 'path'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

const execFileAsync = promisify(execFile)

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
    if (typeof pattern !== 'string' || !pattern.trim()) {
      return { error: 'pattern must be a non-empty string' }
    }

    const searchPath = input.path
      ? resolve(opts.workingDir, input.path as string)
      : opts.workingDir

    // Path traversal protection
    if (!searchPath.startsWith(resolve(opts.workingDir))) {
      return { error: 'Access denied: path is outside working directory.' }
    }

    const globPattern = input.glob as string | undefined
    if (globPattern && typeof globPattern !== 'string') {
      return { error: 'glob must be a string' }
    }

    // Build args for execFile — no shell interpolation, no string concat
    const args: string[] = ['-r', '-n', '--color=never']
    if (input.case_insensitive) args.push('-i')
    if (globPattern) args.push(`--include=${globPattern}`)
    args.push('-e', pattern, searchPath)

    try {
      const { stdout } = await execFileAsync('grep', args, {
        cwd: opts.workingDir,
        timeout: 30_000,
        maxBuffer: 4 * 1024 * 1024,
      })
      // Cap output to first 200 lines on the JS side (no shell `| head`)
      const lines = stdout.split('\n')
      const trimmed = lines.slice(0, 200).join('\n').trim()
      const truncated = lines.length > 200 ? `\n... (${lines.length - 200} more lines)` : ''
      return { output: (trimmed || 'No matches found.') + truncated }
    } catch (err: unknown) {
      const e = err as { code?: number | string; stderr?: string; killed?: boolean; signal?: string }
      // grep exits 1 when no matches — not an error
      if (e.code === 1) return { output: 'No matches found.' }
      if (e.killed || e.signal === 'SIGTERM') return { error: 'grep timed out (30s limit).' }
      return { error: `grep failed: ${e.stderr ?? String(e.code ?? 'unknown')}` }
    }
  },
}
