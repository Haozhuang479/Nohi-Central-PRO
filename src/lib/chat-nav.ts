// Single source of truth for chat-surface navigation entries.
//
// Before v2.8.2 the chat layout sidebar and the in-composer "+ Add" menu
// each hard-coded their own route table; both now import from here.
//
// v3.2.0: the seller-side /seller/connectors route was removed in the zip
// rebuild. Connectors moved under /seller/catalog/connectors as a mock UI
// page. Chat sidebar's Connectors link now points there.

export interface ChatNavEntry {
  id: string
  labelEn: string
  labelZh: string
  href: string
}

/** Quick-nav entries surfaced in the chat sidebar above the New Chat button. */
export const CHAT_SIDEBAR_NAV: ChatNavEntry[] = [
  { id: 'automation', labelEn: 'Automation', labelZh: '自动化',  href: '/chat/automation' },
  { id: 'connectors', labelEn: 'Connectors', labelZh: '连接器',  href: '/seller/catalog/connectors' },
  { id: 'mcps',       labelEn: 'MCPs',       labelZh: 'MCPs',     href: '/chat/mcp' },
  { id: 'skills',     labelEn: 'Skills',     labelZh: '技能',     href: '/chat/skills' },
]

/** Entries rendered in the composer "+ Add" menu. Kept in sync with the
 *  sidebar for the two overlapping items (Connectors + Skills) by simply
 *  reusing those CHAT_SIDEBAR_NAV entries. */
export const CHAT_ADD_MENU_LINKS: ChatNavEntry[] = [
  CHAT_SIDEBAR_NAV.find((n) => n.id === 'connectors')!,
  CHAT_SIDEBAR_NAV.find((n) => n.id === 'skills')!,
]

export function labelFor(entry: ChatNavEntry, lang: 'en' | 'zh'): string {
  return lang === 'zh' ? entry.labelZh : entry.labelEn
}
