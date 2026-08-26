import type { CritiqueRecord } from "@/lib/sharing"

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function CritiqueList({
  critiques,
}: Readonly<{ critiques: readonly CritiqueRecord[] }>) {
  return (
    <section className="border bg-card p-4">
      <h2 className="text-xs font-semibold">Critiques</h2>
      {critiques.length > 0 ? (
        <ul className="mt-3 divide-y border">
          {critiques.map((critique) => (
            <li key={critique.id} className="p-3 text-xs leading-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{critique.displayName}</p>
                <p className="font-mono text-[9px] text-muted-foreground">
                  {critique.pageNumber
                    ? `Page ${String(critique.pageNumber)} · `
                    : ""}
                  {formatDate(critique.createdAt)}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {critique.comment}
              </p>
              {critique.email ? (
                <a
                  href={`mailto:${critique.email}`}
                  className="mt-2 inline-block underline"
                >
                  {critique.email}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No critiques</p>
      )}
    </section>
  )
}
