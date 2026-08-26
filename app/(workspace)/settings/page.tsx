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
import { isPaperStorageConfigured } from "@/lib/paper-storage"

type ProviderStatus = "Connected" | "Demo" | "Not connected"

type Provider = Readonly<{
  name: string
  purpose: string
  status: ProviderStatus
  variables: readonly string[]
}>

function isConfigured(variable: string): boolean {
  return Boolean(process.env[variable]?.trim())
}

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
      purpose: "Private PDF bytes and short-lived signed access",
      status: isPaperStorageConfigured() ? "Connected" : "Not connected",
      variables: ["UPLOADTHING_TOKEN"],
    },
    {
      name: "Managed KV",
      purpose: "Share grants, view aggregates, and private critiques",
      status:
        isConfigured("KV_REST_API_URL") && isConfigured("KV_REST_API_TOKEN")
          ? "Connected"
          : "Not connected",
      variables: ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    },
    {
      name: "CLI ingestion",
      purpose: "Scoped uploads and paper listing for local agents",
      status: isConfigured("PAPER_AMIGO_INGESTION_TOKEN")
        ? "Connected"
        : "Not connected",
      variables: ["PAPER_AMIGO_INGESTION_TOKEN"],
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
