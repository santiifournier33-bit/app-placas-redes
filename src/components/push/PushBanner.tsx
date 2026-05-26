"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import {
  registerServiceWorker,
  subscribeToPush,
  isPushSupported,
  getPushPermission,
} from "@/lib/push/subscribe"

export function PushBanner() {
  const [show, setShow] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    registerServiceWorker()

    if (!isPushSupported()) return
    const perm = getPushPermission()
    if (perm === "default") {
      const dismissed = localStorage.getItem("push-banner-dismissed")
      if (!dismissed) setShow(true)
    }
  }, [])

  const handleEnable = async () => {
    setRegistering(true)
    const reg = await registerServiceWorker()
    if (reg) await subscribeToPush(reg)
    setRegistering(false)
    setShow(false)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem("push-banner-dismissed", "1")
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:bottom-6 lg:max-w-sm z-50">
      <div className="bg-[#1a1a24] border border-border-default rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Bell size={20} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">Activar notificaciones</p>
            <p className="text-xs text-text-muted mt-0.5">
              Recibe recordatorios de tareas y vencimientos en tu celular
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={registering}
                className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {registering ? "Activando..." : "Activar"}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-surface-overlay transition-colors cursor-pointer"
              >
                Ahora no
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-surface-overlay-hover rounded-lg cursor-pointer shrink-0"
          >
            <X size={14} className="text-text-muted" />
          </button>
        </div>
      </div>
    </div>
  )
}
