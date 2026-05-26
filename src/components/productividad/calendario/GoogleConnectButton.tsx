"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Unlink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function GoogleConnectButton() {
  const [status, setStatus] = useState<"loading" | "disconnected" | "connected">("loading")
  const [email, setEmail] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus("disconnected"); return }

    const { data } = await supabase
      .from("google_calendar_connections")
      .select("google_account_email, is_active, sync_token")
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    if (data) {
      setStatus("connected")
      setEmail(data.google_account_email)
    } else {
      setStatus("disconnected")
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/google/sync", { method: "POST" })
      const data = await res.json()
      if (data.ok) {
        setLastSync(`${data.pulled} importados, ${data.pushed} exportados`)
      }
    } catch {}
    setSyncing(false)
  }

  async function handleDisconnect() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from("google_calendar_connections")
      .update({ is_active: false })
      .eq("owner_id", user.id)

    setStatus("disconnected")
    setEmail(null)
  }

  if (status === "loading") return null

  if (status === "disconnected") {
    return (
      <a
        href="/api/google/oauth/authorize"
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-all"
      >
        <GoogleIcon />
        Conectar Google Calendar
      </a>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-xs md:text-[10px] font-medium text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {email}
      </div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="p-1.5 hover:bg-white/[0.06] rounded-lg cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
        title="Sincronizar"
      >
        <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
      </button>
      <button
        onClick={handleDisconnect}
        className="p-1.5 hover:bg-red-500/10 rounded-lg cursor-pointer text-zinc-600 hover:text-red-400 transition-colors"
        title="Desconectar"
      >
        <Unlink size={14} />
      </button>
      {lastSync && (
        <span className="text-xs md:text-[10px] text-zinc-600">{lastSync}</span>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
