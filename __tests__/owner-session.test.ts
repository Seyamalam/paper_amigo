import { describe, expect, it } from "vitest"

import {
  createOwnerSessionToken,
  ownerCredentialsMatch,
  readOwnerSessionEmail,
} from "@/lib/owner-session-core"

const secret = "0123456789abcdef0123456789abcdef"

describe("ownerCredentialsMatch", () => {
  it("accepts the configured email and password", () => {
    expect(
      ownerCredentialsMatch(
        { email: " OWNER@example.com ", password: "correct-password" },
        { email: "owner@example.com", password: "correct-password" }
      )
    ).toBe(true)
  })

  it("rejects an incorrect email or password", () => {
    const configured = {
      email: "owner@example.com",
      password: "correct-password",
    }

    expect(
      ownerCredentialsMatch(
        { email: "other@example.com", password: "correct-password" },
        configured
      )
    ).toBe(false)
    expect(
      ownerCredentialsMatch(
        { email: "owner@example.com", password: "wrong-password" },
        configured
      )
    ).toBe(false)
  })
})

describe("owner session token", () => {
  it("round-trips the owner email through an encrypted token", async () => {
    const token = await createOwnerSessionToken("OWNER@example.com", secret)

    await expect(readOwnerSessionEmail(token, secret)).resolves.toBe(
      "owner@example.com"
    )
    expect(token).not.toContain("owner@example.com")
  })

  it("rejects a token signed with another secret", async () => {
    const token = await createOwnerSessionToken("owner@example.com", secret)

    await expect(
      readOwnerSessionEmail(token, "abcdef0123456789abcdef0123456789")
    ).resolves.toBeUndefined()
  })
})
