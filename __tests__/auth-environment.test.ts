import { describe, expect, it } from "vitest"

import {
  isOwnerEmail,
  resolveAuthEnvironment,
} from "@/lib/auth-environment-core"

const configuredEnvironment = {
  betterAuthSecret: "a-secure-secret-that-is-at-least-32-characters",
  ownerEmail: " Owner@Example.com ",
  ownerPassword: "a-long-owner-password",
} as const

describe("resolveAuthEnvironment", () => {
  it("uses demo mode when no auth settings exist outside Vercel", () => {
    expect(resolveAuthEnvironment({})).toEqual({ kind: "demo" })
  })

  it("fails closed on Vercel when auth is missing", () => {
    expect(resolveAuthEnvironment({ vercel: "1" })).toEqual({
      kind: "invalid",
      variables: [
        "BETTER_AUTH_SECRET",
        "PAPER_AMIGO_OWNER_EMAIL",
        "PAPER_AMIGO_OWNER_PASSWORD",
      ],
    })
  })

  it("normalizes a complete configuration", () => {
    expect(resolveAuthEnvironment(configuredEnvironment)).toEqual({
      kind: "configured",
      configuration: {
        secret: configuredEnvironment.betterAuthSecret,
        ownerEmail: "owner@example.com",
        ownerPassword: configuredEnvironment.ownerPassword,
      },
    })
  })

  it("reports missing or invalid settings", () => {
    expect(
      resolveAuthEnvironment({
        betterAuthSecret: "short",
        ownerEmail: "not-an-email",
        ownerPassword: "",
      })
    ).toEqual({
      kind: "invalid",
      variables: [
        "BETTER_AUTH_SECRET",
        "PAPER_AMIGO_OWNER_EMAIL",
        "PAPER_AMIGO_OWNER_PASSWORD",
      ],
    })
  })

  it("accepts any non-empty configured password", () => {
    expect(
      resolveAuthEnvironment({
        ...configuredEnvironment,
        ownerPassword: "short",
      })
    ).toMatchObject({
      kind: "configured",
      configuration: { ownerPassword: "short" },
    })
  })

  it("never enables demo mode on Vercel", () => {
    expect(
      resolveAuthEnvironment({ demoMode: "true", vercel: "1" })
    ).toMatchObject({ kind: "invalid" })
  })
})

describe("isOwnerEmail", () => {
  it("matches the configured email without case sensitivity", () => {
    expect(isOwnerEmail(" OWNER@example.com ", "owner@example.com")).toBe(true)
    expect(isOwnerEmail("other@example.com", "owner@example.com")).toBe(false)
  })
})
