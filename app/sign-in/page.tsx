import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { Brand } from "@/components/paper-amigo/brand"
import { Button } from "@/components/ui/button"
import { getAuthEnvironmentState } from "@/lib/auth-environment"
import { getOwnerAccess } from "@/lib/owner-access"

export const metadata: Metadata = {
  title: "Sign in",
}

type SearchParameters = Awaited<PageProps<"/sign-in">["searchParams"]>

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function authErrorMessage(error: string | undefined): string | undefined {
  if (error === "email_not_allowed") {
    return "This Google account is not allowed."
  }

  if (error === "email_not_verified") {
    return "Google email verification is required."
  }

  if (error && error !== "configuration") {
    return "Sign-in failed."
  }

  return undefined
}

function SignInShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-sm border bg-card p-6 sm:p-8">
        <Brand linked={false} />
        <div className="mt-8">{children}</div>
      </section>
    </main>
  )
}

async function SignInContent({
  searchParameters,
}: Readonly<{ searchParameters: Promise<SearchParameters> }>) {
  const [parameters, access] = await Promise.all([
    searchParameters,
    getOwnerAccess(),
  ])
  const environment = getAuthEnvironmentState()
  const error = firstValue(parameters["error"])
  const message = authErrorMessage(error)

  if (access.kind === "owner") {
    redirect("/")
  }

  if (environment.kind === "demo") {
    return (
      <SignInShell>
        <h1 className="text-xl font-semibold tracking-tight">Demo mode</h1>
        <Button asChild className="mt-6 w-full">
          <Link href="/">Open library</Link>
        </Button>
      </SignInShell>
    )
  }

  if (environment.kind === "invalid") {
    return (
      <SignInShell>
        <h1 className="text-xl font-semibold tracking-tight">
          Server configuration required
        </h1>
        <ul className="mt-5 space-y-2 border-t pt-5">
          {environment.variables.map((variable) => (
            <li
              key={variable}
              className="font-mono text-[10px] text-muted-foreground"
            >
              {variable}
            </li>
          ))}
        </ul>
      </SignInShell>
    )
  }

  return (
    <SignInShell>
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      {message ? (
        <p role="alert" className="mt-4 border p-3 text-xs">
          {message}
        </p>
      ) : null}
      {access.kind === "not-allowed" ? (
        <form action="/auth/sign-out" method="post">
          <Button type="submit" variant="outline" className="mt-6 w-full">
            Clear session
          </Button>
        </form>
      ) : (
        <Button asChild className="mt-6 w-full">
          <Link href="/auth/google">Continue with Google</Link>
        </Button>
      )}
    </SignInShell>
  )
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Suspense
      fallback={
        <SignInShell>
          <div className="h-20 animate-pulse bg-muted" />
        </SignInShell>
      }
    >
      <SignInContent searchParameters={searchParams} />
    </Suspense>
  )
}
