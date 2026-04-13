// GlobTool — file pattern matching, adapted from Claude Code GlobTool
// Uses recursive readdir instead of fs/promises.glob (requires Node 22+)

import { readdir, stat } from 'fs/promises'
import { resolve, relative, join } from 'path'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

// Convert a glob pattern to a RegExp.
// Supports: *, **, ?, [abc], {a,b} (basic brace expansion)
function globToRegex(pattern: string): RegExp {
  // Expand {a,b,c} brace groups into alternation
  const expanded = expandBraces(pattern)
  const regexStr = expanded
    .replace(/[.+^${}()|[\]\\]/g, (ch) => {
      // Don't escape braces (already expanded) or glob specials
      if (ch === '{' || ch === '}') return ch
      return '\\' + ch
    })
    // ** matches any path segment (including slashes)
    .replace(/\*\*/g, '\x00') // placeholder
    // * matches anything except /
    .replace(/\*/g, '[^/]*')
    // ? matches one char except /
    .replace(/\?/g, '[^/]')
    // restore ** placeholder
    .replace(/\x00/g, '.*')

  return new RegExp('^' + regexStr + '$')
}

// Expand {a,b} → (a|b) for simple single-level braces
function expandBraces(pattern: string): string {
  const match = pattern.match(/^(.*?)\{([^{}]+)\}(.*)$/)
  if (!match) return pattern
  const [, pre, inner, post] = match
  return inner
    .split(',')
    .map((alt) => expandBraces(pre + alt + post))
    .join('|')
    .replace(/^(.+)$/, '($1)') // wrap alternation
}

// Recursively collect all files under dir, returning paths relative to dir
async function collectFiles(dir: string, rel = ''): Promise<string[]> {
  const results: string[] = []
  let entries: Awaited<ReturnType<typeof readdir>>
  try {
    entries = await readdir(join(dir, rel), { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    const entryRel = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      // Skip hidden dirs and common noise folders
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      const sub = await collectFiles(dir, entryRel)
      results.push(...sub)
    } else {
      results.push(entryRel)
    }
  }
  return results
}

export const GlobTool: ToolDef = {
  name: 'glob',
  description: 'Find files matching a glob pattern. Returns matching file paths sorted alphabetically.',
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
      const regex = globToRegex(pattern)
      const allFiles = await collectFiles(searchDir)
      const matches = allFiles.filter((f) => regex.test(f)).sort()

      if (matches.length === 0) {
        return { output: 'No files found matching pattern.' }
      }

      // Cap at 500 results to avoid overwhelming output
      const capped = matches.slice(0, 500)
      const suffix = matches.length > 500 ? `\n(showing first 500 of ${matches.length} matches)` : ''
      return { output: capped.join('\n') + suffix }
    } catch (err: unknown) {
      const e = err as { message?: string }
      return { error: e.message ?? 'Glob failed' }
    }
  },
}
