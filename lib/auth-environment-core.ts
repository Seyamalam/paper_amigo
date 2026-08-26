import { z } from "zod"

export const authVariableNames = [
  "BETTER_AUTH_SECRET",
  "PAPER_AMIGO_OWNER_EMAIL",
  "PAPER_AMIGO_OWNER_PASSWORD",
] as const

export type AuthVariableName = (typeof authVariableNames)[number]

export type AuthEnvironment = Readonly<{
  betterAuthSecret?: string | undefined
  ownerEmail?: string | undefined
  ownerPassword?: string | undefined
  demoMode?: string | undefined
  vercel?: string | undefined
}>

export type AuthConfiguration = Readonly<{
  secret: string
  ownerEmail: string
  ownerPassword: string
}>

export type AuthEnvironmentState =
  | Readonly<{ kind: "configured"; configuration: AuthConfiguration }>
  | Readonly<{ kind: "demo" }>
  | Readonly<{ kind: "invalid"; variables: readonly AuthVariableName[] }>

function clean(value: string | undefined): string {
  return value?.trim() ?? ""
}

function configuredState(environment: AuthEnvironment): AuthEnvironmentState {
  const secret = clean(environment.betterAuthSecret)
  const ownerEmail = clean(environment.ownerEmail).toLowerCase()
  const ownerPassword = environment.ownerPassword ?? ""
  const variables: AuthVariableName[] = []

  if (secret.length < 32) {
    variables.push("BETTER_AUTH_SECRET")
  }

  if (!z.email().safeParse(ownerEmail).success) {
    variables.push("PAPER_AMIGO_OWNER_EMAIL")
  }

  if (ownerPassword.length < 12) {
    variables.push("PAPER_AMIGO_OWNER_PASSWORD")
  }

  if (variables.length > 0) {
    return { kind: "invalid", variables }
  }

  return {
    kind: "configured",
    configuration: { secret, ownerEmail, ownerPassword },
  }
}

function hasAnyAuthValue(environment: AuthEnvironment): boolean {
  return (
    clean(environment.betterAuthSecret).length > 0 ||
    clean(environment.ownerEmail).length > 0 ||
    (environment.ownerPassword ?? "").length > 0
  )
}

export function resolveAuthEnvironment(
  environment: AuthEnvironment
): AuthEnvironmentState {
  const localDemoRequested =
    clean(environment.demoMode) === "true" && !clean(environment.vercel)

  if (localDemoRequested) {
    return { kind: "demo" }
  }

  if (!hasAnyAuthValue(environment) && !clean(environment.vercel)) {
    return { kind: "demo" }
  }

  return configuredState(environment)
}

export function isOwnerEmail(email: string, ownerEmail: string): boolean {
  return email.trim().toLowerCase() === ownerEmail
}
