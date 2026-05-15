"use client"

import { useState, useRef, useEffect } from "react"
import { X, Play, Loader2, CheckCircle2, AlertTriangle, XCircle, FolderPlus, Upload, Sparkles } from "lucide-react"

interface SyncPanelProps {
  unsyncedCount: number
  agents: string[]
  onClose: () => void
  onSyncComplete: () => void
}

interface SyncLogEntry {
  type: "start" | "progress" | "warning" | "error" | "done"
  message: string
  current?: number
  total?: number
  step?: string
}

export function SyncPanel({ unsyncedCount, agents, onClose, onSyncComplete }: SyncPanelProps) {
  const [mode, setMode] = useState<"folders" | "files" | "classify">("classify")
  const [agent, setAgent] = useState<string>("")
  const [syncing, setSyncing] = useState(false)
  const [logs, setLogs] = useState<SyncLogEntry[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [done, setDone] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const handleSync = async () => {
    setSyncing(true)
    setLogs([])
    setDone(false)

    try {
      const res = await fetch("/api/docs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          agent: agent || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setLogs(prev => [...prev, { type: "error", message: err.error || "Error al sincronizar" }])
        setSyncing(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setLogs(prev => [...prev, { type: "error", message: "No se pudo iniciar streaming" }])
        setSyncing(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const entry: SyncLogEntry = JSON.parse(line.slice(6))
              setLogs(prev => [...prev, entry])

              if (entry.current && entry.total) {
                setProgress({ current: entry.current, total: entry.total })
              }
              if (entry.type === "done") {
                setDone(true)
                onSyncComplete()
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, { type: "error", message: `Error de conexión: ${err}` }])
    } finally {
      setSyncing(false)
    }
  }

  const MODES = [
    { value: "folders" as const, label: "Solo carpetas", icon: FolderPlus, desc: "Crea carpetas en Drive sin subir archivos" },
    { value: "files" as const, label: "Carpetas + archivos", icon: Upload, desc: "Crea carpetas y sube archivos desde Tokko" },
    { value: "classify" as const, label: "Completo (con IA)", icon: Sparkles, desc: "Crea carpetas, sube archivos y clasifica con IA" },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={!syncing ? onClose : undefined} />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-lg bg-shell-bg border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-bold text-shell-text">Sincronización</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {unsyncedCount} propiedad{unsyncedCount !== 1 ? "es" : ""} nueva{unsyncedCount !== 1 ? "s" : ""} detectada{unsyncedCount !== 1 ? "s" : ""}
              </p>
            </div>
            {!syncing && (
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] text-zinc-500 cursor-pointer">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Config */}
          {!syncing && !done && (
            <div className="px-5 py-4 space-y-4">
              {/* Mode selection */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-[0.12em]">Modo</p>
                <div className="space-y-1.5">
                  {MODES.map(m => {
                    const Icon = m.icon
                    const selected = mode === m.value
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMode(m.value)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                          selected
                            ? "border-blue-500/30 bg-blue-500/10"
                            : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selected ? "border-blue-400" : "border-zinc-600"
                        }`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                        </div>
                        <Icon size={16} className={selected ? "text-blue-400" : "text-zinc-500"} />
                        <div className="text-left">
                          <p className={`text-sm font-medium ${selected ? "text-blue-400" : "text-zinc-300"}`}>{m.label}</p>
                          <p className="text-[10px] text-zinc-500">{m.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Agent filter */}
              <div>
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-[0.12em] mb-2">Asesor</p>
                <select
                  value={agent}
                  onChange={e => setAgent(e.target.value)}
                  className="w-full appearance-none bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-shell-text cursor-pointer focus:outline-none focus:border-blue-500/30"
                >
                  <option value="">Todos los asesores</option>
                  {agents.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Start button */}
              <button
                onClick={handleSync}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <Play size={16} fill="currentColor" />
                Iniciar sincronización
              </button>
            </div>
          )}

          {/* Log */}
          {(syncing || done || logs.length > 0) && (
            <div className="px-5 pb-5 pt-2 space-y-3">
              {/* Progress bar */}
              {progress.total > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>{syncing ? "Procesando..." : "Completado"}</span>
                    <span>{progress.current}/{progress.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Log entries */}
              <div
                ref={logRef}
                className="max-h-[240px] overflow-y-auto rounded-xl bg-black/30 border border-white/[0.04] p-3 space-y-1 font-mono text-[11px]"
              >
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {log.type === "progress" && <span className="text-blue-400 shrink-0">✓</span>}
                    {log.type === "warning" && <span className="text-amber-400 shrink-0">⚠</span>}
                    {log.type === "error" && <span className="text-red-400 shrink-0">✗</span>}
                    {log.type === "done" && <span className="text-emerald-400 shrink-0">✓</span>}
                    {log.type === "start" && <span className="text-zinc-500 shrink-0">→</span>}
                    <span className={`break-all ${
                      log.type === "error" ? "text-red-400" :
                      log.type === "warning" ? "text-amber-400" :
                      log.type === "done" ? "text-emerald-400" :
                      "text-zinc-400"
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                {syncing && (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Loader2 size={11} className="animate-spin" />
                    <span>Procesando...</span>
                  </div>
                )}
              </div>

              {/* Close when done */}
              {done && (
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  Cerrar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
