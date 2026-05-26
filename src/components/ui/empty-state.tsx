import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

// Standard empty state: centered icon + title + description + optional CTA.
// Use anywhere a list, grid, or section is legitimately empty (no contacts
// yet, no consultas, no matches). NOT for loading (use Skeleton) or error
// (use ErrorState).
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 gap-3",
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-surface-overlay flex items-center justify-center text-text-muted">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="text-xs text-text-muted leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
