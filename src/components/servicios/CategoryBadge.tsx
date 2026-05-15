"use client"

import * as LucideIcons from "lucide-react"
import type { Category } from "@/lib/stores/serviciosStore"

interface CategoryBadgeProps {
  category: Category
  size?: "sm" | "md"
}

export function CategoryBadge({ category, size = "md" }: CategoryBadgeProps) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[category.iconName]

  if (size === "sm") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: category.color + "22", color: category.color }}
      >
        {Icon && <Icon size={10} />}
        {category.name}
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: category.color + "22", color: category.color }}
    >
      {Icon && <Icon size={12} />}
      {category.name}
    </span>
  )
}
