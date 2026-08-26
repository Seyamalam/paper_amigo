import {
  constantTimeEqual,
  symmetricDecodeJWT,
  symmetricEncodeJWT,
} from "better-auth/crypto"
import { z } from "zod"

const ownerSessionSchema = z.object({
  email: z.email(),
  version: z.literal(1),
})

const sessionSalt = "paper-amigo-owner-session"

export const ownerSessionMaxAge = 7 * 24 * 60 * 60

export type OwnerCredentials = Readonly<{
  email: string
  password: string
}>

export function ownerCredentialsMatch(
  submitted: OwnerCredentials,
  configured: OwnerCredentials
): boolean {
  const emailMatches = constantTimeEqual(
    submitted.email.trim().toLowerCase(),
    configured.email
  )
  const passwordMatches = constantTimeEqual(
    submitted.password,
    configured.password
  )

  return emailMatches && passwordMatches
}

export function createOwnerSessionToken(
  email: string,
  secret: string
): Promise<string> {
  return symmetricEncodeJWT(
    { email: email.trim().toLowerCase(), version: 1 },
    secret,
    sessionSalt,
    ownerSessionMaxAge
  )
}

export async function readOwnerSessionEmail(
  token: string | undefined,
  secret: string
): Promise<string | undefined> {
  if (!token) {
    return undefined
  }

  const payload = await symmetricDecodeJWT<unknown>(token, secret, sessionSalt)
  const result = ownerSessionSchema.safeParse(payload)

  return result.success ? result.data.email : undefined
}
