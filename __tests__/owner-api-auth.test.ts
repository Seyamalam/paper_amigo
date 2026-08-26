import { describe, expect, it } from "vitest"

import { parseBasicAuthorization } from "@/lib/owner-api-auth-core"

function basic(value: string): string {
  return `Basic ${Buffer.from(value, "utf8").toString("base64")}`
}

describe("parseBasicAuthorization", () => {
  it("reads an email and password", () => {
    expect(parseBasicAuthorization(basic("owner@example.com:secret"))).toEqual({
      email: "owner@example.com",
      password: "secret",
    })
  })

  it("keeps colons in the password", () => {
    expect(parseBasicAuthorization(basic("owner@example.com:one:two"))).toEqual(
      {
        email: "owner@example.com",
        password: "one:two",
      }
    )
  })

  it.each([
    null,
    "Bearer token",
    "Basic !!!=",
    basic("missing-separator"),
    basic(":missing-email"),
    basic("owner@example.com:secret\nheader"),
  ])("rejects an invalid header", (authorization) => {
    expect(parseBasicAuthorization(authorization)).toBeUndefined()
  })
})
