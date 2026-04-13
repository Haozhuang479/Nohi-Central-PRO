import { create } from "zustand"

interface CostEntry {
  id: string
  label: string
  inputTokens: number
  outputTokens: number
  model: string
  timestamp: number
}

// Cost per 1M tokens (input/output) by model family
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "claude-opus-4": { input: 15, output: 75 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-haiku-4": { input: 0.25, output: 1.25 },
  default: { input: 3, output: 15 },
}

function getCostPerToken(model: string) {
  const key = Object.keys(MODEL_COSTS).find((k) => model.includes(k)) ?? "default"
  const rates = MODEL_COSTS[key]
  return { inputPer1M: rates.input, outputPer1M: rates.output }
}

export function calcCost(inputTokens: number, outputTokens: number, model: string): number {
  const { inputPer1M, outputPer1M } = getCostPerToken(model)
  return (inputTokens / 1_000_000) * inputPer1M + (outputTokens / 1_000_000) * outputPer1M
}

interface CostState {
  entries: CostEntry[]
  todayInputTokens: number
  todayOutputTokens: number
  addEntry: (entry: Omit<CostEntry, "id" | "timestamp">) => void
  getTodayCost: (model: string) => number
  getTotalTokens: () => number
}

export const useCostStore = create<CostState>((set, get) => ({
  entries: [],
  todayInputTokens: 0,
  todayOutputTokens: 0,

  addEntry: (entry) => {
    const full: CostEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() }
    set((s) => ({
      entries: [...s.entries, full],
      todayInputTokens: s.todayInputTokens + entry.inputTokens,
      todayOutputTokens: s.todayOutputTokens + entry.outputTokens,
    }))
  },

  getTodayCost: (model) => {
    const { todayInputTokens, todayOutputTokens } = get()
    return calcCost(todayInputTokens, todayOutputTokens, model)
  },

  getTotalTokens: () => {
    const { todayInputTokens, todayOutputTokens } = get()
    return todayInputTokens + todayOutputTokens
  },
}))
