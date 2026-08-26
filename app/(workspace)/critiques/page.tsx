import Link from "next/link"
import { ArrowUpRight, Circle, FileText, MessageSquareText } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { PreviewNotice } from "@/components/paper-amigo/preview-notice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { critiques, getPaper } from "@/lib/papers"

export default function CritiquesPage() {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="2 unread"
        title="Critiques"
        action={
          <Button disabled variant="outline" title="Connect providers first">
            Export
          </Button>
        }
      />
      <PreviewNotice />

      <section aria-label="Critiques" className="grid gap-3 lg:grid-cols-2">
        {critiques.map((critique) => {
          const paper = getPaper(critique.paperId)

          if (paper === undefined) {
            return null
          }

          return (
            <article
              key={critique.id}
              className="relative border bg-card p-5 sm:p-6"
            >
              {critique.unread && (
                <Circle
                  aria-label="Unread"
                  className="absolute top-5 right-5 size-2 fill-foreground text-foreground"
                />
              )}
              <div className="flex items-center gap-2 pr-5">
                <MessageSquareText aria-hidden="true" className="size-4" />
                <h2 className="text-sm font-semibold">{critique.author}</h2>
                <span className="text-xs text-muted-foreground">
                  · {critique.receivedAt}
                </span>
              </div>
              <blockquote className="mt-5 border-l-2 border-foreground pl-4 text-sm leading-6">
                &quot;{critique.excerpt}&quot;
              </blockquote>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-sm">
                  {critique.linkLabel}
                </Badge>
                <Badge variant="outline" className="rounded-sm">
                  Page {critique.page}
                </Badge>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4 border-t pt-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
                    <FileText aria-hidden="true" className="size-3" />
                    Paper
                  </p>
                  <p className="mt-1 truncate text-xs">{paper.fileName}</p>
                </div>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  aria-label="Open paper"
                >
                  <Link href={`/papers/${paper.id}`}>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
