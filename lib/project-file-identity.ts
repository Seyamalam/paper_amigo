import { randomUUID } from "node:crypto"

const sha256Pattern = /^[a-f\d]{64}$/u

export function createProjectFileCustomId(hash: string): string {
  if (!sha256Pattern.test(hash)) {
    throw new Error("Invalid PDF hash")
  }

  return `${hash}-${randomUUID()}`
}

export function projectFileHashFromCustomId(
  customId: string | null
): string | undefined {
  if (!customId) {
    return undefined
  }

  const hash = customId.slice(0, 64)
  const hasValidSuffix =
    customId.length === 64 ||
    (customId.length > 65 && customId.charAt(64) === "-")

  return sha256Pattern.test(hash) && hasValidSuffix ? hash : undefined
}
