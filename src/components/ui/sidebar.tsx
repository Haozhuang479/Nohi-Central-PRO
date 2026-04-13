import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type SidebarContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  collapsible: 'icon' | 'none' | 'offcanvas'
}

const SidebarContext = React.createContext<SidebarContextValue>({
  open: true,
  setOpen: () => {},
  collapsible: 'icon',
})

export function useSidebar() {
  return React.useContext(SidebarContext)
}

// ---------------------------------------------------------------------------
// SidebarProvider
// ---------------------------------------------------------------------------

interface SidebarProviderProps {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  children,
  className,
  style,
}: SidebarProviderProps) {
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp !== undefined ? openProp : _open
  const setOpen: React.Dispatch<React.SetStateAction<boolean>> =
    React.useCallback(
      (value) => {
        const newValue =
          typeof value === 'function' ? value(open) : value
        if (onOpenChange) {
          onOpenChange(newValue)
        } else {
          _setOpen(newValue)
        }
      },
      [open, onOpenChange]
    )

  return (
    <SidebarContext.Provider value={{ open, setOpen, collapsible: 'none' }}>
      <TooltipProvider delayDuration={0}>
        <div
          style={
            {
              '--sidebar-width': '18rem',
              '--sidebar-width-icon': '3rem',
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            'group/sidebar-wrapper flex flex-1 min-h-0 overflow-hidden w-full',
            className
          )}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'floating' | 'inset'
  collapsible?: 'icon' | 'none' | 'offcanvas'
}

export function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'icon',
  className,
  children,
  ...props
}: SidebarProps) {
  const { open } = useSidebar()

  return (
    <div
      data-state={open ? 'expanded' : 'collapsed'}
      data-collapsible={collapsible}
      data-variant={variant}
      data-side={side}
      className={cn(
        'group peer relative flex h-full flex-col bg-sidebar text-sidebar-foreground sidebar-glass',
        'transition-[width] duration-200 ease-linear',
        open
          ? 'w-[var(--sidebar-width,18rem)]'
          : collapsible === 'icon'
            ? 'w-[var(--sidebar-width-icon,3rem)]'
            : collapsible === 'offcanvas'
              ? 'w-0 overflow-hidden'
              : 'w-[var(--sidebar-width,18rem)]',
        variant === 'inset' && 'rounded-xl border border-sidebar-border m-2 h-[calc(100%-1rem)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SidebarHeader / Footer / Separator
// ---------------------------------------------------------------------------

export function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  )
}

export function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-2 p-2 mt-auto', className)}
      {...props}
    />
  )
}

export function SidebarSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      className={cn('mx-2 border-sidebar-border', className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarContent
// ---------------------------------------------------------------------------

export function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden p-2', className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarGroup / Label / Content
// ---------------------------------------------------------------------------

export function SidebarGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1', className)}
      {...props}
    />
  )
}

export function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar()
  return (
    <div
      className={cn(
        'px-2 py-1 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider transition-opacity duration-200',
        !open && 'opacity-0 pointer-events-none h-0 overflow-hidden py-0',
        className
      )}
      {...props}
    />
  )
}

export function SidebarGroupContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-0.5', className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarMenu / MenuItem
// ---------------------------------------------------------------------------

export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn('flex flex-col gap-0.5 list-none p-0 m-0', className)}
      {...props}
    />
  )
}

export function SidebarMenuItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn('relative', className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarMenuButton
// ---------------------------------------------------------------------------

interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ReactNode
}

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ asChild = false, isActive = false, tooltip, className, children, ...props }, ref) => {
  const { open } = useSidebar()
  const Comp = asChild ? Slot : 'button'

  const button = (
    <Comp
      ref={ref}
      data-active={isActive || undefined}
      className={cn(
        'flex w-full items-center justify-start gap-2 rounded-lg px-2 py-2 text-sm font-medium text-left text-sidebar-foreground outline-none transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-foreground',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'active:bg-sidebar-accent/80',
        isActive && 'bg-sidebar-accent text-sidebar-foreground font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )

  if (!tooltip || open) {
    return button
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-4">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
})
SidebarMenuButton.displayName = 'SidebarMenuButton'

// ---------------------------------------------------------------------------
// SidebarMenuSub / SubItem / SubButton
// ---------------------------------------------------------------------------

export function SidebarMenuSub({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  const { open } = useSidebar()
  return (
    <ul
      className={cn(
        'ml-4 flex flex-col gap-0.5 border-l border-sidebar-border pl-2 list-none p-0 m-0',
        !open && 'hidden',
        className
      )}
      {...props}
    />
  )
}

export function SidebarMenuSubItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn('relative', className)}
      {...props}
    />
  )
}

interface SidebarMenuSubButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
  isActive?: boolean
}

export const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  SidebarMenuSubButtonProps
>(({ asChild = false, isActive = false, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a'
  return (
    <Comp
      ref={ref}
      data-active={isActive || undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 outline-none transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-foreground',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        isActive && 'text-sidebar-foreground font-medium',
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton'

// ---------------------------------------------------------------------------
// SidebarRail (optional toggle hit-area)
// ---------------------------------------------------------------------------

export function SidebarRail({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useSidebar()
  return (
    <button
      aria-label="Toggle sidebar"
      tabIndex={-1}
      onClick={() => setOpen((v) => !v)}
      className={cn(
        'absolute inset-y-0 right-0 z-20 hidden w-4 translate-x-1/2 cursor-col-resize items-center justify-center hover:after:bg-sidebar-border sm:flex',
        'after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:rounded-full after:transition-colors',
        className
      )}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarInset — the main content area companion
// ---------------------------------------------------------------------------

export function SidebarInset({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <main
      className={cn('flex flex-1 flex-col overflow-hidden', className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// SidebarTrigger — hamburger-style toggle button
// ---------------------------------------------------------------------------

interface SidebarTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function SidebarTrigger({ className, onClick, ...props }: SidebarTriggerProps) {
  const { setOpen } = useSidebar()
  return (
    <button
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
        className
      )}
      onClick={(e) => {
        setOpen((v) => !v)
        onClick?.(e)
      }}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
      <span className="sr-only">Toggle sidebar</span>
    </button>
  )
}
