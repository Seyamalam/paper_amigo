import { v } from "convex/values"

export const authorValidator = v.object({
  name: v.string(),
  designation: v.string(),
  university: v.string(),
  orcid: v.optional(v.string()),
  profileUrl: v.optional(v.string()),
})

export const projectFileValidator = v.object({
  key: v.string(),
  hash: v.string(),
  name: v.string(),
  size: v.number(),
  uploadedAt: v.string(),
  url: v.string(),
})

export const projectValidator = v.object({
  schemaVersion: v.literal(1),
  id: v.string(),
  title: v.string(),
  description: v.string(),
  authors: v.array(authorValidator),
  files: v.array(projectFileValidator),
  createdAt: v.string(),
  updatedAt: v.string(),
})

export const shareLinkRecordValidator = v.object({
  schemaVersion: v.literal(1),
  kind: v.literal("share-link"),
  id: v.string(),
  projectId: v.string(),
  label: v.string(),
  tokenHash: v.string(),
  createdAt: v.string(),
})

export const shareLinkSummaryValidator = v.object({
  id: v.string(),
  projectId: v.string(),
  label: v.string(),
  createdAt: v.string(),
  totalViews: v.number(),
  uniqueVisitors: v.number(),
})

export const critiqueRecordValidator = v.object({
  schemaVersion: v.literal(1),
  kind: v.literal("critique"),
  id: v.string(),
  shareLinkId: v.string(),
  projectId: v.string(),
  fileKey: v.string(),
  displayName: v.string(),
  email: v.optional(v.string()),
  comment: v.string(),
  pageNumber: v.optional(v.number()),
  visitorHash: v.string(),
  createdAt: v.string(),
})
