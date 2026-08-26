import Link from "next/link"
import { BookOpen } from "lucide-react"

import { cn } from "@/lib/utils"

type BrandProps = Readonly<{
  className?: string
  linked?: boolean
}>

export function Brand({ className, linked = true }: BrandProps) {
  const content = (
    <>
      <span className="grid size-9 shrink-0 place-items-center bg-foreground text-background">
        <BookOpen aria-hidden="true" className="size-4" />
      </span>
      <span className="text-[15px] leading-none font-semibold tracking-[-0.02em]">
        Paper Amigo
      </span>
    </>
  )

  if (!linked) {
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        {content}
      </div>
    )
  }

  return (
    <Link
      href="/"
      aria-label="Paper Amigo library"
      className={cn("group inline-flex items-center gap-3", className)}
    >
      {content}
    </Link>
  )
}
