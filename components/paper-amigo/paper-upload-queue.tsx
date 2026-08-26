"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  CircleAlert,
  FileText,
  FolderOpen,
  LoaderCircle,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  duplicateCheckResponseSchema,
  formatFileSize,
  getPdfValidationError,
  maxPdfBatchSize,
} from "@/lib/paper-upload"
import { uploadFiles } from "@/lib/uploadthing-client"

type UploadStatus =
  | "checking"
  | "duplicate"
  | "error"
  | "hashing"
  | "ready"
  | "uploaded"
  | "uploading"

type QueueItem = Readonly<{
  file: File
  hash: string | undefined
  id: string
  message: string | undefined
  progress: number
  status: UploadStatus
}>

type HashedItem = Readonly<{
  hash: string
  item: QueueItem
}>

function getFileId(file: File): string {
  return `${file.name}:${String(file.size)}:${String(file.lastModified)}`
}

async function hashFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  const digest = await crypto.subtle.digest("SHA-256", bytes)

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

async function checkServerDuplicates(
  hashes: readonly string[]
): Promise<ReadonlySet<string>> {
  const response = await fetch("/api/papers/duplicates", {
    body: JSON.stringify({ hashes }),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  const body: unknown = await response.json()

  if (!response.ok) {
    throw new Error("Duplicate check failed")
  }

  const result = duplicateCheckResponseSchema.safeParse(body)

  if (!result.success) {
    throw new Error("Invalid duplicate-check response")
  }

  return new Set(result.data.duplicates)
}

function statusLabel(item: QueueItem): string {
  switch (item.status) {
    case "ready":
      return "Ready"
    case "hashing":
      return "Hashing"
    case "checking":
      return "Checking"
    case "uploading":
      return `${String(Math.round(item.progress))}%`
    case "uploaded":
      return "Uploaded"
    case "duplicate":
      return "Already stored"
    case "error":
      return item.message ?? "Failed"
    default: {
      const exhaustiveStatus: never = item.status
      return exhaustiveStatus
    }
  }
}

export function PaperUploadQueue({ enabled }: Readonly<{ enabled: boolean }>) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<readonly QueueItem[]>([])
  const [batchError, setBatchError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  function updateItem(
    id: string,
    update: Partial<Omit<QueueItem, "file" | "id">>
  ): void {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item))
    )
  }

  function selectFiles(files: FileList | null): void {
    setBatchError(undefined)

    if (!files) {
      return
    }

    const selected = Array.from(files)

    if (selected.length > maxPdfBatchSize) {
      setBatchError(`Choose up to ${String(maxPdfBatchSize)} PDFs at once.`)
      return
    }

    setItems(
      selected.map((file) => {
        const validationError = getPdfValidationError(file)

        return {
          file,
          hash: undefined,
          id: getFileId(file),
          message: validationError,
          progress: 0,
          status: validationError ? "error" : "ready",
        }
      })
    )
  }

  function removeItem(id: string): void {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  async function uploadOne({ hash, item }: HashedItem): Promise<boolean> {
    updateItem(item.id, {
      hash,
      message: undefined,
      progress: 0,
      status: "uploading",
    })

    try {
      await uploadFiles("paperPdf", {
        files: [item.file],
        input: { hashes: [hash] },
        onUploadProgress: ({ progress }) => {
          updateItem(item.id, { progress })
        },
      })
      updateItem(item.id, { progress: 100, status: "uploaded" })
      return true
    } catch (error) {
      updateItem(item.id, {
        message: error instanceof Error ? error.message : "Upload failed",
        status: "error",
      })
      return false
    }
  }

  async function startUpload(): Promise<void> {
    const candidates = items.filter((item) => item.status === "ready")

    if (candidates.length === 0) {
      return
    }

    setBusy(true)
    setBatchError(undefined)

    try {
      const hashed: HashedItem[] = []

      async function hashCandidate(
        index: number,
        collected: readonly HashedItem[]
      ): Promise<readonly HashedItem[]> {
        const item = candidates[index]

        if (!item) {
          return collected
        }

        updateItem(item.id, { message: undefined, status: "hashing" })

        try {
          const hash = await hashFile(item.file)
          updateItem(item.id, { hash, status: "checking" })
          return await hashCandidate(index + 1, [...collected, { hash, item }])
        } catch (error) {
          updateItem(item.id, {
            message: error instanceof Error ? error.message : "Hashing failed",
            status: "error",
          })
          return await hashCandidate(index + 1, collected)
        }
      }

      hashed.push(...(await hashCandidate(0, [])))

      const firstItemByHash = new Map<string, string>()
      const unique: HashedItem[] = []

      for (const hashedItem of hashed) {
        if (firstItemByHash.has(hashedItem.hash)) {
          updateItem(hashedItem.item.id, { status: "duplicate" })
          continue
        }

        firstItemByHash.set(hashedItem.hash, hashedItem.item.id)
        unique.push(hashedItem)
      }

      if (unique.length === 0) {
        return
      }

      const duplicates = await checkServerDuplicates(
        unique.map(({ hash }) => hash)
      )
      const uploadable = unique.filter(({ hash, item }) => {
        if (duplicates.has(hash)) {
          updateItem(item.id, { status: "duplicate" })
          return false
        }

        return true
      })

      let cursor = 0

      async function worker(): Promise<number> {
        const next = uploadable[cursor]
        cursor += 1

        if (!next) {
          return 0
        }

        const uploaded = await uploadOne(next)
        const laterUploads = await worker()

        return laterUploads + (uploaded ? 1 : 0)
      }

      const workerCount = Math.min(3, uploadable.length)
      const uploadCounts = await Promise.all(
        Array.from({ length: workerCount }, worker)
      )

      if (uploadCounts.some((count) => count > 0)) {
        router.refresh()
      }
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : "Upload failed")
      setItems((current) =>
        current.map((item) =>
          item.status === "checking" || item.status === "hashing"
            ? { ...item, message: "Upload stopped", status: "error" }
            : item
        )
      )
    } finally {
      setBusy(false)
    }
  }

  const readyCount = items.filter((item) => item.status === "ready").length

  return (
    <>
      <Field className="mt-7" data-disabled={!enabled || undefined}>
        <FieldLabel htmlFor="paper-files" className="sr-only">
          Choose PDF files
        </FieldLabel>
        <label
          htmlFor="paper-files"
          className="flex min-h-52 cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/30 p-8 text-center data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 sm:min-h-60"
          data-disabled={!enabled || undefined}
        >
          <FolderOpen aria-hidden="true" className="size-8" strokeWidth={1.4} />
          <span className="mt-5 text-lg font-semibold">Select PDF files</span>
          <span className="mt-2 text-xs text-muted-foreground">
            {enabled
              ? "Up to 10 files, 64 MB each"
              : "UploadThing not connected"}
          </span>
        </label>
        <Input
          ref={inputRef}
          id="paper-files"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={!enabled || busy}
          className="sr-only"
          onChange={(event) => {
            selectFiles(event.currentTarget.files)
          }}
        />
        <FieldDescription>
          SHA-256 is calculated before private upload.
        </FieldDescription>
      </Field>

      {items.length > 0 ? (
        <ul className="mt-5 divide-y border" aria-label="Upload queue">
          {items.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-[auto_1fr_auto] gap-3 p-3"
            >
              <span className="grid size-8 place-items-center border bg-muted">
                {item.status === "uploaded" ? (
                  <Check aria-hidden="true" className="size-3.5" />
                ) : item.status === "error" || item.status === "duplicate" ? (
                  <CircleAlert aria-hidden="true" className="size-3.5" />
                ) : item.status === "hashing" ||
                  item.status === "checking" ||
                  item.status === "uploading" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3.5 animate-spin"
                  />
                ) : (
                  <FileText aria-hidden="true" className="size-3.5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{item.file.name}</p>
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                  {formatFileSize(item.file.size)} · {statusLabel(item)}
                </p>
                {item.status === "uploading" ? (
                  <progress
                    className="mt-2 h-1 w-full appearance-none bg-muted text-foreground [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-foreground"
                    aria-label={`Uploading ${item.file.name}`}
                    max={100}
                    value={item.progress}
                  />
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busy}
                aria-label={`Remove ${item.file.name}`}
                onClick={() => {
                  removeItem(item.id)
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {batchError ? (
        <p role="alert" className="mt-4 text-xs text-destructive">
          {batchError}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          disabled={!enabled || busy || readyCount === 0}
          onClick={() => void startUpload()}
        >
          {busy ? "Uploading" : "Start private upload"}
        </Button>
        {items.length > 0 && !busy ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setItems([])
              setBatchError(undefined)
              if (inputRef.current) {
                inputRef.current.value = ""
              }
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </>
  )
}
