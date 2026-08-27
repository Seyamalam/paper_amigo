"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteProjectResponseSchema } from "@/lib/projects"

const apiErrorSchema = z.object({ error: z.string().min(1) })

export function ProjectDeletePanel({
  projectId,
  projectTitle,
}: Readonly<{ projectId: string; projectTitle: string }>) {
  const router = useRouter()

  return (
    <ProjectDeleteForm
      projectId={projectId}
      projectTitle={projectTitle}
      onDeleted={() => {
        router.replace("/")
        router.refresh()
      }}
    />
  )
}

export function ProjectDeleteForm({
  onDeleted,
  projectId,
  projectTitle,
}: Readonly<{
  onDeleted: () => void
  projectId: string
  projectTitle: string
}>) {
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  async function deleteProject(): Promise<void> {
    setBusy(true)
    setError(undefined)

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        body: JSON.stringify({ confirmation }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      })
      const body: unknown = await response.json()
      const deleted = deleteProjectResponseSchema.safeParse(body)

      if (!response.ok || !deleted.success) {
        const parsedError = apiErrorSchema.safeParse(body)
        throw new Error(
          parsedError.success
            ? parsedError.data.error
            : "Project deletion failed"
        )
      }

      onDeleted()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Project deletion failed"
      )
      setBusy(false)
    }
  }

  return (
    <section className="border bg-card p-4">
      <h2 className="text-xs font-semibold">Delete project</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Deletes files, share links, views, and critiques.
      </p>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          void deleteProject()
        }}
      >
        <Input
          aria-label="Project title confirmation"
          autoComplete="off"
          disabled={busy}
          placeholder={projectTitle}
          spellCheck={false}
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.currentTarget.value)
          }}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={busy || confirmation !== projectTitle}
        >
          {busy ? "Deleting…" : "Delete project"}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mt-3 text-xs">
          {error}
        </p>
      ) : null}
    </section>
  )
}
