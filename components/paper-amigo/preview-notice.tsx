import { FlaskConical } from "lucide-react"

export function PreviewNotice() {
  return (
    <div className="flex items-start gap-3 border bg-muted/40 px-3.5 py-3 text-xs leading-5">
      <FlaskConical
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <p>
        <strong className="font-semibold">Demo data.</strong> Authentication,
        storage, and tracking are not connected.
      </p>
    </div>
  )
}
