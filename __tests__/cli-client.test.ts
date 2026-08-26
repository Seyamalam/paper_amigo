import { describe, expect, it } from "vitest"

import {
  CliRequestError,
  defaultPaperAmigoUrl,
  readCliConfiguration,
} from "@/cli/client"

const storedCredentials = {
  appUrl: defaultPaperAmigoUrl,
  email: "owner@example.com",
  password: "saved-password",
}

describe("readCliConfiguration", () => {
  it("uses a saved login and the production URL", () => {
    const configuration = readCliConfiguration({}, storedCredentials)

    expect(configuration.appUrl.href).toBe(`${defaultPaperAmigoUrl}/`)
    expect(configuration.authorization).toBe(
      `Basic ${Buffer.from("owner@example.com:saved-password").toString("base64")}`
    )
  })

  it("lets complete environment credentials override the saved login", () => {
    const configuration = readCliConfiguration(
      {
        PAPER_AMIGO_OWNER_EMAIL: "other@example.com",
        PAPER_AMIGO_OWNER_PASSWORD: "environment-password",
      },
      storedCredentials
    )

    expect(configuration.authorization).toBe(
      `Basic ${Buffer.from("other@example.com:environment-password").toString("base64")}`
    )
  })

  it("asks the user to log in when no credentials exist", () => {
    expect(() => readCliConfiguration({})).toThrow(
      new CliRequestError(
        "No saved owner login. Run paper-amigo login",
        "missing-credentials"
      )
    )
  })

  it("rejects insecure remote URLs", () => {
    expect(() =>
      readCliConfiguration(
        { PAPER_AMIGO_URL: "http://example.com" },
        storedCredentials
      )
    ).toThrow("PAPER_AMIGO_URL must use HTTPS outside localhost")
  })
})
