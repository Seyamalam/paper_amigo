import { describe, expect, it } from "vitest"

import {
  isOwnerEmail,
  resolveAuthEnvironment,
} from "@/lib/auth-environment-core"

const configuredEnvironment = {
  betterAuthSecret: "a-secure-secret-that-is-at-least-32-characters",
  betterAuthUrl: "https://papers.example.com/",
  googleClientId: "google-client-id",
  googleClientSecret: "google-client-secret",
  ownerEmails: " Owner@Example.com,second@example.com,owner@example.com ",
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
        "BETTER_AUTH_URL",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "PAPER_AMIGO_OWNER_EMAILS",
      ],
    })
  })

  it("normalizes a complete configuration", () => {
    expect(resolveAuthEnvironment(configuredEnvironment)).toEqual({
      kind: "configured",
      configuration: {
        secret: configuredEnvironment.betterAuthSecret,
        baseUrl: "https://papers.example.com",
        googleClientId: configuredEnvironment.googleClientId,
        googleClientSecret: configuredEnvironment.googleClientSecret,
        ownerEmails: ["owner@example.com", "second@example.com"],
      },
    })
  })

  it("reports partial or invalid settings", () => {
    expect(
      resolveAuthEnvironment({
        ...configuredEnvironment,
        betterAuthSecret: "short",
        betterAuthUrl: "ftp://papers.example.com",
        ownerEmails: "",
      })
    ).toEqual({
      kind: "invalid",
      variables: [
        "BETTER_AUTH_SECRET",
        "BETTER_AUTH_URL",
        "PAPER_AMIGO_OWNER_EMAILS",
      ],
    })
  })

  it("never enables demo mode on Vercel", () => {
    expect(
      resolveAuthEnvironment({ demoMode: "true", vercel: "1" })
    ).toMatchObject({ kind: "invalid" })
  })
})

describe("isOwnerEmail", () => {
  it("matches allowlisted emails without case sensitivity", () => {
    expect(isOwnerEmail(" OWNER@example.com ", ["owner@example.com"])).toBe(
      true
    )
    expect(isOwnerEmail("other@example.com", ["owner@example.com"])).toBe(false)
  })
})
