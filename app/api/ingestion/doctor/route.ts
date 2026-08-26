import { NextResponse, type NextRequest } from "next/server"

import { authenticateBasicOwner, basicAuthHeaders } from "@/lib/owner-api-auth"
import { maxPdfBatchSize, maxPdfBytes } from "@/lib/paper-upload"
import { isPaperStorageConfigured } from "@/lib/paper-storage"

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
      storageConfigured: isPaperStorageConfigured(),
      limits: { maxBatchSize: maxPdfBatchSize, maxPdfBytes },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
