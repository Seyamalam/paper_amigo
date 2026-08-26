import { z } from "zod"

export const maxPdfBytes = 64 * 1024 * 1024
export const maxPdfBatchSize = 10

export const pdfHashSchema = z
  .string()
  .regex(/^[a-f\d]{64}$/u, "Invalid SHA-256 hash")

export const paperUploadInputSchema = z.object({
  hashes: z.array(pdfHashSchema).min(1).max(maxPdfBatchSize),
})

export const duplicateCheckResponseSchema = z.object({
  duplicates: z.array(pdfHashSchema),
})

export type UploadCandidate = Readonly<{
  name: string
  size: number
  type: string
}>

export function getPdfValidationError(
  file: UploadCandidate
): string | undefined {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "PDF files only"
  }

  if (file.type !== "" && file.type !== "application/pdf") {
    return "PDF files only"
  }

  if (file.size === 0) {
    return "File is empty"
  }

  if (file.size > maxPdfBytes) {
    return "File exceeds 64 MB"
  }

  return undefined
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`
  }

  const units = ["KB", "MB", "GB"] as const
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const unit = units[unitIndex] ?? "GB"

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${unit}`
}
