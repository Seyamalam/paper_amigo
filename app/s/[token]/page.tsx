import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink, FileText } from "lucide-react"
import { z } from "zod"

import { Brand } from "@/components/paper-amigo/brand"
import { CritiqueForm } from "@/components/paper-amigo/critique-form"
import { ShareViewTracker } from "@/components/paper-amigo/share-view-tracker"
import { Badge } from "@/components/ui/badge"
import { formatFileSize } from "@/lib/paper-upload"
import { shareTokenSchema } from "@/lib/sharing"
import { getSharedProject } from "@/lib/sharing-storage"

const sharedProjectQuerySchema = z.object({ file: z.string().optional() })

export default async function SharedProjectPage({
  params,
  searchParams,
}: PageProps<"/s/[token]">) {
  const [{ token: rawToken }, query] = await Promise.all([params, searchParams])
  const token = shareTokenSchema.safeParse(rawToken)

  if (!token.success) {
    notFound()
  }

  const shared = await getSharedProject(token.data)

  if (!shared) {
    notFound()
  }

  const parsedQuery = sharedProjectQuerySchema.safeParse(query)
  const requestedFile = parsedQuery.success ? parsedQuery.data.file : undefined
  const selectedFile =
    shared.project.files.find((file) => file.key === requestedFile) ??
    shared.project.files[0]

  if (!selectedFile) {
    notFound()
  }

  return (
    <div className="min-h-svh bg-background">
      <ShareViewTracker token={token.data} />
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Brand linked={false} />
          <p className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
            Shared project
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
        <header className="border-b pb-6">
          <Badge
            variant="outline"
            className="font-mono text-[9px] tracking-wider uppercase"
          >
            {shared.project.files.length}{" "}
            {shared.project.files.length === 1 ? "file" : "files"}
          </Badge>
          <h1 className="mt-4 max-w-5xl text-[clamp(1.7rem,4vw,3rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance">
            {shared.project.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            {shared.project.description}
          </p>
        </header>

        {shared.project.files.length > 1 ? (
          <nav
            aria-label="Project files"
            className="mt-5 overflow-x-auto border"
          >
            <ul className="flex min-w-max divide-x">
              {shared.project.files.map((file) => (
                <li key={file.key}>
                  <Link
                    href={`/s/${token.data}?file=${encodeURIComponent(file.key)}`}
                    aria-current={
                      file.key === selectedFile.key ? "page" : undefined
                    }
                    className="flex h-11 items-center gap-2 px-4 text-xs hover:bg-muted aria-[current=page]:bg-foreground aria-[current=page]:text-background"
                  >
                    <FileText aria-hidden="true" className="size-3.5" />
                    {file.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <section
          className="mt-5 border bg-neutral-100 p-2 sm:p-5 dark:bg-neutral-950"
          aria-label="PDF viewer"
        >
          <div className="mb-2 flex items-center justify-between gap-3 bg-black px-3 py-2 font-mono text-[9px] tracking-wide text-white uppercase sm:mb-4 dark:border dark:border-white/20">
            <span className="flex min-w-0 items-center gap-2">
              <FileText aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{selectedFile.name}</span>
            </span>
            <span>{formatFileSize(selectedFile.size)}</span>
          </div>
          <object
            data={`${selectedFile.url}#toolbar=0&navpanes=0`}
            type="application/pdf"
            aria-label={selectedFile.name}
            className="h-[72svh] min-h-[32rem] w-full bg-white"
          >
            <p className="p-6 text-sm text-black">Preview unavailable</p>
          </object>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <CritiqueForm
            key={selectedFile.key}
            token={token.data}
            fileKey={selectedFile.key}
          />
          <aside className="border p-4">
            <h2 className="text-xs font-semibold">Authors</h2>
            <ul className="mt-3 space-y-4">
              {shared.project.authors.map((author) => (
                <li
                  key={`${author.name}:${author.university}`}
                  className="text-xs leading-5"
                >
                  <p className="font-semibold">{author.name}</p>
                  <p className="text-muted-foreground">{author.designation}</p>
                  <p className="text-muted-foreground">{author.university}</p>
                  {author.orcid ? (
                    <p className="font-mono text-[10px]">
                      ORCID {author.orcid}
                    </p>
                  ) : null}
                  {author.profileUrl ? (
                    <a
                      href={author.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline underline-offset-2"
                    >
                      Profile
                      <ExternalLink aria-hidden="true" className="size-3" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  )
}
