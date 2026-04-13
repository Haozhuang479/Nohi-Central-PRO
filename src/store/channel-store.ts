import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ChannelStatus = "active" | "inactive" | "disconnected" | "always-on" | "coming"

interface ChannelStoreState {
  channelStates: Record<string, ChannelStatus>
  getChannelStatus: (channelId: string) => ChannelStatus
  setChannelStatus: (channelId: string, status: ChannelStatus) => void
  resetChannelStates: () => void
}

const defaultChannelStates: Record<string, ChannelStatus> = {
  "conversational-storefront": "active",
  "chatgpt-acp": "always-on",
  "chatgpt-app": "disconnected",
  "google-ucp": "always-on",
  "google-ai": "always-on",
  "perplexity": "always-on",
  "reddit": "active",
  "third-party": "active",
  "creator-agents": "coming",
  "copilot": "coming",
  "genspark": "coming",
  "kimi": "coming",
  "openclaw": "coming",
}

export const useChannelStore = create<ChannelStoreState>()(
  persist(
    (set, get) => ({
      channelStates: { ...defaultChannelStates },

      getChannelStatus: (channelId: string): ChannelStatus =>
        get().channelStates[channelId] ?? "disconnected",

      setChannelStatus: (channelId: string, status: ChannelStatus) =>
        set((s) => ({
          channelStates: { ...s.channelStates, [channelId]: status },
        })),

      resetChannelStates: () => set({ channelStates: { ...defaultChannelStates } }),
    }),
    {
      name: "nohi-channel-store",
    }
  )
)
