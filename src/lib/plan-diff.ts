// Tiny line-based diff for plan-mode revisions.
//
// Used by PlanApproval when a revised plan arrives — shows the user
// what the model changed compared to the previous plan, line by line.
// We don't reach for a diff library because plans are short (≤200
// lines) and a naive longest-common-subsequence is plenty fast at
// that scale. Avoiding the dep keeps Electron bundle size flat.

export type DiffLineKind = 'same' | 'add' | 'del'

export interface DiffLine {
  kind: DiffLineKind
  line: string
}

/**
 * Compute a unified line diff between two strings.
 *
 * Returns the lines from `next` interleaved with the lines from `prev`
 * that were removed. Adjacent same-content runs collapse so a 100-line
 * unchanged section produces 100 'same' entries (callers can group).
 *
 * Algorithm: classic LCS table + backtrace. O(n*m) time, O(n*m) memory.
 * For plans capped at a few hundred lines this is microseconds.
 */
export function diffLines(prev: string, next: string): DiffLine[] {
  const a = prev.split('\n')
  const b = next.split('\n')
  const n = a.length
  const m = b.length

  // lcs[i][j] = length of LCS of a[0..i) and b[0..j)
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      lcs[i + 1][j + 1] = a[i] === b[j]
        ? lcs[i][j] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  // Backtrace from (n, m) to (0, 0)
  const out: DiffLine[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      out.push({ kind: 'same', line: a[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      out.push({ kind: 'add', line: b[j - 1] })
      j--
    } else {
      out.push({ kind: 'del', line: a[i - 1] })
      i--
    }
  }
  return out.reverse()
}

/** True if `prev` and `next` differ in any line (cheap pre-check). */
export function hasChanges(prev: string, next: string): boolean {
  return prev.trim() !== next.trim()
}
