import { create } from 'zustand'

interface CostEntry {
  id: string
  label: string
  inputTokens: number
  outputTokens: number
  model: string
  provider: string
  timestamp: number
}

// Cost per 1M tokens (input/output) by model family. Kept conservative so we
// err on the high side for cost warnings rather than understating spend.
// When a model doesn't match any prefix we fall back to `default`.
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-opus-4':   { input: 15,    output: 75 },
  'claude-sonnet-4': { input: 3,     output: 15 },
  'claude-haiku':    { input: 0.25,  output: 1.25 },
  // OpenAI
  'gpt-4o':          { input: 2.5,   output: 10 },
  'gpt-4.1':         { input: 2,     output: 8 },
  'gpt-5':           { input: 1.25,  output: 10 },
  'o3':              { input: 2,     output: 8 },
  'o4':              { input: 3,     output: 12 },
  // Kimi (Moonshot)
  'moonshot':        { input: 1.4,   output: 1.4 },
  // DeepSeek
  'deepseek':        { input: 0.27,  output: 1.1 },
  // Minimax
  'abab':            { input: 1,     output: 1 },
  default:           { input: 3,     output: 15 },
}

function getCostPerToken(model: string): { inputPer1M: number; outputPer1M: number } {
  const key = Object.keys(MODEL_COSTS).find((k) => model.includes(k)) ?? 'default'
  const rates = MODEL_COSTS[key]
  return { inputPer1M: rates.input, outputPer1M: rates.output }
}

/** Compute USD cost for an input/output token count under a given model family. */
export function calcCost(inputTokens: number, outputTokens: number, model: string): number {
  const { inputPer1M, outputPer1M } = getCostPerToken(model)
  return (inputTokens / 1_000_000) * inputPer1M + (outputTokens / 1_000_000) * outputPer1M
}

interface CostState {
  entries: CostEntry[]
  todayInputTokens: number
  todayOutputTokens: number
  todaySpend: number
  // When the current `today*` counters last rolled over — stored as an
  // ISO date (YYYY-MM-DD) so we can detect a day-change between user
  // sessions and reset on boot if the app was last open yesterday.
  todayDate: string
  addEntry: (entry: Omit<CostEntry, 'id' | 'timestamp'>) => void
  resetToday: () => void
  rolloverIfNewDay: () => void
  getTodayCost: (modelOverride?: string) => number
  getTotalTokens: () => number
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useCostStore = create<CostState>((set, get) => ({
  entries: [],
  todayInputTokens: 0,
  todayOutputTokens: 0,
  todaySpend: 0,
  todayDate: todayIso(),

  addEntry: (entry) => {
    get().rolloverIfNewDay()
    const full: CostEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() }
    const delta = calcCost(entry.inputTokens, entry.outputTokens, entry.model)
    set((s) => ({
      entries: [...s.entries, full],
      todayInputTokens: s.todayInputTokens + entry.inputTokens,
      todayOutputTokens: s.todayOutputTokens + entry.outputTokens,
      todaySpend: s.todaySpend + delta,
    }))
  },

  resetToday: () => set({
    todayInputTokens: 0,
    todayOutputTokens: 0,
    todaySpend: 0,
    todayDate: todayIso(),
  }),

  rolloverIfNewDay: () => {
    const now = todayIso()
    if (now !== get().todayDate) {
      get().resetToday()
    }
  },

  getTodayCost: (modelOverride) => {
    const { todayInputTokens, todayOutputTokens, todaySpend } = get()
    // If caller passes a model, recompute assuming every token in the day
    // came from that model. Used by Statusbar when it has a fresh model in
    // hand. Otherwise return the actual accumulated spend.
    if (modelOverride) {
      return calcCost(todayInputTokens, todayOutputTokens, modelOverride)
    }
    return todaySpend
  },

  getTotalTokens: () => {
    const { todayInputTokens, todayOutputTokens } = get()
    return todayInputTokens + todayOutputTokens
  },
}))

// ── Auto-rollover at midnight ────────────────────────────────────────────────
// Schedules a timeout to fire at the next local midnight, then reschedules
// itself each day. Belt-and-suspenders with rolloverIfNewDay() in addEntry so
// long-idle sessions still roll over on first use.
if (typeof window !== 'undefined') {
  const scheduleMidnightRollover = (): void => {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    const ms = midnight.getTime() - now.getTime()
    setTimeout(() => {
      useCostStore.getState().resetToday()
      scheduleMidnightRollover()
    }, ms)
  }
  scheduleMidnightRollover()
}
