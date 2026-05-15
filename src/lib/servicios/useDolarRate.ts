"use client"

import { useEffect, useState } from "react"
import { useServiciosStore } from "@/lib/stores/serviciosStore"

export function useDolarRate() {
  const { lastRateFetch, addRate, getCurrentRate } = useServiciosStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retries, setRetries] = useState(0)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (lastRateFetch === today) return
    if (retries >= 3) return

    let cancelled = false
    const fetchRate = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/servicios/dolar")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        addRate({
          date: data.date,
          blueBuy: data.blueBuy,
          source: data.source ?? "dolarhoy",
          fetchedAt: new Date().toISOString(),
        })
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Error desconocido")
        setRetries((r) => r + 1)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchRate()
    return () => { cancelled = true }
  }, [lastRateFetch, retries, addRate])

  const manualSet = (blueBuy: number) => {
    const today = new Date().toISOString().slice(0, 10)
    addRate({
      date: today,
      blueBuy,
      source: "manual",
      fetchedAt: new Date().toISOString(),
    })
    setError(null)
    setRetries(0)
  }

  return {
    rate: getCurrentRate(),
    loading,
    error,
    needsManual: retries >= 3,
    manualSet,
  }
}
