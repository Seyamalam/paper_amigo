import { Link2, Plus } from "lucide-react"

import { PageHeading } from "@/components/paper-amigo/page-heading"
import { Button } from "@/components/ui/button"

export default function SharingPage() {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="0 active links"
        title="Share links"
        action={
          <Button
            disabled
            className="h-10 gap-2 px-4"
            title="Connect providers first"
          >
            <Plus aria-hidden="true" />
            New link
          </Button>
        }
      />

      <section
        aria-label="Share links"
        className="grid min-h-48 place-items-center border border-dashed bg-muted/20 p-8 text-center"
      >
        <div>
          <Link2 aria-hidden="true" className="mx-auto size-5" />
          <p className="mt-3 text-sm font-medium">No share links</p>
        </div>
      </section>
    </div>
  )
}
