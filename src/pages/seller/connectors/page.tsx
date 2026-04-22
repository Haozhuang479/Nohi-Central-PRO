// Connectors page — manage Layer 1 ingestion sources (Shopify, Google Drive).
// Lives at /seller/connectors.

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { toastIpcError } from '@/lib/ipc-toast'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton } from '@/components/ui/list-skeleton'

interface ConnectorMeta {
  id: 'shopify' | 'gdrive'
  name: string
  connected: boolean
  account?: string
  connectedAt?: number
  lastUsedAt?: number
  lastError?: string
}

export default function ConnectorsPage() {
  const { language } = useLanguage()
  const t = (en: string, zh: string) => (language === 'zh' ? zh : en)

  const [items, setItems] = useState<ConnectorMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [shopifyOpen, setShopifyOpen] = useState(false)
  const [gdriveOpen, setGdriveOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(() => {
    window.nohi?.connectors?.list()
      .then((list) => { if (list) setItems(list); setLoading(false) })
      .catch((err) => { toastIpcError('connectors:list')(err); setLoading(false) })
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const disconnect = useCallback(async (id: 'shopify' | 'gdrive') => {
    if (!confirm(t('Disconnect? Credentials will be deleted.', '确认断开？凭证将被删除。'))) return
    setBusy(id)
    if (id === 'shopify') await window.nohi?.connectors?.shopify.disconnect()
    if (id === 'gdrive') await window.nohi?.connectors?.gdrive.disconnect()
    setBusy(null)
    refresh()
    toast.success(t('Disconnected', '已断开'))
  }, [t, refresh])

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-8 py-6 border-b border-border/40">
        <h1 className="text-2xl font-semibold text-foreground">{t('Connectors', '连接器')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            'Connect your merchant data sources. Tokens are stored locally at ~/.nohi/connectors/ and never leave this machine.',
            '连接你的商家数据源。凭证保存在本地 ~/.nohi/connectors/，不会离开此机器。',
          )}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {loading ? (
          <ListSkeleton rows={2} rowHeightClass="h-32" />
        ) : items.length === 0 ? (
          <EmptyState
            title={t('No connectors yet', '还没有连接器')}
            description={t('Connect Shopify or Google Drive to pull catalog data into Nohi.', '连接 Shopify 或 Google Drive,把目录数据拉进 Nohi。')}
            ctaLabel={t('Connect Shopify', '连接 Shopify')}
            onCta={() => setShopifyOpen(true)}
          />
        ) : items.map((c) => (
          <div
            key={c.id}
            className={cn(
              'rounded-2xl border p-5',
              c.connected ? 'border-emerald-300/40 bg-emerald-50/10' : 'border-border/40 bg-muted/10',
            )}
          >
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center font-semibold text-foreground">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-foreground">{c.name}</h3>
                  {c.connected ? (
                    <Badge className="bg-emerald-500 text-white text-[10px]">
                      {t('Connected', '已连接')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      {t('Not connected', '未连接')}
                    </Badge>
                  )}
                </div>
                {c.connected && c.account && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('Account:', '账户：')} <span className="font-mono">{c.account}</span>
                  </p>
                )}
                {c.lastError && (
                  <p className="text-xs text-destructive mt-1">
                    {t('Last error:', '上次错误：')} {c.lastError}
                  </p>
                )}
                {c.connectedAt && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {t('Connected', '连接时间')}: {new Date(c.connectedAt).toLocaleString()}
                    {c.lastUsedAt && `  ·  ${t('Last used', '上次使用')}: ${new Date(c.lastUsedAt).toLocaleString()}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.connected ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === c.id}
                    onClick={() => disconnect(c.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    {t('Disconnect', '断开')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => c.id === 'shopify' ? setShopifyOpen(true) : setGdriveOpen(true)}
                  >
                    {t('Connect', '连接')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {shopifyOpen && (
        <ShopifyModal onClose={() => setShopifyOpen(false)} onDone={refresh} language={language} />
      )}
      {gdriveOpen && (
        <GDriveModal onClose={() => setGdriveOpen(false)} onDone={refresh} language={language} />
      )}
    </div>
  )
}

function ShopifyModal({ onClose, onDone, language }: { onClose: () => void; onDone: () => void; language: 'en' | 'zh' }) {
  const t = (en: string, zh: string) => (language === 'zh' ? zh : en)
  const [shop, setShop] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!shop.trim() || !token.trim()) {
      toast.error(t('Both fields are required', '两项均必填'))
      return
    }
    setBusy(true)
    const result = await window.nohi?.connectors?.shopify.connect(shop.trim(), token.trim())
    setBusy(false)
    if (!result) return
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`${t('Connected to', '已连接')} ${result.account}`)
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl bg-background border border-border/40 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border/40">
          <h2 className="text-lg font-semibold text-foreground">{t('Connect Shopify', '连接 Shopify')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              'Create a Custom App in your Shopify admin, enable the scopes you want (at minimum: read_products, read_orders, read_inventory), then paste the Admin API access token below.',
              '在 Shopify 后台创建 Custom App，开启所需权限（至少：read_products、read_orders、read_inventory），把 Admin API access token 粘贴到下方。',
            )}
          </p>
          <a
            href="https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/admin-api-access-tokens"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-500 hover:underline mt-2 inline-block"
          >
            {t('Shopify Custom App guide →', 'Shopify Custom App 指南 →')}
          </a>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {t('Shop domain', '店铺域名')}
            </label>
            <Input
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="mystore or mystore.myshopify.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {t('Admin API access token', 'Admin API access token')}
            </label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </div>
        </div>
        <div className="p-6 border-t border-border/40 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t('Cancel', '取消')}</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? t('Connecting…', '连接中…') : t('Connect', '连接')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function GDriveModal({ onClose, onDone, language }: { onClose: () => void; onDone: () => void; language: 'en' | 'zh' }) {
  const t = (en: string, zh: string) => (language === 'zh' ? zh : en)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error(t('Both fields are required', '两项均必填'))
      return
    }
    setBusy(true)
    toast.info(t('Opening Google in your browser…', '正在浏览器中打开 Google 授权…'))
    const result = await window.nohi?.connectors?.gdrive.connect(clientId.trim(), clientSecret.trim())
    setBusy(false)
    if (!result) return
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`${t('Connected as', '已连接')} ${result.account}`)
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl bg-background border border-border/40 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border/40">
          <h2 className="text-lg font-semibold text-foreground">{t('Connect Google Drive', '连接 Google Drive')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              'Because Nohi runs locally, it can\'t safely ship a shared Google OAuth client. Create your own in Google Cloud Console (OAuth Client ID → Desktop app), enable the Drive API, then paste the client_id + client_secret here. A browser window will open for you to approve access.',
              '由于 Nohi 本地运行，不能共享 Google OAuth 凭证。请在 Google Cloud Console 创建你自己的 OAuth 客户端（类型：Desktop app）、启用 Drive API，然后把 client_id + client_secret 粘贴到下方。浏览器会打开授权页面。',
            )}
          </p>
          <a
            href="https://support.google.com/cloud/answer/6158849"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-500 hover:underline mt-2 inline-block"
          >
            {t('Google Cloud OAuth setup →', 'Google Cloud OAuth 设置 →')}
          </a>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">client_id</label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="1234567890-xxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">client_secret</label>
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </div>
        </div>
        <div className="p-6 border-t border-border/40 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t('Cancel', '取消')}</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? t('Waiting for Google…', '等待 Google…') : t('Connect', '连接')}
          </Button>
        </div>
      </div>
    </div>
  )
}
