"use client"

import React from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { SellerSidebar } from "@/components/seller/seller-sidebar"
import { ChannelStateProvider } from "@/lib/channel-state"
import { LanguageProvider } from "@/lib/language-context"

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LanguageProvider>
      <ChannelStateProvider>
        <SidebarProvider>
          <SellerSidebar />
          <SidebarInset>
            <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:px-6">
              <SidebarTrigger className="-ml-2" />
            </header>
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ChannelStateProvider>
    </LanguageProvider>
  )
}
