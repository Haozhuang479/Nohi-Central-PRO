// FileReadTool — adapted from Claude Code FileReadTool
// Reads files with line-number prefixes (cat -n style), respects token limits

import { readFile, stat } from 'fs/promises'
import { resolve, extname } from 'path'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

const MAX_LINES = 2000
const MAX_BYTES = 500_000 // ~500KB

// Blocked device paths (matches Claude Code)
const BLOCKED_PATHS = ['/dev/zero', '/dev/random', '/dev/urandom', '/proc/self/fd']

export const FileReadTool: ToolDef = {
  name: 'read_file',
  description:
    'Read the contents of a file. Returns content with line numbers. Supports text files.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute or relative path to the file.',
      },
      offset: {
        type: 'number',
        description: 'Line number to start reading from (1-indexed).',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of lines to read.',
      },
    },
    required: ['file_path'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const rawPath = input.file_path as string
    const filePath = resolve(opts.workingDir, rawPath)
    const offset = (input.offset as number | undefined) ?? 1
    const limit = (input.limit as number | undefined) ?? MAX_LINES

    // Block paths outside working directory (prevent path traversal)
    if (opts.workingDir && !filePath.startsWith(resolve(opts.workingDir))) {
      return { error: `Access denied: path is outside working directory` }
    }

    // Block device paths
    for (const blocked of BLOCKED_PATHS) {
      if (filePath.startsWith(blocked)) {
        return { error: `Blocked path: ${filePath}` }
      }
    }

    try {
      const stats = await stat(filePath)
      if (stats.size > MAX_BYTES) {
        return {
          error: `File too large (${stats.size} bytes). Use offset/limit to read specific sections.`,
        }
      }

      const ext = extname(filePath).toLowerCase()
      const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.zip', '.exe', '.bin']
      if (binaryExts.includes(ext)) {
        return { error: `Binary file (${ext}). Use appropriate tools for binary content.` }
      }

      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      const startLine = Math.max(1, offset) - 1
      const selected = lines.slice(startLine, startLine + limit)

      const numbered = selected
        .map((line, i) => `${String(startLine + i + 1).padStart(6)}\t${line}`)
        .join('\n')

      const totalLines = lines.length
      const readLines = selected.length
      const suffix =
        readLines < totalLines - startLine
          ? `\n\n(Showing lines ${startLine + 1}–${startLine + readLines} of ${totalLines})`
          : ''

      return { output: numbered + suffix }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'ENOENT') return { error: `File not found: ${filePath}` }
      if (e.code === 'EACCES') return { error: `Permission denied: ${filePath}` }
      return { error: e.message ?? 'Failed to read file' }
    }
  },
}
