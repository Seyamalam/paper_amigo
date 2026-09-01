import { convexTest } from "convex-test"
import { describe, expect, test, vi } from "vitest"

import { api } from "./_generated/api"
import schema from "./schema"

const serviceSecret = "paper-amigo-test-service"
Object.assign(process.env, { PAPER_AMIGO_SERVICE_SECRET: serviceSecret })

const modules = import.meta.glob("./**/*.ts")

const project = {
  schemaVersion: 1 as const,
  id: "416d1b34-b331-4f18-8224-39f8a149908f",
  title: "Research project",
  description: "Test project",
  authors: [
    {
      name: "Researcher",
      designation: "Professor",
      university: "Example University",
      orcid: "0000-0000-0000-000X",
    },
  ],
  files: [
    {
      key: "paper-key",
      hash: "a".repeat(64),
      name: "paper.pdf",
      size: 1024,
      uploadedAt: "2026-08-27T00:00:00.000Z",
      url: "https://example.ufs.sh/f/paper-key",
    },
  ],
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
}

const paperFile = project.files[0]
if (!paperFile) throw new Error("Test project requires a PDF")

async function seeded() {
  const t = convexTest(schema, modules)
  await t.mutation(api.projects.create, { serviceSecret, project })
  return t
}

describe("Paper Amigo Convex data layer", () => {
  test("rejects requests without the server credential", async () => {
    const t = convexTest(schema, modules)

    await expect(
      t.query(api.projects.list, { serviceSecret: "wrong" })
    ).rejects.toThrow("Unauthorized service request")
  })

  test("stores and reconstructs projects with ordered children", async () => {
    const t = await seeded()

    await expect(
      t.query(api.projects.list, { serviceSecret })
    ).resolves.toEqual([project])
    await expect(
      t.query(api.projects.findDuplicateHashes, {
        serviceSecret,
        hashes: [paperFile.hash],
      })
    ).resolves.toEqual([paperFile.hash])
  })

  test("appends files beyond the initial three-file batch", async () => {
    const t = await seeded()
    const files = ["b", "c", "d"].map((hashCharacter, index) => ({
      key: `paper-${String(index + 2)}-key`,
      hash: hashCharacter.repeat(64),
      name: `paper-${String(index + 2)}.pdf`,
      size: (index + 2) * 1024,
      uploadedAt: `2026-08-27T00:0${String(index + 1)}:00.000Z`,
      url: `https://example.ufs.sh/f/paper-${String(index + 2)}-key`,
    }))

    const appended = await t.mutation(api.projects.appendFiles, {
      serviceSecret,
      projectId: project.id,
      files,
      updatedAt: "2026-08-27T00:10:00.000Z",
    })

    expect(appended.files.map((file) => file.key)).toEqual([
      "paper-key",
      "paper-2-key",
      "paper-3-key",
      "paper-4-key",
    ])

    await expect(
      t.mutation(api.projects.appendFiles, {
        serviceSecret,
        projectId: project.id,
        files,
        updatedAt: "2026-08-27T00:10:00.000Z",
      })
    ).resolves.toEqual(appended)
  })

  test("tracks total and unique share views", async () => {
    const t = await seeded()
    const record = {
      schemaVersion: 1 as const,
      kind: "share-link" as const,
      id: "e9dd137a-7d58-4a17-b575-e844613852cc",
      projectId: project.id,
      label: "Reviewer A",
      tokenHash: "b".repeat(64),
      createdAt: "2026-08-27T00:01:00.000Z",
    }
    await t.mutation(api.sharing.createLink, { serviceSecret, record })

    await Promise.all(
      (
        [
          ["8e71fa7f-aaeb-459c-899e-23054e616357", "2026-08-27T00:02:00.000Z"],
          ["fe4e9b34-7596-424a-a1d0-479a60bb9d2a", "2026-08-27T00:03:00.000Z"],
        ] as const
      ).map(([externalId, viewedAt]) =>
        t.mutation(api.sharing.recordView, {
          serviceSecret,
          tokenHash: record.tokenHash,
          externalId,
          visitorHash: "c".repeat(64),
          viewedAt,
        })
      )
    )

    const [summary] = await t.query(api.sharing.listLinks, {
      serviceSecret,
      projectId: project.id,
    })
    expect(summary).toMatchObject({ totalViews: 2, uniqueVisitors: 1 })
  })

  test("rate limits critiques per visitor and link", async () => {
    const t = await seeded()
    const link = {
      schemaVersion: 1 as const,
      kind: "share-link" as const,
      id: "46ba556f-3a2f-42b7-8352-793f78e567b8",
      projectId: project.id,
      label: "Reviewer B",
      tokenHash: "d".repeat(64),
      createdAt: "2026-08-27T00:01:00.000Z",
    }
    await t.mutation(api.sharing.createLink, { serviceSecret, record: link })

    const critique = (index: number) => ({
      schemaVersion: 1 as const,
      kind: "critique" as const,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      shareLinkId: link.id,
      projectId: project.id,
      fileKey: paperFile.key,
      displayName: "Reviewer",
      comment: `Comment ${String(index)}`,
      visitorHash: "e".repeat(64),
      createdAt: `2026-08-27T00:01:0${String(index)}.000Z`,
    })

    await Promise.all(
      [1, 2, 3].map((index) =>
        t.mutation(api.sharing.submitCritique, {
          serviceSecret,
          tokenHash: link.tokenHash,
          record: critique(index),
          cutoff: Date.parse("2026-08-27T00:00:00.000Z"),
        })
      )
    )

    await expect(
      t.mutation(api.sharing.submitCritique, {
        serviceSecret,
        tokenHash: link.tokenHash,
        record: critique(4),
        cutoff: Date.parse("2026-08-27T00:00:00.000Z"),
      })
    ).rejects.toThrow("Too many comments")
  })

  test("removes a project and its dependent records in scheduled batches", async () => {
    vi.useFakeTimers()
    const t = await seeded()
    const result = await t.mutation(api.projects.beginDelete, {
      serviceSecret,
      projectId: project.id,
    })

    expect(result).toEqual({ sharingRecordCount: 0 })
    await expect(
      t.query(api.projects.get, { serviceSecret, projectId: project.id })
    ).resolves.toBeNull()

    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const remaining = await t.run((ctx) => ctx.db.query("projects").take(1))
    expect(remaining).toEqual([])
    vi.useRealTimers()
  })
})
