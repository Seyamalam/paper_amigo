import "server-only"

import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto"

import {
  convexApi,
  critiqueRecordForConvex,
  getConvexClient,
  getConvexServiceSecret,
  isConvexConfigured,
} from "@/lib/convex-server"
import { getProject } from "@/lib/project-storage"
import type { Project } from "@/lib/projects"
import {
  createShareLinkInputSchema,
  critiqueRecordSchema,
  shareLinkRecordSchema,
  submitCritiqueInputSchema,
  type CreateShareLinkInput,
  type CritiqueRecord,
  type ShareLinkRecord,
  type ShareLinkSummary,
  type SubmitCritiqueInput,
} from "@/lib/sharing"

export type CreatedShareLink = Readonly<{
  record: ShareLinkRecord
  token: string
}>

export type SharedProject = Readonly<{
  link: ShareLinkRecord
  project: Project
}>

const visitorWindowMilliseconds = 60_000

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function visitorHash(visitorId: string): string {
  const secret = process.env["BETTER_AUTH_SECRET"]?.trim()
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured")
  return createHmac("sha256", secret).update(visitorId).digest("hex")
}

function serviceArgs() {
  return { serviceSecret: getConvexServiceSecret() }
}

export function isSharingStorageConfigured(): boolean {
  return Boolean(
    isConvexConfigured() && process.env["BETTER_AUTH_SECRET"]?.trim()
  )
}

export async function createShareLink(
  projectId: string,
  rawInput: CreateShareLinkInput
): Promise<CreatedShareLink> {
  const input = createShareLinkInputSchema.parse(rawInput)
  const project = await getProject(projectId)
  if (!project) throw new Error("Project not found")

  const token = randomBytes(32).toString("base64url")
  const record = shareLinkRecordSchema.parse({
    schemaVersion: 1,
    kind: "share-link",
    id: randomUUID(),
    projectId,
    label: input.label,
    tokenHash: tokenHash(token),
    createdAt: new Date().toISOString(),
  })
  const created = await getConvexClient().mutation(
    convexApi.sharing.createLink,
    {
      ...serviceArgs(),
      record,
    }
  )
  return { record: shareLinkRecordSchema.parse(created), token }
}

export async function getSharedProject(
  token: string
): Promise<SharedProject | undefined> {
  const shared = await getConvexClient().query(convexApi.sharing.resolve, {
    ...serviceArgs(),
    tokenHash: tokenHash(token),
  })
  return shared
    ? {
        link: shareLinkRecordSchema.parse(shared.link),
        project: shared.project,
      }
    : undefined
}

export async function getShareLinkSummaries(
  projectId?: string
): Promise<readonly ShareLinkSummary[]> {
  const args: { serviceSecret: string; projectId?: string } = serviceArgs()
  if (projectId !== undefined) args.projectId = projectId
  return getConvexClient().query(convexApi.sharing.listLinks, args)
}

export async function recordShareView(
  token: string,
  visitorId: string
): Promise<void> {
  await getConvexClient().mutation(convexApi.sharing.recordView, {
    ...serviceArgs(),
    tokenHash: tokenHash(token),
    externalId: randomUUID(),
    visitorHash: visitorHash(visitorId),
    viewedAt: new Date().toISOString(),
  })
}

export async function submitCritique(
  token: string,
  visitorId: string,
  rawInput: SubmitCritiqueInput
): Promise<CritiqueRecord> {
  const input = submitCritiqueInputSchema.parse(rawInput)
  const shared = await getSharedProject(token)
  if (!shared) throw new Error("Share link not found")
  if (!shared.project.files.some((file) => file.key === input.fileKey)) {
    throw new Error("Project file not found")
  }

  const record = critiqueRecordSchema.parse({
    schemaVersion: 1,
    kind: "critique",
    id: randomUUID(),
    shareLinkId: shared.link.id,
    projectId: shared.project.id,
    fileKey: input.fileKey,
    displayName: input.displayName,
    comment: input.comment,
    visitorHash: visitorHash(visitorId),
    createdAt: new Date().toISOString(),
    email: input.email,
    pageNumber: input.pageNumber,
  })
  const created = await getConvexClient().mutation(
    convexApi.sharing.submitCritique,
    {
      ...serviceArgs(),
      tokenHash: tokenHash(token),
      record: critiqueRecordForConvex(record),
      cutoff: Date.now() - visitorWindowMilliseconds,
    }
  )
  return critiqueRecordSchema.parse(created)
}

export async function getCritiques(
  projectId?: string,
  fileKey?: string
): Promise<readonly CritiqueRecord[]> {
  const args: {
    serviceSecret: string
    projectId?: string
    fileKey?: string
  } = serviceArgs()
  if (projectId !== undefined) args.projectId = projectId
  if (fileKey !== undefined) args.fileKey = fileKey
  const critiques = await getConvexClient().query(
    convexApi.sharing.listCritiques,
    args
  )
  return critiqueRecordSchema.array().parse(critiques)
}
