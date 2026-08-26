import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Eye,
  FileText,
  MessageSquareText,
  Share2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { critiques, getPaper, papers, shareLinks } from "@/lib/papers"

export function generateStaticParams() {
  return papers.map((paper) => ({ paperId: paper.id }))
}

export default async function PaperPage({
  params,
}: PageProps<"/papers/[paperId]">) {
  const { paperId } = await params
  const paper = getPaper(paperId)

  if (paper === undefined) {
    notFound()
  }

  const relatedLinks = shareLinks.filter(
    (shareLink) => shareLink.paperId === paper.id
  )
  const relatedCritiques = critiques.filter(
    (critique) => critique.paperId === paper.id
  )

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Library
      </Link>

      <header className="grid gap-5 border-b pb-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-sm font-mono text-[9px] tracking-wider uppercase"
            >
              PDF
            </Badge>
            <span className="font-mono text-[10px] text-muted-foreground">
              {paper.size} · uploaded {paper.uploadedAt}
            </span>
          </div>
          <h1 className="mt-3 max-w-4xl text-[clamp(1.7rem,4vw,2.7rem)] leading-none font-semibold tracking-[-0.035em] text-balance">
            {paper.fileName}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button disabled title="Connect providers first">
            <Share2 aria-hidden="true" />
            Create share link
          </Button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          aria-label="PDF viewer"
          className="border bg-neutral-100 p-2 sm:p-5 dark:bg-neutral-950"
        >
          <div className="mb-2 flex items-center justify-between bg-black px-3 py-2 font-mono text-[9px] tracking-wide text-white uppercase sm:mb-4 dark:border dark:border-white/20">
            <span className="flex items-center gap-2">
              <FileText aria-hidden="true" className="size-3" />
              Private document preview
            </span>
            <span>1 / —</span>
          </div>
          <div className="mx-auto aspect-[1/1.414] w-full max-w-3xl bg-white p-[8%] text-black">
            <div className="mx-auto h-full max-w-xl">
              <p className="font-mono text-[clamp(0.3rem,1vw,0.6rem)] tracking-[0.12em] text-neutral-500 uppercase">
                PDF viewer not connected
              </p>
              <h2 className="mt-[8%] text-[clamp(1rem,3vw,2.25rem)] leading-tight font-semibold tracking-[-0.03em]">
                {paper.fileName}
              </h2>
              <div className="mt-[7%] h-px bg-neutral-300" />
              <div className="mt-[7%] space-y-[3%]">
                {Array.from({ length: 11 }, (_, index) => (
                  <div
                    key={index}
                    className="h-[clamp(2px,0.45vw,5px)] bg-neutral-200"
                    style={{ width: `${String(92 - (index % 4) * 7)}%` }}
                  />
                ))}
              </div>
              <div className="mt-[9%] border-l-[clamp(2px,0.4vw,4px)] border-black bg-neutral-100 p-[5%]">
                <div className="h-[clamp(3px,0.55vw,6px)] w-1/3 bg-neutral-400" />
                <div className="mt-[4%] h-[clamp(2px,0.45vw,5px)] w-full bg-neutral-300" />
                <div className="mt-[3%] h-[clamp(2px,0.45vw,5px)] w-4/5 bg-neutral-300" />
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="border bg-card p-4">
            <p className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
              Activity
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-px bg-border">
              <div className="bg-card p-3">
                <dt className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Share2 aria-hidden="true" className="size-3" /> Links
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {paper.shareCount}
                </dd>
              </div>
              <div className="bg-card p-3">
                <dt className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <MessageSquareText aria-hidden="true" className="size-3" />{" "}
                  Critiques
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {paper.critiqueCount}
                </dd>
              </div>
            </dl>
          </section>

          <section className="border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold">Share links</h2>
              <Eye
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
              />
            </div>
            <div className="mt-3 space-y-2">
              {relatedLinks.length === 0 ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  No preview links for this paper.
                </p>
              ) : (
                relatedLinks.map((shareLink) => (
                  <div
                    key={shareLink.id}
                    className="border-l-2 border-foreground bg-muted/40 px-3 py-2.5"
                  >
                    <p className="text-xs font-medium">{shareLink.label}</p>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                      {shareLink.views} views · {shareLink.visitors} estimated
                      visitors
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="border bg-card p-4">
            <h2 className="text-xs font-semibold">Latest critiques</h2>
            <div className="mt-3 space-y-3">
              {relatedCritiques.length === 0 ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  No critiques received yet.
                </p>
              ) : (
                relatedCritiques.map((critique) => (
                  <blockquote
                    key={critique.id}
                    className="border-l-2 pl-3 text-xs leading-5 text-muted-foreground"
                  >
                    “{critique.excerpt}”
                    <footer className="mt-1 font-mono text-[9px]">
                      {critique.author} · p. {critique.page}
                    </footer>
                  </blockquote>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
