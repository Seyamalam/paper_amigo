import Link from "next/link"
import { MessageSquareText } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { getProjectLibrary } from "@/lib/project-storage"
import { getCritiques } from "@/lib/sharing-storage"

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default async function CritiquesPage() {
  const [library, critiques] = await Promise.all([
    getProjectLibrary(),
    getCritiques(),
  ])
  const projectById = new Map(
    library.projects.map((project) => [project.id, project])
  )

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow={`${String(critiques.length)} ${critiques.length === 1 ? "critique" : "critiques"}`}
        title="Critiques"
      />

      {critiques.length > 0 ? (
        <section aria-label="Critiques">
          <ul className="divide-y border bg-card">
            {critiques.map((critique) => {
              const project = projectById.get(critique.projectId)
              const file = project?.files.find(
                (candidate) => candidate.key === critique.fileKey
              )

              return (
                <li key={critique.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {critique.displayName}
                      </p>
                      <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                        {file?.name ?? "PDF"}
                        {critique.pageNumber
                          ? ` · page ${String(critique.pageNumber)}`
                          : ""}
                        {` · ${formatDate(critique.createdAt)}`}
                      </p>
                    </div>
                    {project ? (
                      <Link
                        href={`/projects/${project.id}?file=${encodeURIComponent(critique.fileKey)}`}
                        className="text-xs underline underline-offset-2"
                      >
                        Open project
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                    {critique.comment}
                  </p>
                  {critique.email ? (
                    <a
                      href={`mailto:${critique.email}`}
                      className="mt-3 inline-block text-xs underline"
                    >
                      {critique.email}
                    </a>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <section
          aria-label="Critiques"
          className="grid min-h-48 place-items-center border border-dashed bg-muted/20 p-8 text-center"
        >
          <div>
            <MessageSquareText aria-hidden="true" className="mx-auto size-5" />
            <p className="mt-3 text-sm font-medium">No critiques</p>
          </div>
        </section>
      )}
    </div>
  )
}
