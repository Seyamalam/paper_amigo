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
    ownerEmail: process.env["PAPER_AMIGO_OWNER_EMAIL"],
    ownerPassword: process.env["PAPER_AMIGO_OWNER_PASSWORD"],
    demoMode: process.env["PAPER_AMIGO_DEMO_MODE"],
    vercel: process.env["VERCEL"],
  })
}
