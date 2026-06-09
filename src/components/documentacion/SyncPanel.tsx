"use client"

import { useState, useRef, useEffect } from "react"
import { X, Play, Loader2, CheckCircle2, FolderPlus, Upload, Sparkles } from "lucide-react"

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // Clean up polling on unmount.
  useEffect(() => () => stopPoll(), [])

  const handleSync = async () => {
    setSyncing(true)
    setLogs([])
    setDone(false)
    setProgress({ current: 0, total: 0 })

    try {
      const res = await fetch("/api/docs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, agent: agent || null }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setLogs(prev => [...prev, { type: "error", message: err.error || "Error al sincronizar" }])
        setSyncing(false)
        return
      }

      // The sync runs in a background function; poll for progress (Netlify Blobs).
      // Ignore any stale status from a previous run until we see this run start.
      let seenRunning = false
      let lastLogLen = 0

      const poll = async () => {
        try {
          const sres = await fetch("/api/docs/sync/status", { cache: "no-store" })
          const p = await sres.json()

          if (p.state === "running") seenRunning = true
          if (!seenRunning) return // skip stale "done"/"error" from a prior run

          if (typeof p.current === "number" && typeof p.total === "number") {
            setProgress({ current: p.current, total: p.total })
          }
          if (Array.isArray(p.log) && p.log.length > lastLogLen) {
            const fresh = p.log.slice(lastLogLen).map((m: string) => ({ type: "progress" as const, message: m }))
            setLogs(prev => [...prev, ...fresh])
            lastLogLen = p.log.length
          }

          if (p.state === "done") {
            stopPoll()
            setSyncing(false)
            setDone(true)
            setLogs(prev => [...prev, { type: "done", message: p.message || "Sincronización completada" }])
            onSyncComplete()
          } else if (p.state === "error") {
            stopPoll()
            setSyncing(false)
            setLogs(prev => [...prev, { type: "error", message: p.error || p.message || "Error en la sincronización" }])
          }
        } catch {
          // transient poll error — keep trying
        }
      }

      pollRef.current = setInterval(poll, 2500)
      poll()
    } catch (err) {
      setLogs(prev => [...prev, { type: "error", message: `Error de conexión: ${err}` }])
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
        <div className="w-full max-w-lg bg-shell-bg border border-border-subtle rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div>
              <h2 className="text-base font-bold text-text-primary">Sincronización</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {unsyncedCount} propiedad{unsyncedCount !== 1 ? "es" : ""} nueva{unsyncedCount !== 1 ? "s" : ""} detectada{unsyncedCount !== 1 ? "s" : ""}
              </p>
            </div>
            {!syncing && (
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-overlay-hover text-text-muted cursor-pointer">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Config */}
          {!syncing && !done && (
            <div className="px-5 py-4 space-y-4">
              {/* Mode selection */}
              <div className="space-y-2">
                <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.12em]">Modo</p>
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
                            : "border-border-subtle bg-white/[0.01] hover:bg-surface-overlay"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selected ? "border-blue-400" : "border-zinc-600"
                        }`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                        </div>
                        <Icon size={16} className={selected ? "text-blue-400" : "text-text-muted"} />
                        <div className="text-left">
                          <p className={`text-sm font-medium ${selected ? "text-blue-400" : "text-text-secondary"}`}>{m.label}</p>
                          <p className="text-xs md:text-[10px] text-text-muted">{m.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Agent filter */}
              <div>
                <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Asesor</p>
                <select
                  value={agent}
                  onChange={e => setAgent(e.target.value)}
                  className="w-full appearance-none bg-surface-overlay border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-primary cursor-pointer focus:outline-none focus:border-blue-500/30"
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
                  <div className="flex justify-between text-xs md:text-[10px] text-text-muted">
                    <span>{syncing ? "Procesando..." : "Completado"}</span>
                    <span>{progress.current}/{progress.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-overlay overflow-hidden">
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
                className="max-h-[240px] overflow-y-auto rounded-xl bg-black/30 border border-border-subtle p-3 space-y-1 font-mono text-xs md:text-[11px]"
              >
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {log.type === "progress" && <span className="text-blue-400 shrink-0">✓</span>}
                    {log.type === "warning" && <span className="text-amber-400 shrink-0">⚠</span>}
                    {log.type === "error" && <span className="text-red-400 shrink-0">✗</span>}
                    {log.type === "done" && <span className="text-emerald-400 shrink-0">✓</span>}
                    {log.type === "start" && <span className="text-text-muted shrink-0">→</span>}
                    <span className={`break-all ${
                      log.type === "error" ? "text-red-400" :
                      log.type === "warning" ? "text-amber-400" :
                      log.type === "done" ? "text-emerald-400" :
                      "text-text-secondary"
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                {syncing && (
                  <div className="flex items-center gap-2 text-text-muted">
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
