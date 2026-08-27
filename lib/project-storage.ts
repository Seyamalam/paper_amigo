import "server-only"

import { UTApi } from "uploadthing/server"

import {
  convexApi,
  getConvexClient,
  getConvexServiceSecret,
  isConvexConfigured,
  projectForConvex,
} from "@/lib/convex-server"
import { projectFileHashFromCustomId } from "@/lib/project-file-identity"
import {
  createProjectInputSchema,
  projectSchema,
  replaceProjectFileInputSchema,
  type CreateProjectInput,
  type Project,
  type ReplaceProjectFileInput,
  type UploadedProjectFile,
} from "@/lib/projects"

type StoredFile = Readonly<{
  name: string
  size: number
  customId: string | null
  key: string
  status: "Deletion Pending" | "Failed" | "Uploaded" | "Uploading"
  uploadedAt: number
}>

export type ProjectLibraryState =
  | Readonly<{ kind: "unconfigured"; projects: readonly Project[] }>
  | Readonly<{ kind: "ready"; projects: readonly Project[] }>

export type ReplacedProjectFile = Readonly<{
  project: Project
  previousFileDeleted: boolean
}>

export type DeletedProjectStorage = Readonly<{
  deletedManifests: number
  deletedProjectFiles: number
  deletedSharingRecords: number
}>

function getUploadThingToken(): string | undefined {
  const token = process.env["UPLOADTHING_TOKEN"]?.trim()
  return token === "" ? undefined : token
}

function getUploadThingApi(): UTApi {
  const token = getUploadThingToken()
  if (!token) throw new Error("UPLOADTHING_TOKEN is not configured")
  return new UTApi({ token })
}

function isUploadedPdf(file: StoredFile): boolean {
  return file.status === "Uploaded" && file.name.toLowerCase().endsWith(".pdf")
}

function timestampToIso(timestamp: number): string {
  const milliseconds =
    timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
  return new Date(milliseconds).toISOString()
}

function nextProjectTimestamp(previous?: string): string {
  const now = Date.now()
  const previousTime = previous ? new Date(previous).getTime() : 0
  return new Date(Math.max(now, previousTime + 1)).toISOString()
}

function isMatchingPublicUrl(url: string, key: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".ufs.sh") &&
      parsed.pathname === `/f/${key}`
    )
  } catch {
    return false
  }
}

async function listStoredFiles(): Promise<readonly StoredFile[]> {
  const uploadThing = getUploadThingApi()

  async function readPage(
    offset: number,
    files: readonly StoredFile[]
  ): Promise<readonly StoredFile[]> {
    const page = await uploadThing.listFiles({ limit: 500, offset })
    const collected = [...files, ...page.files]
    return page.hasMore && page.files.length > 0
      ? readPage(offset + page.files.length, collected)
      : collected
  }

  return readPage(0, [])
}

function verifyUploadedFiles(
  inputFiles: readonly UploadedProjectFile[],
  storedFiles: readonly StoredFile[]
): readonly StoredFile[] {
  const storedByKey = new Map(
    storedFiles.filter(isUploadedPdf).map((file) => [file.key, file])
  )

  return inputFiles.map((file) => {
    const stored = storedByKey.get(file.key)
    if (
      !stored ||
      projectFileHashFromCustomId(stored.customId) !== file.hash ||
      stored.name !== file.name ||
      stored.size !== file.size ||
      !isMatchingPublicUrl(file.url, file.key)
    ) {
      throw new Error(`Uploaded PDF could not be verified: ${file.name}`)
    }
    return stored
  })
}

async function safelyDeleteFile(fileKey: string): Promise<boolean> {
  try {
    return (await getUploadThingApi().deleteFiles(fileKey)).success
  } catch {
    return false
  }
}

async function deleteStoredFiles(keys: readonly string[]): Promise<number> {
  if (keys.length === 0) return 0
  const deleted = await getUploadThingApi().deleteFiles([...keys])
  if (!deleted.success || deleted.deletedCount !== keys.length) {
    throw new Error("Project PDF deletion was incomplete")
  }
  return deleted.deletedCount
}

function serviceArgs() {
  return { serviceSecret: getConvexServiceSecret() }
}

export function isUploadThingConfigured(): boolean {
  return getUploadThingToken() !== undefined
}

export function isProjectStorageConfigured(): boolean {
  return isUploadThingConfigured() && isConvexConfigured()
}

export async function getProjectLibrary(): Promise<ProjectLibraryState> {
  if (!isProjectStorageConfigured()) {
    return { kind: "unconfigured", projects: [] }
  }
  const projects = await getConvexClient().query(
    convexApi.projects.list,
    serviceArgs()
  )
  return { kind: "ready", projects: projectSchema.array().parse(projects) }
}

export async function getProject(
  projectId: string
): Promise<Project | undefined> {
  if (!isConvexConfigured()) return undefined
  const project = await getConvexClient().query(convexApi.projects.get, {
    ...serviceArgs(),
    projectId,
  })
  return project ? projectSchema.parse(project) : undefined
}

export async function findDuplicatePaperHashes(
  hashes: readonly string[]
): Promise<readonly string[]> {
  return getConvexClient().query(convexApi.projects.findDuplicateHashes, {
    ...serviceArgs(),
    hashes: [...hashes],
  })
}

export async function discardProjectUploads(
  files: readonly UploadedProjectFile[]
): Promise<void> {
  const verified = verifyUploadedFiles(files, await listStoredFiles())
  if (verified.length > 0) {
    await getUploadThingApi().deleteFiles(verified.map((file) => file.key))
  }
}

export async function createProject(
  rawInput: CreateProjectInput
): Promise<Project> {
  const input = createProjectInputSchema.parse(rawInput)
  const storedFiles = await listStoredFiles()
  const verifiedFiles = verifyUploadedFiles(input.files, storedFiles)
  const inputByKey = new Map(input.files.map((file) => [file.key, file]))
  const now = nextProjectTimestamp()
  const project = projectSchema.parse({
    ...input,
    schemaVersion: 1,
    files: verifiedFiles.map((file) => ({
      key: file.key,
      hash: projectFileHashFromCustomId(file.customId),
      name: file.name,
      size: file.size,
      uploadedAt: timestampToIso(file.uploadedAt),
      url: inputByKey.get(file.key)?.url,
    })),
    createdAt: now,
    updatedAt: now,
  })

  try {
    const created = await getConvexClient().mutation(
      convexApi.projects.create,
      {
        ...serviceArgs(),
        project: projectForConvex(project),
      }
    )
    return projectSchema.parse(created)
  } catch (error) {
    let committed: Project | undefined
    try {
      committed = await getProject(project.id)
    } catch {
      throw error
    }

    const expectedKeys = new Set(project.files.map((file) => file.key))
    if (
      committed?.files.length === project.files.length &&
      committed.files.every((file) => expectedKeys.has(file.key))
    ) {
      return committed
    }

    await Promise.all(verifiedFiles.map((file) => safelyDeleteFile(file.key)))
    throw error
  }
}

export async function replaceProjectFile(
  projectId: string,
  targetFileKey: string,
  rawInput: ReplaceProjectFileInput
): Promise<ReplacedProjectFile> {
  const input = replaceProjectFileInputSchema.parse(rawInput)
  const storedFiles = await listStoredFiles()
  const [storedReplacement] = verifyUploadedFiles([input.file], storedFiles)
  if (!storedReplacement)
    throw new Error("Replacement PDF could not be verified")

  const project = await getProject(projectId)
  if (!project) {
    await safelyDeleteFile(input.file.key)
    throw new Error("Project not found")
  }

  const completed = project.files.find((file) => file.key === input.file.key)
  if (completed && !project.files.some((file) => file.key === targetFileKey)) {
    const previousStillStored = storedFiles.some(
      (file) => file.key === targetFileKey && file.status === "Uploaded"
    )
    return {
      project,
      previousFileDeleted: previousStillStored
        ? await safelyDeleteFile(targetFileKey)
        : true,
    }
  }

  const target = project.files.find((file) => file.key === targetFileKey)
  if (!target) {
    await safelyDeleteFile(input.file.key)
    throw new Error("Project file not found")
  }

  try {
    const updated = await getConvexClient().mutation(
      convexApi.projects.replaceFile,
      {
        ...serviceArgs(),
        projectId,
        targetFileKey,
        replacement: {
          ...input.file,
          uploadedAt: timestampToIso(storedReplacement.uploadedAt),
        },
        updatedAt: nextProjectTimestamp(project.updatedAt),
      }
    )
    return {
      project: projectSchema.parse(updated),
      previousFileDeleted: await safelyDeleteFile(target.key),
    }
  } catch (error) {
    let committed: Project | undefined
    try {
      committed = await getProject(projectId)
    } catch {
      throw error
    }

    if (
      committed?.files.some((file) => file.key === input.file.key) &&
      !committed.files.some((file) => file.key === targetFileKey)
    ) {
      return {
        project: committed,
        previousFileDeleted: await safelyDeleteFile(target.key),
      }
    }

    await safelyDeleteFile(input.file.key)
    throw error
  }
}

export async function deleteProjectStorage(
  projectId: string
): Promise<DeletedProjectStorage> {
  const project = await getProject(projectId)
  if (!project) throw new Error("Project not found")

  const storedKeys = new Set(
    (await listStoredFiles())
      .filter((file) => file.status === "Uploaded")
      .map((file) => file.key)
  )
  const deletedProjectFiles = await deleteStoredFiles(
    project.files.map((file) => file.key).filter((key) => storedKeys.has(key))
  )
  const deletion = await getConvexClient().mutation(
    convexApi.projects.beginDelete,
    {
      ...serviceArgs(),
      projectId,
    }
  )

  return {
    deletedManifests: 0,
    deletedProjectFiles,
    deletedSharingRecords: deletion.sharingRecordCount,
  }
}
