"use client"

import { useState } from "react"
import { Mail, Lock, LogIn, AlertCircle, Loader2, ShieldCheck } from "lucide-react"
import { useMail } from "@/lib/mail/MailContext"

export function MailLogin() {
  const { mailEmail, savePassword, isLoading } = useMail()
  const [pass, setPass] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await savePassword(pass)
    } catch {
      setError("Contraseña incorrecta. Usá la contraseña de tu correo corporativo (DonWeb/Ferozo).")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Mail size={28} className="text-blue-400" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-text-primary text-center mb-1">Activar correo</h2>
        <p className="text-sm text-text-muted text-center mb-8">
          Solo necesitás ingresar tu contraseña una vez
        </p>

        {/* Current mail email (read-only, derived from session) */}
        <div className="mb-4 p-3 rounded-xl bg-surface-overlay border border-border-subtle">
          <p className="text-xs md:text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Tu correo corporativo</p>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-sm text-emerald-300 font-medium">{mailEmail}</span>
          </div>
          <p className="text-xs md:text-[10px] text-text-muted mt-1">Detectado automáticamente de tu sesión</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Contraseña del correo
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="Contraseña de DonWeb / Ferozo"
                required
                autoFocus
                className="w-full bg-surface-overlay border border-border-default rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:bg-surface-overlay-hover transition-all"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !pass}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {isLoading ? "Verificando..." : "Activar correo"}
          </button>
        </form>

        <p className="text-xs md:text-[11px] text-text-muted text-center mt-6 leading-relaxed">
          La contraseña se guarda solo en este dispositivo.<br />
          No se almacena en ningún servidor.
        </p>
      </div>
    </div>
  )
}
