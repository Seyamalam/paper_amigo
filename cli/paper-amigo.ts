#!/usr/bin/env bun

import { createHash } from "node:crypto"
import { readFile, stat } from "node:fs/promises"
import { basename } from "node:path"

import {
  CliRequestError,
  doctor,
  findDuplicates,
  listPapers,
  readCliConfiguration,
  uploadPdf,
} from "./client"
import {
  CliUsageError,
  discoverPdfPaths,
  mapWithConcurrency,
  parseCliArguments,
  type DiscoveryFailure,
} from "./core"
import { getPdfValidationError, maxPdfBatchSize } from "../lib/paper-upload"

const helpText = `paper-amigo

Usage:
  paper-amigo doctor [--json]
  paper-amigo list [--json]
  paper-amigo upload <path...> [--recursive] [--dry-run] [--json]
                     [--concurrency <1-8>]

Environment:
  PAPER_AMIGO_URL
  PAPER_AMIGO_OWNER_EMAIL
  PAPER_AMIGO_OWNER_PASSWORD
`

type UploadCandidate = Readonly<{
  hash: string
  name: string
  path: string
  size: number
  lastModified: number
}>

type UploadIssue = Readonly<{
  code: string
  path: string
  reason: string
}>

type UploadedResult = Readonly<{
  id: string
  name: string
  path: string
}>

type SelectionSplit = Readonly<{
  candidates: readonly UploadCandidate[]
  skipped: readonly UploadIssue[]
}>

function write(value: string): void {
  process.stdout.write(`${value}\n`)
}

function writeError(value: string): void {
  process.stderr.write(`${value}\n`)
}

async function hashFile(path: string): Promise<string> {
  const bytes = await readFile(path)

  return createHash("sha256").update(bytes).digest("hex")
}

async function prepareCandidate(
  path: string
): Promise<UploadCandidate | UploadIssue> {
  try {
    const metadata = await stat(path)
    const validationError = getPdfValidationError({
      name: basename(path),
      size: metadata.size,
      type: "application/pdf",
    })

    if (validationError) {
      return { code: "invalid-pdf", path, reason: validationError }
    }

    return {
      hash: await hashFile(path),
      lastModified: metadata.mtimeMs,
      name: basename(path),
      path,
      size: metadata.size,
    }
  } catch {
    return { code: "unreadable", path, reason: "File cannot be read" }
  }
}

function isUploadCandidate(
  value: UploadCandidate | UploadIssue
): value is UploadCandidate {
  return "hash" in value
}

function isUploadIssue(
  value: UploadCandidate | UploadIssue
): value is UploadIssue {
  return "code" in value
}

function splitSelectionDuplicates(
  candidates: readonly UploadCandidate[]
): SelectionSplit {
  const hashes = new Set<string>()
  const unique: UploadCandidate[] = []
  const skipped: UploadIssue[] = []

  for (const candidate of candidates) {
    if (hashes.has(candidate.hash)) {
      skipped.push({
        code: "duplicate-selection",
        path: candidate.path,
        reason: "Same PDF content already selected",
      })
    } else {
      hashes.add(candidate.hash)
      unique.push(candidate)
    }
  }

  return { candidates: unique, skipped }
}

function chunks<T>(values: readonly T[], size: number): readonly T[][] {
  const result: T[][] = []

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }

  return result
}

function issueFromDiscovery(failure: DiscoveryFailure): UploadIssue {
  return failure
}

function printUploadResult(result: {
  dryRun: boolean
  ready: readonly UploadCandidate[]
  uploaded: readonly UploadedResult[]
  skipped: readonly UploadIssue[]
  failed: readonly UploadIssue[]
}): void {
  const prefix = result.dryRun ? "ready" : "uploaded"
  const completed = result.dryRun ? result.ready : result.uploaded

  for (const item of completed) {
    write(`${prefix}\t${item.path}`)
  }

  for (const item of result.skipped) {
    write(`skipped\t${item.path}\t${item.reason}`)
  }

  for (const item of result.failed) {
    writeError(`failed\t${item.path}\t${item.reason}`)
  }

  write(
    `${String(completed.length)} ${prefix}, ${String(result.skipped.length)} skipped, ${String(result.failed.length)} failed`
  )
}

async function runUpload(
  command: Extract<ReturnType<typeof parseCliArguments>, { kind: "upload" }>
): Promise<number> {
  const discovery = await discoverPdfPaths(command.paths, command.recursive)
  const prepared = await mapWithConcurrency(
    discovery.paths,
    command.concurrency,
    prepareCandidate
  )
  const failed: UploadIssue[] = [
    ...discovery.failed.map(issueFromDiscovery),
    ...prepared.filter(isUploadIssue),
  ]
  const selection = splitSelectionDuplicates(prepared.filter(isUploadCandidate))

  if (command.dryRun) {
    const result = {
      command: "upload" as const,
      dryRun: true as const,
      ready: selection.candidates,
      uploaded: [],
      skipped: selection.skipped,
      failed,
    }

    if (command.json) {
      write(JSON.stringify(result, undefined, 2))
    } else {
      printUploadResult(result)
    }

    return failed.length > 0 ? 1 : 0
  }

  const configuration = readCliConfiguration(process.env)
  const duplicateHashes = new Set<string>()

  const duplicateBatches = await Promise.all(
    chunks(
      selection.candidates.map((candidate) => candidate.hash),
      maxPdfBatchSize
    ).map((batch) => findDuplicates(configuration, batch))
  )

  for (const duplicates of duplicateBatches) {
    for (const hash of duplicates) {
      duplicateHashes.add(hash)
    }
  }

  const skipped: UploadIssue[] = [...selection.skipped]
  const pending: UploadCandidate[] = []

  for (const candidate of selection.candidates) {
    if (duplicateHashes.has(candidate.hash)) {
      skipped.push({
        code: "already-uploaded",
        path: candidate.path,
        reason: "PDF is already in the library",
      })
    } else {
      pending.push(candidate)
    }
  }

  const uploadAttempts = await mapWithConcurrency(
    pending,
    command.concurrency,
    async (candidate): Promise<UploadedResult | UploadIssue> => {
      try {
        const bytes = await readFile(candidate.path)
        const file = new File([bytes], candidate.name, {
          lastModified: candidate.lastModified,
          type: "application/pdf",
        })
        const uploaded = await uploadPdf(configuration, file, candidate.hash)

        return { ...uploaded, path: candidate.path }
      } catch (error) {
        return {
          code: error instanceof CliRequestError ? error.code : "upload-failed",
          path: candidate.path,
          reason: error instanceof Error ? error.message : "PDF upload failed",
        }
      }
    }
  )
  const uploaded = uploadAttempts.filter(
    (attempt): attempt is UploadedResult => "id" in attempt
  )
  failed.push(
    ...uploadAttempts.filter(
      (attempt): attempt is UploadIssue => !("id" in attempt)
    )
  )
  const result = {
    command: "upload" as const,
    dryRun: false as const,
    ready: [],
    uploaded,
    skipped,
    failed,
  }

  if (command.json) {
    write(JSON.stringify(result, undefined, 2))
  } else {
    printUploadResult(result)
  }

  return failed.length > 0 ? 1 : 0
}

async function main(): Promise<number> {
  const command = parseCliArguments(process.argv.slice(2))

  if (command.kind === "help") {
    write(helpText.trimEnd())
    return 0
  }

  if (command.kind === "upload") {
    return runUpload(command)
  }

  const configuration = readCliConfiguration(process.env)

  if (command.kind === "doctor") {
    const result = await doctor(configuration)

    if (command.json) {
      write(JSON.stringify({ command: "doctor", ...result }, undefined, 2))
    } else {
      write("Authentication: OK")
      write(`Storage: ${result.storageConfigured ? "OK" : "not configured"}`)
    }

    return result.storageConfigured ? 0 : 1
  }

  const papers = await listPapers(configuration)

  if (command.json) {
    write(JSON.stringify({ command: "list", papers }, undefined, 2))
  } else if (papers.length === 0) {
    write("No papers")
  } else {
    for (const paper of papers) {
      write(`${paper.id}\t${paper.fileName}\t${paper.size}`)
    }
  }

  return 0
}

function writeFatalError(code: string, message: string): void {
  if (process.argv.includes("--json")) {
    write(JSON.stringify({ command: "error", error: { code, message } }))
  } else {
    writeError(`${code}: ${message}`)
  }
}

try {
  process.exitCode = await main()
} catch (error) {
  if (error instanceof CliUsageError) {
    writeFatalError("usage-error", error.message)
    process.exitCode = 2
  } else if (error instanceof CliRequestError) {
    writeFatalError(error.code, error.message)
    process.exitCode = 2
  } else {
    writeFatalError(
      "unexpected-error",
      error instanceof Error ? error.message : "Unexpected error"
    )
    process.exitCode = 1
  }
}
