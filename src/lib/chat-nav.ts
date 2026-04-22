// Single source of truth for chat-surface navigation entries.
//
// Before v2.8.2 the chat layout sidebar and the in-composer "+ Add" menu
// each hard-coded their own route table — layout pointed Skills at
// /chat/skills and Connectors at /seller/connectors, while the + Add menu
// pointed Skills at /seller/settings and Connectors at the now-dead
// /seller/catalog/connectors. Two lists, two answers.
//
// Both menus now import from here. When we rename or redirect a page
// we only have to touch this file.

export interface ChatNavEntry {
  id: string
  labelEn: string
  labelZh: string
  href: string
}

/** Quick-nav entries surfaced in the chat sidebar above the New Chat button. */
export const CHAT_SIDEBAR_NAV: ChatNavEntry[] = [
  { id: 'automation', labelEn: 'Automation', labelZh: '自动化',  href: '/chat/automation' },
  { id: 'connectors', labelEn: 'Connectors', labelZh: '连接器',  href: '/seller/connectors' },
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
