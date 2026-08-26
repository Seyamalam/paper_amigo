import "server-only"

export {
  createOwnerSessionToken,
  ownerCredentialsMatch,
  ownerSessionMaxAge,
  readOwnerSessionEmail,
  type OwnerCredentials,
} from "@/lib/owner-session-core"

export const ownerSessionCookieName = "paper_amigo_session"

export function shouldUseSecureCookie(request: Request): boolean {
  return (
    new URL(request.url).protocol === "https:" || Boolean(process.env["VERCEL"])
  )
}
