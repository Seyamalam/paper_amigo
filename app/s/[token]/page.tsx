import {
  BookOpen,
  FileText,
  LockKeyhole,
  MessageSquareText,
} from "lucide-react"

import { Brand } from "@/components/paper-amigo/brand"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getPaper } from "@/lib/papers"

export function generateStaticParams() {
  return [{ token: "demo-neural-operator-review" }]
}

export default async function SharedPaperPage({
  params,
}: PageProps<"/s/[token]">) {
  await params
  const paper = getPaper("neural-operators")

  if (paper === undefined) {
    return null
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-background px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Brand linked={false} />
          <span className="flex items-center gap-2 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
            <LockKeyhole aria-hidden="true" className="size-3" />
            Private review copy
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-6 sm:py-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section>
          <p className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            Shared with Lab review group
          </p>
          <h1 className="mt-2 max-w-4xl text-[clamp(1.7rem,5vw,2.75rem)] leading-none font-semibold tracking-[-0.035em]">
            {paper.fileName}
          </h1>
          <p className="mt-3 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <FileText aria-hidden="true" className="size-3" />
            Download unavailable
          </p>

          <div className="mt-5 border bg-neutral-100 p-2 sm:p-4 dark:bg-neutral-950">
            <div className="mb-2 flex items-center justify-between bg-black px-3 py-2 font-mono text-[9px] text-white sm:mb-4 dark:border dark:border-white/20">
              <span>SECURE PREVIEW</span>
              <span>1 / —</span>
            </div>
            <div className="mx-auto aspect-[1/1.414] max-w-3xl bg-white p-[8%] text-black">
              <BookOpen aria-hidden="true" className="size-[5%]" />
              <h2 className="mt-[8%] text-[clamp(1rem,3vw,2.25rem)] leading-tight font-semibold tracking-[-0.03em]">
                {paper.fileName}
              </h2>
              <p className="mt-[4%] font-mono text-[clamp(0.3rem,1vw,0.6rem)] text-neutral-500">
                PDF viewer not connected.
              </p>
              <div className="mt-[8%] space-y-[3%]">
                {Array.from({ length: 14 }, (_, index) => (
                  <div
                    key={index}
                    className="h-[clamp(2px,0.45vw,5px)] bg-neutral-200"
                    style={{ width: `${String(96 - (index % 5) * 6)}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <section className="border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <MessageSquareText aria-hidden="true" className="size-4" />
              <h2 className="font-semibold">Leave a critique</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Only the paper owner can read submissions.
            </p>
            <form className="mt-6 space-y-4">
              <Field data-disabled>
                <FieldLabel htmlFor="reviewer-name">Display name</FieldLabel>
                <Input id="reviewer-name" disabled placeholder="Your name" />
              </Field>
              <Field data-disabled>
                <FieldLabel htmlFor="review-page">PDF page</FieldLabel>
                <Input
                  id="review-page"
                  disabled
                  inputMode="numeric"
                  placeholder="Optional"
                />
              </Field>
              <Field data-disabled>
                <FieldLabel htmlFor="critique">Critique</FieldLabel>
                <Textarea
                  id="critique"
                  disabled
                  rows={6}
                  placeholder="What should the author reconsider?"
                />
                <FieldDescription>
                  Submission unlocks with the managed KV integration.
                </FieldDescription>
              </Field>
              <Button disabled className="w-full" title="Preview form only">
                Send private critique
              </Button>
            </form>
          </section>
          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            Paper Amigo
          </p>
        </aside>
      </main>
    </div>
  )
}
