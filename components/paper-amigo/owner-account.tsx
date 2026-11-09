"use client"

import { useRef } from "react"
import {
  ChevronsUpDown,
  CircleUserRound,
  LogOut,
  Monitor,
  Moon,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { OwnerAccess } from "@/lib/owner-access"

type OwnerAccountProps = Readonly<{
  access: Extract<OwnerAccess, { kind: "demo" } | { kind: "owner" }>
  compact?: boolean
}>

const themeItems = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export function OwnerAccount({ access, compact = false }: OwnerAccountProps) {
  const { resolvedTheme, theme, setTheme } = useTheme()
  const signOutFormRef = useRef<HTMLFormElement>(null)
  const label = access.kind === "owner" ? access.email : "Demo"

  const menu = (
    <DropdownMenuContent
      align={compact ? "end" : "start"}
      side={compact ? "bottom" : "top"}
      className="w-56"
    >
      <DropdownMenuLabel className="truncate font-mono text-[10px] font-normal">
        {access.kind === "owner" ? label : "Demo mode"}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup
        value={theme ?? "system"}
        onValueChange={setTheme}
      >
        {themeItems.map((item) => (
          <DropdownMenuRadioItem key={item.value} value={item.value}>
            <item.icon aria-hidden="true" />
            {item.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark")
        }}
      >
        <Moon aria-hidden="true" />
        Toggle theme
        <DropdownMenuShortcut>D</DropdownMenuShortcut>
      </DropdownMenuItem>
      {access.kind === "owner" ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              signOutFormRef.current?.requestSubmit()
            }}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </>
      ) : null}
    </DropdownMenuContent>
  )

  return (
    <>
      {access.kind === "owner" ? (
        <form
          ref={signOutFormRef}
          action="/auth/sign-out"
          method="post"
          className="hidden"
        />
      ) : null}
      {compact ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Account ${label}`}>
              <CircleUserRound aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          {menu}
        </DropdownMenu>
      ) : (
        <div className="border-t px-3 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto w-full justify-between gap-2 px-2 py-2 font-normal"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CircleUserRound
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {label}
                  </span>
                </span>
                <ChevronsUpDown
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              </Button>
            </DropdownMenuTrigger>
            {menu}
          </DropdownMenu>
        </div>
      )}
    </>
  )
}
