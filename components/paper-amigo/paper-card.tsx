import Link from "next/link"
import { ArrowUpRight, FileText, MessageSquareText, Share2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Paper } from "@/lib/papers"

type PaperCardProps = Readonly<{
  paper: Paper
}>

export function PaperCard({ paper }: PaperCardProps) {
  return (
    <article className="group relative flex min-h-60 flex-col overflow-hidden border bg-card transition-colors hover:border-foreground">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-9 place-items-center border bg-muted/60 text-muted-foreground">
            <FileText aria-hidden="true" className="size-4" strokeWidth={1.7} />
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[9px] tracking-wider uppercase"
          >
            PDF
          </Badge>
        </div>
        <h2 className="mt-6 text-lg leading-tight font-semibold tracking-[-0.02em] text-pretty">
          <Link
            href={`/papers/${paper.id}`}
            className="outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {paper.fileName}
          </Link>
        </h2>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3 border-t bg-muted/20 px-5 py-3">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground">
            {paper.size} · {paper.uploadedAt}
          </p>
          <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Share2 aria-hidden="true" className="size-3" />
              {paper.shareCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareText aria-hidden="true" className="size-3" />
              {paper.critiqueCount}
            </span>
          </div>
        </div>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 text-muted-foreground group-hover:text-foreground"
        />
      </div>
    </article>
  )
}
