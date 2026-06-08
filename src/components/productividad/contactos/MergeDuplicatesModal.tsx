'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Merge, Phone, Mail } from 'lucide-react'
import { useContactStore, type Contact } from '@/lib/stores/contactStore'
import { notify } from '@/lib/stores/toastStore'

interface Props {
  contacts: Contact[]
  onClose: () => void
}

const normPhone = (p: string | null) => (p ? p.replace(/\D/g, '') : '')
const normEmail = (e: string | null) => (e ? e.toLowerCase().trim() : '')
const fullName = (c?: Contact | null) =>
  c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Sin nombre' : 'Sin nombre'

/**
 * Detecta grupos de contactos duplicados (mismo teléfono o email) con union-find
 * y permite combinarlos: el usuario elige el principal y el resto se fusiona en él
 * vía /api/contacts/merge (reasigna relaciones + completa campos + soft-delete).
 */
export function MergeDuplicatesModal({ contacts, onClose }: Props) {
  const groups = useMemo(() => {
    const parent = new Map<string, string>()
    contacts.forEach(c => parent.set(c.id, c.id))
    const find = (x: string): string => {
      let r = x
      while (parent.get(r) !== r) r = parent.get(r)!
      return r
    }
    const union = (a: string, b: string) => { parent.set(find(a), find(b)) }
    const byPhone = new Map<string, string>()
    const byEmail = new Map<string, string>()
    for (const c of contacts) {
      const p = normPhone(c.primary_phone)
      if (p) { const prev = byPhone.get(p); if (prev) union(c.id, prev); else byPhone.set(p, c.id) }
      const e = normEmail(c.primary_email)
      if (e) { const prev = byEmail.get(e); if (prev) union(c.id, prev); else byEmail.set(e, c.id) }
    }
    const map = new Map<string, Contact[]>()
    for (const c of contacts) {
      const r = find(c.id)
      const arr = map.get(r) ?? []
      arr.push(c)
      map.set(r, arr)
    }
    return [...map.values()].filter(g => g.length >= 2)
  }, [contacts])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 lg:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full h-full lg:w-[90vw] lg:max-w-2xl lg:h-auto lg:max-h-[85vh] bg-surface-1 border-0 lg:border border-border-subtle rounded-none lg:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-text-primary">Combinar duplicados</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {groups.length === 0 ? 'No se encontraron duplicados' : `${groups.length} grupo${groups.length !== 1 ? 's' : ''} por teléfono o email`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-2 rounded-xl cursor-pointer">
            <X size={20} className="text-text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {groups.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm">
              Tu lista no tiene contactos con teléfono o email repetido.
            </div>
          ) : (
            groups.map(g => <DuplicateGroup key={g.map(c => c.id).sort().join(':')} group={g} />)
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function DuplicateGroup({ group }: { group: Contact[] }) {
  const [primaryId, setPrimaryId] = useState(group[0].id)
  const [merging, setMerging] = useState(false)
  const [done, setDone] = useState(false)
  const [doneName, setDoneName] = useState('')

  const handleMerge = async () => {
    setMerging(true)
    // Capturar el nombre AHORA: tras el merge el store muta y `group` puede recomponerse.
    setDoneName(fullName(group.find(c => c.id === primaryId)))
    const secondaries = group.filter(c => c.id !== primaryId)
    let okCount = 0
    for (const s of secondaries) {
      const r = await fetch('/api/contacts/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ primaryId, secondaryId: s.id }),
      })
      if (r.ok) okCount++
    }
    // Drop secundarios fusionados del store (el soft-delete no llega como DELETE realtime).
    const mergedIds = new Set(secondaries.map(s => s.id))
    useContactStore.setState(st => ({ contacts: st.contacts.filter(c => !mergedIds.has(c.id)) }))
    setMerging(false)
    setDone(true)
    notify(okCount === secondaries.length ? 'Contactos combinados' : `Combinados ${okCount}/${secondaries.length}`,
      okCount === secondaries.length ? 'success' : 'error')
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">
        Combinado en {doneName}.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-overlay p-3 space-y-2">
      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Elegí el contacto principal</p>
      <div className="space-y-1.5">
        {group.map(c => (
          <label key={c.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-overlay-hover cursor-pointer">
            <input
              type="radio"
              name={`primary-${group[0].id}`}
              checked={primaryId === c.id}
              onChange={() => setPrimaryId(c.id)}
              className="accent-blue-500 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-primary truncate">{fullName(c)}</p>
              <div className="flex items-center gap-3 text-[11px] text-text-muted">
                {c.primary_phone && <span className="flex items-center gap-1"><Phone size={10} />{c.primary_phone}</span>}
                {c.primary_email && <span className="flex items-center gap-1 truncate"><Mail size={10} />{c.primary_email}</span>}
              </div>
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={handleMerge}
        disabled={merging}
        className="w-full flex items-center justify-center gap-1.5 min-h-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
      >
        <Merge size={14} /> {merging ? 'Combinando…' : `Combinar ${group.length} en 1`}
      </button>
    </div>
  )
}
