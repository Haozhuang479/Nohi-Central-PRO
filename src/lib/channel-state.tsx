import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export type ChannelStatus = "active" | "inactive" | "disconnected" | "always-on" | "coming"

interface ChannelState {
  [key: string]: ChannelStatus
}

interface ChannelStateContextType {
  channelStates: ChannelState
  setChannelStatus: (channelId: string, status: ChannelStatus) => void
  getChannelStatus: (channelId: string) => ChannelStatus
}

const defaultChannelStates: ChannelState = {
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

const ChannelStateContext = createContext<ChannelStateContextType | undefined>(undefined)

export function ChannelStateProvider({ children }: { children: ReactNode }) {
  const [channelStates, setChannelStates] = useState<ChannelState>(defaultChannelStates)

  const setChannelStatus = useCallback((channelId: string, status: ChannelStatus) => {
    setChannelStates((prev) => ({ ...prev, [channelId]: status }))
  }, [])

  const getChannelStatus = useCallback(
    (channelId: string): ChannelStatus => channelStates[channelId] || "disconnected",
    [channelStates]
  )

  return (
    <ChannelStateContext.Provider value={{ channelStates, setChannelStatus, getChannelStatus }}>
      {children}
    </ChannelStateContext.Provider>
  )
}

export function useChannelState() {
  const context = useContext(ChannelStateContext)
  if (context === undefined) throw new Error("useChannelState must be used within a ChannelStateProvider")
  return context
}
