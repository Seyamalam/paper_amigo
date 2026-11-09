import Link from "next/link"

import { cn } from "@/lib/utils"

type BrandProps = Readonly<{
  className?: string
  linked?: boolean
}>

export function Brand({ className, linked = true }: BrandProps) {
  const content = (
    <>
      <span className="grid size-9 shrink-0 place-items-center bg-foreground text-background">
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          viewBox="0 0 32 32"
        >
          <path d="M4 20 L28 4 L13.5 15 Z" fill="currentColor" />
          <path
            d="M13.5 15 L28 4 L11.5 28 Z"
            fill="currentColor"
            opacity=".55"
          />
        </svg>
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
      href="/library"
      aria-label="Paper Amigo library"
      className={cn("group inline-flex items-center gap-3", className)}
    >
      {content}
    </Link>
  )
}
