"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"

export interface IncomeEntry {
  date: string  // YYYY-MM-DD
  amount: number // USD
}

interface CacheEntry {
  data: IncomeEntry[]
  fetchedAt: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 min
const cache = new Map<string, CacheEntry>()

export function useVentasIncome(from: Date, to: Date) {
  const [data, setData] = useState<IncomeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const fromStr = format(from, "yyyy-MM-dd")
    const toStr = format(to, "yyyy-MM-dd")
    const key = `${fromStr}_${toStr}`

    const cached = cache.get(key)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      setData(cached.data)
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)

    fetch(`/api/ventas/operations?from=${fromStr}&to=${toStr}`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        const operations: { fecha?: string; honorarios?: number; date?: string; amount?: number }[] = Array.isArray(json) ? json : (json.data ?? [])
        const entries: IncomeEntry[] = operations.map((op) => ({
          date: (op.fecha ?? op.date ?? "").slice(0, 10),
          amount: Number(op.honorarios ?? op.amount ?? 0),
        })).filter((e) => e.date && e.amount > 0)
        cache.set(key, { data: entries, fetchedAt: Date.now() })
        setData(entries)
      })
      .catch((e) => {
        if (e.name === "AbortError") return
        setError(e.message ?? "Error")
        setData([])
      })
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [from.getTime(), to.getTime()]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error }
}
