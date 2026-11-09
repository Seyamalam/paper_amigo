"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { deleteProjectResponseSchema } from "@/lib/projects"

const apiErrorSchema = z.object({ error: z.string().min(1) })

export function ProjectDeletePanel({
  projectId,
  projectTitle,
}: Readonly<{ projectId: string; projectTitle: string }>) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <section className="border border-destructive/40 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold">Delete project</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Deletes files, share links, views, and critiques.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 aria-hidden="true" />
              Delete project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete project</DialogTitle>
              <DialogDescription>
                This permanently deletes &ldquo;{projectTitle}&rdquo; and its
                files, share links, views, and critiques. Type the project title
                to confirm.
              </DialogDescription>
            </DialogHeader>
            <ProjectDeleteForm
              projectId={projectId}
              projectTitle={projectTitle}
              onDeleted={() => {
                setOpen(false)
                toast.success("Project deleted")
                router.replace("/")
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </section>
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
    <form
      className="grid gap-3"
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
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="destructive"
        disabled={busy || confirmation !== projectTitle}
      >
        {busy ? "Deleting…" : "Delete project"}
      </Button>
    </form>
  )
}
