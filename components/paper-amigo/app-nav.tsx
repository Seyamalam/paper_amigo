"use client"

import Link, { useLinkStatus } from "next/link"
import type { Route } from "next"
import { usePathname } from "next/navigation"
import {
  Archive,
  FilePlus2,
  MessageSquareText,
  Settings2,
  Share2,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type NavItem = Readonly<{
  href: Route
  label: string
  icon: LucideIcon
}>

const primaryItems: readonly NavItem[] = [
  { href: "/library", label: "Library", icon: Archive },
  { href: "/sharing", label: "Share links", icon: Share2 },
  { href: "/critiques", label: "Critiques", icon: MessageSquareText },
  { href: "/upload", label: "Create", icon: FilePlus2 },
]

const settingsItem: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings2,
}

function isCurrentPath(pathname: string, href: Route): boolean {
  if (href === "/") {
    return (
      pathname === "/library" ||
      pathname.startsWith("/projects/") ||
      pathname.startsWith("/papers/")
    )
  }

  return pathname.startsWith(href)
}

function LinkContent({ icon: Icon, label }: Pick<NavItem, "icon" | "label">) {
  const { pending } = useLinkStatus()

  return (
    <>
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "ml-auto size-1.5 bg-foreground opacity-0 transition-opacity",
          pending && "opacity-100"
        )}
      />
    </>
  )
}

export function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Workspace" className="space-y-1">
      {primaryItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isCurrentPath(pathname, item.href) ? "page" : undefined}
          className="group flex h-10 items-center gap-3 border-l-2 border-transparent px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-foreground"
        >
          <LinkContent icon={item.icon} label={item.label} />
        </Link>
      ))}
    </nav>
  )
}

export function SettingsNavItem() {
  const pathname = usePathname()

  return (
    <Link
      href={settingsItem.href}
      aria-current={
        isCurrentPath(pathname, settingsItem.href) ? "page" : undefined
      }
      className="flex h-10 items-center gap-3 border-l-2 border-transparent px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-foreground"
    >
      <LinkContent icon={settingsItem.icon} label={settingsItem.label} />
    </Link>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t bg-background px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {primaryItems.map((item) => {
        const Icon = item.icon
        const current = isCurrentPath(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className="relative flex min-h-15 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium text-muted-foreground transition-colors aria-[current=page]:text-foreground"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-0 h-0.5 w-6 bg-transparent",
                current && "bg-foreground"
              )}
            />
            <Icon
              aria-hidden="true"
              className="size-[18px]"
              strokeWidth={1.8}
            />
            <span>{item.label === "Share links" ? "Sharing" : item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
