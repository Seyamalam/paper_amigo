import { v } from "convex/values"

import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { assertServiceSecret } from "./serviceAuth"
import { projectFileValidator, projectValidator } from "./validators"

type ReadContext = Pick<QueryCtx, "db">

interface ProjectAuthor {
  name: string
  designation: string
  university: string
  orcid?: string
  profileUrl?: string
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

async function projectByExternalId(
  ctx: ReadContext,
  externalId: string
): Promise<Doc<"projects"> | null> {
  return ctx.db
    .query("projects")
    .withIndex("by_external_id", (index) => index.eq("externalId", externalId))
    .unique()
}

async function readProject(
  ctx: ReadContext,
  project: Doc<"projects">
): Promise<{
  schemaVersion: 1
  id: string
  title: string
  description: string
  authors: {
    name: string
    designation: string
    university: string
    orcid?: string
    profileUrl?: string
  }[]
  files: {
    key: string
    hash: string
    name: string
    size: number
    uploadedAt: string
    url: string
  }[]
  createdAt: string
  updatedAt: string
}> {
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
    schemaVersion: 1,
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

function assertProjectLimits(
  authors: readonly unknown[],
  files: readonly { key: string; hash: string }[]
): void {
  if (authors.length < 1 || authors.length > 50) {
    throw new Error("A project must have between 1 and 50 authors")
  }

  if (files.length < 1 || files.length > 10) {
    throw new Error("A project must have between 1 and 10 PDF files")
  }

  if (new Set(files.map((file) => file.key)).size !== files.length) {
    throw new Error("A project cannot contain the same PDF key twice")
  }

  if (new Set(files.map((file) => file.hash)).size !== files.length) {
    throw new Error("A project cannot contain duplicate PDF content")
  }
}

async function assertFilesAreAvailable(
  ctx: ReadContext,
  files: readonly { key: string; hash: string }[]
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      const [sameKey, sameHash] = await Promise.all([
        ctx.db
          .query("projectFiles")
          .withIndex("by_key", (index) => index.eq("key", file.key))
          .unique(),
        ctx.db
          .query("projectFiles")
          .withIndex("by_hash", (index) => index.eq("hash", file.hash))
          .first(),
      ])

      if (sameKey) {
        throw new Error("PDF is already attached to a project")
      }

      if (sameHash) {
        throw new Error("PDF content is already in the library")
      }
    })
  )
}

async function insertProjectChildren(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  project: {
    authors: {
      name: string
      designation: string
      university: string
      orcid?: string
      profileUrl?: string
    }[]
    files: {
      key: string
      hash: string
      name: string
      size: number
      uploadedAt: string
      url: string
    }[]
  }
): Promise<void> {
  for (const [position, author] of project.authors.entries()) {
    await ctx.db.insert("authors", { projectId, position, ...author })
  }

  for (const [position, file] of project.files.entries()) {
    await ctx.db.insert("projectFiles", { projectId, position, ...file })
  }
}

export const list = query({
  args: { serviceSecret: v.string() },
  returns: v.array(projectValidator),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status_and_updated_at", (index) =>
        index.eq("status", "active")
      )
      .order("desc")
      .take(500)

    return Promise.all(projects.map((project) => readProject(ctx, project)))
  },
})

export const get = query({
  args: { serviceSecret: v.string(), projectId: v.string() },
  returns: v.union(projectValidator, v.null()),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    const project = await projectByExternalId(ctx, args.projectId)

    return project?.status === "active" ? readProject(ctx, project) : null
  },
})

export const findDuplicateHashes = query({
  args: { serviceSecret: v.string(), hashes: v.array(v.string()) },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    const duplicates: string[] = []

    for (const hash of new Set(args.hashes)) {
      const match = await ctx.db
        .query("projectFiles")
        .withIndex("by_hash", (index) => index.eq("hash", hash))
        .first()

      if (match) {
        duplicates.push(hash)
      }
    }

    return duplicates
  },
})

export const create = mutation({
  args: { serviceSecret: v.string(), project: projectValidator },
  returns: projectValidator,
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    assertProjectLimits(args.project.authors, args.project.files)

    if (await projectByExternalId(ctx, args.project.id)) {
      throw new Error("Project ID already exists")
    }

    await assertFilesAreAvailable(ctx, args.project.files)
    const projectId = await ctx.db.insert("projects", {
      externalId: args.project.id,
      title: args.project.title,
      description: args.project.description,
      createdAt: args.project.createdAt,
      updatedAt: args.project.updatedAt,
      status: "active",
      sharingRecordCount: 0,
    })
    await insertProjectChildren(ctx, projectId, args.project)

    return args.project
  },
})

export const replaceFile = mutation({
  args: {
    serviceSecret: v.string(),
    projectId: v.string(),
    targetFileKey: v.string(),
    replacement: projectFileValidator,
    updatedAt: v.string(),
  },
  returns: projectValidator,
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    const project = await projectByExternalId(ctx, args.projectId)

    if (project?.status !== "active") {
      throw new Error("Project not found")
    }

    const target = await ctx.db
      .query("projectFiles")
      .withIndex("by_key", (index) => index.eq("key", args.targetFileKey))
      .unique()

    if (target?.projectId !== project._id) {
      throw new Error("Project file not found")
    }

    const sameReplacement = await ctx.db
      .query("projectFiles")
      .withIndex("by_key", (index) => index.eq("key", args.replacement.key))
      .unique()

    if (sameReplacement && sameReplacement._id !== target._id) {
      throw new Error("Replacement PDF is already attached to a project")
    }

    const sameHash = await ctx.db
      .query("projectFiles")
      .withIndex("by_hash", (index) => index.eq("hash", args.replacement.hash))
      .first()

    if (sameHash && sameHash._id !== target._id) {
      throw new Error("Replacement PDF content is already in the library")
    }

    await ctx.db.patch(target._id, args.replacement)
    await ctx.db.patch(project._id, { updatedAt: args.updatedAt })

    const updated = await ctx.db.get(project._id)

    if (!updated) {
      throw new Error("Project not found")
    }

    return readProject(ctx, updated)
  },
})

export const beginDelete = mutation({
  args: { serviceSecret: v.string(), projectId: v.string() },
  returns: v.object({ sharingRecordCount: v.number() }),
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret)
    const project = await projectByExternalId(ctx, args.projectId)

    if (!project) {
      return { sharingRecordCount: 0 }
    }

    if (project.status === "active") {
      await ctx.db.patch(project._id, { status: "deleting" })
    }

    await ctx.scheduler.runAfter(0, internal.projects.cleanupProject, {
      projectId: project._id,
    })

    return { sharingRecordCount: project.sharingRecordCount }
  },
})

const cleanupBatchSize = 100

export const cleanupProject = internalMutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId)

    if (project?.status !== "deleting") {
      return null
    }

    const tableQueries = [
      ctx.db
        .query("shareViews")
        .withIndex("by_project_id", (index) =>
          index.eq("projectId", args.projectId)
        ),
      ctx.db
        .query("shareVisitors")
        .withIndex("by_project_id", (index) =>
          index.eq("projectId", args.projectId)
        ),
      ctx.db
        .query("critiques")
        .withIndex("by_project_id_and_created_at", (index) =>
          index.eq("projectId", args.projectId)
        ),
      ctx.db
        .query("shareLinks")
        .withIndex("by_project_id_and_created_at", (index) =>
          index.eq("projectId", args.projectId)
        ),
      ctx.db
        .query("authors")
        .withIndex("by_project_id_and_position", (index) =>
          index.eq("projectId", args.projectId)
        ),
      ctx.db
        .query("projectFiles")
        .withIndex("by_project_id_and_position", (index) =>
          index.eq("projectId", args.projectId)
        ),
    ] as const

    for (const tableQuery of tableQueries) {
      const documents = await tableQuery.take(cleanupBatchSize)

      if (documents.length > 0) {
        await Promise.all(
          documents.map((document) => ctx.db.delete(document._id))
        )
        await ctx.scheduler.runAfter(0, internal.projects.cleanupProject, args)
        return null
      }
    }

    await ctx.db.delete(project._id)
    return null
  },
})
