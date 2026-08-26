import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, FileText, Share2 } from "lucide-react"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getProject } from "@/lib/project-storage"
import { formatFileSize } from "@/lib/paper-upload"

const projectQuerySchema = z.object({ file: z.string().optional() })

export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]">) {
  const [{ projectId }, query] = await Promise.all([params, searchParams])
  const project = await getProject(projectId)

  if (!project) {
    notFound()
  }

  const parsedQuery = projectQuerySchema.safeParse(query)
  const requestedFile = parsedQuery.success ? parsedQuery.data.file : undefined
  const selectedFile =
    project.files.find((file) => file.key === requestedFile) ?? project.files[0]

  if (!selectedFile) {
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
              className="font-mono text-[9px] tracking-wider uppercase"
            >
              {project.files.length}{" "}
              {project.files.length === 1 ? "file" : "files"}
            </Badge>
          </div>
          <h1 className="mt-3 max-w-4xl text-[clamp(1.7rem,4vw,2.7rem)] leading-none font-semibold tracking-[-0.035em] text-balance">
            {project.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            {project.description}
          </p>
        </div>
        <Button disabled>
          <Share2 aria-hidden="true" />
          Create share link
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          aria-label="PDF viewer"
          className="border bg-neutral-100 p-2 sm:p-5 dark:bg-neutral-950"
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
            className="h-[calc(100svh-13rem)] min-h-[32rem] w-full bg-white"
          >
            <p className="p-6 text-sm text-black">Preview unavailable</p>
          </object>
        </section>

        <aside className="space-y-3">
          <section className="border bg-card p-4">
            <h2 className="text-xs font-semibold">Files</h2>
            <ul className="mt-3 divide-y border">
              {project.files.map((file) => (
                <li key={file.key}>
                  <Link
                    href={`/projects/${project.id}?file=${encodeURIComponent(file.key)}`}
                    aria-current={
                      file.key === selectedFile.key ? "true" : undefined
                    }
                    className="flex items-center justify-between gap-2 p-3 text-xs hover:bg-muted aria-[current=true]:bg-foreground aria-[current=true]:text-background"
                  >
                    <span className="truncate">{file.name}</span>
                    <ExternalLink
                      aria-hidden="true"
                      className="size-3 shrink-0"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="border bg-card p-4">
            <h2 className="text-xs font-semibold">Authors</h2>
            <ul className="mt-3 space-y-4">
              {project.authors.map((author) => (
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
                      className="underline underline-offset-2"
                    >
                      Profile
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
