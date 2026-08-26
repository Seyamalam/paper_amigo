import { NextResponse } from "next/server"

import {
  ownerSessionCookieName,
  shouldUseSecureCookie,
} from "@/lib/owner-session"

export function POST(request: Request): Response {
  const response = NextResponse.redirect(new URL("/sign-in", request.url), 303)
  response.headers.set("cache-control", "no-store")
  response.cookies.set({
    name: ownerSessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: 0,
  })

  return response
}
