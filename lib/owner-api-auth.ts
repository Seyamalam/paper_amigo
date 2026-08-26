import "server-only"

import { getAuthEnvironmentState } from "@/lib/auth-environment"
import { parseBasicAuthorization } from "@/lib/owner-api-auth-core"
import { ownerCredentialsMatch } from "@/lib/owner-session-core"

export type AuthenticatedOwner = Readonly<{ email: string }>

export function authenticateBasicOwner(
  authorization: string | null
): AuthenticatedOwner | undefined {
  const state = getAuthEnvironmentState()
  const submitted = parseBasicAuthorization(authorization)

  if (state.kind !== "configured" || !submitted) {
    return undefined
  }

  const configured = {
    email: state.configuration.ownerEmail,
    password: state.configuration.ownerPassword,
  }

  return ownerCredentialsMatch(submitted, configured)
    ? { email: state.configuration.ownerEmail }
    : undefined
}

export function basicAuthHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store",
    "WWW-Authenticate": 'Basic realm="Paper Amigo", charset="UTF-8"',
  }
}
