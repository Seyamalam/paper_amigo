import "server-only"

import type { NextRequest } from "next/server"

import { authenticateBasicOwner } from "@/lib/owner-api-auth"
import { getOwnerAccessFromToken, type OwnerAccess } from "@/lib/owner-access"
import { ownerSessionCookieName } from "@/lib/owner-session"

export async function getOwnerRequestAccess(
  request: NextRequest
): Promise<OwnerAccess> {
  const authorization = request.headers.get("authorization")

  if (authorization !== null) {
    const owner = authenticateBasicOwner(authorization)

    return owner
      ? { kind: "owner", email: owner.email }
      : { kind: "signed-out" }
  }

  const token = request.cookies.get(ownerSessionCookieName)?.value

  return getOwnerAccessFromToken(token)
}
