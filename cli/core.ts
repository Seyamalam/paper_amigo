import { lstat, readdir } from "node:fs/promises"
import { resolve } from "node:path"

export type CliCommand =
  | Readonly<{ kind: "doctor"; json: boolean }>
  | Readonly<{ kind: "help" }>
  | Readonly<{ kind: "list"; json: boolean }>
  | Readonly<{
      kind: "upload"
      concurrency: number
      dryRun: boolean
      json: boolean
      paths: readonly string[]
      recursive: boolean
    }>

export type DiscoveryFailure = Readonly<{
  code: "not-found" | "not-pdf" | "unreadable" | "unsupported"
  path: string
  reason: string
}>

export type DiscoveryResult = Readonly<{
  paths: readonly string[]
  failed: readonly DiscoveryFailure[]
}>

export class CliUsageError extends Error {
  override readonly name = "CliUsageError"
}

function parseConcurrency(value: string | undefined): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    throw new CliUsageError("--concurrency must be an integer from 1 to 8")
  }

  return parsed
}

function parseSimpleCommand(
  kind: "doctor" | "list",
  arguments_: readonly string[]
): CliCommand {
  let json = false

  for (const argument of arguments_) {
    if (argument === "--json") {
      json = true
      continue
    }

    if (argument === "--help" || argument === "-h") {
      return { kind: "help" }
    }

    throw new CliUsageError(`Unknown option: ${argument}`)
  }

  return { kind, json }
}

function parseUploadCommand(arguments_: readonly string[]): CliCommand {
  const paths: string[] = []
  let concurrency = 3
  let dryRun = false
  let json = false
  let recursive = false

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]

    if (argument === "--recursive" || argument === "-r") {
      recursive = true
    } else if (argument === "--dry-run") {
      dryRun = true
    } else if (argument === "--json") {
      json = true
    } else if (argument === "--help" || argument === "-h") {
      return { kind: "help" }
    } else if (argument === "--concurrency") {
      concurrency = parseConcurrency(arguments_[index + 1])
      index += 1
    } else if (argument?.startsWith("--concurrency=")) {
      concurrency = parseConcurrency(argument.slice("--concurrency=".length))
    } else if (argument?.startsWith("-")) {
      throw new CliUsageError(`Unknown option: ${argument}`)
    } else if (argument) {
      paths.push(argument)
    }
  }

  if (paths.length === 0) {
    throw new CliUsageError("upload needs at least one file or directory")
  }

  return { kind: "upload", concurrency, dryRun, json, paths, recursive }
}

export function parseCliArguments(arguments_: readonly string[]): CliCommand {
  const [command, ...rest] = arguments_

  if (!command || command === "--help" || command === "-h") {
    return { kind: "help" }
  }

  if (command === "doctor" || command === "list") {
    return parseSimpleCommand(command, rest)
  }

  if (command === "upload") {
    return parseUploadCommand(rest)
  }

  throw new CliUsageError(`Unknown command: ${command}`)
}

function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf")
}

async function walkDirectory(
  directory: string,
  recursive: boolean,
  found: Set<string>,
  failed: DiscoveryFailure[]
): Promise<void> {
  let entries

  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    failed.push({
      code: "unreadable",
      path: directory,
      reason: "Directory cannot be read",
    })
    return
  }

  await Promise.all(
    entries
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const path = resolve(directory, entry.name)

        if (entry.isFile() && isPdfPath(entry.name)) {
          found.add(path)
        } else if (recursive && entry.isDirectory()) {
          await walkDirectory(path, true, found, failed)
        }
      })
  )
}

export async function discoverPdfPaths(
  inputs: readonly string[],
  recursive: boolean
): Promise<DiscoveryResult> {
  const found = new Set<string>()
  const failed: DiscoveryFailure[] = []

  await Promise.all(
    inputs.map(async (input) => {
      const path = resolve(input)
      let stats

      try {
        stats = await lstat(path)
      } catch {
        failed.push({ code: "not-found", path, reason: "Path does not exist" })
        return
      }

      if (stats.isSymbolicLink()) {
        failed.push({
          code: "unsupported",
          path,
          reason: "Symbolic links are not followed",
        })
      } else if (stats.isDirectory()) {
        await walkDirectory(path, recursive, found, failed)
      } else if (stats.isFile() && isPdfPath(path)) {
        found.add(path)
      } else if (stats.isFile()) {
        failed.push({ code: "not-pdf", path, reason: "PDF files only" })
      } else {
        failed.push({ code: "unsupported", path, reason: "Unsupported path" })
      }
    })
  )

  return {
    paths: [...found].toSorted((left, right) => left.localeCompare(right)),
    failed: failed.toSorted((left, right) =>
      left.path.localeCompare(right.path)
    ),
  }
}

export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>
): Promise<readonly R[]> {
  const results: R[] = []
  let nextIndex = 0

  async function worker(): Promise<void> {
    const index = nextIndex
    nextIndex += 1
    const value = values[index]

    if (value === undefined) {
      return
    }

    results[index] = await mapper(value, index)
    await worker()
  }

  const workerCount = Math.min(concurrency, values.length)
  await Promise.all(Array.from({ length: workerCount }, worker))

  return results
}
