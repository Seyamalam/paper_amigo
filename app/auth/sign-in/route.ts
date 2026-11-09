import { NextResponse } from "next/server"
import { z } from "zod"

import { getAuthEnvironmentState } from "@/lib/auth-environment"
import {
  createOwnerSessionToken,
  ownerCredentialsMatch,
  ownerSessionCookieName,
  ownerSessionMaxAge,
  shouldUseSecureCookie,
} from "@/lib/owner-session"

const signInSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
})

function signInRedirect(request: Request, error: string): NextResponse {
  const url = new URL("/sign-in", request.url)
  url.searchParams.set("error", error)

  return NextResponse.redirect(url, 303)
}

export async function POST(request: Request): Promise<Response> {
  const state = getAuthEnvironmentState()

  if (state.kind !== "configured") {
    return signInRedirect(request, "configuration")
  }

  const submitted = signInSchema.safeParse(
    Object.fromEntries(await request.formData())
  )

  if (
    !submitted.success ||
    !ownerCredentialsMatch(submitted.data, {
      email: state.configuration.ownerEmail,
      password: state.configuration.ownerPassword,
    })
  ) {
    return signInRedirect(request, "invalid_credentials")
  }

  const token = await createOwnerSessionToken(
    state.configuration.ownerEmail,
    state.configuration.secret
  )
  const response = NextResponse.redirect(new URL("/library", request.url), 303)
  response.headers.set("cache-control", "no-store")
  response.cookies.set({
    name: ownerSessionCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: ownerSessionMaxAge,
  })

  return response
}
