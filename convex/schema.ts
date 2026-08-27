import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  projects: defineTable({
    externalId: v.string(),
    title: v.string(),
    description: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    status: v.union(v.literal("active"), v.literal("deleting")),
    sharingRecordCount: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_status_and_updated_at", ["status", "updatedAt"]),

  authors: defineTable({
    projectId: v.id("projects"),
    position: v.number(),
    name: v.string(),
    designation: v.string(),
    university: v.string(),
    orcid: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
  }).index("by_project_id_and_position", ["projectId", "position"]),

  projectFiles: defineTable({
    projectId: v.id("projects"),
    position: v.number(),
    key: v.string(),
    hash: v.string(),
    name: v.string(),
    size: v.number(),
    uploadedAt: v.string(),
    url: v.string(),
  })
    .index("by_project_id_and_position", ["projectId", "position"])
    .index("by_key", ["key"])
    .index("by_hash", ["hash"]),

  shareLinks: defineTable({
    externalId: v.string(),
    projectId: v.id("projects"),
    projectExternalId: v.string(),
    label: v.string(),
    tokenHash: v.string(),
    createdAt: v.string(),
    totalViews: v.number(),
    uniqueVisitors: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_token_hash", ["tokenHash"])
    .index("by_project_id_and_created_at", ["projectId", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  shareViews: defineTable({
    externalId: v.string(),
    shareLinkId: v.id("shareLinks"),
    projectId: v.id("projects"),
    visitorHash: v.string(),
    viewedAt: v.string(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_viewed_at", ["viewedAt"])
    .index("by_share_link_id_and_viewed_at", ["shareLinkId", "viewedAt"])
    .index("by_project_id", ["projectId"]),

  shareVisitors: defineTable({
    shareLinkId: v.id("shareLinks"),
    projectId: v.id("projects"),
    visitorHash: v.string(),
    firstViewedAt: v.string(),
  })
    .index("by_share_link_id_and_visitor_hash", ["shareLinkId", "visitorHash"])
    .index("by_project_id", ["projectId"]),

  critiques: defineTable({
    externalId: v.string(),
    shareLinkId: v.id("shareLinks"),
    shareLinkExternalId: v.string(),
    projectId: v.id("projects"),
    projectExternalId: v.string(),
    fileKey: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    comment: v.string(),
    pageNumber: v.optional(v.number()),
    visitorHash: v.string(),
    createdAt: v.string(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_project_id_and_created_at", ["projectId", "createdAt"])
    .index("by_project_id_and_file_key_and_created_at", [
      "projectId",
      "fileKey",
      "createdAt",
    ])
    .index("by_share_link_id_and_visitor_hash_and_created_at", [
      "shareLinkId",
      "visitorHash",
      "createdAt",
    ])
    .index("by_created_at", ["createdAt"]),
})
