import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  CliUpdateError,
  findCliCheckout,
  updateCliCheckout,
  type CliUpdateCommandRunner,
} from "@/cli/updater"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }))
  )
})

describe("findCliCheckout", () => {
  it("finds a Paper Amigo checkout above the CLI entry", async () => {
    const repository = await mkdtemp(join(tmpdir(), "paper-amigo-update-"))
    temporaryDirectories.push(repository)
    const cliDirectory = join(repository, "cli")
    const entry = join(cliDirectory, "paper-amigo.ts")

    await mkdir(join(repository, ".git"))
    await mkdir(cliDirectory)
    await writeFile(
      join(repository, "package.json"),
      JSON.stringify({ name: "paper_amigo" })
    )
    await writeFile(entry, "#!/usr/bin/env bun\n")

    await expect(findCliCheckout([entry])).resolves.toBe(
      await realpath(repository)
    )
  })

  it("rejects unrelated repositories", async () => {
    const repository = await mkdtemp(join(tmpdir(), "other-update-"))
    temporaryDirectories.push(repository)

    await mkdir(join(repository, ".git"))
    await writeFile(
      join(repository, "package.json"),
      JSON.stringify({ name: "another_project" })
    )

    await expect(findCliCheckout([repository])).resolves.toBeNull()
  })
})

describe("updateCliCheckout", () => {
  it("fast-forwards the checkout and refreshes locked dependencies", async () => {
    const outputs = [
      { stderr: "", stdout: "" },
      { stderr: "", stdout: "abc123\n" },
      { stderr: "", stdout: "Updating abc123..def456\n" },
      { stderr: "", stdout: "Checked 500 installs\n" },
      { stderr: "", stdout: "def456\n" },
    ]
    const runner = vi.fn<CliUpdateCommandRunner>(() => {
      const output = outputs.shift()

      if (!output) throw new Error("Unexpected command")
      return Promise.resolve(output)
    })

    await expect(updateCliCheckout("/repo", runner)).resolves.toEqual({
      afterRevision: "def456",
      beforeRevision: "abc123",
      pullOutput: "Updating abc123..def456",
      repository: "/repo",
    })
    expect(runner.mock.calls).toEqual([
      ["git", ["status", "--porcelain", "--untracked-files=no"], "/repo"],
      ["git", ["rev-parse", "--short", "HEAD"], "/repo"],
      ["git", ["pull", "--ff-only"], "/repo"],
      ["bun", ["install", "--frozen-lockfile"], "/repo"],
      ["git", ["rev-parse", "--short", "HEAD"], "/repo"],
    ])
  })

  it("does not pull over tracked local changes", async () => {
    const runner = vi.fn<CliUpdateCommandRunner>().mockResolvedValue({
      stderr: "",
      stdout: " M cli/paper-amigo.ts\n",
    })

    await expect(updateCliCheckout("/repo", runner)).rejects.toThrow(
      CliUpdateError
    )
    expect(runner).toHaveBeenCalledOnce()
  })
})
