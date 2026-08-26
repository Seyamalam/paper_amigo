"use client"

import { useDeferredValue, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDownUp, Plus, Search } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { ProjectCard } from "@/components/paper-amigo/project-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Project } from "@/lib/projects"

export function ProjectLibrary({
  projects,
}: Readonly<{ projects: readonly Project[] }>) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [oldestFirst, setOldestFirst] = useState(false)
  const visibleProjects = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()
    const matching = projects.filter((project) => {
      const searchable = [
        project.title,
        project.description,
        ...project.authors.map((author) => author.name),
      ]
        .join(" ")
        .toLowerCase()

      return searchable.includes(normalizedQuery)
    })

    return oldestFirst ? matching.toReversed() : matching
  }, [deferredQuery, oldestFirst, projects])
  const projectCount = projects.length

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow={`${String(projectCount)} ${projectCount === 1 ? "project" : "projects"}`}
        title="Projects"
        action={
          <Button asChild className="h-10 gap-2 px-4">
            <Link href="/upload">
              <Plus aria-hidden="true" />
              Create
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="library-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="library-heading" className="text-sm font-semibold">
              All projects
            </h2>
            <p className="mt-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              {oldestFirst ? "Oldest first" : "Newest first"}
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
                  aria-label="Search projects"
                  placeholder="Search projects"
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

        {visibleProjects.length === 0 ? (
          <div className="grid min-h-48 place-items-center border border-dashed bg-muted/20 p-8 text-center">
            <div>
              <p className="text-sm font-medium">
                {projects.length === 0 ? "No projects" : "No matches"}
              </p>
              {projects.length === 0 ? (
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/upload">Create project</Link>
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
