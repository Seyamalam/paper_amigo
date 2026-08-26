import type { ReactNode } from "react"

type PageHeadingProps = Readonly<{
  eyebrow: string
  title: string
  action?: ReactNode
}>

export function PageHeading({ eyebrow, title, action }: PageHeadingProps) {
  return (
    <header className="grid gap-5 border-b pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 max-w-3xl text-[clamp(1.8rem,5vw,2.75rem)] leading-none font-semibold tracking-[-0.035em] text-balance">
          {title}
        </h1>
      </div>
      {action}
    </header>
  )
}
