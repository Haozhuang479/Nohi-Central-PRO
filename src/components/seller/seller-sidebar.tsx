import { Link, useLocation } from 'react-router-dom'
import nohiLogo from '@/assets/nohi-logo.svg'
import { cn } from '@/lib/utils'
import { useChannelState } from '@/lib/channel-state'
import { useLanguage } from '@/lib/language-context'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export function SellerSidebar() {
  const { pathname } = useLocation()
  const { getChannelStatus } = useChannelState()
  const { t } = useLanguage()

  const isBrandContext = pathname.startsWith('/seller/brand-context')
  const isAgenticCatalog = pathname.startsWith('/seller/catalog')
  const isChannelControl = pathname.startsWith('/seller/channels')

  const brandContextSubPages = [
    { title: t('nav.details'), href: '/seller/brand-context/details' },
    { title: t('nav.guardrails'), href: '/seller/brand-context/guardrails' },
    { title: t('nav.visualStyle'), href: '/seller/brand-context/visual-style' },
    { title: t('nav.brandStory'), href: '/seller/brand-context/brand-story' },
    { title: t('nav.postsUgc'), href: '/seller/brand-context/posts-ugc' },
    { title: t('nav.fulfillment'), href: '/seller/brand-context/fulfillment' },
  ]

  const ownSupplyItems = [
    { title: t('nav.csvUpload'), href: '/seller/catalog/own-supply' },
    { title: t('nav.connectors'), href: '/seller/catalog/connectors' },
  ]

  const nohiDatabaseItems = [
    { title: t('nav.products'), href: '/seller/catalog/nohi-database/products' },
    { title: t('nav.brands'), href: '/seller/catalog/nohi-database/brands' },
    { title: t('nav.websites'), href: '/seller/catalog/nohi-database/websites' },
    { title: t('nav.categories'), href: '/seller/catalog/nohi-database/categories' },
  ]

  const channelControlItems = [
    {
      title: t('nav.conversationalStorefront'),
      href: '/seller/channels/conversational-storefront',
      id: 'conversational-storefront',
    },
    { title: 'ChatGPT ACP', href: '/seller/channels/chatgpt-acp', id: 'chatgpt-acp' },
    { title: 'ChatGPT App', href: '/seller/channels/chatgpt-app', id: 'chatgpt-app' },
    { title: 'Google UCP', href: '/seller/channels/google-ucp', id: 'google-ucp' },
    { title: 'Google AI Mode', href: '/seller/channels/google-ai', id: 'google-ai' },
    { title: 'Perplexity', href: '/seller/channels/perplexity', id: 'perplexity' },
    { title: 'Reddit DPA', href: '/seller/channels/reddit', id: 'reddit' },
    { title: t('nav.thirdPartyAgents'), href: '/seller/channels/third-party', id: 'third-party' },
    { title: t('nav.creatorAgents'), href: '/seller/channels/creator-agents', id: 'creator-agents' },
    { title: 'Microsoft Copilot', href: '/seller/channels/copilot', id: 'copilot' },
    { title: 'Genspark', href: '/seller/channels/genspark', id: 'genspark' },
    { title: 'Kimi', href: '/seller/channels/kimi', id: 'kimi' },
    { title: 'Openclaw', href: '/seller/channels/openclaw', id: 'openclaw' },
  ]

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border h-full">
      {/* ── Logo header ── */}
      <SidebarHeader className="p-4">
        <Link to="/seller" className="flex items-center gap-2">
          <img src={nohiLogo} alt="Nohi" className="h-[60px] w-auto object-contain" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/60 drop-shadow-sm">
            PRO
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>

              {/* ── Home ── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/seller'}
                  tooltip={t('nav.home')}
                >
                  <Link to="/seller">
                    <span>{t('nav.home')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ── Agentic Catalog ── */}
              <Collapsible defaultOpen={isAgenticCatalog} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isAgenticCatalog}
                      tooltip={t('nav.agenticCatalog')}
                    >
                      <span className="flex-1 truncate">{t('nav.agenticCatalog')}</span>
                      <span className="ml-auto text-xs transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">›</span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* YOUR PRODUCTS section header */}
                      <SidebarMenuSubItem>
                        <span className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          {t('nav.yourProducts')}
                        </span>
                      </SidebarMenuSubItem>
                      {ownSupplyItems.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                            <Link to={item.href}>
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}

                      {/* DISCOVER section header */}
                      <SidebarMenuSubItem className="mt-2">
                        <span className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          {t('nav.discover')}
                        </span>
                      </SidebarMenuSubItem>
                      {nohiDatabaseItems.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                            <Link to={item.href}>
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* ── Brand Context ── */}
              <Collapsible defaultOpen={isBrandContext} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isBrandContext} tooltip={t('nav.brandContext')}>
                      <span className="flex-1 truncate">{t('nav.brandContext')}</span>
                      <span className="ml-auto text-xs transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">›</span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {brandContextSubPages.map((sub) => (
                        <SidebarMenuSubItem key={sub.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === sub.href}>
                            <Link to={sub.href}>
                              <span>{sub.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* ── Channel Control ── */}
              <Collapsible defaultOpen={isChannelControl} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isChannelControl}
                      tooltip={t('nav.channelControl')}
                    >
                      <span className="flex-1 truncate">{t('nav.channelControl')}</span>
                      <span className="ml-auto text-xs transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">›</span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {channelControlItems.map((item) => {
                        const status = getChannelStatus(item.id)
                        const dotColor =
                          status === 'active' || status === 'always-on'
                            ? 'bg-green-500'
                            : status === 'inactive'
                            ? 'bg-yellow-500'
                            : status === 'disconnected'
                            ? 'bg-red-500'
                            : null

                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === item.href}
                              className={status === 'coming' ? 'opacity-50' : ''}
                            >
                              <Link to={status === 'coming' ? '#' : item.href}>
                                <span className="flex items-center gap-2 flex-1">
                                  {dotColor && (
                                    <span
                                      className={cn('size-1.5 rounded-full shrink-0', dotColor)}
                                    />
                                  )}
                                  <span className="truncate">{item.title}</span>
                                  {status === 'coming' && (
                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                      {t('channel.coming')}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* ── Connectors (Layer 1 ingestion) ── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/seller/connectors'}
                  tooltip="Connectors"
                >
                  <Link to="/seller/connectors">
                    <span>Connectors</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ── Automation ── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/seller/automation'}
                  tooltip="Automation"
                >
                  <Link to="/seller/automation">
                    <span>Automation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ── Analytics ── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/seller/analytics'}
                  tooltip={t('nav.analytics')}
                >
                  <Link to="/seller/analytics">
                    <span>{t('nav.analytics')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ── Skills ── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/seller/skills'}
                  tooltip="Skills"
                >
                  <Link to="/seller/skills">
                    <span>Skills</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ── MCP Servers ── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/seller/mcp'}
                  tooltip="MCP Servers"
                >
                  <Link to="/seller/mcp">
                    <span>MCP Servers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer: user account ── */}
      <SidebarFooter className="p-3">
        <Link
          to="/seller/settings"
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-foreground text-sidebar text-xs font-semibold">
            N
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-medium text-sidebar-foreground truncate">Demo</span>
            <span className="text-[10px] text-sidebar-foreground/50">PRO Plan</span>
          </div>
        </Link>
      </SidebarFooter>

    </Sidebar>
  )
}
