import { NextResponse, type NextRequest } from "next/server"

import { readShareVisitor, setShareVisitorCookie } from "@/lib/share-visitor"
import { submitCritique } from "@/lib/sharing-storage"
import { shareTokenSchema, submitCritiqueInputSchema } from "@/lib/sharing"

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/public/shares/[token]/critiques">
): Promise<NextResponse> {
  const token = shareTokenSchema.safeParse((await context.params).token)
  const input = submitCritiqueInputSchema.safeParse(
    await request.json().catch(() => undefined)
  )

  if (!token.success) {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 })
  }

  if (!input.success) {
    return NextResponse.json(
      {
        error: input.error.issues[0]?.message ?? "Invalid comment",
      },
      { status: 400 }
    )
  }

  const visitor = readShareVisitor(request)

  try {
    const critique = await submitCritique(token.data, visitor.id, input.data)
    const response = NextResponse.json(
      { critique: { id: critique.id, createdAt: critique.createdAt } },
      { status: 201 }
    )

    if (visitor.isNew) {
      setShareVisitorCookie(response, visitor.id)
    }

    return response
  } catch (error) {
    const knownMessages = new Set([
      "Share link not found",
      "Project file not found",
      "Too many comments. Wait a minute and try again",
    ])
    const message =
      error instanceof Error && knownMessages.has(error.message)
        ? error.message
        : "Comment could not be saved"

    return NextResponse.json(
      { error: message },
      { status: message === "Share link not found" ? 404 : 400 }
    )
  }
}
