import { getAuth } from "@/lib/auth"
import { getAuthEnvironmentState } from "@/lib/auth-environment"

async function handleAuthRequest(request: Request): Promise<Response> {
  const state = getAuthEnvironmentState()

  if (state.kind !== "configured") {
    return Response.json(
      { error: "authentication_not_configured" },
      { status: 503 }
    )
  }

  return getAuth().handler(request)
}

export function GET(request: Request): Promise<Response> {
  return handleAuthRequest(request)
}

export function POST(request: Request): Promise<Response> {
  return handleAuthRequest(request)
}
