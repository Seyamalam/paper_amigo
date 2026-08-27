import "server-only"

import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto"

import { UTApi, UTFile } from "uploadthing/server"
import { cache } from "react"

import { getProject } from "@/lib/project-storage"
import type { Project } from "@/lib/projects"
import {
  decryptSharingRecord,
  encryptSharingRecord,
} from "@/lib/sharing-crypto"
import {
  createShareLinkInputSchema,
  critiqueRecordSchema,
  shareLinkRecordSchema,
  submitCritiqueInputSchema,
  type CreateShareLinkInput,
  type CritiqueRecord,
  type ShareLinkRecord,
  type ShareLinkSummary,
  type SharingRecord,
  type ShareViewRecord,
  type SubmitCritiqueInput,
} from "@/lib/sharing"

type StoredFile = Readonly<{
  name: string
  key: string
  status: "Deletion Pending" | "Failed" | "Uploaded" | "Uploading"
}>

export type CreatedShareLink = Readonly<{
  record: ShareLinkRecord
  token: string
}>

export type SharedProject = Readonly<{
  link: ShareLinkRecord
  project: Project
}>

const eventNamePrefix = "paper-amigo-event."
const deletionBatchSize = 100
const visitorWindowMilliseconds = 60_000
const visitorCommentLimit = 3

function getUploadThingApi(): UTApi {
  const token = process.env["UPLOADTHING_TOKEN"]?.trim()

  if (!token) {
    throw new Error("UPLOADTHING_TOKEN is not configured")
  }

  return new UTApi({ token })
}

function getDataSecret(): string {
  const secret = process.env["BETTER_AUTH_SECRET"]?.trim()

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not configured")
  }

  return secret
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function visitorHash(visitorId: string): string {
  return createHmac("sha256", getDataSecret()).update(visitorId).digest("hex")
}

async function listEventFiles(): Promise<readonly StoredFile[]> {
  const uploadThing = getUploadThingApi()
  const limit = 500

  async function readPage(
    offset: number,
    files: readonly StoredFile[]
  ): Promise<readonly StoredFile[]> {
    const page = await uploadThing.listFiles({ limit, offset })
    const collected = [...files, ...page.files]

    if (!page.hasMore || page.files.length === 0) {
      return collected.filter(
        (file) =>
          file.status === "Uploaded" && file.name.startsWith(eventNamePrefix)
      )
    }

    return readPage(offset + page.files.length, collected)
  }

  return readPage(0, [])
}

async function readEvent(
  uploadThing: UTApi,
  file: StoredFile
): Promise<SharingRecord | undefined> {
  try {
    const { ufsUrl } = await uploadThing.generateSignedURL(file.key, {
      expiresIn: "5m",
    })
    const response = await fetch(ufsUrl, { cache: "no-store" })

    if (!response.ok) {
      return undefined
    }

    return decryptSharingRecord(await response.text(), getDataSecret())
  } catch {
    return undefined
  }
}

const readEvents = cache(async (): Promise<readonly SharingRecord[]> => {
  const uploadThing = getUploadThingApi()
  const events = await Promise.all(
    (await listEventFiles()).map((file) => readEvent(uploadThing, file))
  )

  return events.flatMap((event) => (event ? [event] : []))
})

async function appendEvent(record: SharingRecord): Promise<void> {
  const uploadThing = getUploadThingApi()
  const file = new UTFile(
    [encryptSharingRecord(record, getDataSecret())],
    `${eventNamePrefix}${record.kind}.${record.id}.pae`,
    {
      customId: `pa-event-${record.kind}-${record.id}`,
      type: "application/octet-stream",
    }
  )
  const uploaded = await uploadThing.uploadFiles(file, {
    acl: "public-read",
    contentDisposition: "inline",
  })

  if (uploaded.error) {
    throw new Error(`Sharing record upload failed: ${uploaded.error.message}`)
  }
}

export function isSharingStorageConfigured(): boolean {
  return Boolean(
    process.env["UPLOADTHING_TOKEN"]?.trim() &&
    process.env["BETTER_AUTH_SECRET"]?.trim()
  )
}

export async function createShareLink(
  projectId: string,
  rawInput: CreateShareLinkInput
): Promise<CreatedShareLink> {
  const input = createShareLinkInputSchema.parse(rawInput)
  const project = await getProject(projectId)

  if (!project) {
    throw new Error("Project not found")
  }

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

  await appendEvent(record)

  return { record, token }
}

export async function getSharedProject(
  token: string
): Promise<SharedProject | undefined> {
  const hash = tokenHash(token)
  const events = await readEvents()
  const link = events.find(
    (event): event is ShareLinkRecord =>
      event.kind === "share-link" && event.tokenHash === hash
  )

  if (!link) {
    return undefined
  }

  const project = await getProject(link.projectId)

  return project ? { link, project } : undefined
}

export async function getShareLinkSummaries(
  projectId?: string
): Promise<readonly ShareLinkSummary[]> {
  const events = await readEvents()
  const links = events.filter(
    (event): event is ShareLinkRecord =>
      event.kind === "share-link" &&
      (projectId === undefined || event.projectId === projectId)
  )
  const views = events.filter(
    (event): event is ShareViewRecord => event.kind === "share-view"
  )

  return links
    .map((link) => {
      const linkViews = views.filter((view) => view.shareLinkId === link.id)

      return {
        id: link.id,
        projectId: link.projectId,
        label: link.label,
        createdAt: link.createdAt,
        totalViews: linkViews.length,
        uniqueVisitors: new Set(linkViews.map((view) => view.visitorHash)).size,
      }
    })
    .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function recordShareView(
  token: string,
  visitorId: string
): Promise<void> {
  const shared = await getSharedProject(token)

  if (!shared) {
    throw new Error("Share link not found")
  }

  await appendEvent({
    schemaVersion: 1,
    kind: "share-view",
    id: randomUUID(),
    shareLinkId: shared.link.id,
    projectId: shared.project.id,
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

  if (!shared) {
    throw new Error("Share link not found")
  }

  if (!shared.project.files.some((file) => file.key === input.fileKey)) {
    throw new Error("Project file not found")
  }

  const hash = visitorHash(visitorId)
  const cutoff = Date.now() - visitorWindowMilliseconds
  const recentCritiques = (await readEvents()).filter(
    (event): event is CritiqueRecord =>
      event.kind === "critique" &&
      event.shareLinkId === shared.link.id &&
      event.visitorHash === hash &&
      new Date(event.createdAt).getTime() >= cutoff
  )

  if (recentCritiques.length >= visitorCommentLimit) {
    throw new Error("Too many comments. Wait a minute and try again")
  }

  const critique = critiqueRecordSchema.parse({
    schemaVersion: 1,
    kind: "critique",
    id: randomUUID(),
    shareLinkId: shared.link.id,
    projectId: shared.project.id,
    fileKey: input.fileKey,
    displayName: input.displayName,
    comment: input.comment,
    visitorHash: hash,
    createdAt: new Date().toISOString(),
    email: input.email,
    pageNumber: input.pageNumber,
  })

  await appendEvent(critique)

  return critique
}

export async function getCritiques(
  projectId?: string,
  fileKey?: string
): Promise<readonly CritiqueRecord[]> {
  const events = await readEvents()

  return events
    .filter(
      (event): event is CritiqueRecord =>
        event.kind === "critique" &&
        (projectId === undefined || event.projectId === projectId) &&
        (fileKey === undefined || event.fileKey === fileKey)
    )
    .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function deleteProjectSharingRecords(
  projectId: string
): Promise<number> {
  const uploadThing = getUploadThingApi()
  const files = await listEventFiles()
  const records = await Promise.all(
    files.map(async (file) => ({
      file,
      record: await readEvent(uploadThing, file),
    }))
  )
  const keys = records.flatMap(({ file, record }) =>
    record?.projectId === projectId ? [file.key] : []
  )

  if (keys.length === 0) {
    return 0
  }

  const batches = Array.from(
    { length: Math.ceil(keys.length / deletionBatchSize) },
    (_, index) =>
      keys.slice(index * deletionBatchSize, (index + 1) * deletionBatchSize)
  )
  const deletions = await Promise.all(
    batches.map(async (batch) => ({
      batch,
      result: await uploadThing.deleteFiles(batch),
    }))
  )

  for (const deletion of deletions) {
    if (
      !deletion.result.success ||
      deletion.result.deletedCount !== deletion.batch.length
    ) {
      throw new Error("Sharing record deletion was incomplete")
    }
  }

  return deletions.reduce(
    (total, deletion) => total + deletion.result.deletedCount,
    0
  )
}
