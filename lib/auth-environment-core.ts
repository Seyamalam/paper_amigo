export const authVariableNames = [
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "PAPER_AMIGO_OWNER_EMAILS",
] as const

export type AuthVariableName = (typeof authVariableNames)[number]

export type AuthEnvironment = Readonly<{
  betterAuthSecret?: string | undefined
  betterAuthUrl?: string | undefined
  googleClientId?: string | undefined
  googleClientSecret?: string | undefined
  ownerEmails?: string | undefined
  demoMode?: string | undefined
  vercel?: string | undefined
}>

export type AuthConfiguration = Readonly<{
  secret: string
  baseUrl: string
  googleClientId: string
  googleClientSecret: string
  ownerEmails: readonly string[]
}>

export type AuthEnvironmentState =
  | Readonly<{ kind: "configured"; configuration: AuthConfiguration }>
  | Readonly<{ kind: "demo" }>
  | Readonly<{ kind: "invalid"; variables: readonly AuthVariableName[] }>

function clean(value: string | undefined): string {
  return value?.trim() ?? ""
}

function parseOwnerEmails(value: string): readonly string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0)
    ),
  ]
}

function isHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) {
    return false
  }

  const protocol = new URL(value).protocol
  return protocol === "http:" || protocol === "https:"
}

function configuredState(environment: AuthEnvironment): AuthEnvironmentState {
  const secret = clean(environment.betterAuthSecret)
  const baseUrl = clean(environment.betterAuthUrl).replace(/\/$/, "")
  const googleClientId = clean(environment.googleClientId)
  const googleClientSecret = clean(environment.googleClientSecret)
  const ownerEmails = parseOwnerEmails(clean(environment.ownerEmails))

  const variables: AuthVariableName[] = []

  if (secret.length < 32) {
    variables.push("BETTER_AUTH_SECRET")
  }

  if (!isHttpUrl(baseUrl)) {
    variables.push("BETTER_AUTH_URL")
  }

  if (!googleClientId) {
    variables.push("GOOGLE_CLIENT_ID")
  }

  if (!googleClientSecret) {
    variables.push("GOOGLE_CLIENT_SECRET")
  }

  if (ownerEmails.length === 0) {
    variables.push("PAPER_AMIGO_OWNER_EMAILS")
  }

  if (variables.length > 0) {
    return { kind: "invalid", variables }
  }

  return {
    kind: "configured",
    configuration: {
      secret,
      baseUrl,
      googleClientId,
      googleClientSecret,
      ownerEmails,
    },
  }
}

function hasAnyAuthValue(environment: AuthEnvironment): boolean {
  return (
    clean(environment.betterAuthSecret).length > 0 ||
    clean(environment.betterAuthUrl).length > 0 ||
    clean(environment.googleClientId).length > 0 ||
    clean(environment.googleClientSecret).length > 0 ||
    clean(environment.ownerEmails).length > 0
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

export function isOwnerEmail(
  email: string,
  ownerEmails: readonly string[]
): boolean {
  return ownerEmails.includes(email.trim().toLowerCase())
}
