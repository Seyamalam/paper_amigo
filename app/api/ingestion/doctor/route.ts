import { NextResponse, type NextRequest } from "next/server"

import { authenticateBasicOwner, basicAuthHeaders } from "@/lib/owner-api-auth"
import { maxPdfBatchSize, maxPdfBytes } from "@/lib/paper-upload"
import { isProjectStorageConfigured } from "@/lib/project-storage"

export function GET(request: NextRequest): NextResponse {
  if (!authenticateBasicOwner(request.headers.get("authorization"))) {
    return NextResponse.json(
      { error: "Invalid owner credentials" },
      { headers: basicAuthHeaders(), status: 401 }
    )
  }

  return NextResponse.json(
    {
      ok: true,
      storageConfigured: isProjectStorageConfigured(),
      limits: { maxBatchSize: maxPdfBatchSize, maxPdfBytes },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
