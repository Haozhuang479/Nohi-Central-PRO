import { create } from "zustand"
import type { Session } from "../../electron/main/engine/types"

// Per-provider token cost in USD per 1 000 tokens (input / output)
const COST_TABLE: Record<string, { input: number; output: number }> = {
  anthropic:  { input: 0.003,   output: 0.015  },
  openai:     { input: 0.005,   output: 0.015  },
  kimi:       { input: 0.0014,  output: 0.0014 },
  minimax:    { input: 0.001,   output: 0.001  },
  deepseek:   { input: 0.00027, output: 0.0011 },
}

function computeCost(
  inputTokens: number,
  outputTokens: number,
  provider: string
): number {
  const rates = COST_TABLE[provider] ?? COST_TABLE.anthropic
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output
}

interface AIState {
  // Current session
  session: Session | null
  sessions: Session[]
  isRunning: boolean
  isConsoleOpen: boolean
  planMode: boolean

  // Provider / model
  provider: "anthropic" | "openai" | "kimi" | "minimax" | "deepseek"
  model: string

  // Token/cost tracking (session-level)
  inputTokens: number
  outputTokens: number

  // Daily aggregates (reset by resetDaily)
  tokensToday: number
  costToday: number

  // Actions
  setSession: (session: Session | ((prev: Session | null) => Session | null) | null) => void
  setSessions: (sessions: Session[] | ((prev: Session[]) => Session[])) => void
  setIsRunning: (v: boolean) => void
  setConsoleOpen: (v: boolean) => void
  toggleConsole: () => void
  setPlanMode: (v: boolean) => void
  setProvider: (provider: AIState["provider"]) => void
  setModel: (model: string) => void
  addTokens: (input: number, output: number, provider?: string) => void
  resetTokens: () => void
  resetDaily: () => void
}

export const useAIStore = create<AIState>((set, get) => ({
  session: null,
  sessions: [],
  isRunning: false,
  isConsoleOpen: false,
  planMode: false,

  provider: "anthropic",
  model: "claude-sonnet-4-6",

  inputTokens: 0,
  outputTokens: 0,
  tokensToday: 0,
  costToday: 0,

  setSession: (session) =>
    set((s) => ({ session: typeof session === 'function' ? session(s.session) : session })),
  setSessions: (sessions) =>
    set((s) => ({ sessions: typeof sessions === 'function' ? sessions(s.sessions) : sessions })),
  setIsRunning: (v) => set({ isRunning: v }),
  setConsoleOpen: (v) => set({ isConsoleOpen: v }),
  toggleConsole: () => set((s) => ({ isConsoleOpen: !s.isConsoleOpen })),
  setPlanMode: (v) => set({ planMode: v }),
  setProvider: (provider) => set({ provider }),
  setModel: (model) => set({ model }),

  addTokens: (input: number, output: number, provider?: string) => {
    const resolvedProvider = provider ?? get().provider
    const sessionCost = computeCost(input, output, resolvedProvider)
    set((s) => ({
      inputTokens: s.inputTokens + input,
      outputTokens: s.outputTokens + output,
      tokensToday: s.tokensToday + input + output,
      costToday: s.costToday + sessionCost,
    }))
  },

  resetTokens: () => set({ inputTokens: 0, outputTokens: 0 }),

  resetDaily: () => set({ tokensToday: 0, costToday: 0, inputTokens: 0, outputTokens: 0 }),
}))

// ── Auto-reset daily stats at midnight ───────────────────────────────────────
// Schedules a timeout to fire at the next local midnight, then reschedules
// itself each day. Uses a self-referencing function so no external cleanup needed.
;(function scheduleMidnightReset() {
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  const msUntilMidnight = midnight.getTime() - now.getTime()
  setTimeout(() => {
    useAIStore.getState().resetDaily()
    scheduleMidnightReset() // reschedule for next midnight
  }, msUntilMidnight)
})()
