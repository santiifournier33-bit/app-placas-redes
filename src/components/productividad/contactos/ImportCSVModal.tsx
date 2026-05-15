'use client'

import { useState, useCallback } from 'react'
import { Upload, X, ArrowRight, Check, AlertTriangle } from 'lucide-react'
import { parseCSV, autoMapHeaders, MAPPABLE_FIELDS, type ColumnMapping } from '@/lib/csv/parse'
import { useContactStore, type Contact } from '@/lib/stores/contactStore'

type Step = 'upload' | 'mapping' | 'importing' | 'done'

interface ImportCSVModalProps {
  onClose: () => void
}

export function ImportCSVModal({ onClose }: ImportCSVModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 })
  const [dragOver, setDragOver] = useState(false)

  const { addContact, findDuplicate } = useContactStore()

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) return
    const parsed = await parseCSV(file)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    setMapping(autoMapHeaders(parsed.headers))
    setStep('mapping')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const updateMapping = (csvHeader: string, dbField: string | null) => {
    setMapping(prev =>
      prev.map(m => m.csvHeader === csvHeader ? { ...m, dbField } : m)
    )
  }

  const mappedCount = mapping.filter(m => m.dbField).length
  const hasFirstName = mapping.some(m => m.dbField === 'first_name')

  const startImport = async () => {
    setStep('importing')
    const total = rows.length
    setProgress({ done: 0, total, errors: 0 })
    let errors = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const data: Record<string, string> = {}

      for (const m of mapping) {
        if (m.dbField && row[m.csvHeader]) {
          data[m.dbField] = row[m.csvHeader].trim()
        }
      }

      if (!data.first_name) {
        errors++
        setProgress({ done: i + 1, total, errors })
        continue
      }

      const dup = findDuplicate(data.primary_phone ?? '', data.primary_email ?? '')
      if (dup) {
        errors++
        setProgress({ done: i + 1, total, errors })
        continue
      }

      try {
        await addContact(data as unknown as Partial<Contact> & { first_name: string })
      } catch {
        errors++
      }
      setProgress({ done: i + 1, total, errors })
    }

    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a24] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <h3 className="text-sm font-bold text-shell-text">Importar CSV</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/[0.06] rounded-lg cursor-pointer">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'upload' && (
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`flex flex-col items-center justify-center gap-3 py-12 rounded-xl border-2 border-dashed transition-colors ${
                dragOver ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/[0.1]'
              }`}
            >
              <Upload size={32} className="text-zinc-500" />
              <p className="text-sm text-zinc-400">Arrastrá un archivo CSV acá</p>
              <p className="text-xs text-zinc-600">o</p>
              <label className="px-4 py-2 rounded-xl bg-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/25 cursor-pointer">
                Elegir archivo
                <input type="file" accept=".csv" onChange={onFileSelect} className="hidden" />
              </label>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  {rows.length} filas · {mappedCount} columnas mapeadas
                </p>
                {!hasFirstName && (
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle size={13} />
                    <span className="text-[11px]">Falta mapear Nombre</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {mapping.map(m => (
                  <div key={m.csvHeader} className="flex items-center gap-2 py-1.5">
                    <span className="text-xs text-zinc-500 w-36 truncate shrink-0" title={m.csvHeader}>
                      {m.csvHeader}
                    </span>
                    <ArrowRight size={12} className="text-zinc-700 shrink-0" />
                    <select
                      value={m.dbField ?? ''}
                      onChange={e => updateMapping(m.csvHeader, e.target.value || null)}
                      className="flex-1 bg-white/[0.04] rounded-lg px-2 py-1.5 text-xs text-zinc-300 border border-white/[0.06] outline-none cursor-pointer [color-scheme:dark]"
                    >
                      <option value="">— Ignorar —</option>
                      {MAPPABLE_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {rows.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Vista previa (primeras 3 filas)</p>
                  <div className="space-y-2">
                    {rows.slice(0, 3).map((row, i) => (
                      <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                        {mapping.filter(m => m.dbField).map(m => (
                          <div key={m.csvHeader} className="flex gap-2 text-[11px]">
                            <span className="text-zinc-600 w-20 shrink-0">
                              {MAPPABLE_FIELDS.find(f => f.value === m.dbField)?.label}:
                            </span>
                            <span className="text-zinc-400 truncate">{row[m.csvHeader] || '—'}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-sm text-zinc-400">
                {progress.done} / {progress.total} contactos
              </p>
              {progress.errors > 0 && (
                <p className="text-xs text-amber-400">{progress.errors} omitidos (duplicados o sin nombre)</p>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Check size={24} className="text-emerald-400" />
              </div>
              <p className="text-sm text-zinc-300 font-medium">Importación completa</p>
              <p className="text-xs text-zinc-500">
                {progress.done - progress.errors} importados · {progress.errors} omitidos
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2 shrink-0">
          {step === 'mapping' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:bg-white/[0.06] cursor-pointer"
              >
                Volver
              </button>
              <button
                onClick={startImport}
                disabled={!hasFirstName || mappedCount === 0}
                className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 cursor-pointer"
              >
                Importar {rows.length} contactos
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 cursor-pointer"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
