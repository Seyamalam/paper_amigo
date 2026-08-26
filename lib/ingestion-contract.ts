import { z } from "zod"

import { maxPdfBatchSize, maxPdfBytes } from "@/lib/paper-upload"
import { projectSchema } from "@/lib/projects"

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

export const ingestionProjectsResponseSchema = z.object({
  projects: z.array(projectSchema),
})
