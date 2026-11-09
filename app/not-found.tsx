import Link from "next/link"
import { FileQuestion } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="max-w-md border-l-4 border-foreground pl-6">
        <FileQuestion aria-hidden="true" className="size-7" />
        <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          404
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.035em]">
          Not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The paper or link is unavailable.
        </p>
        <Button asChild className="mt-6">
          <Link href="/library">Return to library</Link>
        </Button>
      </div>
    </main>
  )
}
