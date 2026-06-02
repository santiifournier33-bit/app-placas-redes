import { Skeleton } from "./skeleton"

/**
 * Generic route skeleton shown via loading.tsx while a segment streams in.
 * Mirrors the common page shape (header strip + dense content rows) so the
 * layout doesn't jump when real content replaces it. Dark-theme first.
 */
export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="h-full w-full p-4 lg:p-6" aria-busy="true" aria-live="polite">
      {/* Header strip */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Content rows */}
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
