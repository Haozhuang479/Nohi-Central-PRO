// Seller-side outer chrome — wraps every route under /seller in the
// shadcn Sidebar shell from the v3.2.0 zip rebuild. LanguageProvider /
// ChannelStateProvider are intentionally NOT mounted here; they live up
// at App.tsx so chat and seller share the same context instances.
//
// Children come from <Outlet /> instead of a `children` prop because
// React Router v6 nested routes use Outlet, not Next-style layouts.

import React from "react"
import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { SellerSidebar } from "@/components/seller/seller-sidebar"

export function SellerLayout() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "200px" } as React.CSSProperties}>
      <SellerSidebar />
      <SidebarInset className="m-0 rounded-none shadow-none">
        <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:px-6">
          <SidebarTrigger className="-ml-2" />
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
