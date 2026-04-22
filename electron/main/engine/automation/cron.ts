// Tiny cron expression parser + scheduler helpers.
//
// Supports the standard 5-field format:  minute hour day-of-month month day-of-week
// Each field may be:
//   *            any
//   N            literal (e.g. "5")
//   N,M,...      comma list
//   N-M          range (inclusive)
//   */N          step (every N)
//   N-M/S        stepped range
// Day-of-week: 0 = Sunday through 6 = Saturday.
// Times are evaluated in local time to match the user's intuitive schedule.
//
// This lives in-tree rather than pulling a cron library — the grammar is
// narrow and adding a dep for 100 LOC of parsing is not worth it.

export interface CronSpec {
  minute: Set<number>
  hour: Set<number>
  dayOfMonth: Set<number>
  month: Set<number>
  dayOfWeek: Set<number>
}

interface FieldBounds { min: number; max: number }

const BOUNDS: Record<keyof CronSpec, FieldBounds> = {
  minute:     { min: 0, max: 59 },
  hour:       { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month:      { min: 1, max: 12 },
  dayOfWeek:  { min: 0, max: 6 },
}

function parseField(raw: string, bounds: FieldBounds): Set<number> {
  const out = new Set<number>()
  for (const token of raw.split(',')) {
    const [rangePart, stepPart] = token.split('/')
    const step = stepPart ? Math.max(1, parseInt(stepPart, 10)) : 1
    let lo = bounds.min
    let hi = bounds.max
    if (rangePart === '*') {
      // nothing
    } else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-').map((s) => parseInt(s, 10))
      if (Number.isNaN(a) || Number.isNaN(b)) throw new Error(`invalid range "${token}"`)
      lo = a
      hi = b
    } else {
      const n = parseInt(rangePart, 10)
      if (Number.isNaN(n)) throw new Error(`invalid value "${token}"`)
      lo = n
      hi = n
    }
    if (lo < bounds.min || hi > bounds.max || lo > hi) {
      throw new Error(`value out of range in "${token}"`)
    }
    for (let v = lo; v <= hi; v += step) out.add(v)
  }
  return out
}

/** Parse a 5-field cron expression. Throws on any syntax/bounds error. */
export function parseCron(expr: string): CronSpec {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) {
    throw new Error(`cron expression must have 5 fields (got ${fields.length})`)
  }
  return {
    minute:     parseField(fields[0], BOUNDS.minute),
    hour:       parseField(fields[1], BOUNDS.hour),
    dayOfMonth: parseField(fields[2], BOUNDS.dayOfMonth),
    month:      parseField(fields[3], BOUNDS.month),
    dayOfWeek:  parseField(fields[4], BOUNDS.dayOfWeek),
  }
}

/** Cheap validator used by UI + schema. Returns null on success. */
export function cronError(expr: string): string | null {
  try {
    parseCron(expr)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

/**
 * Is this local time a tick the given expression should fire on? Compares
 * against the minute boundary — callers poll at 60s cadence and should pass
 * a Date that represents "now" with seconds/ms truncated, or accept the
 * standard "any second inside this minute counts".
 */
export function cronMatches(spec: CronSpec, now: Date): boolean {
  if (!spec.minute.has(now.getMinutes())) return false
  if (!spec.hour.has(now.getHours())) return false
  if (!spec.month.has(now.getMonth() + 1)) return false
  // Day-of-month and day-of-week are OR-ed when both are non-wildcard, to
  // match the classic Vixie cron behaviour. Here we treat a full set as
  // "wildcard" for the purposes of that OR.
  const domWild = spec.dayOfMonth.size === BOUNDS.dayOfMonth.max - BOUNDS.dayOfMonth.min + 1
  const dowWild = spec.dayOfWeek.size === BOUNDS.dayOfWeek.max - BOUNDS.dayOfWeek.min + 1
  const domOk = spec.dayOfMonth.has(now.getDate())
  const dowOk = spec.dayOfWeek.has(now.getDay())
  if (domWild && dowWild) return true
  if (domWild) return dowOk
  if (dowWild) return domOk
  return domOk || dowOk
}

/**
 * Next run time (ms epoch) strictly after `from`. Walks minute-by-minute
 * up to 14 days ahead; returns undefined if nothing matches (e.g. an
 * impossible expression like "0 0 31 2 *"). Used by the store to keep the
 * sidebar's "next run" label fresh.
 */
export function nextCronRun(spec: CronSpec, from: Date = new Date()): number | undefined {
  const cursor = new Date(from)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)
  const LIMIT_MINUTES = 60 * 24 * 14
  for (let i = 0; i < LIMIT_MINUTES; i++) {
    if (cronMatches(spec, cursor)) return cursor.getTime()
    cursor.setMinutes(cursor.getMinutes() + 1)
  }
  return undefined
}

// ── Human-readable descriptions ───────────────────────────────────────────

function describeField(raw: string, names?: string[]): string {
  if (raw === '*') return 'any'
  if (!raw.includes(',') && !raw.includes('-') && !raw.includes('/')) {
    const n = parseInt(raw, 10)
    return names ? (names[n] ?? String(n)) : String(n)
  }
  return raw
}

const DOW_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_NAMES_ZH = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_NAMES_EN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Best-effort human summary of a cron expression, for live UI preview. */
export function describeCron(expr: string, lang: 'en' | 'zh' = 'en'): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return ''
  const [min, hour, dom, mon, dow] = parts
  const timeEn = `${describeField(hour)}:${min.padStart(2, '0')}`
  const timeZh = `${describeField(hour)}:${min.padStart(2, '0')}`
  const domPart = describeField(dom)
  const monPart = describeField(mon, MONTH_NAMES_EN)
  const dowPart = describeField(dow, lang === 'zh' ? DOW_NAMES_ZH : DOW_NAMES_EN)
  if (lang === 'zh') {
    const bits: string[] = []
    if (dow !== '*') bits.push(`周${dowPart}`)
    if (dom !== '*') bits.push(`每月 ${domPart} 日`)
    if (mon !== '*') bits.push(`${monPart} 月`)
    bits.push(`${timeZh}`)
    return `在 ${bits.join('、')}`
  }
  const bits: string[] = []
  if (dow !== '*') bits.push(`on ${dowPart}`)
  if (dom !== '*') bits.push(`on day ${domPart}`)
  if (mon !== '*') bits.push(`in ${monPart}`)
  bits.push(`at ${timeEn}`)
  return bits.join(' ')
}
