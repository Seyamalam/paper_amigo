"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDownUp, Plus, Search } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { PaperCard } from "@/components/paper-amigo/paper-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Paper } from "@/lib/papers"

export function PaperLibrary({
  papers,
}: Readonly<{
  papers: readonly Paper[]
}>) {
  const [query, setQuery] = useState("")
  const [oldestFirst, setOldestFirst] = useState(false)
  const visiblePapers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const matching = papers.filter((paper) =>
      paper.fileName.toLowerCase().includes(normalizedQuery)
    )

    return oldestFirst ? matching.toReversed() : matching
  }, [oldestFirst, papers, query])
  const paperCount = papers.length

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow={`${String(paperCount)} ${paperCount === 1 ? "paper" : "papers"}`}
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

      <section aria-labelledby="library-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="library-heading" className="text-sm font-semibold">
              All papers
            </h2>
            <p className="mt-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              {oldestFirst
                ? "Sorted by oldest upload"
                : "Sorted by newest upload"}
            </p>
          </div>
          <div className="flex gap-2">
            <search className="min-w-0 flex-1 sm:w-64">
              <form
                className="relative"
                onSubmit={(event) => {
                  event.preventDefault()
                }}
              >
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  name="q"
                  type="search"
                  aria-label="Search papers"
                  placeholder="Search filenames"
                  value={query}
                  className="h-9 rounded-none bg-card pl-9 text-xs"
                  onChange={(event) => {
                    setQuery(event.currentTarget.value)
                  }}
                />
              </form>
            </search>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label={
                oldestFirst ? "Sort newest first" : "Sort oldest first"
              }
              onClick={() => {
                setOldestFirst((current) => !current)
              }}
            >
              <ArrowDownUp aria-hidden="true" />
            </Button>
          </div>
        </div>

        {visiblePapers.length === 0 ? (
          <div className="grid min-h-48 place-items-center border border-dashed bg-muted/20 p-8 text-center">
            <div>
              <p className="text-sm font-medium">
                {papers.length === 0 ? "No papers" : "No matches"}
              </p>
              {papers.length === 0 ? (
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/upload">Upload PDF</Link>
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visiblePapers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
