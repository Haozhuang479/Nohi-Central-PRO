import { Suspense, lazy, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from '@/lib/language-context'
import { ChannelStateProvider } from '@/lib/channel-state'
import { Toaster } from '@/components/ui/sonner'
import type { NohiSettings } from '../electron/main/engine/types'

// ── Lazy page imports ─────────────────────────────────────────────────────────

const ChatLayout = lazy(() =>
  import('@/pages/chat/layout').then((m) => ({ default: m.ChatLayout }))
)

const ChatPage = lazy(() => import('@/pages/chat/page'))

const SellerLayout = lazy(() =>
  import('@/pages/seller/layout').then((m) => ({ default: m.SellerLayout }))
)

const OnboardingPage = lazy(() => import('@/pages/onboarding/page'))

// Seller pages
const SellerHomePage = lazy(() => import('@/pages/seller/home/page'))
const SettingsPage = lazy(() => import('@/pages/seller/settings/page'))
const AnalyticsPage = lazy(() => import('@/pages/seller/analytics/page'))
const SkillsPage = lazy(() => import('@/pages/seller/skills/page'))
const McpPage = lazy(() => import('@/pages/seller/mcp/page'))

// Catalog
const OwnSupplyPage = lazy(() => import('@/pages/seller/catalog/own-supply/page'))
const ConnectorsPage = lazy(() => import('@/pages/seller/catalog/connectors/page'))
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
      .then(setSettings)
      .catch((err: unknown) => {
        setLoadError(String(err))
      })
  }, [])

  const handleSettingsSave = async (s: NohiSettings) => {
    await window.nohi.settings.save(s)
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

  const hasApiKey =
    !!(settings?.anthropicApiKey?.trim()) ||
    !!(settings?.openaiApiKey?.trim()) ||
    !!(settings?.kimiApiKey?.trim()) ||
    !!(settings?.minimaxApiKey?.trim()) ||
    !!(settings?.deepseekApiKey?.trim())

  return (
    <LanguageProvider>
      <ChannelStateProvider>
        <HashRouter>
          <Suspense fallback={<AppSpinner />}>
            <Routes>
              {/* Onboarding */}
              <Route
                path="/onboarding"
                element={
                  <OnboardingPage
                    onComplete={async (s) => {
                      // Merge onboarding settings with existing defaults (don't wipe workingDir etc.)
                      const merged = { ...settings, ...s } as NohiSettings
                      await handleSettingsSave(merged)
                    }}
                  />
                }
              />

              {/* Chat — full-screen standalone AI chat */}
              <Route
                path="/chat"
                element={
                  hasApiKey ? (
                    <ChatLayout
                      settings={settings!}
                      onSettingsSave={handleSettingsSave}
                    />
                  ) : (
                    <Navigate to="/onboarding" replace />
                  )
                }
              >
                <Route index element={<ChatPage settings={settings!} />} />
              </Route>

              {/* Seller shell — nested under SellerLayout */}
              <Route
                path="/seller"
                element={
                  hasApiKey ? (
                    <SellerLayout
                      settings={settings!}
                      onSettingsSave={handleSettingsSave}
                    />
                  ) : (
                    <Navigate to="/onboarding" replace />
                  )
                }
              >
                {/* Index: home dashboard */}
                <Route index element={<SellerHomePage />} />

                {/* Catalog */}
                <Route
                  path="catalog/own-supply"
                  element={<OwnSupplyPage />}
                />
                <Route
                  path="catalog/connectors"
                  element={<ConnectorsPage />}
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

              {/* Catch-all → chat (or onboarding if no key) */}
              <Route
                path="*"
                element={
                  hasApiKey ? (
                    <Navigate to="/chat" replace />
                  ) : (
                    <Navigate to="/onboarding" replace />
                  )
                }
              />
            </Routes>
          </Suspense>
        </HashRouter>

        <Toaster position="bottom-right" />
      </ChannelStateProvider>
    </LanguageProvider>
  )
}
