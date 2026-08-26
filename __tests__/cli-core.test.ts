import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { CliUsageError, discoverPdfPaths, parseCliArguments } from "@/cli/core"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }))
  )
})

describe("parseCliArguments", () => {
  it("parses recursive uploads", () => {
    expect(
      parseCliArguments([
        "upload",
        "papers",
        "--recursive",
        "--dry-run",
        "--json",
        "--concurrency=4",
      ])
    ).toEqual({
      kind: "upload",
      concurrency: 4,
      dryRun: true,
      json: true,
      paths: ["papers"],
      recursive: true,
    })
  })

  it("rejects invalid concurrency", () => {
    expect(() =>
      parseCliArguments(["upload", "paper.pdf", "--concurrency", "9"])
    ).toThrow(CliUsageError)
  })
})

describe("discoverPdfPaths", () => {
  it("finds PDFs deterministically and ignores scanned non-PDFs", async () => {
    const root = await mkdtemp(join(tmpdir(), "paper-amigo-"))
    temporaryDirectories.push(root)
    const nested = join(root, "nested")
    await mkdir(nested)
    await Promise.all([
      writeFile(join(root, "b.pdf"), "b"),
      writeFile(join(root, "notes.txt"), "notes"),
      writeFile(join(nested, "a.PDF"), "a"),
    ])

    const result = await discoverPdfPaths([root], true)

    expect(result.paths).toEqual([join(root, "b.pdf"), join(nested, "a.PDF")])
    expect(result.failed).toEqual([])
  })

  it("reports explicit non-PDFs and symlinks", async () => {
    const root = await mkdtemp(join(tmpdir(), "paper-amigo-"))
    temporaryDirectories.push(root)
    const textPath = join(root, "notes.txt")
    const linkPath = join(root, "link.pdf")
    await writeFile(textPath, "notes")
    await symlink(textPath, linkPath)

    const result = await discoverPdfPaths([textPath, linkPath], false)

    expect(result.failed.map((failure) => failure.code)).toEqual([
      "unsupported",
      "not-pdf",
    ])
  })
})
