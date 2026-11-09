"use client"

import { useState } from "react"
import { Check, Copy, Link2, Plus } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ShareLinkSummary } from "@/lib/sharing"

const createLinkResponseSchema = z.object({
  link: z.object({
    id: z.uuid(),
    label: z.string().min(1),
    path: z.string().startsWith("/s/"),
  }),
})

const apiErrorSchema = z.object({ error: z.string().min(1) })

export function ShareLinkPanel({
  projectId,
  initialLinks,
}: Readonly<{
  projectId: string
  initialLinks: readonly ShareLinkSummary[]
}>) {
  const [label, setLabel] = useState("")
  const [links, setLinks] = useState(initialLinks)
  const [createdUrl, setCreatedUrl] = useState<string | undefined>()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  async function createLink(): Promise<void> {
    setBusy(true)
    setError(undefined)
    setCreatedUrl(undefined)
    setCopied(false)

    try {
      const response = await fetch(`/api/projects/${projectId}/shares`, {
        body: JSON.stringify({ label }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
      const body: unknown = await response.json()
      const created = createLinkResponseSchema.safeParse(body)

      if (!response.ok || !created.success) {
        const parsedError = apiErrorSchema.safeParse(body)
        throw new Error(
          parsedError.success ? parsedError.data.error : "Link creation failed"
        )
      }

      const absoluteUrl = new URL(
        created.data.link.path,
        window.location.origin
      ).href
      setCreatedUrl(absoluteUrl)
      setLinks((current) => [
        {
          id: created.data.link.id,
          projectId,
          label: created.data.link.label,
          createdAt: new Date().toISOString(),
          totalViews: 0,
          uniqueVisitors: 0,
        },
        ...current,
      ])
      setLabel("")
      toast.success("Share link created")
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Link creation failed"
      )
      toast.error(
        caught instanceof Error ? caught.message : "Link creation failed"
      )
    } finally {
      setBusy(false)
    }
  }

  async function copyCreatedLink(): Promise<void> {
    if (!createdUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(createdUrl)
      setCopied(true)
      toast.success("Link copied to clipboard")
    } catch {
      setError("Copy failed. Select the link manually")
      toast.error("Copy failed. Select the link manually")
    }
  }

  return (
    <section className="border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold">Share links</h2>
        <Link2 aria-hidden="true" className="size-3.5 text-muted-foreground" />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void createLink()
        }}
      >
        <Input
          aria-label="Recipient label"
          placeholder="Recipient label"
          value={label}
          maxLength={120}
          disabled={busy}
          className="h-9 text-xs"
          onChange={(event) => {
            setLabel(event.currentTarget.value)
          }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="submit"
              size="icon"
              disabled={busy || label.trim() === ""}
            >
              <Plus aria-hidden="true" />
              <span className="sr-only">Create share link</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create share link</TooltipContent>
        </Tooltip>
      </form>

      {createdUrl ? (
        <div className="mt-3 border bg-muted/30 p-3">
          <p className="font-mono text-[10px] leading-4 break-all">
            {createdUrl}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void copyCreatedLink()}
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {links.length > 0 ? (
        <ul className="mt-3 divide-y border">
          {links.map((link) => (
            <li
              key={link.id}
              className="grid grid-cols-[1fr_auto] gap-3 p-3 text-xs"
            >
              <span className="truncate font-medium">{link.label}</span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {link.totalViews} views · {link.uniqueVisitors} unique
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No share links</p>
      )}
    </section>
  )
}
