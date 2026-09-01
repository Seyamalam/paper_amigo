import { execFile } from "node:child_process"
import { access, readFile, realpath, stat } from "node:fs/promises"
import { dirname, join, parse } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

type CommandResult = Readonly<{
  stderr: string
  stdout: string
}>

export type CliUpdateResult = Readonly<{
  afterRevision: string
  beforeRevision: string
  pullOutput: string
  repository: string
}>

export type CliUpdateCommandRunner = (
  command: string,
  arguments_: readonly string[],
  workingDirectory: string
) => Promise<CommandResult>

export class CliUpdateError extends Error {
  override readonly name = "CliUpdateError"
}

async function runCommand(
  command: string,
  arguments_: readonly string[],
  workingDirectory: string
): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, [...arguments_], {
      cwd: workingDirectory,
      encoding: "utf8",
    })

    return { stderr: result.stderr, stdout: result.stdout }
  } catch (error) {
    throw new CliUpdateError(
      `${command} failed: ${error instanceof Error ? error.message : "Unknown command error"}`
    )
  }
}

async function isPaperAmigoCheckout(directory: string): Promise<boolean> {
  try {
    await access(join(directory, ".git"))
    const packageJson = await readFile(join(directory, "package.json"), "utf8")

    return /"name"\s*:\s*"paper_amigo"/.test(packageJson)
  } catch {
    return false
  }
}

async function startingDirectory(candidate: string): Promise<string | null> {
  try {
    const resolved = await realpath(candidate)
    const metadata = await stat(resolved)

    return metadata.isDirectory() ? resolved : dirname(resolved)
  } catch {
    return null
  }
}

export async function findCliCheckout(
  candidates: readonly string[]
): Promise<string | null> {
  const startingDirectories = await Promise.all(
    candidates.map(startingDirectory)
  )
  const directories: string[] = []

  for (const candidateDirectory of startingDirectories) {
    let directory = candidateDirectory

    while (directory) {
      directories.push(directory)
      const parent = dirname(directory)
      directory = parent === parse(directory).root ? null : parent
    }
  }

  const uniqueDirectories = [...new Set(directories)]
  const matches = await Promise.all(uniqueDirectories.map(isPaperAmigoCheckout))

  return uniqueDirectories.find((_, index) => matches[index] === true) ?? null
}

export async function updateCliCheckout(
  repository: string,
  runner: CliUpdateCommandRunner = runCommand
): Promise<CliUpdateResult> {
  const status = await runner(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    repository
  )

  if (status.stdout.trim()) {
    throw new CliUpdateError(
      "The Paper Amigo checkout has tracked local changes. Commit or stash them before updating."
    )
  }

  const before = await runner(
    "git",
    ["rev-parse", "--short", "HEAD"],
    repository
  )
  const pull = await runner("git", ["pull", "--ff-only"], repository)
  await runner("bun", ["install", "--frozen-lockfile"], repository)
  const after = await runner(
    "git",
    ["rev-parse", "--short", "HEAD"],
    repository
  )

  return {
    afterRevision: after.stdout.trim(),
    beforeRevision: before.stdout.trim(),
    pullOutput: [pull.stdout.trim(), pull.stderr.trim()]
      .filter(Boolean)
      .join("\n"),
    repository,
  }
}
