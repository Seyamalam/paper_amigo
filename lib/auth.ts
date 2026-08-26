import "server-only"

import { betterAuth } from "better-auth"

import {
  getAuthEnvironmentState,
  isOwnerEmail,
  type AuthConfiguration,
} from "@/lib/auth-environment"

function createAuth(configuration: AuthConfiguration) {
  return betterAuth({
    appName: "Paper Amigo",
    baseURL: configuration.baseUrl,
    secret: configuration.secret,
    socialProviders: {
      google: {
        clientId: configuration.googleClientId,
        clientSecret: configuration.googleClientSecret,
        requireEmailVerification: true,
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 7 * 24 * 60 * 60,
        strategy: "jwe",
        refreshCache: true,
      },
    },
    account: {
      storeStateStrategy: "cookie",
      storeAccountCookie: true,
    },
    user: {
      validateUserInfo: ({ user, source }) => {
        if (source.oauth?.providerId !== "google") {
          return {
            error: "provider_not_allowed",
            errorDescription: "Google sign-in is required.",
          }
        }

        if (
          !user.email ||
          !isOwnerEmail(user.email, configuration.ownerEmails)
        ) {
          return {
            error: "email_not_allowed",
            errorDescription: "This Google account is not allowed.",
          }
        }

        return undefined
      },
    },
  })
}

type AuthInstance = ReturnType<typeof createAuth>

let authInstance: AuthInstance | undefined

export function getAuth(): AuthInstance {
  if (authInstance) {
    return authInstance
  }

  const state = getAuthEnvironmentState()
  if (state.kind !== "configured") {
    throw new Error("Better Auth is not configured.")
  }

  authInstance = createAuth(state.configuration)
  return authInstance
}
