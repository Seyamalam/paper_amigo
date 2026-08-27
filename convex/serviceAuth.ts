import { env } from "./_generated/server"

export function assertServiceSecret(submitted: string): void {
  if (submitted.length === 0 || submitted !== env.PAPER_AMIGO_SERVICE_SECRET) {
    throw new Error("Unauthorized service request")
  }
}
