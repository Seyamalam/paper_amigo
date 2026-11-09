import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { Brand } from "@/components/paper-amigo/brand"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
  if (error === "invalid_credentials") {
    return "Invalid email or password."
  }

  if (error && error !== "configuration") {
    return "Sign-in failed."
  }

  return undefined
}

function SignInShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-svh bg-background md:grid-cols-2">
      <section className="flex flex-col justify-between bg-foreground p-8 text-background sm:p-12 lg:p-16">
        <Brand linked={false} className="text-background" />
        <div className="mt-16 md:mt-0">
          <p className="font-mono text-[10px] tracking-[0.18em] text-background/60 uppercase">
            1 owner · no recipient accounts
          </p>
          <h1 className="mt-6 max-w-md text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
            A research-paper library for careful readers.
          </h1>
          <ul className="mt-10 space-y-3 border-t border-background/15 pt-8">
            {[
              "Projects group PDFs behind one link",
              "Share links open files, nothing else",
              "Critiques land beside the file they mean",
            ].map((line) => (
              <li
                key={line}
                className="flex items-center gap-3 text-sm text-background/75"
              >
                <span className="size-1.5 bg-background" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="grid place-items-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            Paper Amigo
          </p>
          <div className="mt-8">{children}</div>
        </div>
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
          <Link href="/library">Open library</Link>
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
        <form action="/auth/sign-in" method="post" className="mt-6 space-y-4">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
          </Field>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
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
