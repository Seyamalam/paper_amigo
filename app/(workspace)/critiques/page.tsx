import { MessageSquareText } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { Button } from "@/components/ui/button"

export default function CritiquesPage() {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="0 unread"
        title="Critiques"
        action={
          <Button disabled variant="outline" title="Connect providers first">
            Export
          </Button>
        }
      />

      <section
        aria-label="Critiques"
        className="grid min-h-48 place-items-center border border-dashed bg-muted/20 p-8 text-center"
      >
        <div>
          <MessageSquareText aria-hidden="true" className="mx-auto size-5" />
          <p className="mt-3 text-sm font-medium">No critiques</p>
        </div>
      </section>
    </div>
  )
}
