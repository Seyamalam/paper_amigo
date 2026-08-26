import { NextResponse, type NextRequest } from "next/server"

import { authenticateBasicOwner, basicAuthHeaders } from "@/lib/owner-api-auth"
import { getPaperLibrary, isPaperStorageConfigured } from "@/lib/paper-storage"

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!authenticateBasicOwner(request.headers.get("authorization"))) {
    return NextResponse.json(
      { error: "Invalid owner credentials" },
      { headers: basicAuthHeaders(), status: 401 }
    )
  }

  if (!isPaperStorageConfigured()) {
    return NextResponse.json(
      { error: "UploadThing is not configured" },
      { headers: { "Cache-Control": "no-store" }, status: 503 }
    )
  }

  const library = await getPaperLibrary()

  return NextResponse.json(
    { papers: library.papers },
    { headers: { "Cache-Control": "no-store" } }
  )
}
