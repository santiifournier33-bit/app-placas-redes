import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Merge Tailwind classes intelligently: clsx handles falsy/array/obj inputs,
// twMerge resolves conflicts (last token wins per Tailwind group). Used by
// every shadcn-style component to allow consumers to override default styles
// via a className prop without specificity wars.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
