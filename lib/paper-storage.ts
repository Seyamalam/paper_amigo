import "server-only"

import { cache } from "react"
import { UTApi } from "uploadthing/server"

import { papers as demoPapers, type Paper } from "@/lib/papers"
import { formatFileSize } from "@/lib/paper-upload"

type StoredFile = Readonly<{
  name: string
  size: number
  customId: string | null
  key: string
  status: "Deletion Pending" | "Failed" | "Uploaded" | "Uploading"
  uploadedAt: number
}>

export type PaperLibraryState =
  | Readonly<{ kind: "preview"; papers: readonly Paper[] }>
  | Readonly<{ kind: "ready"; papers: readonly Paper[] }>

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

function isStoredPdf(file: StoredFile): boolean {
  return file.status === "Uploaded" && file.name.toLowerCase().endsWith(".pdf")
}

function formatUploadDate(timestamp: number): string {
  const milliseconds =
    timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(milliseconds))
}

function toPaper(file: StoredFile): Paper {
  return {
    id: file.customId ?? file.key,
    fileName: file.name,
    size: formatFileSize(file.size),
    uploadedAt: formatUploadDate(file.uploadedAt),
    shareCount: 0,
    critiqueCount: 0,
  }
}

const listStoredFiles = cache(async (): Promise<readonly StoredFile[]> => {
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
})

export function isPaperStorageConfigured(): boolean {
  return getUploadThingToken() !== undefined
}

export async function getPaperLibrary(): Promise<PaperLibraryState> {
  if (!isPaperStorageConfigured()) {
    return { kind: "preview", papers: demoPapers }
  }

  const files = await listStoredFiles()
  const papers = files
    .filter(isStoredPdf)
    .toSorted((left, right) => right.uploadedAt - left.uploadedAt)
    .map(toPaper)

  return { kind: "ready", papers }
}

export async function findDuplicatePaperHashes(
  hashes: readonly string[]
): Promise<readonly string[]> {
  const requested = new Set(hashes)
  const files = await listStoredFiles()

  return files
    .filter(isStoredPdf)
    .flatMap((file) =>
      file.customId && requested.has(file.customId) ? [file.customId] : []
    )
}

export async function getStoredPaper(
  paperId: string
): Promise<Paper | undefined> {
  if (!isPaperStorageConfigured()) {
    return demoPapers.find((paper) => paper.id === paperId)
  }

  const files = await listStoredFiles()
  const file = files.find(
    (candidate) =>
      isStoredPdf(candidate) &&
      (candidate.customId === paperId || candidate.key === paperId)
  )

  return file ? toPaper(file) : undefined
}

export async function getPrivatePaperUrl(
  paperId: string
): Promise<string | undefined> {
  if (!isPaperStorageConfigured()) {
    return undefined
  }

  const files = await listStoredFiles()
  const file = files.find(
    (candidate) =>
      isStoredPdf(candidate) &&
      (candidate.customId === paperId || candidate.key === paperId)
  )

  if (!file) {
    return undefined
  }

  const { ufsUrl } = await getUploadThingApi().generateSignedURL(file.key, {
    expiresIn: "5m",
  })

  return ufsUrl
}
