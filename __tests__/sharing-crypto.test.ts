import { describe, expect, it } from "vitest"

import {
  decryptSharingRecord,
  encryptSharingRecord,
} from "@/lib/sharing-crypto"
import type { CritiqueRecord } from "@/lib/sharing"

const critique: CritiqueRecord = {
  schemaVersion: 1,
  kind: "critique",
  id: "7f095605-0ea6-4aa8-b420-973ed55877c8",
  shareLinkId: "ec102fd7-2d2c-4a6f-8b9c-1f346e87433e",
  projectId: "416d1b34-b331-4f18-8224-39f8a149908f",
  fileKey: "pdf-key",
  displayName: "Reviewer",
  comment: "Clarify the external validation protocol.",
  visitorHash: "a".repeat(64),
  createdAt: "2026-08-27T00:00:00.000Z",
}

describe("sharing record encryption", () => {
  it("round-trips a critique without exposing its text", () => {
    const encrypted = encryptSharingRecord(critique, "test-secret")

    expect(encrypted).not.toContain(critique.comment)
    expect(decryptSharingRecord(encrypted, "test-secret")).toEqual(critique)
  })

  it("rejects the wrong secret and malformed envelopes", () => {
    const encrypted = encryptSharingRecord(critique, "test-secret")

    expect(decryptSharingRecord(encrypted, "wrong-secret")).toBeUndefined()
    expect(decryptSharingRecord("not-json", "test-secret")).toBeUndefined()
  })
})
