import { Suspense, lazy, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from '@/lib/language-context'
import { ChannelStateProvider } from '@/lib/channel-state'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/error-boundary'
import { CrashWatcher } from '@/components/crash-watcher'
import { ToolConsent } from '@/components/chat/tool-consent'
import { PlanApproval } from '@/components/chat/plan-approval'
import { toastIpcError } from '@/lib/ipc-toast'
import { toast } from 'sonner'
import type { NohiSettings } from '../electron/main/engine/types'

// ── Lazy page imports ─────────────────────────────────────────────────────────

const ChatLayout = lazy(() =>
  import('@/pages/chat/layout').then((m) => ({ default: m.ChatLayout }))
)

const ChatPage = lazy(() => import('@/pages/chat/page'))
const ChatSkillsPage = lazy(() => import('@/pages/chat/skills'))
const ChatMcpPage = lazy(() => import('@/pages/chat/mcp'))
const ChatAutomationPage = lazy(() => import('@/pages/chat/automation'))

const SellerLayout = lazy(() =>
  import('@/pages/seller/layout').then((m) => ({ default: m.SellerLayout }))
)

// Onboarding removed — users configure API keys in Settings

// Seller pages
const SellerHomePage = lazy(() => import('@/pages/seller/home/page'))
const SettingsPage = lazy(() => import('@/pages/seller/settings/page'))
const AnalyticsPage = lazy(() => import('@/pages/seller/analytics/page'))
const SkillsPage = lazy(() => import('@/pages/seller/skills/page'))
const McpPage = lazy(() => import('@/pages/seller/mcp/page'))
const AutomationPage = lazy(() => import('@/pages/seller/automation/page'))
const ConnectorsTopPage = lazy(() => import('@/pages/seller/connectors/page'))

// Catalog
const OwnSupplyPage = lazy(() => import('@/pages/seller/catalog/own-supply/page'))
const NohiProductsPage = lazy(
  () => import('@/pages/seller/catalog/nohi-database/products/page')
)
const NohiBrandsPage = lazy(
  () => import('@/pages/seller/catalog/nohi-database/brands/page')
)
const NohiWebsitesPage = lazy(
  () => import('@/pages/seller/catalog/nohi-database/websites/page')
)
const NohiCategoriesPage = lazy(
  () => import('@/pages/seller/catalog/nohi-database/categories/page')
)

// Brand Context
const BrandContextPage = lazy(() => import('@/pages/seller/brand-context/page'))
const BrandDetailsPage = lazy(() => import('@/pages/seller/brand-context/details/page'))
const BrandGuardrailsPage = lazy(
  () => import('@/pages/seller/brand-context/guardrails/page')
)
const BrandVisualStylePage = lazy(
  () => import('@/pages/seller/brand-context/visual-style/page')
)
const BrandStoryPage = lazy(
  () => import('@/pages/seller/brand-context/brand-story/page')
)
const BrandPostsUgcPage = lazy(
  () => import('@/pages/seller/brand-context/posts-ugc/page')
)
const BrandFulfillmentPage = lazy(
  () => import('@/pages/seller/brand-context/fulfillment/page')
)

// Channels
const ConversationalStorefrontPage = lazy(
  () => import('@/pages/seller/channels/conversational-storefront/page')
)
const GenericChannelPage = lazy(() => import('@/pages/seller/channels/[slug]/page'))

// ── Full-screen loading spinner ───────────────────────────────────────────────

function AppSpinner() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background text-xl font-bold">
          N
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
          <span>Loading Nohi Central PRO…</span>
        </div>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [settings, setSettings] = useState<NohiSettings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    window.nohi.settings
      .get()
      .then((s) => {
        setSettings(s)
        // One-shot post-upgrade notice: any plaintext API key was dropped
        // by the safeStorage migration. Tell the user once, then clear the
        // flag by persisting the settings without it.
        if (s.migratedPlaintextKeys) {
          toast.warning(
            'Saved API keys were cleared during a security upgrade. Please re-enter them in Settings — they will now be encrypted via your OS keychain.',
            { duration: 15000 },
          )
          const { migratedPlaintextKeys: _drop, ...rest } = s
          void _drop
          window.nohi.settings.save(rest).catch(toastIpcError('settings:save'))
        }
      })
      .catch((err: unknown) => {
        setLoadError(String(err))
      })
  }, [])

  const handleSettingsSave = async (s: NohiSettings) => {
    const result = await window.nohi.settings.save(s)
    if (result && 'ok' in result && !result.ok) {
      toast.error(result.error, { duration: 8000 })
      return
    }
    setSettings(s)
  }

  // Still loading settings from IPC
  if (!settings && !loadError) {
    return <AppSpinner />
  }

  // IPC error fallback
  if (loadError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p className="text-sm text-destructive">Failed to load settings: {loadError}</p>
      </div>
    )
  }

  // No onboarding gate — always allow access (users configure keys in Settings)

  return (
    <ErrorBoundary>
    <CrashWatcher />
    <ToolConsent />
    <PlanApproval />
    <LanguageProvider>
      <ChannelStateProvider>
        <HashRouter>
          <Suspense fallback={<AppSpinner />}>
            <Routes>
              {/* Chat — full-screen standalone AI chat */}
              <Route
                path="/chat"
                element={
                  <ChatLayout
                    settings={settings!}
                    onSettingsSave={handleSettingsSave}
                  />
                }
              >
                <Route index element={<ChatPage settings={settings!} />} />
                <Route path="skills" element={<ChatSkillsPage />} />
                <Route path="automation" element={<ChatAutomationPage />} />
                <Route
                  path="mcp"
                  element={
                    <ChatMcpPage
                      settings={settings!}
                      onSave={handleSettingsSave}
                    />
                  }
                />
              </Route>

              {/* Seller shell — nested under SellerLayout */}
              <Route
                path="/seller"
                element={
                  <SellerLayout
                    settings={settings!}
                    onSettingsSave={handleSettingsSave}
                  />
                }
              >
                {/* Index: home dashboard */}
                <Route index element={<SellerHomePage />} />

                {/* Catalog */}
                <Route
                  path="catalog/own-supply"
                  element={<OwnSupplyPage />}
                />
                {/* v2.8.3: the old /seller/catalog/connectors page was a
                    dead visual duplicate of /seller/connectors with zero
                    IPC wiring. Redirect so old bookmarks/links still work. */}
                <Route
                  path="catalog/connectors"
                  element={<Navigate to="/seller/connectors" replace />}
                />
                <Route
                  path="catalog/nohi-database/products"
                  element={<NohiProductsPage />}
                />
                <Route
                  path="catalog/nohi-database/brands"
                  element={<NohiBrandsPage />}
                />
                <Route
                  path="catalog/nohi-database/websites"
                  element={<NohiWebsitesPage />}
                />
                <Route
                  path="catalog/nohi-database/categories"
                  element={<NohiCategoriesPage />}
                />

                {/* Brand Context */}
                <Route path="brand-context" element={<BrandContextPage />} />
                <Route
                  path="brand-context/details"
                  element={<BrandDetailsPage />}
                />
                <Route
                  path="brand-context/guardrails"
                  element={<BrandGuardrailsPage />}
                />
                <Route
                  path="brand-context/visual-style"
                  element={<BrandVisualStylePage />}
                />
                <Route
                  path="brand-context/brand-story"
                  element={<BrandStoryPage />}
                />
                <Route
                  path="brand-context/posts-ugc"
                  element={<BrandPostsUgcPage />}
                />
                <Route
                  path="brand-context/fulfillment"
                  element={<BrandFulfillmentPage />}
                />

                {/* Channels */}
                <Route
                  path="channels/conversational-storefront"
                  element={<ConversationalStorefrontPage />}
                />
                <Route path="channels/:slug" element={<GenericChannelPage />} />

                {/* Top-level pages */}
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="connectors" element={<ConnectorsTopPage />} />
                <Route path="automation" element={<AutomationPage />} />
                <Route path="skills" element={<SkillsPage />} />
                <Route
                  path="mcp"
                  element={
                    <McpPage
                      settings={settings!}
                      onSave={handleSettingsSave}
                    />
                  }
                />
                <Route
                  path="settings"
                  element={
                    <SettingsPage
                      settings={settings!}
                      onSave={handleSettingsSave}
                    />
                  }
                />
              </Route>

              {/* Catch-all → chat */}
              <Route
                path="*"
                element={<Navigate to="/chat" replace />}
              />
            </Routes>
          </Suspense>
        </HashRouter>

        <Toaster position="bottom-right" />
      </ChannelStateProvider>
    </LanguageProvider>
    </ErrorBoundary>
  )
}
