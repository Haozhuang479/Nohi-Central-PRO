// Google Drive tools — agent-facing wrappers for the gdrive connector.

import type { ToolDef, ToolResult } from '../types'
import { searchFiles, listFolder, readFile, getStatus } from '../connectors/gdrive'

async function assertConnected(): Promise<{ error: string } | null> {
  const s = await getStatus()
  if (!s.connected) return { error: 'Google Drive is not connected. Ask the user to connect it in Settings → Connectors.' }
  return null
}

export const GDriveSearchTool: ToolDef = {
  name: 'gdrive_search',
  description:
    'Search Google Drive. Accepts a full Drive query (e.g. `name contains \'brand\' and mimeType=\'application/pdf\'`). Returns file id, name, mimeType, modifiedTime. Use this to find files before reading them.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Drive query string. Examples: `name contains "brief"`, `mimeType="image/png"`, `modifiedTime > "2025-01-01"`.' },
      page_size: { type: 'number', description: '1–100 (default 20).' },
    },
    required: ['query'],
  },
  async call(input): Promise<ToolResult> {
    const guard = await assertConnected(); if (guard) return guard
    try {
      const files = await searchFiles(input.query as string, Math.min(Math.max((input.page_size as number | undefined) ?? 20, 1), 100))
      if (files.length === 0) return { output: 'No files matched.' }
      const lines = files.map((f, i) => `${i + 1}. [${f.id}] ${f.name} · ${shortMime(f.mimeType)} · ${f.modifiedTime ?? '—'}`)
      return { output: `${files.length} files:\n${lines.join('\n')}` }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const GDriveListFolderTool: ToolDef = {
  name: 'gdrive_list_folder',
  description: 'List every file and subfolder inside a Google Drive folder by id.',
  inputSchema: {
    type: 'object',
    properties: {
      folder_id: { type: 'string' },
      page_size: { type: 'number' },
    },
    required: ['folder_id'],
  },
  async call(input): Promise<ToolResult> {
    const guard = await assertConnected(); if (guard) return guard
    try {
      const files = await listFolder(input.folder_id as string, Math.min(Math.max((input.page_size as number | undefined) ?? 50, 1), 100))
      if (files.length === 0) return { output: 'Folder is empty.' }
      const lines = files.map((f, i) => {
        const marker = f.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄'
        return `${i + 1}. ${marker} [${f.id}] ${f.name} · ${shortMime(f.mimeType)}`
      })
      return { output: `${files.length} items:\n${lines.join('\n')}` }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const GDriveReadFileTool: ToolDef = {
  name: 'gdrive_read_file',
  description:
    'Read a Google Drive file by id. Google Docs → exported as plain text. Sheets → exported as CSV. Text/JSON/CSV → returned inline. Images/PDFs/other binaries → returned as base64 (use extract_from_image / extract_from_pdf to process them next).',
  inputSchema: {
    type: 'object',
    properties: {
      file_id: { type: 'string' },
    },
    required: ['file_id'],
  },
  async call(input): Promise<ToolResult> {
    const guard = await assertConnected(); if (guard) return guard
    try {
      const result = await readFile(input.file_id as string)
      if (result.kind === 'text') {
        const preview = result.content.length > 8000 ? result.content.slice(0, 8000) + `\n... (${result.content.length - 8000} more chars)` : result.content
        return { output: `# ${result.name}\n\nType: ${result.mimeType}\n\n${preview}` }
      }
      return {
        output: `Binary file "${result.name}" (${result.mimeType}, ${Math.round(result.base64.length * 0.75 / 1024)} KB). base64:${result.base64.slice(0, 120)}…\n\nUse extract_from_image or extract_from_pdf to analyze the content.`,
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

function shortMime(m: string): string {
  const map: Record<string, string> = {
    'application/vnd.google-apps.document': 'Google Doc',
    'application/vnd.google-apps.spreadsheet': 'Google Sheet',
    'application/vnd.google-apps.presentation': 'Google Slides',
    'application/vnd.google-apps.folder': 'folder',
    'application/pdf': 'PDF',
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'text/csv': 'CSV',
    'text/plain': 'text',
  }
  return map[m] ?? m
}
