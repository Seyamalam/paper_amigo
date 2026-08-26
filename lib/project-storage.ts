import "server-only"

import { UTApi, UTFile } from "uploadthing/server"

import {
  createProjectInputSchema,
  projectSchema,
  type CreateProjectInput,
  type Project,
  type UploadedProjectFile,
} from "@/lib/projects"
import { projectFileHashFromCustomId } from "@/lib/project-file-identity"

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

const manifestNamePrefix = "paper-amigo-project."
const manifestCustomIdPrefix = "pa-project-"

function getUploadThingToken(): string | undefined {
  const token = process.env["UPLOADTHING_TOKEN"]?.trim()

  return token === "" ? undefined : token
}

function getUploadThingApi(): UTApi {
  const token = getUploadThingToken()

  if (!token) {
    throw new Error("UPLOADTHING_TOKEN is not configured")
  }

  return new UTApi({ token })
}

function isUploadedPdf(file: StoredFile): boolean {
  return file.status === "Uploaded" && file.name.toLowerCase().endsWith(".pdf")
}

function isManifest(file: StoredFile): boolean {
  return (
    file.status === "Uploaded" &&
    file.name.startsWith(manifestNamePrefix) &&
    file.name.endsWith(".json")
  )
}

function timestampToIso(timestamp: number): string {
  const milliseconds =
    timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp

  return new Date(milliseconds).toISOString()
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
  const limit = 500

  async function readPage(
    offset: number,
    files: readonly StoredFile[]
  ): Promise<readonly StoredFile[]> {
    const page = await uploadThing.listFiles({ limit, offset })
    const collected = [...files, ...page.files]

    if (!page.hasMore || page.files.length === 0) {
      return collected
    }

    return readPage(offset + page.files.length, collected)
  }

  return readPage(0, [])
}

async function readManifest(
  uploadThing: UTApi,
  file: StoredFile
): Promise<Project | undefined> {
  try {
    const { ufsUrl } = await uploadThing.generateSignedURL(file.key, {
      expiresIn: "5m",
    })

    const response = await fetch(ufsUrl, { cache: "no-store" })

    if (!response.ok) {
      return undefined
    }

    const parsed = projectSchema.safeParse(await response.json())

    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

async function readProjects(files: readonly StoredFile[]): Promise<Project[]> {
  const uploadThing = getUploadThingApi()
  const manifests = files.filter(isManifest)
  const parsed = await Promise.all(
    manifests.map((file) => readManifest(uploadThing, file))
  )
  const newestById = new Map<string, Project>()

  for (const project of parsed) {
    if (!project) {
      continue
    }

    const current = newestById.get(project.id)

    if (!current || project.updatedAt > current.updatedAt) {
      newestById.set(project.id, project)
    }
  }

  return [...newestById.values()].toSorted((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  )
}

export function isProjectStorageConfigured(): boolean {
  return getUploadThingToken() !== undefined
}

export async function getProjectLibrary(): Promise<ProjectLibraryState> {
  if (!isProjectStorageConfigured()) {
    return { kind: "unconfigured", projects: [] }
  }

  return {
    kind: "ready",
    projects: await readProjects(await listStoredFiles()),
  }
}

export async function getProject(
  projectId: string
): Promise<Project | undefined> {
  const library = await getProjectLibrary()

  return library.projects.find((project) => project.id === projectId)
}

export async function findDuplicatePaperHashes(
  hashes: readonly string[]
): Promise<readonly string[]> {
  const requested = new Set(hashes)
  const files = await listStoredFiles()

  return files.flatMap((file) => {
    if (!isUploadedPdf(file)) {
      return []
    }

    const hash = projectFileHashFromCustomId(file.customId)

    return hash && requested.has(hash) ? [hash] : []
  })
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

export async function discardProjectUploads(
  files: readonly UploadedProjectFile[]
): Promise<void> {
  const storedFiles = await listStoredFiles()
  const verified = verifyUploadedFiles(files, storedFiles)

  if (verified.length > 0) {
    await getUploadThingApi().deleteFiles(verified.map((file) => file.key))
  }
}

export async function createProject(
  rawInput: CreateProjectInput
): Promise<Project> {
  const input = createProjectInputSchema.parse(rawInput)
  const uploadThing = getUploadThingApi()
  const storedFiles = await listStoredFiles()
  const verifiedFiles = verifyUploadedFiles(input.files, storedFiles)

  try {
    const existingProjects = await readProjects(storedFiles)

    if (existingProjects.some((project) => project.id === input.id)) {
      throw new Error("Project ID already exists")
    }

    const inputByKey = new Map(input.files.map((file) => [file.key, file]))
    const now = new Date().toISOString()
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
    const revision = Date.now().toString(36)
    const manifest = new UTFile(
      [JSON.stringify(project)],
      `${manifestNamePrefix}${project.id}.${revision}.json`,
      {
        customId: `${manifestCustomIdPrefix}${project.id}-${revision}`,
        type: "application/json",
      }
    )
    const uploaded = await uploadThing.uploadFiles(manifest, {
      acl: "public-read",
      contentDisposition: "inline",
    })

    if (uploaded.error) {
      throw new Error(
        `Project metadata upload failed: ${uploaded.error.message}`
      )
    }

    return project
  } catch (error) {
    await uploadThing.deleteFiles(verifiedFiles.map((file) => file.key))
    throw error
  }
}
