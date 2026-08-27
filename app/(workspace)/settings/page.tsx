import {
  Check,
  CheckCircle2,
  CircleAlert,
  KeyRound,
  ShieldCheck,
} from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { Badge } from "@/components/ui/badge"
import { getAuthEnvironmentState } from "@/lib/auth-environment"
import { isConvexConfigured } from "@/lib/convex-server"
import { isUploadThingConfigured } from "@/lib/project-storage"

type ProviderStatus = "Connected" | "Demo" | "Not connected"

type Provider = Readonly<{
  name: string
  purpose: string
  status: ProviderStatus
  variables: readonly string[]
}>

export default function SettingsPage() {
  const authState = getAuthEnvironmentState()
  const providers: readonly Provider[] = [
    {
      name: "Owner login",
      purpose: "Single owner credential and encrypted stateless sessions",
      status:
        authState.kind === "configured"
          ? "Connected"
          : authState.kind === "demo"
            ? "Demo"
            : "Not connected",
      variables: [
        "BETTER_AUTH_SECRET",
        "PAPER_AMIGO_OWNER_EMAIL",
        "PAPER_AMIGO_OWNER_PASSWORD",
      ],
    },
    {
      name: "UploadThing",
      purpose: "Public-read PDF files",
      status: isUploadThingConfigured() ? "Connected" : "Not connected",
      variables: ["UPLOADTHING_TOKEN"],
    },
    {
      name: "Convex",
      purpose: "Projects, links, views, and critiques",
      status: isConvexConfigured() ? "Connected" : "Not connected",
      variables: ["CONVEX_URL"],
    },
    {
      name: "CLI ingestion",
      purpose: "Direct PDF uploads using the owner login",
      status: authState.kind === "configured" ? "Connected" : "Not connected",
      variables: ["PAPER_AMIGO_OWNER_EMAIL", "PAPER_AMIGO_OWNER_PASSWORD"],
    },
  ]

  return (
    <div className="space-y-7">
      <PageHeading eyebrow="Local configuration" title="Settings" />

      <div className="grid gap-3 lg:grid-cols-2">
        {providers.map((provider) => (
          <section key={provider.name} className="border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-9 place-items-center border bg-muted text-muted-foreground">
                <KeyRound aria-hidden="true" className="size-4" />
              </span>
              <Badge variant="outline" className="rounded-sm">
                {provider.status === "Connected" ? (
                  <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
                ) : (
                  <CircleAlert aria-hidden="true" data-icon="inline-start" />
                )}
                {provider.status}
              </Badge>
            </div>
            <h2 className="mt-5 text-base font-semibold">{provider.name}</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {provider.purpose}
            </p>
            <ul className="mt-4 space-y-2 border-t pt-4">
              {provider.variables.map((variable) => (
                <li
                  key={variable}
                  className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"
                >
                  <Check aria-hidden="true" className="size-3" />
                  {variable}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex gap-3 border bg-muted/40 p-4 text-xs leading-5">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Status checks read variable presence only. Values stay server-side.
      </div>
    </div>
  )
}
