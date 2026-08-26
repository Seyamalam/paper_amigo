"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  CircleAlert,
  FileText,
  FolderOpen,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  duplicateCheckResponseSchema,
  formatFileSize,
  getPdfValidationError,
  maxPdfBatchSize,
} from "@/lib/paper-upload"
import {
  createProjectInputSchema,
  projectSchema,
  type ProjectAuthor,
  type UploadedProjectFile,
} from "@/lib/projects"
import { ingestionErrorSchema } from "@/lib/ingestion-contract"
import { uploadFiles } from "@/lib/uploadthing-client"
import { z } from "zod"

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

type HashedItem = Readonly<{ hash: string; item: QueueItem }>

type AuthorDraft = Readonly<{
  id: string
  name: string
  designation: string
  university: string
  orcid: string
  profileUrl: string
}>

const projectCreationResponseSchema = z.union([
  z.object({ project: projectSchema }),
  ingestionErrorSchema,
])

function emptyAuthor(): AuthorDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    designation: "",
    university: "",
    orcid: "",
    profileUrl: "",
  }
}

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
  const result = duplicateCheckResponseSchema.safeParse(body)

  if (!response.ok || !result.success) {
    throw new Error("Duplicate check failed")
  }

  return new Set(result.data.duplicates)
}

async function discardUploads(
  files: readonly UploadedProjectFile[]
): Promise<void> {
  if (files.length === 0) {
    return
  }

  await fetch("/api/projects/uploads", {
    body: JSON.stringify({ files }),
    headers: { "content-type": "application/json" },
    method: "DELETE",
  })
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

function toAuthor(draft: AuthorDraft): ProjectAuthor {
  const author: ProjectAuthor = {
    name: draft.name,
    designation: draft.designation,
    university: draft.university,
  }

  if (draft.orcid.trim()) {
    author.orcid = draft.orcid
  }

  if (draft.profileUrl.trim()) {
    author.profileUrl = draft.profileUrl
  }

  return author
}

export function ProjectCreateForm({ enabled }: Readonly<{ enabled: boolean }>) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [authors, setAuthors] = useState<readonly AuthorDraft[]>(() => [
    emptyAuthor(),
  ])
  const [items, setItems] = useState<readonly QueueItem[]>([])
  const [formError, setFormError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  function updateItem(
    id: string,
    update: Partial<Omit<QueueItem, "file" | "id">>
  ): void {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item))
    )
  }

  function updateAuthor(
    id: string,
    update: Partial<Omit<AuthorDraft, "id">>
  ): void {
    setAuthors((current) =>
      current.map((author) =>
        author.id === id ? { ...author, ...update } : author
      )
    )
  }

  function selectFiles(files: FileList | null): void {
    setFormError(undefined)

    if (!files) {
      return
    }

    const selected = Array.from(files)

    if (selected.length > maxPdfBatchSize) {
      setFormError(`Choose up to ${String(maxPdfBatchSize)} PDFs.`)
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

  async function uploadOne({
    hash,
    item,
  }: HashedItem): Promise<UploadedProjectFile> {
    updateItem(item.id, {
      hash,
      message: undefined,
      progress: 0,
      status: "uploading",
    })

    const uploaded = await uploadFiles("paperPdf", {
      files: [item.file],
      input: { hashes: [hash] },
      onUploadProgress: ({ progress }) => {
        updateItem(item.id, { progress })
      },
    })
    const result = uploaded[0]?.serverData

    if (!result) {
      throw new Error("Upload returned no file")
    }

    updateItem(item.id, { progress: 100, status: "uploaded" })
    return result
  }

  async function startCreation(): Promise<void> {
    const candidates = items.filter((item) => item.status === "ready")

    if (candidates.length !== items.length) {
      setFormError("Remove invalid files")
      return
    }

    const projectId = crypto.randomUUID()
    const metadata = createProjectInputSchema.safeParse({
      id: projectId,
      title,
      description,
      authors: authors.map(toAuthor),
      files: candidates.map((item) => ({
        hash: "0".repeat(64),
        key: item.id,
        name: item.file.name,
        size: item.file.size,
        url: `https://paper-amigo.ufs.sh/f/${encodeURIComponent(item.id)}`,
      })),
    })

    if (!metadata.success) {
      setFormError(metadata.error.issues[0]?.message ?? "Invalid project")
      return
    }

    setBusy(true)
    setFormError(undefined)
    const completed: UploadedProjectFile[] = []

    try {
      const hashed: HashedItem[] = []

      async function hashCandidate(index: number): Promise<void> {
        const item = candidates[index]

        if (!item) {
          return
        }

        updateItem(item.id, { message: undefined, status: "hashing" })
        const hash = await hashFile(item.file)
        updateItem(item.id, { hash, status: "checking" })
        hashed.push({ hash, item })
        await hashCandidate(index + 1)
      }

      await hashCandidate(0)

      const selectedHashes = new Set<string>()

      for (const entry of hashed) {
        if (selectedHashes.has(entry.hash)) {
          updateItem(entry.item.id, { status: "duplicate" })
          throw new Error("Remove duplicate PDFs")
        }
        selectedHashes.add(entry.hash)
      }

      const duplicates = await checkServerDuplicates(
        hashed.map(({ hash }) => hash)
      )

      if (duplicates.size > 0) {
        for (const entry of hashed) {
          if (duplicates.has(entry.hash)) {
            updateItem(entry.item.id, { status: "duplicate" })
          }
        }
        throw new Error("A PDF is already attached to a project")
      }

      let cursor = 0
      async function worker(): Promise<number> {
        const next = hashed[cursor]
        cursor += 1

        if (!next) {
          return 0
        }

        try {
          completed.push(await uploadOne(next))
          return 1 + (await worker())
        } catch (error) {
          updateItem(next.item.id, {
            message: error instanceof Error ? error.message : "Upload failed",
            status: "error",
          })
          return worker()
        }
      }

      const uploadCounts = await Promise.all(
        Array.from({ length: Math.min(3, hashed.length) }, worker)
      )

      if (
        uploadCounts.reduce((total, count) => total + count, 0) !==
        hashed.length
      ) {
        throw new Error("PDF upload failed")
      }

      const response = await fetch("/api/projects", {
        body: JSON.stringify({
          id: projectId,
          title,
          description,
          authors: authors.map(toAuthor),
          files: completed,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
      const body: unknown = await response.json()
      const parsed = projectCreationResponseSchema.safeParse(body)

      if (!parsed.success) {
        throw new Error("Project creation failed")
      }

      if (!response.ok || "error" in parsed.data) {
        throw new Error(
          "error" in parsed.data ? parsed.data.error : "Project creation failed"
        )
      }

      router.push(`/projects/${parsed.data.project.id}`)
      router.refresh()
    } catch (error) {
      if (completed.length > 0 && completed.length < candidates.length) {
        await discardUploads(completed).catch(() => undefined)
      }
      setFormError(
        error instanceof Error ? error.message : "Project creation failed"
      )
    } finally {
      setBusy(false)
    }
  }

  const readyCount = items.filter((item) => item.status === "ready").length

  return (
    <form
      className="space-y-7"
      onSubmit={(event) => {
        event.preventDefault()
        void startCreation()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="project-title">Title</FieldLabel>
          <Input
            id="project-title"
            value={title}
            maxLength={240}
            disabled={busy}
            onChange={(event) => {
              setTitle(event.currentTarget.value)
            }}
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="project-description">Description</FieldLabel>
          <Textarea
            id="project-description"
            value={description}
            maxLength={10_000}
            disabled={busy}
            className="min-h-28"
            onChange={(event) => {
              setDescription(event.currentTarget.value)
            }}
          />
        </Field>
      </div>

      <fieldset className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <legend className="text-sm font-semibold">Authors</legend>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || authors.length >= 50}
            onClick={() => {
              setAuthors((current) => [...current, emptyAuthor()])
            }}
          >
            <Plus aria-hidden="true" /> Add author
          </Button>
        </div>
        {authors.map((author, index) => (
          <div key={author.id} className="grid gap-3 border p-4 sm:grid-cols-2">
            <div className="flex items-center justify-between sm:col-span-2">
              <p className="font-mono text-[10px] uppercase">
                Author {index + 1}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove author ${String(index + 1)}`}
                disabled={busy || authors.length === 1}
                onClick={() => {
                  setAuthors((current) =>
                    current.filter(({ id }) => id !== author.id)
                  )
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <Input
              aria-label={`Author ${String(index + 1)} name`}
              placeholder="Name"
              value={author.name}
              disabled={busy}
              onChange={(event) => {
                updateAuthor(author.id, { name: event.currentTarget.value })
              }}
            />
            <Input
              aria-label={`Author ${String(index + 1)} designation`}
              placeholder="Designation"
              value={author.designation}
              disabled={busy}
              onChange={(event) => {
                updateAuthor(author.id, {
                  designation: event.currentTarget.value,
                })
              }}
            />
            <Input
              aria-label={`Author ${String(index + 1)} university`}
              placeholder="University"
              value={author.university}
              disabled={busy}
              onChange={(event) => {
                updateAuthor(author.id, {
                  university: event.currentTarget.value,
                })
              }}
            />
            <Input
              aria-label={`Author ${String(index + 1)} ORCID iD`}
              placeholder="ORCID iD (optional)"
              value={author.orcid}
              disabled={busy}
              onChange={(event) => {
                updateAuthor(author.id, { orcid: event.currentTarget.value })
              }}
            />
            <Input
              aria-label={`Author ${String(index + 1)} profile URL`}
              placeholder="Profile URL (optional)"
              type="url"
              value={author.profileUrl}
              disabled={busy}
              className="sm:col-span-2"
              onChange={(event) => {
                updateAuthor(author.id, {
                  profileUrl: event.currentTarget.value,
                })
              }}
            />
          </div>
        ))}
      </fieldset>

      <Field data-disabled={!enabled || undefined}>
        <FieldLabel htmlFor="project-files" className="sr-only">
          Choose PDF files
        </FieldLabel>
        <label
          htmlFor="project-files"
          className="flex min-h-44 cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/30 p-8 text-center data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60"
          data-disabled={!enabled || undefined}
        >
          <FolderOpen aria-hidden="true" className="size-8" strokeWidth={1.4} />
          <span className="mt-4 text-sm font-semibold">Select PDF files</span>
          <span className="mt-1 text-xs text-muted-foreground">
            Up to 10 files, 64 MB each
          </span>
        </label>
        <Input
          ref={inputRef}
          id="project-files"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={!enabled || busy}
          className="sr-only"
          onChange={(event) => {
            selectFiles(event.currentTarget.files)
          }}
        />
        <FieldDescription>SHA-256 duplicate detection.</FieldDescription>
      </Field>

      {items.length > 0 ? (
        <ul className="divide-y border" aria-label="Project files">
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
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busy}
                aria-label={`Remove ${item.file.name}`}
                onClick={() => {
                  setItems((current) =>
                    current.filter(({ id }) => id !== item.id)
                  )
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {formError ? (
        <p role="alert" className="text-xs text-destructive">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={!enabled || busy || readyCount === 0}>
        {busy ? "Creating" : "Create project"}
      </Button>
    </form>
  )
}
