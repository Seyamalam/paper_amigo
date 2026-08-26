import { NextResponse, type NextRequest } from "next/server"

import { getAuth } from "@/lib/auth"
import { getAuthEnvironmentState, isOwnerEmail } from "@/lib/auth-environment"

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

  const session = await getAuth().api.getSession({ headers: request.headers })

  if (!session) {
    return signInRedirect(request)
  }

  if (!isOwnerEmail(session.user.email, state.configuration.ownerEmails)) {
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
