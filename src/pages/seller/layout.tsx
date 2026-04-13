import React from 'react'
import { Outlet } from 'react-router-dom'
import { SellerSidebar } from '@/components/seller/seller-sidebar'
import { Titlebar } from '@/components/shell/titlebar'
import { CommandPalette } from '@/components/shell/command-palette'
import { SidebarProvider } from '@/components/ui/sidebar'
import type { NohiSettings } from '../../../electron/main/engine/types'

interface SellerLayoutProps {
  settings: NohiSettings
  onSettingsSave: (s: NohiSettings) => void
}

export function SellerLayout({ settings, onSettingsSave }: SellerLayoutProps) {
  // Suppress unused-var lint on onSettingsSave — kept on props so
  // nested pages (like SettingsPage) that receive it directly via App.tsx
  // routing don't need to thread it through the layout.
  void onSettingsSave

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* ── Titlebar (macOS traffic lights + drag region) ── */}
      <Titlebar />

      {/* ── Body: sidebar + scrollable main content ── */}
      {/* SidebarProvider renders a flex-1 min-h-0 overflow-hidden row */}
      <SidebarProvider defaultOpen style={{ '--sidebar-width': '220px' } as React.CSSProperties}>
        <SellerSidebar />

        {/* Main scrollable outlet */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </SidebarProvider>

      {/* ── Cmd+K command palette (global) ── */}
      <CommandPalette />
    </div>
  )
}
