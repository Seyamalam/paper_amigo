import Link from "next/link"
import { Clock3, Eye, Link2, Plus, Users } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { PreviewNotice } from "@/components/paper-amigo/preview-notice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPaper, shareLinks } from "@/lib/papers"

function statusLabel(status: "active" | "expires-soon" | "revoked"): string {
  const labels = {
    active: "Active",
    "expires-soon": "Expires soon",
    revoked: "Revoked",
  } as const

  return labels[status]
}

export default function SharingPage() {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="3 active links"
        title="Share links"
        action={
          <Button
            disabled
            className="h-10 gap-2 px-4"
            title="Connect providers first"
          >
            <Plus aria-hidden="true" />
            New link
          </Button>
        }
      />
      <PreviewNotice />

      <section aria-label="Share links" className="border-t">
        {shareLinks.map((shareLink) => {
          const paper = getPaper(shareLink.paperId)

          if (paper === undefined) {
            return null
          }

          return (
            <article
              key={shareLink.id}
              className="grid gap-5 border-x border-b bg-card p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link2 aria-hidden="true" className="size-4" />
                  <h2 className="text-base font-semibold">{shareLink.label}</h2>
                  <Badge
                    variant="outline"
                    className="rounded-sm font-mono text-[9px] tracking-wide uppercase"
                  >
                    {statusLabel(shareLink.status)}
                  </Badge>
                </div>
                <Link
                  href={`/papers/${paper.id}`}
                  className="mt-2 block truncate font-mono text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {paper.fileName}
                </Link>
                <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Eye aria-hidden="true" className="size-3.5" />
                    <dt className="sr-only">Views</dt>
                    <dd>{shareLink.views} views</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users aria-hidden="true" className="size-3.5" />
                    <dt className="sr-only">Estimated visitors</dt>
                    <dd>{shareLink.visitors} estimated visitors</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock3 aria-hidden="true" className="size-3.5" />
                    <dt className="sr-only">Last opened</dt>
                    <dd>Opened {shareLink.lastOpened}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button asChild variant="outline">
                  <Link href="/s/demo-neural-operator-review">
                    Open preview
                  </Link>
                </Button>
                <Button
                  disabled
                  variant="outline"
                  title="Connect providers first"
                >
                  Copy link
                </Button>
                <Button
                  disabled
                  variant="ghost"
                  title="Connect providers first"
                >
                  Revoke
                </Button>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
