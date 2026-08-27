import "server-only"

import { createHmac } from "node:crypto"

import { ConvexHttpClient } from "convex/browser"

import { api } from "@/convex/_generated/api"
import type { Project } from "@/lib/projects"
import type { CritiqueRecord, SharingRecord } from "@/lib/sharing"

type ConvexAuthor = Readonly<{
  name: string
  designation: string
  university: string
  orcid?: string
  profileUrl?: string
}>

interface MutableConvexAuthor {
  name: string
  designation: string
  university: string
  orcid?: string
  profileUrl?: string
}

type ConvexCritiqueRecord = Omit<CritiqueRecord, "email" | "pageNumber"> &
  Readonly<{ email?: string; pageNumber?: number }>

function authorForConvex(author: Project["authors"][number]): ConvexAuthor {
  const normalized: MutableConvexAuthor = {
    name: author.name,
    designation: author.designation,
    university: author.university,
  }

  if (author.orcid !== undefined) normalized.orcid = author.orcid
  if (author.profileUrl !== undefined) normalized.profileUrl = author.profileUrl
  return normalized
}

let client: ConvexHttpClient | undefined

function convexUrl(): string | undefined {
  const value = (
    process.env["CONVEX_URL"] ?? process.env["NEXT_PUBLIC_CONVEX_URL"]
  )?.trim()

  if (!value) {
    return undefined
  }

  const parsed = new URL(value)

  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".convex.cloud")
  ) {
    throw new Error("CONVEX_URL is invalid")
  }

  return parsed.toString().replace(/\/$/u, "")
}

export function getConvexServiceSecret(): string {
  const explicit = process.env["PAPER_AMIGO_CONVEX_SERVICE_SECRET"]?.trim()

  if (explicit) {
    return explicit
  }

  const authSecret = process.env["BETTER_AUTH_SECRET"]?.trim()

  if (!authSecret) {
    throw new Error(
      "PAPER_AMIGO_CONVEX_SERVICE_SECRET or BETTER_AUTH_SECRET is required"
    )
  }

  return createHmac("sha256", authSecret)
    .update("paper-amigo:convex-service:v1")
    .digest("hex")
}

export function isConvexConfigured(): boolean {
  try {
    return Boolean(convexUrl() && getConvexServiceSecret())
  } catch {
    return false
  }
}

export function getConvexClient(): ConvexHttpClient {
  const url = convexUrl()

  if (!url) {
    throw new Error("CONVEX_URL is not configured")
  }

  client ??= new ConvexHttpClient(url)
  return client
}

export function projectForConvex(project: Project) {
  return {
    ...project,
    authors: project.authors.map(authorForConvex),
  }
}

export function sharingRecordForConvex(record: SharingRecord) {
  if (record.kind !== "critique") {
    return record
  }

  return critiqueRecordForConvex(record)
}

export function critiqueRecordForConvex(
  record: CritiqueRecord
): ConvexCritiqueRecord {
  const { email, pageNumber, ...required } = record
  const normalized: {
    email?: string
    pageNumber?: number
  } & Omit<CritiqueRecord, "email" | "pageNumber"> = required

  if (email !== undefined) normalized.email = email
  if (pageNumber !== undefined) normalized.pageNumber = pageNumber
  return normalized
}

export { api as convexApi }
