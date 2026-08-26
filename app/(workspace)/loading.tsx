import { Skeleton } from "@/components/ui/skeleton"

export default function WorkspaceLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading workspace"
      className="space-y-8"
    >
      <div className="space-y-3 border-b pb-6">
        <Skeleton className="h-3 w-32 rounded-none" />
        <Skeleton className="h-12 w-full max-w-xl rounded-none" />
        <Skeleton className="h-4 w-full max-w-lg rounded-none" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-60 rounded-none" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}
