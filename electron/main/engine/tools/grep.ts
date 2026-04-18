// GrepTool — regex content search, adapted from Claude Code GrepTool

import { execFile } from 'child_process'
import { promisify } from 'util'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'
import { castString, castBoolean, resolveSafePath, runTool } from './_utils'

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
    return runTool(async () => {
      const pattern = castString(input.pattern, 'pattern')
      const globPattern = castString(input.glob, 'glob', { optional: true }) || undefined
      const caseInsensitive = castBoolean(input.case_insensitive)

      // Path safety: resolve relative paths against workingDir, reject escapes
      let searchPath = opts.workingDir
      if (input.path !== undefined) {
        const r = resolveSafePath(input.path, opts.workingDir)
        if ('error' in r) return r
        searchPath = r.path
      }

      const args = ['-r', '-n', '--color=never']
      if (caseInsensitive) args.push('-i')
      if (globPattern) args.push(`--include=${globPattern}`)
      args.push('-e', pattern, searchPath)

      try {
        const { stdout } = await execFileAsync('grep', args, {
          cwd: opts.workingDir,
          timeout: 30_000,
          maxBuffer: 4 * 1024 * 1024,
        })
        const lines = stdout.split('\n')
        const trimmed = lines.slice(0, 200).join('\n').trim()
        const truncated = lines.length > 200 ? `\n... (${lines.length - 200} more lines)` : ''
        return { output: (trimmed || 'No matches found.') + truncated }
      } catch (err: unknown) {
        const e = err as { code?: number | string; stderr?: string; killed?: boolean; signal?: string }
        if (e.code === 1) return { output: 'No matches found.' }
        if (e.killed || e.signal === 'SIGTERM') return { error: 'grep timed out (30s limit).' }
        return { error: `grep failed: ${e.stderr ?? String(e.code ?? 'unknown')}` }
      }
    })
  },
}
