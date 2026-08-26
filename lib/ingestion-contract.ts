import { z } from "zod"

import { maxPdfBatchSize, maxPdfBytes } from "@/lib/paper-upload"

export const ingestionErrorSchema = z.object({
  error: z.string(),
})

export const ingestionDoctorResponseSchema = z.object({
  ok: z.literal(true),
  storageConfigured: z.boolean(),
  limits: z.object({
    maxBatchSize: z.literal(maxPdfBatchSize),
    maxPdfBytes: z.literal(maxPdfBytes),
  }),
})

export const ingestionPaperSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  size: z.string().min(1),
  uploadedAt: z.string().min(1),
  shareCount: z.number().int().nonnegative(),
  critiqueCount: z.number().int().nonnegative(),
})

export const ingestionPapersResponseSchema = z.object({
  papers: z.array(ingestionPaperSchema),
})
