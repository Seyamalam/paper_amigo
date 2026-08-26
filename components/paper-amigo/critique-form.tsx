"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface CritiqueRequest {
  fileKey: string
  displayName: string
  comment: string
  website: string
  email?: string
  pageNumber?: number
}

const critiqueResponseSchema = z.object({
  critique: z.object({ id: z.uuid(), createdAt: z.iso.datetime() }),
})
const apiErrorSchema = z.object({ error: z.string().min(1) })

export function CritiqueForm({
  token,
  fileKey,
}: Readonly<{ token: string; fileKey: string }>) {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [comment, setComment] = useState("")
  const [pageNumber, setPageNumber] = useState("")
  const [website, setWebsite] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | undefined>()
  const [failed, setFailed] = useState(false)

  async function submit(): Promise<void> {
    setBusy(true)
    setMessage(undefined)
    setFailed(false)

    try {
      const input: CritiqueRequest = {
        fileKey,
        displayName,
        comment,
        website,
      }

      if (email.trim()) {
        input.email = email
      }

      if (pageNumber) {
        input.pageNumber = Number(pageNumber)
      }

      const response = await fetch(`/api/public/shares/${token}/critiques`, {
        body: JSON.stringify(input),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
      const body: unknown = await response.json()
      const submitted = critiqueResponseSchema.safeParse(body)

      if (!response.ok || !submitted.success) {
        const parsedError = apiErrorSchema.safeParse(body)
        throw new Error(
          parsedError.success
            ? parsedError.data.error
            : "Comment could not be saved"
        )
      }

      setComment("")
      setPageNumber("")
      setMessage("Comment sent")
    } catch (caught) {
      setFailed(true)
      setMessage(
        caught instanceof Error ? caught.message : "Comment could not be saved"
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="border bg-background p-4 sm:p-5"
      aria-labelledby="comment-heading"
    >
      <h2 id="comment-heading" className="text-sm font-semibold">
        Add comment
      </h2>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field>
          <FieldLabel htmlFor={`comment-name-${fileKey}`}>Name</FieldLabel>
          <Input
            id={`comment-name-${fileKey}`}
            value={displayName}
            maxLength={120}
            required
            disabled={busy}
            onChange={(event) => {
              setDisplayName(event.currentTarget.value)
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`comment-email-${fileKey}`}>
            Email · optional
          </FieldLabel>
          <Input
            id={`comment-email-${fileKey}`}
            type="email"
            value={email}
            maxLength={320}
            disabled={busy}
            onChange={(event) => {
              setEmail(event.currentTarget.value)
            }}
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`comment-text-${fileKey}`}>Comment</FieldLabel>
          <Textarea
            id={`comment-text-${fileKey}`}
            value={comment}
            maxLength={5_000}
            required
            disabled={busy}
            className="min-h-28"
            onChange={(event) => {
              setComment(event.currentTarget.value)
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`comment-page-${fileKey}`}>
            PDF page · optional
          </FieldLabel>
          <Input
            id={`comment-page-${fileKey}`}
            type="number"
            min={1}
            max={100_000}
            value={pageNumber}
            disabled={busy}
            onChange={(event) => {
              setPageNumber(event.currentTarget.value)
            }}
          />
        </Field>
        <div className="hidden" aria-hidden="true">
          <label htmlFor={`comment-website-${fileKey}`}>Website</label>
          <input
            id={`comment-website-${fileKey}`}
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => {
              setWebsite(event.currentTarget.value)
            }}
          />
        </div>
        <div className="flex items-end sm:justify-end">
          <Button
            type="submit"
            disabled={busy || !displayName.trim() || !comment.trim()}
          >
            <Send aria-hidden="true" />
            {busy ? "Sending" : "Send comment"}
          </Button>
        </div>
        {message ? (
          <p
            role={failed ? "alert" : "status"}
            className={`text-xs sm:col-span-2 ${failed ? "text-destructive" : "text-muted-foreground"}`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  )
}
