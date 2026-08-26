import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { getOwnerRequestAccess } from "@/lib/owner-request-access"
import {
  createShareLink,
  getShareLinkSummaries,
  isSharingStorageConfigured,
} from "@/lib/sharing-storage"
import { createShareLinkInputSchema } from "@/lib/sharing"
import type { ShareLinkSummary } from "@/lib/sharing"

const projectIdSchema = z.uuid()

type ShareRouteBody =
  | Readonly<{ error: string }>
  | Readonly<{ links: readonly ShareLinkSummary[] }>
  | Readonly<{
      link: Readonly<{ id: string; label: string; path: string }>
    }>

function json(body: ShareRouteBody, status = 200): NextResponse {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  })
}

async function authorize(request: NextRequest): Promise<boolean> {
  const access = await getOwnerRequestAccess(request)

  return access.kind === "demo" || access.kind === "owner"
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/projects/[projectId]/shares">
): Promise<NextResponse> {
  if (!(await authorize(request))) {
    return json({ error: "Sign in required" }, 401)
  }

  const parsedId = projectIdSchema.safeParse((await context.params).projectId)

  if (!parsedId.success) {
    return json({ error: "Invalid project" }, 400)
  }

  return json({ links: await getShareLinkSummaries(parsedId.data) })
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/projects/[projectId]/shares">
): Promise<NextResponse> {
  if (!(await authorize(request))) {
    return json({ error: "Sign in required" }, 401)
  }

  if (!isSharingStorageConfigured()) {
    return json({ error: "Sharing storage is not configured" }, 503)
  }

  const parsedId = projectIdSchema.safeParse((await context.params).projectId)
  const input = createShareLinkInputSchema.safeParse(
    await request.json().catch(() => undefined)
  )

  if (!parsedId.success || !input.success) {
    return json(
      {
        error: !input.success
          ? (input.error.issues[0]?.message ?? "Invalid share link")
          : "Invalid project",
      },
      400
    )
  }

  try {
    const created = await createShareLink(parsedId.data, input.data)

    return json(
      {
        link: {
          id: created.record.id,
          label: created.record.label,
          path: `/s/${created.token}`,
        },
      },
      201
    )
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Share link creation failed",
      },
      400
    )
  }
}
