import { getAuth } from "@/lib/auth"
import { getAuthEnvironmentState } from "@/lib/auth-environment"

export async function POST(request: Request): Promise<Response> {
  const state = getAuthEnvironmentState()

  if (state.kind !== "configured") {
    return Response.redirect(new URL("/sign-in", request.url), 303)
  }

  const result = await getAuth().api.signOut({
    headers: request.headers,
    body: { callbackURL: "/sign-in" },
    returnHeaders: true,
  })

  const location = new URL(result.response.url ?? "/sign-in", request.url)
  const responseHeaders = new Headers(result.headers)
  responseHeaders.set("location", location.toString())

  return new Response(null, { status: 303, headers: responseHeaders })
}
