"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, SlidersHorizontal, Plus, LayoutList, LayoutGrid, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { getPaymentStatus } from "@/lib/servicios/status"
import { PaymentCard } from "@/components/servicios/PaymentCard"
import { PaymentForm } from "@/components/servicios/PaymentForm"
import { CategoryBadge } from "@/components/servicios/CategoryBadge"
import type { Payment, PaymentStatus, Currency } from "@/lib/stores/serviciosStore"

type ViewMode = "list" | "grouped"

export default function GastosPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Mobile FAB fab:new-payment → open payment form (fresh, no edit).
  useEffect(() => {
    const open = () => {
      setEditPayment(undefined)
      setFormOpen(true)
    }
    window.addEventListener("fab:new-payment", open)
    return () => window.removeEventListener("fab:new-payment", open)
  }, [])

  const { payments, categories, providers } = useServiciosStore()

  // Filters
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<PaymentStatus[]>([])
  const [filterCurrency, setFilterCurrency] = useState<Currency | "">("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [filterTags, setFilterTags] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [showFilters, setShowFilters] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<Payment | undefined>()

  const today = new Date()

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      // Search: match category name, provider name, notes
      if (search) {
        const cat = categories.find((c) => c.id === p.categoryId)
        const prov = providers.find((pr) => pr.id === p.providerId)
        const haystack = [cat?.name, prov?.name, p.notes, ...p.tags].join(" ").toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      if (filterCategory.length > 0 && !filterCategory.includes(p.categoryId)) return false
      if (filterStatus.length > 0 && !filterStatus.includes(getPaymentStatus(p, today))) return false
      if (filterCurrency && p.currency !== filterCurrency) return false
      if (filterDateFrom && p.dueDate < filterDateFrom) return false
      if (filterDateTo && p.dueDate > filterDateTo + "T23:59:59") return false
      if (filterTags) {
        const tags = filterTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
        if (!tags.every((t) => p.tags.some((pt) => pt.toLowerCase().includes(t)))) return false
      }
      return true
    }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
  }, [payments, search, filterCategory, filterStatus, filterCurrency, filterDateFrom, filterDateTo, filterTags, categories, providers, today])

  const grouped = useMemo(() => {
    if (viewMode !== "grouped") return null
    const map = new Map<string, Payment[]>()
    filtered.forEach((p) => {
      const key = format(new Date(p.dueDate), "MMMM yyyy", { locale: es })
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })
    return Array.from(map.entries())
  }, [filtered, viewMode])

  const activeFilters = filterCategory.length + filterStatus.length + (filterCurrency ? 1 : 0) + (filterDateFrom ? 1 : 0) + (filterDateTo ? 1 : 0) + (filterTags ? 1 : 0)

  const clearFilters = () => {
    setFilterCategory([])
    setFilterStatus([])
    setFilterCurrency("")
    setFilterDateFrom("")
    setFilterDateTo("")
    setFilterTags("")
  }

  const toggleCategoryFilter = (id: string) =>
    setFilterCategory((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])

  const toggleStatusFilter = (s: PaymentStatus) =>
    setFilterStatus((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])

  if (!mounted) {
    return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-white/[0.04] rounded-xl" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-shell-text">Gastos</h1>
        <button
          onClick={() => { setEditPayment(undefined); setFormOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo gasto</span>
        </button>
      </div>

      {/* Search + filter toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar gastos..."
            className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-blue-500/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X size={12} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((o) => !o)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition-colors ${
            activeFilters > 0
              ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
              : "border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]"
          }`}
        >
          <SlidersHorizontal size={14} />
          {activeFilters > 0 && <span className="text-xs font-medium">{activeFilters}</span>}
        </button>

        <div className="flex rounded-xl border border-white/[0.08] overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 transition-colors ${viewMode === "list" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <LayoutList size={14} />
          </button>
          <button
            onClick={() => setViewMode("grouped")}
            className={`p-2 transition-colors ${viewMode === "grouped" ? "bg-white/[0.08] text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-4">
          {/* Category chips */}
          <div>
            <p className="text-xs text-zinc-500 mb-2 font-medium">Categoría</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategoryFilter(cat.id)}
                  className={`transition-all ${filterCategory.includes(cat.id) ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                  style={filterCategory.includes(cat.id) ? { outline: `1.5px solid ${cat.color}`, borderRadius: "9999px" } : {}}
                >
                  <CategoryBadge category={cat} size="sm" />
                </button>
              ))}
            </div>
          </div>

          {/* Status chips */}
          <div>
            <p className="text-xs text-zinc-500 mb-2 font-medium">Estado</p>
            <div className="flex flex-wrap gap-1.5">
              {(["pendiente", "vence_hoy", "vencido", "pagado"] as PaymentStatus[]).map((s) => {
                const labels = { pendiente: "Pendiente", vence_hoy: "Vence hoy", vencido: "Vencido", pagado: "Pagado" }
                const active = filterStatus.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      active ? "bg-white/[0.08] border-white/[0.15] text-zinc-200" : "border-white/[0.06] text-zinc-500 hover:border-white/[0.12] hover:text-zinc-400"
                    }`}
                  >
                    {labels[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Moneda + Fecha range + Tags row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1 font-medium">Moneda</p>
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value as Currency | "")}
                className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none [color-scheme:dark]"
              >
                <option value="">Todas</option>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 font-medium">Desde</p>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none [color-scheme:dark]" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 font-medium">Hasta</p>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none [color-scheme:dark]" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 font-medium">Tags</p>
              <input type="text" value={filterTags} onChange={(e) => setFilterTags(e.target.value)}
                placeholder="urgente, fijo..."
                className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none" />
            </div>
          </div>

          {activeFilters > 0 && (
            <button onClick={clearFilters} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
              <X size={11} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-zinc-600 mb-3">
        {filtered.length === payments.length
          ? `${payments.length} gasto${payments.length !== 1 ? "s" : ""}`
          : `${filtered.length} de ${payments.length} gasto${payments.length !== 1 ? "s" : ""}`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] p-12 text-center">
          <p className="text-zinc-600 text-sm">
            {payments.length === 0 ? "No hay gastos registrados." : "Ningún gasto coincide con los filtros."}
          </p>
          {payments.length === 0 && (
            <button
              onClick={() => { setEditPayment(undefined); setFormOpen(true) }}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Crear el primero →
            </button>
          )}
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {filtered.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              onEdit={(pay) => { setEditPayment(pay); setFormOpen(true) }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped!.map(([month, pays]) => (
            <div key={month}>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 capitalize">{month}</h3>
              <div className="space-y-2">
                {pays.map((p) => (
                  <PaymentCard
                    key={p.id}
                    payment={p}
                    onEdit={(pay) => { setEditPayment(pay); setFormOpen(true) }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => { setEditPayment(undefined); setFormOpen(true) }}
        className="fixed bottom-24 right-5 lg:hidden w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-30"
      >
        <Plus size={22} />
      </button>

      {/* Form modal */}
      {formOpen && (
        <PaymentForm
          payment={editPayment}
          onClose={() => { setFormOpen(false); setEditPayment(undefined) }}
        />
      )}
    </div>
  )
}
