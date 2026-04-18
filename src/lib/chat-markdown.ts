// Markdown rendering pipeline shared across chat views.
// Wraps marked + highlight.js + KaTeX + mermaid + DOMPurify.

import { useEffect } from 'react'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import markedKatex from 'marked-katex-extension'
import hljs from 'highlight.js/lib/common'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict', fontSize: 12 })

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span', 'div',
      'img', 'details', 'summary', 'del', 'sup', 'sub', 'input',
      'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt',
      'svg', 'path', 'g', 'use', 'defs', 'symbol', 'title', 'desc',
      'foreignObject',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'data-code', 'data-lang', 'data-img', 'role',
      'src', 'alt', 'width', 'height', 'loading', 'type', 'checked', 'disabled',
      'aria-hidden', 'style', 'd', 'viewbox', 'viewBox', 'fill', 'stroke',
      'stroke-width', 'transform', 'x', 'y', 'cx', 'cy', 'r', 'points',
      'preserveAspectRatio', 'xmlns', 'xmlns:xlink', 'xlink:href',
    ],
    FORCE_BODY: false,
    ADD_ATTR: ['target'],
  })
}

marked.setOptions({ breaks: true, gfm: true })

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang === 'diff') return colorizeDiff(code)
      try {
        const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
        return hljs.highlight(code, { language, ignoreIllegals: true }).value
      } catch {
        return escapeHtml(code)
      }
    },
  }),
)

try { marked.use(markedKatex({ throwOnError: false })) } catch { /* optional */ }

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function colorizeDiff(code: string): string {
  return code.split('\n').map((line) => {
    const esc = escapeHtml(line)
    if (line.startsWith('+')) return `<span class="diff-add">${esc}</span>`
    if (line.startsWith('-')) return `<span class="diff-del">${esc}</span>`
    if (line.startsWith('@@')) return `<span class="diff-hunk">${esc}</span>`
    return esc
  }).join('\n')
}

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const safeCode = text.replace(/"/g, '&quot;').replace(/\n/g, '&#10;')
  const langLabel = lang
    ? `<span class="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">${lang}</span>`
    : ''
  let highlighted: string
  if (lang === 'diff') {
    highlighted = colorizeDiff(text)
  } else {
    try {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value
    } catch {
      highlighted = escapeHtml(text)
    }
  }
  return `<div class="code-block-wrapper relative group/code my-2">${langLabel}<span role="button" class="copy-code-btn absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity rounded-md bg-muted/80 hover:bg-muted px-2 py-1 text-[10px] text-muted-foreground border border-border/50 cursor-pointer select-none" data-code="${safeCode}">Copy</span><pre class="bg-muted/60 rounded-lg ${lang ? 'pt-7' : 'pt-3'} pb-3 px-3 text-xs font-mono overflow-x-auto"><code class="hljs language-${lang ?? 'plaintext'}">${highlighted}</code></pre></div>`
}
renderer.codespan = ({ text }: { text: string }) =>
  `<code class="bg-muted/60 rounded px-1 py-0.5 text-xs font-mono">${text}</code>`
renderer.image = ({ href, title, text }: { href: string; title?: string | null; text: string }) => {
  let src = href
  if (src.startsWith('file://')) src = `nohi-file://${src.slice(7)}`
  const titleAttr = title ? ` title="${title}"` : ''
  return `<img src="${src}" alt="${text || 'Image'}"${titleAttr} loading="lazy" data-img="${src}" class="max-w-full max-h-[400px] rounded-xl object-contain my-2 cursor-zoom-in hover:opacity-95 transition-opacity" />`
}
renderer.link = ({ href, title, tokens }: { href: string; title?: string | null; tokens: unknown[] }) => {
  const text = (tokens as Array<{ type: string; raw?: string; text?: string }>)
    .map(t => t.text ?? t.raw ?? '').join('')
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${text}</a>`
}
renderer.checkbox = ({ checked }: { checked: boolean }) =>
  checked
    ? `<input type="checkbox" checked disabled class="mr-1.5 align-middle accent-emerald-500" />`
    : `<input type="checkbox" disabled class="mr-1.5 align-middle" />`

export function renderMarkdown(text: string): string {
  try {
    const html = marked.parse(text, { renderer, async: false }) as string
    return sanitizeHtml(html)
  } catch {
    return sanitizeHtml(escapeHtml(text))
  }
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useCodeCopyHandler(containerRef: React.RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const clickHandler = (e: MouseEvent): void => {
      const target = e.target as HTMLElement
      const btn = target.closest('.copy-code-btn') as HTMLElement | null
      if (btn) {
        const code = btn.getAttribute('data-code') ?? ''
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = 'Copied!'
          setTimeout(() => { btn.textContent = 'Copy' }, 1500)
        }).catch(() => {})
        return
      }
      const img = target.closest('img[data-img]') as HTMLImageElement | null
      if (img) {
        const src = img.getAttribute('data-img') ?? img.src
        window.dispatchEvent(new CustomEvent('nohi:lightbox', { detail: { src } }))
      }
    }
    el.addEventListener('click', clickHandler)

    // Image error fallback (replaces inline onerror handler that violated strict CSP)
    const errorHandler = (e: Event): void => {
      const target = e.target as HTMLElement
      if (target instanceof HTMLImageElement) {
        target.style.display = 'none'
      }
    }
    el.addEventListener('error', errorHandler, true) // capture phase: <img> error doesn't bubble

    return () => {
      el.removeEventListener('click', clickHandler)
      el.removeEventListener('error', errorHandler, true)
    }
  }, [containerRef])
}

export function useMermaidRenderer(containerRef: React.RefObject<HTMLDivElement | null>, content: string): void {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const blocks = el.querySelectorAll<HTMLElement>('code.language-mermaid')
    if (blocks.length === 0) return
    let cancelled = false
    blocks.forEach(async (block, i) => {
      const wrapper = block.closest('.code-block-wrapper') as HTMLElement | null
      if (!wrapper || wrapper.dataset.mermaidRendered === '1') return
      const source = block.textContent ?? ''
      try {
        const id = `mermaid-${Date.now()}-${i}`
        const { svg } = await mermaid.render(id, source)
        if (cancelled) return
        const container = document.createElement('div')
        container.className = 'mermaid-diagram my-2 flex justify-center bg-muted/20 rounded-lg p-3 overflow-x-auto'
        container.innerHTML = svg
        wrapper.replaceWith(container)
        wrapper.dataset.mermaidRendered = '1'
      } catch {
        // Leave the original code block on parse failure
      }
    })
    return () => { cancelled = true }
  }, [containerRef, content])
}
