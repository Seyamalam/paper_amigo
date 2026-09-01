import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  CliUsageError,
  discoverPdfPaths,
  parseCliArguments,
  parseCliAuthor,
  resolveProjectFile,
} from "@/cli/core"
import type { Project } from "@/lib/projects"

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

  it("parses checkout updates", () => {
    expect(parseCliArguments(["update"])).toEqual({ kind: "update" })
    expect(() => parseCliArguments(["update", "--json"])).toThrow(
      "Unknown option: --json"
    )
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

  it("parses appending several files to an existing project", () => {
    expect(
      parseCliArguments([
        "project",
        "append",
        "416d1b34-b331-4f18-8224-39f8a149908f",
        "paper-four.pdf",
        "appendices",
        "--recursive",
        "--dry-run",
        "--json",
        "--concurrency=5",
      ])
    ).toEqual({
      kind: "project-append",
      concurrency: 5,
      dryRun: true,
      json: true,
      paths: ["paper-four.pdf", "appendices"],
      projectId: "416d1b34-b331-4f18-8224-39f8a149908f",
      recursive: true,
    })
  })

  it("requires an append project and at least one path", () => {
    expect(() =>
      parseCliArguments([
        "project",
        "append",
        "416d1b34-b331-4f18-8224-39f8a149908f",
      ])
    ).toThrow("project append needs")
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

  it("parses a project file replacement", () => {
    expect(
      parseCliArguments([
        "project",
        "replace",
        "416d1b34-b331-4f18-8224-39f8a149908f",
        "manuscript.pdf",
        "revised.pdf",
        "--json",
      ])
    ).toEqual({
      kind: "project-replace",
      json: true,
      path: "revised.pdf",
      projectId: "416d1b34-b331-4f18-8224-39f8a149908f",
      target: "manuscript.pdf",
    })
  })

  it("requires all project replacement operands", () => {
    expect(() =>
      parseCliArguments(["project", "replace", "project-id", "paper.pdf"])
    ).toThrow("project replace needs")
  })

  it("parses confirmed project deletion", () => {
    expect(
      parseCliArguments([
        "project",
        "delete",
        "416d1b34-b331-4f18-8224-39f8a149908f",
        "--confirm",
        "Study title",
        "--json",
      ])
    ).toEqual({
      kind: "project-delete",
      confirmation: "Study title",
      json: true,
      projectId: "416d1b34-b331-4f18-8224-39f8a149908f",
    })
  })

  it("requires a project deletion confirmation", () => {
    expect(() =>
      parseCliArguments([
        "project",
        "delete",
        "416d1b34-b331-4f18-8224-39f8a149908f",
      ])
    ).toThrow("project delete needs --confirm")
  })

  it("accepts a project title that begins with a dash", () => {
    expect(
      parseCliArguments([
        "delete",
        "416d1b34-b331-4f18-8224-39f8a149908f",
        "--confirm=-Study",
      ])
    ).toEqual({
      kind: "project-delete",
      confirmation: "-Study",
      json: false,
      projectId: "416d1b34-b331-4f18-8224-39f8a149908f",
    })
  })
})

describe("resolveProjectFile", () => {
  const project: Project = {
    schemaVersion: 1,
    id: "416d1b34-b331-4f18-8224-39f8a149908f",
    title: "Study",
    description: "Description",
    authors: [
      {
        name: "Researcher",
        designation: "Professor",
        university: "University",
      },
    ],
    files: [
      {
        key: "key-one",
        hash: "a".repeat(64),
        name: "manuscript.pdf",
        size: 100,
        uploadedAt: "2026-08-26T10:00:00.000Z",
        url: "https://paper-amigo.ufs.sh/f/key-one",
      },
      {
        key: "key-two",
        hash: "b".repeat(64),
        name: "manuscript.pdf",
        size: 200,
        uploadedAt: "2026-08-26T10:00:00.000Z",
        url: "https://paper-amigo.ufs.sh/f/key-two",
      },
    ],
    createdAt: "2026-08-26T10:00:00.000Z",
    updatedAt: "2026-08-26T10:00:00.000Z",
  }

  it("prefers an exact storage key", () => {
    expect(resolveProjectFile(project, "key-two").key).toBe("key-two")
  })

  it("rejects an ambiguous filename", () => {
    expect(() => resolveProjectFile(project, "manuscript.pdf")).toThrow(
      "use a file key"
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
