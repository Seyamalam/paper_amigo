import { randomBytes } from "node:crypto"

import { version as uploadThingVersion } from "uploadthing/client"
import { z } from "zod"

import {
  ingestionDoctorResponseSchema,
  ingestionErrorSchema,
  ingestionPapersResponseSchema,
} from "../lib/ingestion-contract"
import { duplicateCheckResponseSchema } from "../lib/paper-upload"

const presignedUploadSchema = z.object({
  url: z.url(),
  key: z.string().min(1),
  name: z.string().min(1),
  customId: z.string().nullable(),
})

const presignedUploadsSchema = z.array(presignedUploadSchema).length(1)

const storageUploadResponseSchema = z.object({
  serverData: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
})

export const defaultPaperAmigoUrl = "https://paper-amigo.vercel.app"

export type StoredCliCredentials = Readonly<{
  appUrl: string
  email: string
  password: string
}>

export type CliEnvironment = Readonly<Record<string, string | undefined>>

export type CliConfiguration = Readonly<{
  appUrl: URL
  authorization: string
}>

type TraceHeaders = Readonly<{ b3: string; traceparent: string }>

export class CliRequestError extends Error {
  override readonly name = "CliRequestError"

  constructor(
    message: string,
    readonly code: string
  ) {
    super(message)
  }
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  )
}

function nonEmpty(value: string | undefined): string | undefined {
  const cleaned = value?.trim()

  if (!cleaned) {
    return undefined
  }

  return cleaned
}

export function readCliConfiguration(
  environment: CliEnvironment,
  storedCredentials?: StoredCliCredentials
): CliConfiguration {
  const rawUrl =
    nonEmpty(environment["PAPER_AMIGO_URL"]) ??
    storedCredentials?.appUrl ??
    defaultPaperAmigoUrl
  const environmentEmail = nonEmpty(environment["PAPER_AMIGO_OWNER_EMAIL"])
  const environmentPassword = environment["PAPER_AMIGO_OWNER_PASSWORD"]
  const hasEnvironmentEmail = Boolean(environmentEmail)
  const hasEnvironmentPassword = Boolean(environmentPassword)
  const useEnvironmentCredentials =
    hasEnvironmentEmail && hasEnvironmentPassword
  const email = useEnvironmentCredentials
    ? environmentEmail
    : storedCredentials?.email
  const password = useEnvironmentCredentials
    ? environmentPassword
    : storedCredentials?.password

  let appUrl: URL

  try {
    appUrl = new URL(rawUrl)
  } catch {
    throw new CliRequestError("PAPER_AMIGO_URL is invalid", "invalid-url")
  }

  if (appUrl.protocol !== "https:" && !isLocalHost(appUrl.hostname)) {
    throw new CliRequestError(
      "PAPER_AMIGO_URL must use HTTPS outside localhost",
      "insecure-url"
    )
  }

  if (appUrl.protocol !== "https:" && appUrl.protocol !== "http:") {
    throw new CliRequestError(
      "PAPER_AMIGO_URL must use HTTP or HTTPS",
      "invalid-url"
    )
  }

  if (!email || password === undefined || password.length === 0) {
    throw new CliRequestError(
      "No saved owner login. Run paper-amigo login",
      "missing-credentials"
    )
  }

  appUrl.pathname = appUrl.pathname.replace(/\/+$/u, "") || "/"
  appUrl.search = ""
  appUrl.hash = ""

  return {
    appUrl,
    authorization: `Basic ${Buffer.from(`${email}:${password}`, "utf8").toString("base64")}`,
  }
}

function endpoint(configuration: CliConfiguration, path: string): URL {
  return new URL(
    path.replace(/^\//u, ""),
    `${configuration.appUrl.href.replace(/\/$/u, "")}/`
  )
}

async function readError(response: Response): Promise<string> {
  try {
    const parsed = ingestionErrorSchema.safeParse(await response.json())
    return parsed.success ? parsed.data.error : response.statusText
  } catch {
    return response.statusText
  }
}

async function fetchAuthenticated(
  configuration: CliConfiguration,
  path: string,
  init?: RequestInit
): Promise<Response> {
  let response: Response

  try {
    const headers = new Headers(init?.headers)
    headers.set("Authorization", configuration.authorization)
    response = await fetch(endpoint(configuration, path), { ...init, headers })
  } catch {
    throw new CliRequestError("Could not reach Paper Amigo", "network-error")
  }

  if (!response.ok) {
    throw new CliRequestError(
      (await readError(response)) ||
        `Request failed (${String(response.status)})`,
      response.status === 401 ? "authentication-failed" : "request-failed"
    )
  }

  return response
}

export async function doctor(configuration: CliConfiguration) {
  const response = await fetchAuthenticated(
    configuration,
    "/api/ingestion/doctor"
  )
  const parsed = ingestionDoctorResponseSchema.safeParse(
    await response.json().catch(() => undefined)
  )

  if (!parsed.success) {
    throw new CliRequestError(
      "Server returned an invalid response",
      "invalid-response"
    )
  }

  return parsed.data
}

export async function listPapers(configuration: CliConfiguration) {
  const response = await fetchAuthenticated(
    configuration,
    "/api/ingestion/papers"
  )
  const parsed = ingestionPapersResponseSchema.safeParse(
    await response.json().catch(() => undefined)
  )

  if (!parsed.success) {
    throw new CliRequestError(
      "Server returned an invalid response",
      "invalid-response"
    )
  }

  return parsed.data.papers
}

export async function findDuplicates(
  configuration: CliConfiguration,
  hashes: readonly string[]
): Promise<ReadonlySet<string>> {
  const response = await fetchAuthenticated(
    configuration,
    "/api/papers/duplicates",
    {
      body: JSON.stringify({ hashes }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  )
  const parsed = duplicateCheckResponseSchema.safeParse(
    await response.json().catch(() => undefined)
  )

  if (!parsed.success) {
    throw new CliRequestError(
      "Server returned an invalid response",
      "invalid-response"
    )
  }

  return new Set(parsed.data.duplicates)
}

function traceHeaders(): TraceHeaders {
  const traceId = randomBytes(16).toString("hex")
  const spanId = randomBytes(8).toString("hex")

  return {
    b3: `${traceId}-${spanId}-01`,
    traceparent: `00-${traceId}-${spanId}-01`,
  }
}

export async function uploadPdf(
  configuration: CliConfiguration,
  file: File,
  hash: string
): Promise<Readonly<{ id: string; name: string }>> {
  const traces = traceHeaders()
  const uploadUrl = endpoint(configuration, "/api/uploadthing")
  uploadUrl.searchParams.set("actionType", "upload")
  uploadUrl.searchParams.set("slug", "paperPdf")
  const presignedResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: configuration.authorization,
      "Content-Type": "application/json",
      "x-uploadthing-package": "paper-amigo-cli",
      "x-uploadthing-version": uploadThingVersion,
      ...traces,
    },
    body: JSON.stringify({
      input: { hashes: [hash] },
      files: [
        {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        },
      ],
    }),
  })

  if (!presignedResponse.ok) {
    throw new CliRequestError(
      (await readError(presignedResponse)) || "Upload was rejected",
      presignedResponse.status === 401 || presignedResponse.status === 403
        ? "authentication-failed"
        : "upload-rejected"
    )
  }

  const presigned = presignedUploadsSchema.safeParse(
    await presignedResponse.json().catch(() => undefined)
  )

  if (!presigned.success) {
    throw new CliRequestError(
      "Invalid upload authorization",
      "invalid-response"
    )
  }

  const authorization = presigned.data[0]

  if (!authorization) {
    throw new CliRequestError(
      "Invalid upload authorization",
      "invalid-response"
    )
  }

  const formData = new FormData()
  formData.append("file", file)
  const storageResponse = await fetch(authorization.url, {
    method: "PUT",
    headers: {
      Range: "bytes=0-",
      "x-uploadthing-version": uploadThingVersion,
      ...traces,
    },
    body: formData,
  })

  if (!storageResponse.ok) {
    throw new CliRequestError("Storage upload failed", "storage-upload-failed")
  }

  const uploaded = storageUploadResponseSchema.safeParse(
    await storageResponse.json().catch(() => undefined)
  )

  if (!uploaded.success) {
    throw new CliRequestError(
      "Storage returned an invalid response",
      "invalid-response"
    )
  }

  return uploaded.data.serverData
}
