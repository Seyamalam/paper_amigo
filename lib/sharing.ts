import { z } from "zod"

const requiredText = (label: string, maximum: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(maximum, `${label} is too long`)

export const shareTokenSchema = z
  .string()
  .regex(/^[A-Za-z\d_-]{43}$/u, "Invalid share link")

export const createShareLinkInputSchema = z.object({
  label: requiredText("Label", 120),
})

export const submitCritiqueInputSchema = z.object({
  fileKey: z.string().min(1).max(512),
  displayName: requiredText("Name", 120),
  email: z.email("Invalid email").max(320).optional(),
  comment: requiredText("Comment", 5_000),
  pageNumber: z.number().int().positive().max(100_000).optional(),
  website: z.literal("").optional(),
})

export const shareLinkRecordSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("share-link"),
  id: z.uuid(),
  projectId: z.uuid(),
  label: z.string().min(1).max(120),
  tokenHash: z.string().regex(/^[a-f\d]{64}$/u),
  createdAt: z.iso.datetime(),
})

export const shareViewRecordSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("share-view"),
  id: z.uuid(),
  shareLinkId: z.uuid(),
  projectId: z.uuid(),
  visitorHash: z.string().regex(/^[a-f\d]{64}$/u),
  viewedAt: z.iso.datetime(),
})

export const critiqueRecordSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("critique"),
  id: z.uuid(),
  shareLinkId: z.uuid(),
  projectId: z.uuid(),
  fileKey: z.string().min(1).max(512),
  displayName: z.string().min(1).max(120),
  email: z.email().max(320).optional(),
  comment: z.string().min(1).max(5_000),
  pageNumber: z.number().int().positive().max(100_000).optional(),
  visitorHash: z.string().regex(/^[a-f\d]{64}$/u),
  createdAt: z.iso.datetime(),
})

export const sharingRecordSchema = z.discriminatedUnion("kind", [
  shareLinkRecordSchema,
  shareViewRecordSchema,
  critiqueRecordSchema,
])

export type CreateShareLinkInput = z.infer<typeof createShareLinkInputSchema>
export type SubmitCritiqueInput = z.infer<typeof submitCritiqueInputSchema>
export type ShareLinkRecord = z.infer<typeof shareLinkRecordSchema>
export type ShareViewRecord = z.infer<typeof shareViewRecordSchema>
export type CritiqueRecord = z.infer<typeof critiqueRecordSchema>
export type SharingRecord = z.infer<typeof sharingRecordSchema>

export type ShareLinkSummary = Readonly<{
  id: string
  projectId: string
  label: string
  createdAt: string
  totalViews: number
  uniqueVisitors: number
}>
