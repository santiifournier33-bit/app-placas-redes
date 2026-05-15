"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, X, AlertTriangle } from "lucide-react"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { getPaymentStatus, daysUntilDue } from "@/lib/servicios/status"

const STORAGE_KEY = "servicios-last-reminder-shown"

export function ReminderToast() {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const { payments, providers } = useServiciosStore()

  useEffect(() => {
    setMounted(true)
    const today = new Date().toISOString().slice(0, 10)
    const last = localStorage.getItem(STORAGE_KEY)
    if (last === today) setDismissed(true)
  }, [])

  if (!mounted || dismissed) return null

  const today = new Date()
  const upcoming = payments.filter((p) => {
    if (p.paidDate) return false
    const status = getPaymentStatus(p, today)
    if (status === "vencido" || status === "vence_hoy") return true
    const days = daysUntilDue(p, today)
    const provider = providers.find((pr) => pr.id === p.providerId)
    const reminders = provider?.reminderDaysBefore ?? [7, 3, 1, 0]
    return reminders.includes(days)
  })

  if (upcoming.length === 0) return null

  const overdue = upcoming.filter((p) => getPaymentStatus(p, today) === "vencido").length
  const isUrgent = overdue > 0

  const dismiss = () => {
    setDismissed(true)
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(STORAGE_KEY, today)
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#1e1e2c] border border-white/[0.1] rounded-2xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-w-md">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isUrgent ? "bg-red-500/20" : "bg-amber-500/20"
      }`}>
        {isUrgent ? (
          <AlertTriangle size={14} className="text-red-400" />
        ) : (
          <Bell size={14} className="text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 font-medium">
          {overdue > 0
            ? `${overdue} ${overdue === 1 ? "pago vencido" : "pagos vencidos"}`
            : `${upcoming.length} ${upcoming.length === 1 ? "vencimiento próximo" : "vencimientos próximos"}`}
        </p>
        <Link
          href="/servicios/gastos"
          className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
        >
          Ver detalles →
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="text-zinc-600 hover:text-zinc-400 cursor-pointer shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  )
}
