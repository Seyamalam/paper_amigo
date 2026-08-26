import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { getOwnerRequestAccess } from "@/lib/owner-request-access"
import { discardProjectUploads } from "@/lib/project-storage"
import { uploadedProjectFileSchema } from "@/lib/projects"

const discardSchema = z.object({
  files: z.array(uploadedProjectFileSchema).min(1).max(10),
})

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const access = await getOwnerRequestAccess(request)

  if (access.kind !== "demo" && access.kind !== "owner") {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const input = discardSchema.safeParse(
    await request.json().catch(() => undefined)
  )

  if (!input.success) {
    return NextResponse.json(
      { error: "Invalid uploaded files" },
      { status: 400 }
    )
  }

  try {
    await discardProjectUploads(input.data.files)
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json(
      { error: "Upload cleanup failed" },
      { status: 400 }
    )
  }
}
