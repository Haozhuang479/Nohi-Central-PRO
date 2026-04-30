
import React from "react"
import { Link, useLocation } from "react-router-dom"
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
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Home, Orbit, Fingerprint, Wifi, Compass, CreditCard, TrendingUp, SlidersHorizontal, CircleUserRound, Store } from "lucide-react"

export function SellerSidebar() {
  const pathname = useLocation().pathname
  const { t, language } = useLanguage()
  const isBrandContext = pathname.startsWith("/seller/brand-context")
  const isAgenticCatalog = pathname.startsWith("/seller/catalog")
  const isChannelControl = pathname.startsWith("/seller/channels")
  const isOnboarding = pathname.startsWith("/seller/onboarding")
  const isAnalytics = pathname.startsWith("/seller/analytics")
  const isConversationalStorefront = pathname.startsWith("/seller/channels/conversational-storefront")

  const navItems = [
    {
      label: t("nav.home"),
      href: "/seller",
      icon: Home,
      isActive: pathname === "/seller",
    },
    {
      label: language === "zh" ? "快速开始" : "Getting Started",
      href: "/seller/onboarding",
      icon: Compass,
      isActive: isOnboarding,
    },
    {
      label: t("nav.agenticCatalog"),
      href: "/seller/catalog/product-catalog",
      icon: Orbit,
      isActive: isAgenticCatalog,
    },
    {
      label: t("nav.brandContext"),
      href: "/seller/brand-context",
      icon: Fingerprint,
      isActive: isBrandContext,
    },
    {
      label: language === "zh" ? "站内" : "On-site",
      href: "/seller/channels/conversational-storefront",
      icon: Store,
      isActive: isConversationalStorefront,
    },
    {
      label: language === "zh" ? "数据分析" : "Analytics",
      href: "/seller/analytics",
      icon: TrendingUp,
      isActive: isAnalytics,
    },
  ]

  return (
    <Sidebar variant="inset" collapsible="icon" style={{ "--sidebar-width": "200px" } as React.CSSProperties}>
      <SidebarHeader className="p-4">
        <Link to="/seller" className="flex items-center gap-2">
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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive}
                    tooltip={item.label}
                    className="justify-start"
                  >
                    <Link to={item.href}>
                      <item.icon className="size-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-2 flex flex-col gap-1">
        {/* Billing */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/seller/billing")}
              tooltip={language === "zh" ? "账单与付款" : "Billing"}
              className="justify-start"
            >
              <Link to="/seller/billing">
                <CreditCard className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {language === "zh" ? "账单与付款" : "Billing"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/seller/settings") || pathname.startsWith("/seller/channels")}
              tooltip={language === "zh" ? "设置" : "Settings"}
              className="justify-start"
            >
              <Link to="/seller/settings">
                <SlidersHorizontal className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {language === "zh" ? "设置" : "Settings"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/seller/account")}
              tooltip={language === "zh" ? "账号" : "Account"}
              className="justify-start"
            >
              <Link to="/seller/account">
                <CircleUserRound className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {language === "zh" ? "账号" : "Account"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
