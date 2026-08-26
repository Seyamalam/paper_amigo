import { describe, expect, it } from "vitest"

import {
  formatFileSize,
  getPdfValidationError,
  paperUploadInputSchema,
} from "@/lib/paper-upload"

describe("getPdfValidationError", () => {
  it("accepts a non-empty PDF within the size limit", () => {
    expect(
      getPdfValidationError({
        name: "paper.pdf",
        size: 1024,
        type: "application/pdf",
      })
    ).toBeUndefined()
  })

  it("rejects invalid extensions, MIME types, empty files, and large files", () => {
    expect(
      getPdfValidationError({ name: "paper.txt", size: 1, type: "text/plain" })
    ).toBe("PDF files only")
    expect(
      getPdfValidationError({ name: "paper.pdf", size: 1, type: "text/plain" })
    ).toBe("PDF files only")
    expect(
      getPdfValidationError({ name: "paper.pdf", size: 0, type: "" })
    ).toBe("File is empty")
    expect(
      getPdfValidationError({
        name: "paper.pdf",
        size: 64 * 1024 * 1024 + 1,
        type: "application/pdf",
      })
    ).toBe("File exceeds 64 MB")
  })
})

describe("paperUploadInputSchema", () => {
  it("accepts lowercase SHA-256 values", () => {
    expect(
      paperUploadInputSchema.safeParse({ hashes: ["a".repeat(64)] }).success
    ).toBe(true)
  })

  it("rejects malformed values and oversized batches", () => {
    expect(paperUploadInputSchema.safeParse({ hashes: ["nope"] }).success).toBe(
      false
    )
    expect(
      paperUploadInputSchema.safeParse({
        hashes: Array.from({ length: 11 }, () => "a".repeat(64)),
      }).success
    ).toBe(false)
  })
})

describe("formatFileSize", () => {
  it("formats byte values for the queue and library", () => {
    expect(formatFileSize(512)).toBe("512 B")
    expect(formatFileSize(1536)).toBe("1.5 KB")
    expect(formatFileSize(12 * 1024 * 1024)).toBe("12 MB")
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe("2.0 GB")
  })
})
