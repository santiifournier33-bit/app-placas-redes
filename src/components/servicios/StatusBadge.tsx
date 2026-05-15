"use client"

import { STATUS_LABELS, STATUS_COLORS } from "@/lib/servicios/status"
import type { PaymentStatus } from "@/lib/stores/serviciosStore"

interface StatusBadgeProps {
  status: PaymentStatus
  size?: "sm" | "md"
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const c = STATUS_COLORS[status]

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {STATUS_LABELS[status]}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  )
}
