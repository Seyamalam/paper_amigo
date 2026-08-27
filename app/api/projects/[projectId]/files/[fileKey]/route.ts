import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { getOwnerRequestAccess } from "@/lib/owner-request-access"
import {
  isProjectStorageConfigured,
  replaceProjectFile,
} from "@/lib/project-storage"
import {
  replaceProjectFileInputSchema,
  type ReplaceProjectFileResponse,
} from "@/lib/projects"

type ReplaceProjectFileBody =
  Readonly<{ error: string }> | ReplaceProjectFileResponse

function noStoreJson(body: ReplaceProjectFileBody, status = 200): NextResponse {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  })
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/projects/[projectId]/files/[fileKey]">
): Promise<NextResponse> {
  const access = await getOwnerRequestAccess(request)

  if (access.kind !== "demo" && access.kind !== "owner") {
    return noStoreJson({ error: "Sign in required" }, 401)
  }

  if (!isProjectStorageConfigured()) {
    return noStoreJson({ error: "Storage is not configured" }, 503)
  }

  const parameters = await context.params
  const projectId = z.uuid().safeParse(parameters.projectId)
  const fileKey = z.string().min(1).max(512).safeParse(parameters.fileKey)
  const input = replaceProjectFileInputSchema.safeParse(
    await request.json().catch(() => undefined)
  )

  if (!projectId.success || !fileKey.success || !input.success) {
    return noStoreJson({ error: "Invalid file replacement" }, 400)
  }

  try {
    const replaced = await replaceProjectFile(
      projectId.data,
      fileKey.data,
      input.data
    )

    return noStoreJson(replaced)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "File replacement failed"
    const status = message.endsWith("not found")
      ? 404
      : message.includes("already")
        ? 409
        : 400

    return noStoreJson({ error: message }, status)
  }
}
