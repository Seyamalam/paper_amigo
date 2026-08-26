import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

import { z } from "zod"

import { sharingRecordSchema, type SharingRecord } from "@/lib/sharing"

type EncryptedEnvelope = Readonly<{
  version: 1
  iv: string
  tag: string
  ciphertext: string
}>

const sharingEnvelopeSchema = z.object({
  version: z.literal(1),
  iv: z.string().min(1),
  tag: z.string().min(1),
  ciphertext: z.string().min(1),
})

function encryptionKey(secret: string): Buffer {
  if (secret.trim() === "") {
    throw new Error("Sharing encryption secret is required")
  }

  return createHash("sha256")
    .update("paper-amigo-sharing-v1\0")
    .update(secret)
    .digest()
}

export function encryptSharingRecord(
  record: SharingRecord,
  secret: string
): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(record), "utf8"),
    cipher.final(),
  ])
  const envelope: EncryptedEnvelope = {
    version: 1,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  }

  return JSON.stringify(envelope)
}

export function decryptSharingRecord(
  value: string,
  secret: string
): SharingRecord | undefined {
  try {
    const rawEnvelope: unknown = JSON.parse(value)
    const parsedEnvelope = sharingEnvelopeSchema.safeParse(rawEnvelope)

    if (!parsedEnvelope.success) {
      return undefined
    }

    const envelope = parsedEnvelope.data
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(secret),
      Buffer.from(envelope.iv, "base64url")
    )
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8")
    const rawRecord: unknown = JSON.parse(plaintext)
    const record = sharingRecordSchema.safeParse(rawRecord)

    return record.success ? record.data : undefined
  } catch {
    return undefined
  }
}
