import Link from "next/link"
import { ArrowUpRight, FileText, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatFileSize } from "@/lib/paper-upload"
import type { Project } from "@/lib/projects"

type ProjectCardProps = Readonly<{
  project: Project
}>

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

export function ProjectCard({ project }: ProjectCardProps) {
  const totalBytes = project.files.reduce((sum, file) => sum + file.size, 0)

  return (
    <article className="group relative flex min-h-64 flex-col overflow-hidden border bg-card transition-colors hover:border-foreground">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-9 place-items-center border bg-muted/60 text-muted-foreground">
            <FileText aria-hidden="true" className="size-4" strokeWidth={1.7} />
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[9px] tracking-wider uppercase"
          >
            {project.files.length}{" "}
            {project.files.length === 1 ? "file" : "files"}
          </Badge>
        </div>
        <h2 className="mt-6 text-lg leading-tight font-semibold tracking-[-0.02em] text-pretty">
          <Link
            href={`/projects/${project.id}`}
            className="outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {project.title}
          </Link>
        </h2>
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {project.description}
        </p>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3 border-t bg-muted/20 px-5 py-3">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground">
            {formatFileSize(totalBytes)} · {formatDate(project.updatedAt)}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users aria-hidden="true" className="size-3" />
            {project.authors.map((author) => author.name).join(", ")}
          </p>
        </div>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 text-muted-foreground group-hover:text-foreground"
        />
      </div>
    </article>
  )
}
