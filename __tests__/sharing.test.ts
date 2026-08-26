import { describe, expect, it } from "vitest"

import {
  createShareLinkInputSchema,
  shareTokenSchema,
  submitCritiqueInputSchema,
} from "@/lib/sharing"

describe("sharing inputs", () => {
  it("accepts a labeled link and a 256-bit URL token", () => {
    expect(
      createShareLinkInputSchema.parse({ label: "  External review  " })
    ).toEqual({ label: "External review" })
    expect(shareTokenSchema.safeParse("a".repeat(43)).success).toBe(true)
  })

  it("ties a critique to a project file", () => {
    expect(
      submitCritiqueInputSchema.safeParse({
        fileKey: "QMVxAv8DZmlKk2ZkqU6u648UBltPFVRACvONDXG1oTwqyYm2",
        displayName: "Reviewer",
        email: "reviewer@example.com",
        comment: "Clarify the evaluation protocol.",
        pageNumber: 4,
        website: "",
      }).success
    ).toBe(true)
  })

  it("rejects honeypot and empty comment submissions", () => {
    const base = {
      fileKey: "QMVxAv8DZmlKk2ZkqU6u648UBltPFVRACvONDXG1oTwqyYm2",
      displayName: "Reviewer",
      comment: "Useful critique",
    }

    expect(
      submitCritiqueInputSchema.safeParse({ ...base, website: "spam" }).success
    ).toBe(false)
    expect(
      submitCritiqueInputSchema.safeParse({ ...base, comment: "" }).success
    ).toBe(false)
  })
})
