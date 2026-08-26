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
import { getPrivatePaperUrl, getStoredPaper } from "@/lib/paper-storage"

export default async function PaperPage({
  params,
}: PageProps<"/papers/[paperId]">) {
  const { paperId } = await params
  const [paper, privateUrl] = await Promise.all([
    getStoredPaper(paperId),
    getPrivatePaperUrl(paperId),
  ])

  if (paper === undefined) {
    notFound()
  }

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
          {privateUrl ? (
            <object
              data={privateUrl}
              type="application/pdf"
              aria-label={paper.fileName}
              className="h-[calc(100svh-13rem)] min-h-[32rem] w-full bg-white"
            >
              <p className="p-6 text-sm text-black">Preview unavailable</p>
            </object>
          ) : (
            <div className="mx-auto grid aspect-[1/1.414] w-full max-w-3xl place-items-center bg-white p-8 text-center text-black">
              <div>
                <FileText aria-hidden="true" className="mx-auto size-8" />
                <p className="mt-4 text-sm font-medium">Preview unavailable</p>
              </div>
            </div>
          )}
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
              <p className="text-xs leading-5 text-muted-foreground">
                No share links.
              </p>
            </div>
          </section>

          <section className="border bg-card p-4">
            <h2 className="text-xs font-semibold">Latest critiques</h2>
            <div className="mt-3 space-y-3">
              <p className="text-xs leading-5 text-muted-foreground">
                No critiques.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
