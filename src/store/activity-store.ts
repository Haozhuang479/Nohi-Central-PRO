import { create } from "zustand"

export type ActivityType = "enriched" | "synced" | "generated" | "pending" | "error"
export type ActivityStatus = "success" | "pending" | "error" | "info"

export interface ActivityItem {
  id: string
  /** Semantic category of the activity */
  type: ActivityType
  /** Primary display label */
  label: string
  /** Human-readable message (alias of label for new callers) */
  message: string
  detail?: string
  timestamp: number
  status: ActivityStatus
}

interface ActivityState {
  activities: ActivityItem[]
  /** @deprecated Use activities */
  items: ActivityItem[]
  addActivity: (activity: Omit<ActivityItem, "id" | "timestamp">) => void
  /** @deprecated Use addActivity */
  add: (item: Omit<ActivityItem, "id" | "timestamp">) => void
  clearActivities: () => void
  /** @deprecated Use clearActivities */
  clear: () => void
}

function typeToStatus(type: ActivityType): ActivityStatus {
  if (type === "error") return "error"
  if (type === "pending") return "pending"
  return "success"
}

const seed: ActivityItem[] = [
  {
    id: "1",
    type: "enriched",
    label: "Enriched 12 products",
    message: "Enriched 12 products",
    detail: "AI filled descriptions & tags",
    timestamp: Date.now() - 2 * 60_000,
    status: "success",
  },
  {
    id: "2",
    type: "synced",
    label: "Synced to ChatGPT ACP",
    message: "Synced to ChatGPT ACP",
    detail: "42 products pushed",
    timestamp: Date.now() - 60 * 60_000,
    status: "success",
  },
  {
    id: "3",
    type: "pending",
    label: "Brand story pending review",
    message: "Brand story pending review",
    timestamp: Date.now() - 120 * 60_000,
    status: "pending",
  },
]

export const useActivityStore = create<ActivityState>((set) => ({
  activities: seed,
  get items() {
    return this.activities
  },

  addActivity: (activity) =>
    set((s) => {
      const item: ActivityItem = {
        ...activity,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        // ensure both label and message are populated
        label: activity.label ?? activity.message,
        message: activity.message ?? activity.label,
        status: activity.status ?? typeToStatus(activity.type),
      }
      const next = [item, ...s.activities].slice(0, 50)
      return { activities: next }
    }),

  add: (item) =>
    set((s) => {
      const entry: ActivityItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        label: item.label ?? item.message,
        message: item.message ?? item.label,
        status: item.status ?? typeToStatus(item.type),
      }
      const next = [entry, ...s.activities].slice(0, 50)
      return { activities: next }
    }),

  clearActivities: () => set({ activities: [] }),
  clear: () => set({ activities: [] }),
}))
