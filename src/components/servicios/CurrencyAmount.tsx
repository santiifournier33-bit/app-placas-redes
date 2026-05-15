"use client"

import type { Currency } from "@/lib/stores/serviciosStore"

interface CurrencyAmountProps {
  amount: number
  currency: Currency
  amountUSD?: number
  showBoth?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)
}

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n)
}

export function CurrencyAmount({ amount, currency, amountUSD, showBoth = false, className = "", size = "md" }: CurrencyAmountProps) {
  const sizeClass = size === "sm" ? "text-xs" : size === "lg" ? "text-lg font-semibold" : "text-sm"

  return (
    <span className={`${sizeClass} ${className}`}>
      {currency === "ARS" ? formatARS(amount) : formatUSD(amount)}
      {showBoth && currency === "ARS" && amountUSD !== undefined && amountUSD > 0 && (
        <span className="text-zinc-500 ml-1.5 text-xs">≈ {formatUSD(amountUSD)}</span>
      )}
    </span>
  )
}

export { formatARS, formatUSD }
