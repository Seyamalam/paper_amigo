#!/usr/bin/env bun

import { createHash, randomUUID } from "node:crypto"
import { readFile, stat } from "node:fs/promises"
import { basename, resolve } from "node:path"

import {
  CliRequestError,
  createProject,
  discardUploads,
  doctor,
  findDuplicates,
  listProjects,
  replaceProjectFile,
  uploadPdf,
} from "./client"
import { clearLogin, loadCliConfiguration, saveLogin } from "./credentials"
import {
  CliUsageError,
  discoverPdfPaths,
  mapWithConcurrency,
  parseCliArguments,
  resolveProjectFile,
  type DiscoveryFailure,
} from "./core"
import { getPdfValidationError, maxPdfBatchSize } from "../lib/paper-upload"

const helpText = `paper-amigo

Usage:
  paper-amigo login
  paper-amigo logout
  paper-amigo doctor [--json]
  paper-amigo project list [--json]
  paper-amigo project create <path...> --title <title> --description <text>
      --author "Name|Designation|University|ORCID|Profile URL"
      [--author <author>...] [--recursive] [--dry-run] [--json]
      [--concurrency <1-8>]
  paper-amigo project replace <project-id> <current-file-name-or-key>
      <replacement.pdf> [--json]

Aliases:
  paper-amigo list
  paper-amigo upload <options for project create>
  paper-amigo replace <options for project replace>

Run paper-amigo login again to update the saved email or password.
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
  hash: string
  key: string
  name: string
  path: string
  size: number
  url: string
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

function printProjectResult(result: {
  dryRun: boolean
  projectId: string | undefined
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

  if (result.projectId) {
    write(`project\t${result.projectId}`)
  }
}

async function runProjectCreate(
  command: Extract<
    ReturnType<typeof parseCliArguments>,
    { kind: "project-create" }
  >
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
      authors: [...command.authors],
      command: "project-create" as const,
      description: command.description,
      dryRun: true as const,
      ready: selection.candidates,
      uploaded: [],
      skipped: selection.skipped,
      title: command.title,
      failed,
      projectId: undefined,
    }

    if (command.json) {
      write(JSON.stringify(result, undefined, 2))
    } else {
      printProjectResult(result)
    }

    return failed.length > 0 ? 1 : 0
  }

  const configuration = await loadCliConfiguration(process.env)
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
        reason: "PDF is already attached to a project",
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
    (attempt): attempt is UploadedResult => "key" in attempt
  )
  failed.push(
    ...uploadAttempts.filter(
      (attempt): attempt is UploadIssue => !("key" in attempt)
    )
  )

  if (skipped.some((issue) => issue.code === "already-uploaded")) {
    failed.push({
      code: "project-incomplete",
      path: command.title,
      reason: "A project cannot reuse a PDF already attached elsewhere",
    })
  }

  let projectId: string | undefined

  if (failed.length === 0 && uploaded.length > 0) {
    const project = await createProject(configuration, {
      id: randomUUID(),
      title: command.title,
      description: command.description,
      authors: [...command.authors],
      files: uploaded.map(({ hash, key, name, size, url }) => ({
        hash,
        key,
        name,
        size,
        url,
      })),
    })
    projectId = project.id
  } else if (uploaded.length > 0) {
    try {
      await discardUploads(
        configuration,
        uploaded.map(({ hash, key, name, size, url }) => ({
          hash,
          key,
          name,
          size,
          url,
        }))
      )
      failed.push(
        ...uploaded.map((file) => ({
          code: "rolled-back",
          path: file.path,
          reason: "Upload removed because the project was incomplete",
        }))
      )
    } catch (error) {
      failed.push({
        code: "cleanup-failed",
        path: command.title,
        reason:
          error instanceof Error ? error.message : "Upload cleanup failed",
      })
    }
  }

  const result = {
    command: "project-create" as const,
    dryRun: false as const,
    ready: [],
    uploaded: projectId ? uploaded : [],
    skipped,
    failed,
    projectId,
  }

  if (command.json) {
    write(JSON.stringify(result, undefined, 2))
  } else {
    printProjectResult(result)
  }

  return projectId ? 0 : 1
}

async function runProjectReplace(
  command: Extract<
    ReturnType<typeof parseCliArguments>,
    { kind: "project-replace" }
  >
): Promise<number> {
  const replacementPath = resolve(command.path)
  const discovery = await discoverPdfPaths([command.path], false)

  if (
    discovery.failed.length > 0 ||
    discovery.paths.length !== 1 ||
    discovery.paths[0] !== replacementPath
  ) {
    throw new CliUsageError(
      discovery.failed[0]?.reason ?? "Replacement must be one PDF file"
    )
  }

  const prepared = await prepareCandidate(replacementPath)

  if (isUploadIssue(prepared)) {
    throw new CliUsageError(prepared.reason)
  }

  const configuration = await loadCliConfiguration(process.env)
  const projects = await listProjects(configuration)
  const project = projects.find(
    (candidate) => candidate.id === command.projectId
  )

  if (!project) {
    throw new CliUsageError(`Project ${command.projectId} was not found`)
  }

  const target = resolveProjectFile(project, command.target)

  if (prepared.hash === target.hash) {
    throw new CliUsageError("Replacement PDF is identical to the current file")
  }

  if ((await findDuplicates(configuration, [prepared.hash])).size > 0) {
    throw new CliUsageError("Replacement PDF content is already in the library")
  }

  const bytes = await readFile(prepared.path)
  const file = new File([bytes], prepared.name, {
    lastModified: prepared.lastModified,
    type: "application/pdf",
  })
  const uploaded = await uploadPdf(configuration, file, prepared.hash)
  let replacement

  try {
    replacement = await replaceProjectFile(
      configuration,
      project.id,
      target.key,
      {
        file: uploaded,
      }
    )
  } catch (error) {
    if (!(error instanceof CliRequestError) || error.code !== "network-error") {
      throw error
    }

    try {
      replacement = await replaceProjectFile(
        configuration,
        project.id,
        target.key,
        { file: uploaded }
      )
    } catch (retryError) {
      if (
        retryError instanceof CliRequestError &&
        retryError.code === "network-error"
      ) {
        throw new CliRequestError(
          "Could not confirm the replacement. Run project list before retrying",
          "replacement-status-unknown"
        )
      }

      throw retryError
    }
  }

  const result = {
    command: "project-replace" as const,
    projectId: project.id,
    previous: target,
    replacement: { ...uploaded, path: prepared.path },
    previousFileDeleted: replacement.previousFileDeleted,
  }

  if (command.json) {
    write(JSON.stringify(result, undefined, 2))
  } else {
    write(`replaced\t${target.name}\t${prepared.path}`)
    write(`project\t${project.id}`)

    if (!replacement.previousFileDeleted) {
      writeError("warning\tThe prior PDF could not be removed from storage")
    }
  }

  return 0
}

async function main(): Promise<number> {
  const command = parseCliArguments(process.argv.slice(2))

  if (command.kind === "help") {
    write(helpText.trimEnd())
    return 0
  }

  if (command.kind === "project-create") {
    return runProjectCreate(command)
  }

  if (command.kind === "project-replace") {
    return runProjectReplace(command)
  }

  if (command.kind === "login") {
    const login = await saveLogin(process.env)
    write(`Logged in as ${login.email}`)

    if (!login.storageConfigured) {
      write("Storage is not configured")
    }

    return 0
  }

  if (command.kind === "logout") {
    await clearLogin(process.env)
    write("Saved login removed")
    return 0
  }

  const configuration = await loadCliConfiguration(process.env)

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

  const projects = await listProjects(configuration)

  if (command.json) {
    write(JSON.stringify({ command: "project-list", projects }, undefined, 2))
  } else if (projects.length === 0) {
    write("No projects")
  } else {
    for (const project of projects) {
      write(
        `${project.id}\t${project.title}\t${String(project.files.length)} file${project.files.length === 1 ? "" : "s"}`
      )
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
