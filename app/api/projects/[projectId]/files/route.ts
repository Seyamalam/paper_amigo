import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { getOwnerRequestAccess } from "@/lib/owner-request-access"
import {
  appendProjectFiles,
  isProjectStorageConfigured,
} from "@/lib/project-storage"
import {
  appendProjectFilesInputSchema,
  type AppendProjectFilesResponse,
} from "@/lib/projects"

type AppendProjectFilesBody =
  Readonly<{ error: string }> | AppendProjectFilesResponse

function noStoreJson(body: AppendProjectFilesBody, status = 200): NextResponse {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  })
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/projects/[projectId]/files">
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
  const input = appendProjectFilesInputSchema.safeParse(
    await request.json().catch(() => undefined)
  )

  if (!projectId.success || !input.success) {
    return noStoreJson({ error: "Invalid project files" }, 400)
  }

  try {
    return noStoreJson({
      project: await appendProjectFiles(projectId.data, input.data),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "File append failed"
    const status = message.endsWith("not found")
      ? 404
      : message.includes("already")
        ? 409
        : 400

    return noStoreJson({ error: message }, status)
  }
}
