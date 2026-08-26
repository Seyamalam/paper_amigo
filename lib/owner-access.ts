import "server-only"

import { cookies } from "next/headers"

import {
  getAuthEnvironmentState,
  isOwnerEmail,
  type AuthVariableName,
} from "@/lib/auth-environment"
import {
  ownerSessionCookieName,
  readOwnerSessionEmail,
} from "@/lib/owner-session"

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

  const token = (await cookies()).get(ownerSessionCookieName)?.value
  const email = await readOwnerSessionEmail(token, state.configuration.secret)

  if (!email) {
    return { kind: "signed-out" }
  }

  if (!isOwnerEmail(email, state.configuration.ownerEmail)) {
    return { kind: "not-allowed" }
  }

  return { kind: "owner", email }
}
