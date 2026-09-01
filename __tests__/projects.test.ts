import { describe, expect, it } from "vitest"

import {
  appendProjectFilesInputSchema,
  createProjectInputSchema,
  deleteProjectInputSchema,
  projectAuthorSchema,
  withAppendedProjectFiles,
  withReplacedProjectFile,
  type Project,
} from "@/lib/projects"

describe("project schemas", () => {
  it("requires a non-empty exact-title deletion confirmation", () => {
    expect(
      deleteProjectInputSchema.safeParse({ confirmation: "Climate study" })
        .success
    ).toBe(true)
    expect(
      deleteProjectInputSchema.safeParse({ confirmation: "" }).success
    ).toBe(false)
  })

  it("accepts multiple files and optional author identifiers", () => {
    const parsed = createProjectInputSchema.safeParse({
      id: "0f5a034d-c19a-4b77-8605-c1f3b30ad3c2",
      title: "Climate study",
      description: "Longitudinal results",
      authors: [
        {
          name: "Seyam",
          designation: "Researcher",
          university: "Example University",
          orcid: "0000-0002-1825-0097",
          profileUrl: "https://example.edu/seyam",
        },
      ],
      files: [
        {
          key: "one",
          hash: "a".repeat(64),
          name: "one.pdf",
          size: 100,
          url: "https://paper-amigo.ufs.sh/f/one",
        },
        {
          key: "two",
          hash: "b".repeat(64),
          name: "two.pdf",
          size: 200,
          url: "https://paper-amigo.ufs.sh/f/two",
        },
      ],
    })

    expect(parsed.success).toBe(true)
  })

  it("requires the core author details", () => {
    expect(
      projectAuthorSchema.safeParse({
        name: "Seyam",
        designation: "",
        university: "Example University",
      }).success
    ).toBe(false)
  })

  it("rejects malformed ORCID iDs", () => {
    expect(
      projectAuthorSchema.safeParse({
        name: "Seyam",
        designation: "Researcher",
        university: "Example University",
        orcid: "1234",
      }).success
    ).toBe(false)
  })

  it("replaces a project file without moving the file slot", () => {
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
          key: "old-key",
          hash: "a".repeat(64),
          name: "manuscript.pdf",
          size: 100,
          uploadedAt: "2026-08-26T10:00:00.000Z",
          url: "https://paper-amigo.ufs.sh/f/old-key",
        },
        {
          key: "appendix-key",
          hash: "b".repeat(64),
          name: "appendix.pdf",
          size: 200,
          uploadedAt: "2026-08-26T10:00:00.000Z",
          url: "https://paper-amigo.ufs.sh/f/appendix-key",
        },
      ],
      createdAt: "2026-08-26T10:00:00.000Z",
      updatedAt: "2026-08-26T10:00:00.000Z",
    }

    const replaced = withReplacedProjectFile(
      project,
      "old-key",
      {
        key: "new-key",
        hash: "c".repeat(64),
        name: "revised.pdf",
        size: 300,
        url: "https://paper-amigo.ufs.sh/f/new-key",
      },
      "2026-08-27T10:00:00.000Z",
      "2026-08-27T10:00:01.000Z"
    )

    expect(replaced.files.map((file) => file.key)).toEqual([
      "new-key",
      "appendix-key",
    ])
    expect(replaced.createdAt).toBe(project.createdAt)
    expect(replaced.updatedAt).toBe("2026-08-27T10:00:01.000Z")
  })

  it("appends project files after the existing file slots", () => {
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
          key: "paper-one",
          hash: "a".repeat(64),
          name: "paper-one.pdf",
          size: 100,
          uploadedAt: "2026-08-26T10:00:00.000Z",
          url: "https://paper-amigo.ufs.sh/f/paper-one",
        },
      ],
      createdAt: "2026-08-26T10:00:00.000Z",
      updatedAt: "2026-08-26T10:00:00.000Z",
    }
    const files = [
      {
        key: "paper-two",
        hash: "b".repeat(64),
        name: "paper-two.pdf",
        size: 200,
        url: "https://paper-amigo.ufs.sh/f/paper-two",
      },
      {
        key: "paper-three",
        hash: "c".repeat(64),
        name: "paper-three.pdf",
        size: 300,
        url: "https://paper-amigo.ufs.sh/f/paper-three",
      },
      {
        key: "paper-four",
        hash: "d".repeat(64),
        name: "paper-four.pdf",
        size: 400,
        url: "https://paper-amigo.ufs.sh/f/paper-four",
      },
    ]

    expect(appendProjectFilesInputSchema.safeParse({ files }).success).toBe(
      true
    )
    const appended = withAppendedProjectFiles(
      project,
      files,
      new Map(files.map((file) => [file.key, "2026-08-27T10:00:00.000Z"])),
      "2026-08-27T10:00:01.000Z"
    )

    expect(appended.files.map((file) => file.key)).toEqual([
      "paper-one",
      "paper-two",
      "paper-three",
      "paper-four",
    ])
  })
})
