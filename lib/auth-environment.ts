import "server-only"

import { resolveAuthEnvironment } from "@/lib/auth-environment-core"

export {
  authVariableNames,
  isOwnerEmail,
  resolveAuthEnvironment,
  type AuthConfiguration,
  type AuthEnvironment,
  type AuthEnvironmentState,
  type AuthVariableName,
} from "@/lib/auth-environment-core"

export function getAuthEnvironmentState() {
  return resolveAuthEnvironment({
    betterAuthSecret: process.env["BETTER_AUTH_SECRET"],
    betterAuthUrl: process.env["BETTER_AUTH_URL"],
    googleClientId: process.env["GOOGLE_CLIENT_ID"],
    googleClientSecret: process.env["GOOGLE_CLIENT_SECRET"],
    ownerEmails: process.env["PAPER_AMIGO_OWNER_EMAILS"],
    demoMode: process.env["PAPER_AMIGO_DEMO_MODE"],
    vercel: process.env["VERCEL"],
  })
}
