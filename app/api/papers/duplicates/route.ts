import { NextResponse, type NextRequest } from "next/server"

import { getOwnerRequestAccess } from "@/lib/owner-request-access"
import {
  findDuplicatePaperHashes,
  isPaperStorageConfigured,
} from "@/lib/paper-storage"
import { paperUploadInputSchema } from "@/lib/paper-upload"

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await getOwnerRequestAccess(request)

  if (access.kind !== "demo" && access.kind !== "owner") {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  if (!isPaperStorageConfigured()) {
    return NextResponse.json(
      { error: "UploadThing is not configured" },
      { status: 503 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const input = paperUploadInputSchema.safeParse(body)

  if (!input.success) {
    return NextResponse.json({ error: "Invalid PDF hashes" }, { status: 400 })
  }

  const duplicates = await findDuplicatePaperHashes(input.data.hashes)

  return NextResponse.json({ duplicates })
}
