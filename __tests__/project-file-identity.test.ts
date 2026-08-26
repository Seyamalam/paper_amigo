import { describe, expect, it } from "vitest"

import {
  createProjectFileCustomId,
  projectFileHashFromCustomId,
} from "@/lib/project-file-identity"

const hash = "a".repeat(64)

describe("project file identity", () => {
  it("uses a fresh storage ID when identical content is uploaded again", () => {
    const first = createProjectFileCustomId(hash)
    const second = createProjectFileCustomId(hash)

    expect(first).not.toBe(second)
    expect(projectFileHashFromCustomId(first)).toBe(hash)
    expect(projectFileHashFromCustomId(second)).toBe(hash)
  })

  it("reads legacy hash-only custom IDs", () => {
    expect(projectFileHashFromCustomId(hash)).toBe(hash)
  })
})
