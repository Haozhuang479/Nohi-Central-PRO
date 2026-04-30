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
  import('@/pages/chat/layout').then((m) => ({ default: m.ChatLayout })),
)

const ChatPage = lazy(() => import('@/pages/chat/page'))
const ChatSkillsPage = lazy(() => import('@/pages/chat/skills'))
const ChatMcpPage = lazy(() => import('@/pages/chat/mcp'))
const ChatAutomationPage = lazy(() => import('@/pages/chat/automation'))

const SellerLayout = lazy(() =>
  import('@/pages/seller/layout').then((m) => ({ default: m.SellerLayout })),
)

// ── v3.2.0 zip seller pages — full reset of /seller/* tree to match the SaaS
// reference zip. NOHI-only routes (automation/mcp/skills/connectors at the
// top level) were removed; their chat-side equivalents (/chat/automation
// etc.) remain. Backend IPC + tools untouched.

const SellerHomePage = lazy(() => import('@/pages/seller/page'))
const SellerAccountPage = lazy(() => import('@/pages/seller/account/page'))
const SellerAnalyticsPage = lazy(() => import('@/pages/seller/analytics/page'))
const SellerBillingPage = lazy(() => import('@/pages/seller/billing/page'))
const SellerPromotionalCreditsPage = lazy(() =>
  import('@/pages/seller/billing/promotional-credits/page'),
)
const SellerCampaignsPage = lazy(() => import('@/pages/seller/campaigns/page'))
const SellerOnboardingPage = lazy(() => import('@/pages/seller/onboarding/page'))
const SellerSettingsPage = lazy(() => import('@/pages/seller/settings/page'))

// Brand Context (zip): hub + 5 sub-pages — posts-ugc dropped (not in zip).
const BrandContextHubPage = lazy(() => import('@/pages/seller/brand-context/page'))
const BrandDetailsPage = lazy(() => import('@/pages/seller/brand-context/details/page'))
const BrandStoryPage = lazy(() => import('@/pages/seller/brand-context/brand-story/page'))
const BrandFulfillmentPage = lazy(() => import('@/pages/seller/brand-context/fulfillment/page'))
const BrandGuardrailsPage = lazy(() => import('@/pages/seller/brand-context/guardrails/page'))
const BrandVisualStylePage = lazy(() => import('@/pages/seller/brand-context/visual-style/page'))

// Catalog
const CatalogIndexPage = lazy(() => import('@/pages/seller/catalog/page'))
const CatalogConnectFeedPage = lazy(() => import('@/pages/seller/catalog/connect-feed/page'))
const CatalogConnectorsPage = lazy(() => import('@/pages/seller/catalog/connectors/page'))
const CatalogOwnSupplyPage = lazy(() => import('@/pages/seller/catalog/own-supply/page'))
const CatalogOwnSupplyImportPage = lazy(() =>
  import('@/pages/seller/catalog/own-supply/import/page'),
)
const CatalogProductCatalogPage = lazy(() =>
  import('@/pages/seller/catalog/product-catalog/page'),
)
const NohiBrandsPage = lazy(() => import('@/pages/seller/catalog/nohi-database/brands/page'))
const NohiBrandDetailPage = lazy(() =>
  import('@/pages/seller/catalog/nohi-database/brands/[slug]/page'),
)
const NohiCategoriesPage = lazy(() =>
  import('@/pages/seller/catalog/nohi-database/categories/page'),
)
const NohiProductsPage = lazy(() => import('@/pages/seller/catalog/nohi-database/products/page'))
const NohiProductDetailPage = lazy(() =>
  import('@/pages/seller/catalog/nohi-database/products/[slug]/page'),
)
const NohiWebsitesPage = lazy(() => import('@/pages/seller/catalog/nohi-database/websites/page'))

// Channels
const ChannelsHubPage = lazy(() => import('@/pages/seller/channels/page'))
const ChannelDetailPage = lazy(() => import('@/pages/seller/channels/[slug]/page'))
const ConversationalStorefrontPage = lazy(() =>
  import('@/pages/seller/channels/conversational-storefront/page'),
)

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

  if (!settings && !loadError) {
    return <AppSpinner />
  }

  if (loadError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p className="text-sm text-destructive">Failed to load settings: {loadError}</p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <CrashWatcher />
      <LanguageProvider>
        <ToolConsent />
        <PlanApproval />
        <ChannelStateProvider>
          <HashRouter>
            <Suspense fallback={<AppSpinner />}>
              <Routes>
                {/* Chat — full-screen standalone AI chat (unchanged) */}
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

                {/* Seller shell — full v3.2.0 reset to zip routes */}
                <Route path="/seller" element={<SellerLayout />}>
                  <Route index element={<SellerHomePage />} />
                  <Route path="account" element={<SellerAccountPage />} />
                  <Route path="analytics" element={<SellerAnalyticsPage />} />

                  {/* Billing */}
                  <Route path="billing" element={<SellerBillingPage />} />
                  <Route
                    path="billing/promotional-credits"
                    element={<SellerPromotionalCreditsPage />}
                  />

                  {/* Brand Context */}
                  <Route path="brand-context" element={<BrandContextHubPage />} />
                  <Route path="brand-context/details" element={<BrandDetailsPage />} />
                  <Route path="brand-context/brand-story" element={<BrandStoryPage />} />
                  <Route path="brand-context/fulfillment" element={<BrandFulfillmentPage />} />
                  <Route path="brand-context/guardrails" element={<BrandGuardrailsPage />} />
                  <Route path="brand-context/visual-style" element={<BrandVisualStylePage />} />

                  {/* Catalog */}
                  <Route path="catalog" element={<CatalogIndexPage />} />
                  <Route path="catalog/connect-feed" element={<CatalogConnectFeedPage />} />
                  <Route path="catalog/connectors" element={<CatalogConnectorsPage />} />
                  <Route path="catalog/own-supply" element={<CatalogOwnSupplyPage />} />
                  <Route path="catalog/own-supply/import" element={<CatalogOwnSupplyImportPage />} />
                  <Route path="catalog/product-catalog" element={<CatalogProductCatalogPage />} />
                  <Route
                    path="catalog/nohi-database/brands"
                    element={<NohiBrandsPage />}
                  />
                  <Route
                    path="catalog/nohi-database/brands/:slug"
                    element={<NohiBrandDetailPage />}
                  />
                  <Route
                    path="catalog/nohi-database/categories"
                    element={<NohiCategoriesPage />}
                  />
                  <Route
                    path="catalog/nohi-database/products"
                    element={<NohiProductsPage />}
                  />
                  <Route
                    path="catalog/nohi-database/products/:slug"
                    element={<NohiProductDetailPage />}
                  />
                  <Route
                    path="catalog/nohi-database/websites"
                    element={<NohiWebsitesPage />}
                  />

                  {/* Campaigns */}
                  <Route path="campaigns" element={<SellerCampaignsPage />} />

                  {/* Channels — list, detail, conversational storefront */}
                  <Route path="channels" element={<ChannelsHubPage />} />
                  <Route
                    path="channels/conversational-storefront"
                    element={<ConversationalStorefrontPage />}
                  />
                  <Route path="channels/:slug" element={<ChannelDetailPage />} />

                  {/* Onboarding (zip-only flow) */}
                  <Route path="onboarding" element={<SellerOnboardingPage />} />

                  {/* Settings */}
                  <Route path="settings" element={<SellerSettingsPage />} />

                  {/* v3.2.0: Backwards-compatibility redirects for the
                      NOHI-only seller routes that were removed in the rebuild.
                      Old bookmarks land somewhere sensible instead of 404. */}
                  <Route path="home" element={<Navigate to="/seller" replace />} />
                  <Route path="automation" element={<Navigate to="/seller" replace />} />
                  <Route path="mcp" element={<Navigate to="/seller" replace />} />
                  <Route path="skills" element={<Navigate to="/seller" replace />} />
                  <Route path="connectors" element={<Navigate to="/seller/catalog/connectors" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/chat" replace />} />
              </Routes>
            </Suspense>
          </HashRouter>

          <Toaster position="bottom-right" />
        </ChannelStateProvider>
      </LanguageProvider>
    </ErrorBoundary>
  )
}
