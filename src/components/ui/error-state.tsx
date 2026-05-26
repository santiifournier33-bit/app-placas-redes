import * as React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

// Inline error banner. Use when an API call fails or data is unrecoverable
// in the current view. Keep messages user-facing (no stack traces). Pair
// with onRetry whenever the action is idempotent.
export function ErrorState({
  title = "Algo salió mal",
  description,
  onRetry,
  retryLabel = "Reintentar",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3",
        className,
      )}
    >
      <AlertCircle className="size-5 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold text-red-300">{title}</p>
        {description && (
          <p className="text-xs text-red-300/80 leading-relaxed break-words">{description}</p>
        )}
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
          >
            <RefreshCw className="size-3" />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
