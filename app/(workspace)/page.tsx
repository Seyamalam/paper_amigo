import Link from "next/link"
import { ArrowDownUp, Plus, Search } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { PaperCard } from "@/components/paper-amigo/paper-card"
import { PreviewNotice } from "@/components/paper-amigo/preview-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { papers } from "@/lib/papers"

export default function Page() {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="6 papers"
        title="Papers"
        action={
          <Button asChild className="h-10 gap-2 px-4">
            <Link href="/upload">
              <Plus aria-hidden="true" />
              Upload
            </Link>
          </Button>
        }
      />

      <PreviewNotice />

      <section aria-labelledby="library-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="library-heading" className="text-sm font-semibold">
              All papers
            </h2>
            <p className="mt-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              Sorted by newest upload
            </p>
          </div>
          <div className="flex gap-2">
            <search className="min-w-0 flex-1 sm:w-64">
              <form className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  name="q"
                  type="search"
                  aria-label="Search papers"
                  placeholder="Search filenames"
                  className="h-9 rounded-none bg-card pl-9 text-xs"
                />
              </form>
            </search>
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Change paper sort"
            >
              <ArrowDownUp aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </div>
      </section>
    </div>
  )
}
