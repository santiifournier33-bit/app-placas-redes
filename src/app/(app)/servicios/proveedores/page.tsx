"use client"

import { useState, useMemo } from "react"
import { Search, Plus, X } from "lucide-react"
import { useHydrated } from "@/lib/hooks/useHydrated"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { ProviderCard } from "@/components/servicios/ProviderCard"
import { ProviderForm } from "@/components/servicios/ProviderForm"
import { ProviderDetail } from "@/components/servicios/ProviderDetail"
import type { Provider } from "@/lib/stores/serviciosStore"

export default function ProveedoresPage() {
  const mounted = useHydrated()

  const { providers, categories } = useServiciosStore()
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editProvider, setEditProvider] = useState<Provider | undefined>()
  const [detailProvider, setDetailProvider] = useState<Provider | undefined>()

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      if (search) {
        const cat = categories.find((c) => c.id === p.categoryId)
        const haystack = [p.name, cat?.name, ...p.tags].join(" ").toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      if (filterCategory && p.categoryId !== filterCategory) return false
      return true
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [providers, search, filterCategory, categories])

  const usedCategories = useMemo(() => {
    const ids = new Set(providers.map((p) => p.categoryId))
    return categories.filter((c) => ids.has(c.id))
  }, [providers, categories])

  if (!mounted) {
    return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-surface-overlay rounded-xl" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-text-primary">Proveedores</h1>
        <button
          onClick={() => { setEditProvider(undefined); setFormOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo proveedor</span>
        </button>
      </div>

      {/* Search + category filter */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proveedores..."
            className="w-full pl-8 pr-3 py-2 bg-surface-overlay border border-border-subtle rounded-xl text-sm text-text-secondary placeholder-zinc-600 focus:outline-none focus:border-blue-500/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
              <X size={12} />
            </button>
          )}
        </div>
        {usedCategories.length > 1 && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-surface-overlay border border-border-subtle rounded-xl text-sm text-text-secondary focus:outline-none [color-scheme:dark]"
          >
            <option value="">Todas las categorías</option>
            {usedCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-text-muted mb-3">
        {filtered.length} proveedor{filtered.length !== 1 ? "es" : ""}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle p-12 text-center">
          <p className="text-text-muted text-sm">
            {providers.length === 0 ? "No hay proveedores registrados." : "Ningún proveedor coincide con la búsqueda."}
          </p>
          {providers.length === 0 && (
            <button
              onClick={() => { setEditProvider(undefined); setFormOpen(true) }}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Crear el primero →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              onClick={() => setDetailProvider(p)}
            />
          ))}
        </div>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => { setEditProvider(undefined); setFormOpen(true) }}
        className="fixed bottom-24 right-5 lg:hidden w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-30"
      >
        <Plus size={22} />
      </button>

      {/* Form modal */}
      {formOpen && (
        <ProviderForm
          provider={editProvider}
          onClose={() => { setFormOpen(false); setEditProvider(undefined) }}
        />
      )}

      {/* Detail drawer */}
      {detailProvider && (
        <ProviderDetail
          provider={detailProvider}
          onClose={() => setDetailProvider(undefined)}
          onEdit={(p) => { setDetailProvider(undefined); setEditProvider(p); setFormOpen(true) }}
          onDelete={() => setDetailProvider(undefined)}
        />
      )}
    </div>
  )
}
