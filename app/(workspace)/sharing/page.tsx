import Link from "next/link"
import { Eye, Link2, Users } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { getProjectLibrary } from "@/lib/project-storage"
import { getShareLinkSummaries } from "@/lib/sharing-storage"

export default async function SharingPage() {
  const [library, links] = await Promise.all([
    getProjectLibrary(),
    getShareLinkSummaries(),
  ])
  const projectById = new Map(
    library.projects.map((project) => [project.id, project])
  )

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow={`${String(links.length)} ${links.length === 1 ? "link" : "links"}`}
        title="Share links"
      />

      {links.length > 0 ? (
        <section
          aria-label="Share links"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {links.map((link) => {
            const project = projectById.get(link.projectId)

            return (
              <article key={link.id} className="border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <Link2 aria-hidden="true" className="size-4" />
                  <span className="font-mono text-[9px] text-muted-foreground uppercase">
                    Active
                  </span>
                </div>
                <h2 className="mt-5 text-sm font-semibold">{link.label}</h2>
                {project ? (
                  <Link
                    href={`/projects/${project.id}`}
                    className="mt-2 line-clamp-2 block text-xs leading-5 text-muted-foreground hover:text-foreground"
                  >
                    {project.title}
                  </Link>
                ) : null}
                <dl className="mt-5 grid grid-cols-2 gap-px bg-border">
                  <div className="bg-card p-3">
                    <dt className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Eye aria-hidden="true" className="size-3" /> Views
                    </dt>
                    <dd className="mt-1 text-xl font-semibold">
                      {link.totalViews}
                    </dd>
                  </div>
                  <div className="bg-card p-3">
                    <dt className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Users aria-hidden="true" className="size-3" /> Unique
                    </dt>
                    <dd className="mt-1 text-xl font-semibold">
                      {link.uniqueVisitors}
                    </dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </section>
      ) : (
        <section
          aria-label="Share links"
          className="grid min-h-48 place-items-center border border-dashed bg-muted/20 p-8 text-center"
        >
          <div>
            <Link2 aria-hidden="true" className="mx-auto size-5" />
            <p className="mt-3 text-sm font-medium">No share links</p>
          </div>
        </section>
      )}
    </div>
  )
}
