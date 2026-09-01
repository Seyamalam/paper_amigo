import { afterEach, describe, expect, it, vi } from "vitest"

import {
  appendProjectFiles,
  CliRequestError,
  deleteProject,
  defaultPaperAmigoUrl,
  readCliConfiguration,
  replaceProjectFile,
} from "@/cli/client"

const storedCredentials = {
  appUrl: defaultPaperAmigoUrl,
  email: "owner@example.com",
  password: "saved-password",
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("readCliConfiguration", () => {
  it("uses a saved login and the production URL", () => {
    const configuration = readCliConfiguration({}, storedCredentials)

    expect(configuration.appUrl.href).toBe(`${defaultPaperAmigoUrl}/`)
    expect(configuration.authorization).toBe(
      `Basic ${Buffer.from("owner@example.com:saved-password").toString("base64")}`
    )
  })

  it("lets complete environment credentials override the saved login", () => {
    const configuration = readCliConfiguration(
      {
        PAPER_AMIGO_OWNER_EMAIL: "other@example.com",
        PAPER_AMIGO_OWNER_PASSWORD: "environment-password",
      },
      storedCredentials
    )

    expect(configuration.authorization).toBe(
      `Basic ${Buffer.from("other@example.com:environment-password").toString("base64")}`
    )
  })

  it("asks the user to log in when no credentials exist", () => {
    expect(() => readCliConfiguration({})).toThrow(
      new CliRequestError(
        "No saved owner login. Run paper-amigo login",
        "missing-credentials"
      )
    )
  })

  it("rejects insecure remote URLs", () => {
    expect(() =>
      readCliConfiguration(
        { PAPER_AMIGO_URL: "http://example.com" },
        storedCredentials
      )
    ).toThrow("PAPER_AMIGO_URL must use HTTPS outside localhost")
  })
})

describe("replaceProjectFile", () => {
  it("sends an authenticated replacement request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        project: {
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
              key: "new-key",
              hash: "b".repeat(64),
              name: "revised.pdf",
              size: 200,
              uploadedAt: "2026-08-27T10:00:00.000Z",
              url: "https://paper-amigo.ufs.sh/f/new-key",
            },
          ],
          createdAt: "2026-08-26T10:00:00.000Z",
          updatedAt: "2026-08-27T10:00:01.000Z",
        },
        previousFileDeleted: true,
      })
    )
    vi.stubGlobal("fetch", fetchMock)
    const configuration = readCliConfiguration({}, storedCredentials)

    const result = await replaceProjectFile(
      configuration,
      "416d1b34-b331-4f18-8224-39f8a149908f",
      "old/key",
      {
        file: {
          key: "new-key",
          hash: "b".repeat(64),
          name: "revised.pdf",
          size: 200,
          url: "https://paper-amigo.ufs.sh/f/new-key",
        },
      }
    )

    expect(result.previousFileDeleted).toBe(true)
    const firstCall = fetchMock.mock.calls[0]

    expect(firstCall).toBeDefined()

    if (!firstCall) {
      throw new Error("Replacement request was not sent")
    }

    const [requestUrl, request] = firstCall

    expect(requestUrl).toBeInstanceOf(URL)

    if (!(requestUrl instanceof URL)) {
      throw new Error("Replacement URL was not normalized")
    }

    expect(requestUrl.pathname).toBe(
      "/api/projects/416d1b34-b331-4f18-8224-39f8a149908f/files/old%2Fkey"
    )
    expect(request?.method).toBe("PUT")
    expect(new Headers(request?.headers).get("Authorization")).toBe(
      configuration.authorization
    )
  })
})

describe("appendProjectFiles", () => {
  it("posts new PDFs to the existing project", async () => {
    const appendedFile = {
      key: "paper-four-key",
      hash: "d".repeat(64),
      name: "paper-four.pdf",
      size: 400,
      url: "https://paper-amigo.ufs.sh/f/paper-four-key",
    }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        project: {
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
              ...appendedFile,
              uploadedAt: "2026-08-27T10:00:00.000Z",
            },
          ],
          createdAt: "2026-08-26T10:00:00.000Z",
          updatedAt: "2026-08-27T10:00:01.000Z",
        },
      })
    )
    vi.stubGlobal("fetch", fetchMock)
    const configuration = readCliConfiguration({}, storedCredentials)

    const result = await appendProjectFiles(
      configuration,
      "416d1b34-b331-4f18-8224-39f8a149908f",
      { files: [appendedFile] }
    )

    expect(result.files[0]?.key).toBe("paper-four-key")
    const firstCall = fetchMock.mock.calls[0]
    expect(firstCall).toBeDefined()

    if (!firstCall) throw new Error("Append request was not sent")
    const [requestUrl, request] = firstCall

    expect(requestUrl).toBeInstanceOf(URL)
    if (!(requestUrl instanceof URL)) {
      throw new Error("Append URL was not normalized")
    }
    expect(requestUrl.pathname).toBe(
      "/api/projects/416d1b34-b331-4f18-8224-39f8a149908f/files"
    )
    expect(request?.method).toBe("POST")
  })
})

describe("deleteProject", () => {
  it("sends an authenticated confirmed deletion request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        deleted: true,
        deletedManifests: 2,
        deletedProjectFiles: 3,
        deletedSharingRecords: 4,
        projectId: "416d1b34-b331-4f18-8224-39f8a149908f",
      })
    )
    vi.stubGlobal("fetch", fetchMock)
    const configuration = readCliConfiguration({}, storedCredentials)

    const result = await deleteProject(
      configuration,
      "416d1b34-b331-4f18-8224-39f8a149908f",
      "Study title"
    )

    expect(result.deleted).toBe(true)
    const firstCall = fetchMock.mock.calls[0]

    expect(firstCall).toBeDefined()

    if (!firstCall) {
      throw new Error("Deletion request was not sent")
    }

    const [requestUrl, request] = firstCall

    expect(requestUrl).toBeInstanceOf(URL)

    if (!(requestUrl instanceof URL)) {
      throw new Error("Deletion URL was not normalized")
    }

    expect(requestUrl.pathname).toBe(
      "/api/projects/416d1b34-b331-4f18-8224-39f8a149908f"
    )
    expect(request?.method).toBe("DELETE")
    expect(request?.body).toBe(JSON.stringify({ confirmation: "Study title" }))
    expect(new Headers(request?.headers).get("Authorization")).toBe(
      configuration.authorization
    )
  })
})
