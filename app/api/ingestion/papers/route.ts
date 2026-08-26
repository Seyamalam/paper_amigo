import { NextResponse, type NextRequest } from "next/server"

import { authenticateBasicOwner, basicAuthHeaders } from "@/lib/owner-api-auth"
import {
  getProjectLibrary,
  isProjectStorageConfigured,
} from "@/lib/project-storage"

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!authenticateBasicOwner(request.headers.get("authorization"))) {
    return NextResponse.json(
      { error: "Invalid owner credentials" },
      { headers: basicAuthHeaders(), status: 401 }
    )
  }

  if (!isProjectStorageConfigured()) {
    return NextResponse.json(
      { error: "UploadThing is not configured" },
      { headers: { "Cache-Control": "no-store" }, status: 503 }
    )
  }

  const library = await getProjectLibrary()

  return NextResponse.json(
    { projects: library.projects },
    { headers: { "Cache-Control": "no-store" } }
  )
}
