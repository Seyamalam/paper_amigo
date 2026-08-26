import { NextResponse, type NextRequest } from "next/server"

import { readShareVisitor, setShareVisitorCookie } from "@/lib/share-visitor"
import { recordShareView } from "@/lib/sharing-storage"
import { shareTokenSchema } from "@/lib/sharing"

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/public/shares/[token]/view">
): Promise<NextResponse> {
  const token = shareTokenSchema.safeParse((await context.params).token)

  if (!token.success) {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 })
  }

  const visitor = readShareVisitor(request)

  try {
    await recordShareView(token.data, visitor.id)
    const response = new NextResponse(null, { status: 204 })

    if (visitor.isNew) {
      setShareVisitorCookie(response, visitor.id)
    }

    return response
  } catch {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 })
  }
}
