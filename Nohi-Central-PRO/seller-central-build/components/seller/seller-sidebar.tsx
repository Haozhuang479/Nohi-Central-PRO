"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useChannelState } from "@/lib/channel-state"
import { useLanguage } from "@/lib/language-context"
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
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronRight, Home, Package, Layers, Radio, BarChart3 } from "lucide-react"

export function SellerSidebar() {
  const pathname = usePathname()
  const { getChannelStatus } = useChannelState()
  const { t, language } = useLanguage()
  const isBrandContext = pathname.startsWith("/seller/brand-context")
  const isAgenticCatalog = pathname.startsWith("/seller/catalog")
  const isChannelControl = pathname.startsWith("/seller/channels")

  const brandContextSubPages = [
    { title: t("nav.details"), href: "/seller/brand-context/details" },
    { title: t("nav.guardrails"), href: "/seller/brand-context/guardrails" },
    { title: t("nav.visualStyle"), href: "/seller/brand-context/visual-style" },
    { title: t("nav.brandStory"), href: "/seller/brand-context/brand-story" },
    { title: t("nav.postsUgc"), href: "/seller/brand-context/posts-ugc" },
    { title: t("nav.fulfillment"), href: "/seller/brand-context/fulfillment" },
  ]

  const ownSupplyItems = [
    { title: t("nav.csvUpload"), href: "/seller/catalog/own-supply" },
    { title: t("nav.connectors"), href: "/seller/catalog/connectors" },
  ]

  const nohiDatabaseItems = [
    { title: t("nav.products"), href: "/seller/catalog/nohi-database/products" },
    { title: t("nav.brands"), href: "/seller/catalog/nohi-database/brands" },
    { title: t("nav.websites"), href: "/seller/catalog/nohi-database/websites" },
    { title: t("nav.categories"), href: "/seller/catalog/nohi-database/categories" },
  ]

  // Channel IDs for lookup
  const channelControlItems = [
    { title: t("nav.conversationalStorefront"), href: "/seller/channels/conversational-storefront", id: "conversational-storefront" },
    { title: "ChatGPT ACP", href: "/seller/channels/chatgpt-acp", id: "chatgpt-acp" },
    { title: "ChatGPT App", href: "/seller/channels/chatgpt-app", id: "chatgpt-app" },
    { title: "Google UCP", href: "/seller/channels/google-ucp", id: "google-ucp" },
    { title: "Google AI Mode", href: "/seller/channels/google-ai", id: "google-ai" },
    { title: "Perplexity", href: "/seller/channels/perplexity", id: "perplexity" },
    { title: "Reddit DPA", href: "/seller/channels/reddit", id: "reddit" },
    { title: t("nav.thirdPartyAgents"), href: "/seller/channels/third-party", id: "third-party" },
    { title: t("nav.creatorAgents"), href: "/seller/channels/creator-agents", id: "creator-agents" },
    { title: "Microsoft Copilot", href: "/seller/channels/copilot", id: "copilot" },
    { title: "Genspark", href: "/seller/channels/genspark", id: "genspark" },
    { title: "Kimi", href: "/seller/channels/kimi", id: "kimi" },
    { title: "Openclaw", href: "/seller/channels/openclaw", id: "openclaw" },
  ]

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/seller" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground drop-shadow-sm">
            Nohi
          </span>
          <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-widest group-data-[collapsible=icon]:hidden">
            {t("nav.seller")}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Home */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/seller"}
                  tooltip={t("nav.home")}
                >
                  <Link href="/seller">
                    <Home className="size-4 shrink-0 hidden group-data-[collapsible=icon]:block" />
                    <span className="group-data-[collapsible=icon]:hidden">{t("nav.home")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Agentic Catalog - Collapsible */}
              <Collapsible
                defaultOpen={isAgenticCatalog}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  {/* Icon link for collapsed state */}
                  <div className="hidden group-data-[collapsible=icon]:block">
                    <SidebarMenuButton
                      asChild
                      isActive={isAgenticCatalog}
                      tooltip={t("nav.agenticCatalog")}
                    >
                      <Link href="/seller/catalog/own-supply">
                        <Package className="size-4 shrink-0" />
                      </Link>
                    </SidebarMenuButton>
                  </div>
                  {/* Collapsible trigger for expanded state */}
                  <CollapsibleTrigger asChild className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenuButton
                      isActive={isAgenticCatalog}
                      tooltip={t("nav.agenticCatalog")}
                    >
                      <span className="flex-1 truncate">{t("nav.agenticCatalog")}</span>
                      <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* Your Products Section */}
                      <SidebarMenuSubItem>
                        <span className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          {t("nav.yourProducts")}
                        </span>
                      </SidebarMenuSubItem>
                      {ownSupplyItems.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === item.href}
                          >
                            <Link href={item.href}>
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      
                      {/* Discover Section */}
                      <SidebarMenuSubItem className="mt-2">
                        <span className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          {t("nav.discover")}
                        </span>
                      </SidebarMenuSubItem>
                      {nohiDatabaseItems.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === item.href}
                          >
                            <Link href={item.href}>
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Brand Context - Collapsible */}
              <Collapsible
                defaultOpen={isBrandContext}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  {/* Icon link for collapsed state */}
                  <div className="hidden group-data-[collapsible=icon]:block">
                    <SidebarMenuButton
                      asChild
                      isActive={isBrandContext}
                      tooltip={t("nav.brandContext")}
                    >
                      <Link href="/seller/brand-context">
                        <Layers className="size-4 shrink-0" />
                      </Link>
                    </SidebarMenuButton>
                  </div>
                  {/* Collapsible trigger for expanded state */}
                  <CollapsibleTrigger asChild className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenuButton
                      isActive={isBrandContext}
                      tooltip={t("nav.brandContext")}
                    >
                      <span className="flex-1 truncate">{t("nav.brandContext")}</span>
                      <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {brandContextSubPages.map((sub) => (
                        <SidebarMenuSubItem key={sub.href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === sub.href}
                          >
                            <Link href={sub.href}>
                              <span>{sub.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Channel Control - Collapsible */}
              <Collapsible
                defaultOpen={isChannelControl}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  {/* Icon link for collapsed state - rendered outside collapsible trigger */}
                  <div className="hidden group-data-[collapsible=icon]:block">
                    <SidebarMenuButton
                      asChild
                      isActive={isChannelControl}
                      tooltip={t("nav.channelControl")}
                    >
                      <Link href="/seller/channels/conversational-storefront">
                        <Radio className="size-4 shrink-0" />
                      </Link>
                    </SidebarMenuButton>
                  </div>
                  {/* Collapsible trigger for expanded state */}
                  <CollapsibleTrigger asChild className="group-data-[collapsible=icon]:hidden">
                    <SidebarMenuButton
                      isActive={isChannelControl}
                      tooltip={t("nav.channelControl")}
                    >
                      <span className="flex-1 truncate">{t("nav.channelControl")}</span>
                      <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {channelControlItems.map((item) => {
                        const status = getChannelStatus(item.id)
                        const dotColor = 
                          status === "active" || status === "always-on" ? "bg-green-500" :
                          status === "inactive" ? "bg-yellow-500" :
                          status === "disconnected" ? "bg-red-500" : null
                        
                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === item.href}
                              className={status === "coming" ? "opacity-50" : ""}
                            >
                              <Link href={status === "coming" ? "#" : item.href}>
                                <span className="flex items-center gap-2 flex-1">
                                  {dotColor && (
                                    <span className={cn("size-1.5 rounded-full shrink-0", dotColor)} />
                                  )}
                                  <span className="truncate">{item.title}</span>
                                  {status === "coming" && (
                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                      {t("channel.coming")}
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

              {/* Analytics */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/seller/analytics"}
                  tooltip={t("nav.analytics")}
                >
                  <Link href="/seller/analytics">
                    <BarChart3 className="size-4 shrink-0 hidden group-data-[collapsible=icon]:block" />
                    <span className="group-data-[collapsible=icon]:hidden">{t("nav.analytics")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
        <Link 
          href="/seller/settings"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent cursor-pointer"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">
            N
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-sidebar-foreground truncate">
              {t("common.demo")}
            </span>
            <span className="text-xs text-sidebar-foreground/50 truncate">
              {t("common.freePlan")}
            </span>
          </div>
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}
