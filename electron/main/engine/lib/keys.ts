// Credential lookup helpers.
// Single source of truth for "read an API key from settings or fall back to
// a process.env var". Kept out of ./http.ts because those env-var names are
// tool-specific and should not bleed into generic HTTP plumbing.

import type { NohiSettings } from '../types'

/**
 * Brave Search API key: user-set value in Settings wins; otherwise we honour
 * the BRAVE_SEARCH_API_KEY environment variable for headless dev setups.
 */
export function getBraveKey(settings?: NohiSettings): string | undefined {
  return settings?.braveSearchApiKey || process.env.BRAVE_SEARCH_API_KEY
}
