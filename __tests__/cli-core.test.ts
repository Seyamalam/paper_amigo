import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  CliUsageError,
  discoverPdfPaths,
  parseCliArguments,
  parseCliAuthor,
} from "@/cli/core"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }))
  )
})

describe("parseCliArguments", () => {
  it("parses saved-login commands", () => {
    expect(parseCliArguments(["login"])).toEqual({ kind: "login" })
    expect(parseCliArguments(["logout"])).toEqual({ kind: "logout" })
  })

  it("parses recursive project creation", () => {
    expect(
      parseCliArguments([
        "project",
        "create",
        "papers",
        "--title",
        "Climate study",
        "--description",
        "A longitudinal study",
        "--author",
        "Seyam|Researcher|Example University|0000-0002-1825-0097|https://example.edu/seyam",
        "--recursive",
        "--dry-run",
        "--json",
        "--concurrency=4",
      ])
    ).toEqual({
      kind: "project-create",
      authors: [
        {
          name: "Seyam",
          designation: "Researcher",
          university: "Example University",
          orcid: "0000-0002-1825-0097",
          profileUrl: "https://example.edu/seyam",
        },
      ],
      concurrency: 4,
      description: "A longitudinal study",
      dryRun: true,
      json: true,
      paths: ["papers"],
      recursive: true,
      title: "Climate study",
    })
  })

  it("rejects invalid concurrency", () => {
    expect(() =>
      parseCliArguments([
        "project",
        "create",
        "paper.pdf",
        "--title",
        "Title",
        "--description",
        "Description",
        "--author",
        "Name|Role|University",
        "--concurrency",
        "9",
      ])
    ).toThrow(CliUsageError)
  })

  it("parses authors without optional identifiers", () => {
    expect(parseCliAuthor("Name|Professor|University")).toEqual({
      name: "Name",
      designation: "Professor",
      university: "University",
    })
  })

  it("requires project metadata", () => {
    expect(() => parseCliArguments(["project", "create", "paper.pdf"])).toThrow(
      "project create needs --title"
    )
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
