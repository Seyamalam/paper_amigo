import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { assertServiceSecret } from "./serviceAuth"
import {
  critiqueRecordValidator,
  projectValidator,
  shareLinkRecordValidator,
  shareLinkSummaryValidator,
} from "./validators"

type ReadContext = Pick<QueryCtx, "db">

interface ProjectAuthor {
  name: string
  designation: string
  university: string
  orcid?: string
  profileUrl?: string
}

interface CritiqueSource {
  id: string
  fileKey: string
  displayName: string
  email?: string
  comment: string
  pageNumber?: number
  visitorHash: string
  createdAt: string
}

interface CritiqueValues {
  externalId: string
  shareLinkId: Id<"shareLinks">
  shareLinkExternalId: string
  projectId: Id<"projects">
  projectExternalId: string
  fileKey: string
  displayName: string
  email?: string
  comment: string
  pageNumber?: number
  visitorHash: string
  createdAt: string
}

interface CritiqueRecordValue {
  schemaVersion: 1
  kind: "critique"
  id: string
  shareLinkId: string
  projectId: string
  fileKey: string
  displayName: string
  email?: string
  comment: string
  pageNumber?: number
  visitorHash: string
  createdAt: string
}

function projectAuthor(author: Doc<"authors">): ProjectAuthor {
  const normalized: ProjectAuthor = {
    name: author.name,
    designation: author.designation,
    university: author.university,
  }
  if (author.orcid !== undefined) normalized.orcid = author.orcid
  if (author.profileUrl !== undefined) normalized.profileUrl = author.profileUrl
  return normalized
}

function critiqueValues(
  record: CritiqueSource,
  link: Doc<"shareLinks">,
  project: Doc<"projects">
): CritiqueValues {
  const values: CritiqueValues = {
    externalId: record.id,
    shareLinkId: link._id,
    shareLinkExternalId: link.externalId,
    projectId: project._id,
    projectExternalId: project.externalId,
    fileKey: record.fileKey,
    displayName: record.displayName,
    comment: record.comment,
    visitorHash: record.visitorHash,
    createdAt: record.createdAt,
  }
  if (record.email !== undefined) values.email = record.email
  if (record.pageNumber !== undefined) values.pageNumber = record.pageNumber
  return values
}

function critiqueRecord(critique: Doc<"critiques">) {
  const record: CritiqueRecordValue = {
    schemaVersion: 1,
    kind: "critique",
    id: critique.externalId,
    shareLinkId: critique.shareLinkExternalId,
    projectId: critique.projectExternalId,
    fileKey: critique.fileKey,
    displayName: critique.displayName,
    comment: critique.comment,
    visitorHash: critique.visitorHash,
    createdAt: critique.createdAt,
  }
  if (critique.email !== undefined) record.email = critique.email
  if (critique.pageNumber !== undefined) record.pageNumber = critique.pageNumber
  return record
}

async function activeProjectByExternalId(ctx: ReadContext, externalId: string) {
  const project = await ctx.db
    .query("projects")
    .withIndex("by_external_id", (index) => index.eq("externalId", externalId))
    .unique()

  return project?.status === "active" ? project : null
}

async function linkByExternalId(ctx: ReadContext, externalId: string) {
  return ctx.db
    .query("shareLinks")
    .withIndex("by_external_id", (index) => index.eq("externalId", externalId))
    .unique()
}

async function linkByTokenHash(ctx: ReadContext, tokenHash: string) {
  return ctx.db
    .query("shareLinks")
    .withIndex("by_token_hash", (index) => index.eq("tokenHash", tokenHash))
    .unique()
}

function linkRecord(link: Doc<"shareLinks">) {
  return {
    schemaVersion: 1 as const,
    kind: "share-link" as const,
    id: link.externalId,
    projectId: link.projectExternalId,
    label: link.label,
    tokenHash: link.tokenHash,
    createdAt: link.createdAt,
  }
}

async function readProject(ctx: ReadContext, project: Doc<"projects">) {
  const [authors, files] = await Promise.all([
    ctx.db
      .query("authors")
      .withIndex("by_project_id_and_position", (index) =>
        index.eq("projectId", project._id)
      )
      .take(50),
    ctx.db
      .query("projectFiles")
      .withIndex("by_project_id_and_position", (index) =>
        index.eq("projectId", project._id)
      )
      .take(10),
  ])

  return {
    schemaVersion: 1 as const,
    id: project.externalId,
    title: project.title,
    description: project.description,
    authors: authors.map(projectAuthor),
    files: files.map(({ key, hash, name, size, uploadedAt, url }) => ({
      key,
      hash,
      name,
      size,
      uploadedAt,
      url,
    })),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

async function incrementSharingRecordCount(
  ctx: MutationCtx,
  project: Doc<"projects">
): Promise<void> {
  await ctx.db.patch(project._id, {
    sharingRecordCount: project.sharingRecordCount + 1,
  })
}

export const createLink = mutation({
  args: { serviceSecret: v.string(), record: shareLinkRecordValidator },
  returns: shareLinkRecordValidator,
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    const project = await activeProjectByExternalId(ctx, args.record.projectId)

    if (!project) {
      throw new Error("Project not found")
    }

    if (await linkByExternalId(ctx, args.record.id)) {
      throw new Error("Share link ID already exists")
    }

    if (await linkByTokenHash(ctx, args.record.tokenHash)) {
      throw new Error("Share token already exists")
    }

    await ctx.db.insert("shareLinks", {
      externalId: args.record.id,
      projectId: project._id,
      projectExternalId: project.externalId,
      label: args.record.label,
      tokenHash: args.record.tokenHash,
      createdAt: args.record.createdAt,
      totalViews: 0,
      uniqueVisitors: 0,
    })
    await incrementSharingRecordCount(ctx, project)
    return args.record
  },
})

export const resolve = query({
  args: { serviceSecret: v.string(), tokenHash: v.string() },
  returns: v.union(
    v.object({ link: shareLinkRecordValidator, project: projectValidator }),
    v.null()
  ),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    const link = await linkByTokenHash(ctx, args.tokenHash)

    if (!link) {
      return null
    }

    const project = await ctx.db.get(link.projectId)

    if (project?.status !== "active") {
      return null
    }

    return { link: linkRecord(link), project: await readProject(ctx, project) }
  },
})

export const listLinks = query({
  args: { serviceSecret: v.string(), projectId: v.optional(v.string()) },
  returns: v.array(shareLinkSummaryValidator),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    const requestedProjectId = args.projectId
    const links = requestedProjectId
      ? await (async () => {
          const project = await activeProjectByExternalId(
            ctx,
            requestedProjectId
          )
          return project
            ? ctx.db
                .query("shareLinks")
                .withIndex("by_project_id_and_created_at", (index) =>
                  index.eq("projectId", project._id)
                )
                .order("desc")
                .take(500)
            : []
        })()
      : await ctx.db
          .query("shareLinks")
          .withIndex("by_created_at")
          .order("desc")
          .take(500)

    return links.map((link) => ({
      id: link.externalId,
      projectId: link.projectExternalId,
      label: link.label,
      createdAt: link.createdAt,
      totalViews: link.totalViews,
      uniqueVisitors: link.uniqueVisitors,
    }))
  },
})

export const recordView = mutation({
  args: {
    serviceSecret: v.string(),
    tokenHash: v.string(),
    externalId: v.string(),
    visitorHash: v.string(),
    viewedAt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)

    if (
      await ctx.db
        .query("shareViews")
        .withIndex("by_external_id", (index) =>
          index.eq("externalId", args.externalId)
        )
        .unique()
    ) {
      return null
    }

    const link = await linkByTokenHash(ctx, args.tokenHash)

    if (!link) {
      throw new Error("Share link not found")
    }

    const project = await ctx.db.get(link.projectId)
    if (project?.status !== "active") throw new Error("Share link not found")

    const visitor = await ctx.db
      .query("shareVisitors")
      .withIndex("by_share_link_id_and_visitor_hash", (index) =>
        index.eq("shareLinkId", link._id).eq("visitorHash", args.visitorHash)
      )
      .unique()

    await ctx.db.insert("shareViews", {
      externalId: args.externalId,
      shareLinkId: link._id,
      projectId: project._id,
      visitorHash: args.visitorHash,
      viewedAt: args.viewedAt,
    })

    if (!visitor) {
      await ctx.db.insert("shareVisitors", {
        shareLinkId: link._id,
        projectId: project._id,
        visitorHash: args.visitorHash,
        firstViewedAt: args.viewedAt,
      })
    }

    await ctx.db.patch(link._id, {
      totalViews: link.totalViews + 1,
      uniqueVisitors: link.uniqueVisitors + (visitor ? 0 : 1),
    })
    await incrementSharingRecordCount(ctx, project)
    return null
  },
})

export const submitCritique = mutation({
  args: {
    serviceSecret: v.string(),
    tokenHash: v.string(),
    record: critiqueRecordValidator,
    cutoff: v.number(),
  },
  returns: critiqueRecordValidator,
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)

    if (
      await ctx.db
        .query("critiques")
        .withIndex("by_external_id", (index) =>
          index.eq("externalId", args.record.id)
        )
        .unique()
    ) {
      return args.record
    }

    const link = await linkByTokenHash(ctx, args.tokenHash)

    if (link?.externalId !== args.record.shareLinkId) {
      throw new Error("Share link not found")
    }

    const project = await ctx.db.get(link.projectId)
    if (
      project?.status !== "active" ||
      project.externalId !== args.record.projectId
    ) {
      throw new Error("Share link not found")
    }

    const file = await ctx.db
      .query("projectFiles")
      .withIndex("by_key", (index) => index.eq("key", args.record.fileKey))
      .unique()

    if (file?.projectId !== project._id) {
      throw new Error("Project file not found")
    }

    const recent = await ctx.db
      .query("critiques")
      .withIndex("by_share_link_id_and_visitor_hash_and_created_at", (index) =>
        index
          .eq("shareLinkId", link._id)
          .eq("visitorHash", args.record.visitorHash)
          .gte("createdAt", new Date(args.cutoff).toISOString())
      )
      .order("desc")
      .take(3)

    if (recent.length >= 3) {
      throw new Error("Too many comments. Wait a minute and try again")
    }

    await ctx.db.insert("critiques", critiqueValues(args.record, link, project))
    await incrementSharingRecordCount(ctx, project)
    return args.record
  },
})

export const listCritiques = query({
  args: {
    serviceSecret: v.string(),
    projectId: v.optional(v.string()),
    fileKey: v.optional(v.string()),
  },
  returns: v.array(critiqueRecordValidator),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    const requestedFileKey = args.fileKey
    const project = args.projectId
      ? await activeProjectByExternalId(ctx, args.projectId)
      : null
    const critiques = project
      ? requestedFileKey
        ? await ctx.db
            .query("critiques")
            .withIndex("by_project_id_and_file_key_and_created_at", (index) =>
              index.eq("projectId", project._id).eq("fileKey", requestedFileKey)
            )
            .order("desc")
            .take(500)
        : await ctx.db
            .query("critiques")
            .withIndex("by_project_id_and_created_at", (index) =>
              index.eq("projectId", project._id)
            )
            .order("desc")
            .take(500)
      : args.projectId
        ? []
        : await ctx.db
            .query("critiques")
            .withIndex("by_created_at")
            .order("desc")
            .take(500)

    return critiques.map(critiqueRecord)
  },
})
