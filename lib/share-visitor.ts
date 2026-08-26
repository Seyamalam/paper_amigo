import "server-only"

import { randomUUID } from "node:crypto"

import { type NextRequest, type NextResponse } from "next/server"
import { z } from "zod"

export const shareVisitorCookieName = "paper_amigo_visitor"

export function readShareVisitor(request: NextRequest): Readonly<{
  id: string
  isNew: boolean
}> {
  const stored = z
    .uuid()
    .safeParse(request.cookies.get(shareVisitorCookieName)?.value)

  return stored.success
    ? { id: stored.data, isNew: false }
    : { id: randomUUID(), isNew: true }
}

export function setShareVisitorCookie(
  response: NextResponse,
  visitorId: string
): void {
  response.cookies.set(shareVisitorCookieName, visitorId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}
