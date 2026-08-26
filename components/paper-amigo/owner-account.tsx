import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { OwnerAccess } from "@/lib/owner-access"

type OwnerAccountProps = Readonly<{
  access: Extract<OwnerAccess, { kind: "demo" } | { kind: "owner" }>
  compact?: boolean
}>

export function OwnerAccount({ access, compact = false }: OwnerAccountProps) {
  const label = access.kind === "owner" ? access.email : "Demo"

  if (compact) {
    if (access.kind === "demo") {
      return (
        <span className="border px-2 py-1 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
          Demo
        </span>
      )
    }

    return (
      <form action="/auth/sign-out" method="post">
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label={`Sign out ${label}`}
        >
          <LogOut aria-hidden="true" />
        </Button>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-2 border-t px-3 pt-3">
      <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-muted-foreground">
        {label}
      </span>
      {access.kind === "owner" ? (
        <form action="/auth/sign-out" method="post">
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label={`Sign out ${label}`}
          >
            <LogOut aria-hidden="true" />
          </Button>
        </form>
      ) : null}
    </div>
  )
}
