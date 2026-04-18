// NotebookEdit — read/write/insert/delete cells in a Jupyter .ipynb file
// Mirrors Claude Code's NotebookEdit tool

import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw'
  source: string | string[]
  metadata?: Record<string, unknown>
  outputs?: unknown[]
  execution_count?: number | null
  id?: string
}

interface Notebook {
  cells: NotebookCell[]
  metadata?: Record<string, unknown>
  nbformat?: number
  nbformat_minor?: number
}

export const NotebookEditTool: ToolDef = {
  name: 'notebook_edit',
  description:
    'Edit a Jupyter notebook (.ipynb) cell. Modes: replace (default — replace cell at index), insert (add a new cell at index), delete (remove cell at index). Always use this — never edit .ipynb files with file_edit (corrupts JSON structure).',
  inputSchema: {
    type: 'object',
    properties: {
      notebook_path: {
        type: 'string',
        description: 'Absolute path to the .ipynb file.',
      },
      cell_number: {
        type: 'number',
        description: '0-indexed cell position. For insert mode, the new cell is added at this index.',
      },
      new_source: {
        type: 'string',
        description: 'New cell source. Required for replace/insert modes.',
      },
      cell_type: {
        type: 'string',
        enum: ['code', 'markdown'],
        description: 'Cell type. Defaults to existing type for replace; required for insert.',
      },
      edit_mode: {
        type: 'string',
        enum: ['replace', 'insert', 'delete'],
        description: 'Defaults to replace.',
      },
    },
    required: ['notebook_path', 'cell_number'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const notebookPath = resolve(opts.workingDir, input.notebook_path as string)
    const cellNumber = input.cell_number as number
    const newSource = input.new_source as string | undefined
    const cellType = input.cell_type as 'code' | 'markdown' | undefined
    const editMode = (input.edit_mode as 'replace' | 'insert' | 'delete' | undefined) ?? 'replace'

    if (!notebookPath.endsWith('.ipynb')) {
      return { error: 'File must be a .ipynb notebook.' }
    }

    let raw: string
    try {
      raw = await readFile(notebookPath, 'utf-8')
    } catch (err) {
      const e = err as { code?: string }
      if (e.code === 'ENOENT') return { error: `Notebook not found: ${notebookPath}` }
      throw err
    }

    let nb: Notebook
    try {
      nb = JSON.parse(raw) as Notebook
    } catch {
      return { error: 'Notebook file is not valid JSON.' }
    }

    if (!Array.isArray(nb.cells)) return { error: 'Notebook has no cells array.' }

    if (editMode === 'delete') {
      if (cellNumber < 0 || cellNumber >= nb.cells.length) {
        return { error: `cell_number ${cellNumber} out of bounds (notebook has ${nb.cells.length} cells).` }
      }
      nb.cells.splice(cellNumber, 1)
    } else if (editMode === 'insert') {
      if (newSource === undefined) return { error: 'new_source is required for insert mode.' }
      if (!cellType) return { error: 'cell_type is required for insert mode.' }
      const newCell: NotebookCell = {
        cell_type: cellType,
        source: newSource,
        metadata: {},
      }
      if (cellType === 'code') {
        newCell.outputs = []
        newCell.execution_count = null
      }
      const idx = Math.max(0, Math.min(cellNumber, nb.cells.length))
      nb.cells.splice(idx, 0, newCell)
    } else {
      // replace
      if (cellNumber < 0 || cellNumber >= nb.cells.length) {
        return { error: `cell_number ${cellNumber} out of bounds.` }
      }
      if (newSource === undefined) return { error: 'new_source is required for replace mode.' }
      const cell = nb.cells[cellNumber]
      cell.source = newSource
      if (cellType) cell.cell_type = cellType
      // Reset execution state for code cells
      if (cell.cell_type === 'code') {
        cell.outputs = []
        cell.execution_count = null
      }
    }

    await writeFile(notebookPath, JSON.stringify(nb, null, 1) + '\n', 'utf-8')

    return {
      output: `Notebook updated: ${notebookPath}\nMode: ${editMode}\nCell index: ${cellNumber}\nTotal cells: ${nb.cells.length}`,
    }
  },
}
