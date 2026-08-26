import { describe, expect, it } from "vitest"

import { createProjectInputSchema, projectAuthorSchema } from "@/lib/projects"

describe("project schemas", () => {
  it("accepts multiple files and optional author identifiers", () => {
    const parsed = createProjectInputSchema.safeParse({
      id: "0f5a034d-c19a-4b77-8605-c1f3b30ad3c2",
      title: "Climate study",
      description: "Longitudinal results",
      authors: [
        {
          name: "Seyam",
          designation: "Researcher",
          university: "Example University",
          orcid: "0000-0002-1825-0097",
          profileUrl: "https://example.edu/seyam",
        },
      ],
      files: [
        {
          key: "one",
          hash: "a".repeat(64),
          name: "one.pdf",
          size: 100,
          url: "https://paper-amigo.ufs.sh/f/one",
        },
        {
          key: "two",
          hash: "b".repeat(64),
          name: "two.pdf",
          size: 200,
          url: "https://paper-amigo.ufs.sh/f/two",
        },
      ],
    })

    expect(parsed.success).toBe(true)
  })

  it("requires the core author details", () => {
    expect(
      projectAuthorSchema.safeParse({
        name: "Seyam",
        designation: "",
        university: "Example University",
      }).success
    ).toBe(false)
  })

  it("rejects malformed ORCID iDs", () => {
    expect(
      projectAuthorSchema.safeParse({
        name: "Seyam",
        designation: "Researcher",
        university: "Example University",
        orcid: "1234",
      }).success
    ).toBe(false)
  })
})
