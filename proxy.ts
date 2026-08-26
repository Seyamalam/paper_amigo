import { NextResponse, type NextRequest } from "next/server"

import { getAuthEnvironmentState, isOwnerEmail } from "@/lib/auth-environment"
import {
  ownerSessionCookieName,
  readOwnerSessionEmail,
} from "@/lib/owner-session"

function signInRedirect(request: NextRequest, error?: string): NextResponse {
  const url = new URL("/sign-in", request.url)

  if (error) {
    url.searchParams.set("error", error)
  }

  return NextResponse.redirect(url)
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const state = getAuthEnvironmentState()

  if (state.kind === "demo") {
    return NextResponse.next()
  }

  if (state.kind === "invalid") {
    return signInRedirect(request, "configuration")
  }

  const token = request.cookies.get(ownerSessionCookieName)?.value
  const email = await readOwnerSessionEmail(token, state.configuration.secret)

  if (!email) {
    return signInRedirect(request)
  }

  if (!isOwnerEmail(email, state.configuration.ownerEmail)) {
    return signInRedirect(request, "email_not_allowed")
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/papers/:path*",
    "/sharing/:path*",
    "/critiques/:path*",
    "/upload/:path*",
    "/settings/:path*",
  ],
}
