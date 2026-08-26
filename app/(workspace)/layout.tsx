import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Plus } from "lucide-react"

import {
  DesktopNav,
  MobileNav,
  SettingsNavItem,
} from "@/components/paper-amigo/app-nav"
import { Brand } from "@/components/paper-amigo/brand"
import { OwnerAccount } from "@/components/paper-amigo/owner-account"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getOwnerAccess, type OwnerAccess } from "@/lib/owner-access"

export const dynamic = "force-dynamic"

type GrantedAccess = Extract<OwnerAccess, { kind: "demo" } | { kind: "owner" }>

function WorkspaceShell({
  access,
  children,
}: Readonly<{ access: GrantedAccess; children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-sidebar md:flex md:flex-col">
        <div className="flex h-20 items-center px-6">
          <Brand />
        </div>
        <Separator />
        <div className="flex flex-1 flex-col overflow-y-auto p-3">
          <p className="mb-2 px-3 pt-2 font-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
            Workspace
          </p>
          <DesktopNav />
          <div className="mt-auto pt-8">
            <SettingsNavItem />
            <OwnerAccount access={access} />
          </div>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            <OwnerAccount access={access} compact />
            <Button asChild size="icon" aria-label="Upload papers">
              <Link href="/upload">
                <Plus aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 pt-7 pb-24 sm:px-6 sm:pt-10 md:px-9 md:pb-12 lg:px-12">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

async function ProtectedWorkspace({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const access = await getOwnerAccess()

  if (access.kind === "signed-out") {
    redirect("/sign-in")
  }

  if (access.kind === "not-allowed") {
    redirect("/sign-in?error=email_not_allowed")
  }

  if (access.kind === "configuration-error") {
    redirect("/sign-in?error=configuration")
  }

  return <WorkspaceShell access={access}>{children}</WorkspaceShell>
}

export default function WorkspaceLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-svh bg-background" />}>
      <ProtectedWorkspace>{children}</ProtectedWorkspace>
    </Suspense>
  )
}
