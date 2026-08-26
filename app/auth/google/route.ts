import { getAuth } from "@/lib/auth"
import { getAuthEnvironmentState } from "@/lib/auth-environment"

export async function GET(request: Request): Promise<Response> {
  const state = getAuthEnvironmentState()

  if (state.kind !== "configured") {
    return Response.redirect(
      new URL("/sign-in?error=configuration", request.url)
    )
  }

  const result = await getAuth().api.signInSocial({
    body: {
      provider: "google",
      callbackURL: "/",
      newUserCallbackURL: "/",
      errorCallbackURL: "/sign-in",
    },
    returnHeaders: true,
  })

  if (!result.response.url) {
    return Response.redirect(new URL("/sign-in?error=oauth", request.url))
  }

  const responseHeaders = new Headers(result.headers)
  responseHeaders.set("location", result.response.url)

  return new Response(null, { status: 302, headers: responseHeaders })
}
