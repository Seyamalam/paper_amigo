import "server-only"

import { headers } from "next/headers"

import { getAuth } from "@/lib/auth"
import {
  getAuthEnvironmentState,
  isOwnerEmail,
  type AuthVariableName,
} from "@/lib/auth-environment"

export type OwnerAccess =
  | Readonly<{ kind: "owner"; email: string }>
  | Readonly<{ kind: "demo" }>
  | Readonly<{ kind: "signed-out" }>
  | Readonly<{ kind: "not-allowed" }>
  | Readonly<{
      kind: "configuration-error"
      variables: readonly AuthVariableName[]
    }>

export async function getOwnerAccess(): Promise<OwnerAccess> {
  const state = getAuthEnvironmentState()

  if (state.kind === "demo") {
    return { kind: "demo" }
  }

  if (state.kind === "invalid") {
    return { kind: "configuration-error", variables: state.variables }
  }

  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) {
    return { kind: "signed-out" }
  }

  if (!isOwnerEmail(session.user.email, state.configuration.ownerEmails)) {
    return { kind: "not-allowed" }
  }

  return { kind: "owner", email: session.user.email }
}
