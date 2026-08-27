import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { getOwnerRequestAccess } from "@/lib/owner-request-access"
import {
  deleteProjectStorage,
  getProject,
  isProjectStorageConfigured,
} from "@/lib/project-storage"
import {
  deleteProjectInputSchema,
  type DeleteProjectResponse,
} from "@/lib/projects"
import { isSharingStorageConfigured } from "@/lib/sharing-storage"

type DeleteProjectBody = Readonly<{ error: string }> | DeleteProjectResponse

function noStoreJson(body: DeleteProjectBody, status = 200): NextResponse {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  })
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/projects/[projectId]">
): Promise<NextResponse> {
  const access = await getOwnerRequestAccess(request)

  if (access.kind !== "demo" && access.kind !== "owner") {
    return noStoreJson({ error: "Sign in required" }, 401)
  }

  if (!isProjectStorageConfigured() || !isSharingStorageConfigured()) {
    return noStoreJson({ error: "Storage is not configured" }, 503)
  }

  const projectId = z.uuid().safeParse((await context.params).projectId)
  const input = deleteProjectInputSchema.safeParse(
    await request.json().catch(() => undefined)
  )

  if (!projectId.success || !input.success) {
    return noStoreJson({ error: "Invalid project deletion" }, 400)
  }

  const project = await getProject(projectId.data)

  if (!project) {
    return noStoreJson({
      deleted: false,
      deletedManifests: 0,
      deletedProjectFiles: 0,
      deletedSharingRecords: 0,
      projectId: projectId.data,
    })
  }

  if (input.data.confirmation !== project.title) {
    return noStoreJson(
      { error: "Project title confirmation does not match" },
      409
    )
  }

  try {
    const storage = await deleteProjectStorage(project.id)

    return noStoreJson({
      deleted: true,
      projectId: project.id,
      ...storage,
    })
  } catch (error) {
    return noStoreJson(
      {
        error:
          error instanceof Error ? error.message : "Project deletion failed",
      },
      500
    )
  }
}
