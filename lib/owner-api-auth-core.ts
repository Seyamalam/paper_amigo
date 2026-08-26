import type { OwnerCredentials } from "@/lib/owner-session-core"

function decodeBasicValue(value: string): string | undefined {
  if (!/^[A-Za-z\d+/]+={0,2}$/u.test(value) || value.length % 4 !== 0) {
    return undefined
  }

  try {
    const bytes = Buffer.from(value, "base64")
    const canonical = bytes.toString("base64")

    if (canonical !== value) {
      return undefined
    }

    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return undefined
  }
}

export function parseBasicAuthorization(
  authorization: string | null
): OwnerCredentials | undefined {
  if (!authorization) {
    return undefined
  }

  const match = /^Basic ([^\s]+)$/iu.exec(authorization)
  const decoded = match?.[1] ? decodeBasicValue(match[1]) : undefined

  if (!decoded || /[\0\r\n]/u.test(decoded)) {
    return undefined
  }

  const separator = decoded.indexOf(":")

  if (separator <= 0) {
    return undefined
  }

  return {
    email: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  }
}
