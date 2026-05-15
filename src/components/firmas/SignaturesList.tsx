'use client'

import { useEffect, useState } from 'react'

interface Submission {
  id: number
  name: string
  status: string
  created_at: string
  completed_at: string | null
  submitters: Array<{
    id: number
    name: string
    email: string
    status: string
    completed_at: string | null
  }>
  documents?: Array<{ url: string; name: string }>
}

const statusLabel: Record<string, { text: string; color: string }> = {
  pending: { text: 'Pendiente', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  completed: { text: 'Completado', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  declined: { text: 'Rechazado', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  expired: { text: 'Vencido', color: 'text-gray-400 bg-gray-400/10 border-gray-400/30' },
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SignaturesList() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/signatures/list')
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setSubmissions(data.submissions || [])
      })
      .catch(() => setError('Error al cargar documentos'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[var(--text-muted)]">Cargando documentos...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center h-full">
      <p className="text-sm text-red-400">{error}</p>
    </div>
  )

  if (submissions.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center h-full gap-4 text-[var(--text-muted)]">
      <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-medium text-[var(--text-secondary)]">Sin documentos todavía</p>
        <p className="text-sm mt-1">Los documentos enviados a firmar aparecerán acá</p>
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-3">
        {submissions.map(sub => {
          const st = statusLabel[sub.status] || statusLabel['pending']
          const completed = sub.submitters.filter(s => s.status === 'completed').length
          const total = sub.submitters.length
          const progress = total > 0 ? (completed / total) * 100 : 0

          return (
            <div key={sub.id} className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-violet-500/40 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[var(--text-primary)] truncate">{sub.name}</h3>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${st.color}`}>
                      {st.text}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Creado {formatDate(sub.created_at)}</p>
                  {sub.completed_at && (
                    <p className="text-xs text-emerald-400 mt-0.5">Completado {formatDate(sub.completed_at)}</p>
                  )}
                </div>

                {/* Progress */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-violet-400">{completed}/{total}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">firmantes</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }} />
              </div>

              {/* Submitters */}
              <div className="mt-3 flex flex-wrap gap-2">
                {sub.submitters.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 text-[11px] bg-[var(--bg-secondary)] rounded-lg px-2 py-1">
                    <div className={`w-2 h-2 rounded-full ${s.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <span className="text-[var(--text-secondary)]">{s.name || s.email}</span>
                  </div>
                ))}
              </div>

              {/* Download button */}
              {sub.status === 'completed' && (
                <a
                  href={`/api/signatures/${sub.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar PDF firmado
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
