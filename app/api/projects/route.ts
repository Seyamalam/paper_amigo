import { NextResponse, type NextRequest } from "next/server"

import { getOwnerRequestAccess } from "@/lib/owner-request-access"
import {
  createProject,
  getProjectLibrary,
  isProjectStorageConfigured,
} from "@/lib/project-storage"
import { createProjectInputSchema } from "@/lib/projects"
import type { Project } from "@/lib/projects"

type ProjectApiBody =
  | Readonly<{ error: string }>
  | Readonly<{ project: Project }>
  | Readonly<{ projects: readonly Project[] }>

function noStoreJson(body: ProjectApiBody, status = 200): NextResponse {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  })
}

async function isOwner(request: NextRequest): Promise<boolean> {
  const access = await getOwnerRequestAccess(request)

  return access.kind === "demo" || access.kind === "owner"
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await isOwner(request))) {
    return noStoreJson({ error: "Sign in required" }, 401)
  }

  if (!isProjectStorageConfigured()) {
    return noStoreJson({ error: "UploadThing is not configured" }, 503)
  }

  const library = await getProjectLibrary()

  return noStoreJson({ projects: library.projects })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await isOwner(request))) {
    return noStoreJson({ error: "Sign in required" }, 401)
  }

  if (!isProjectStorageConfigured()) {
    return noStoreJson({ error: "UploadThing is not configured" }, 503)
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return noStoreJson({ error: "Invalid request" }, 400)
  }

  const input = createProjectInputSchema.safeParse(body)

  if (!input.success) {
    return noStoreJson(
      { error: input.error.issues[0]?.message ?? "Invalid project" },
      400
    )
  }

  try {
    return noStoreJson({ project: await createProject(input.data) }, 201)
  } catch (error) {
    return noStoreJson(
      {
        error:
          error instanceof Error ? error.message : "Project creation failed",
      },
      400
    )
  }
}
