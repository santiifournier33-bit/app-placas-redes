"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, X } from "lucide-react"
import {
  registerServiceWorker,
  subscribeToPush,
  getExistingSubscription,
  isPushSupported,
  getPushPermission,
} from "@/lib/push/subscribe"

// Don't nag on every load. Once the user dismisses (or a request fails) while the
// permission is still "default", snooze the banner for this long.
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
const SNOOZE_KEY = "push-banner-snooze-until"
// Throttle the silent server re-sync (idempotent upsert) so we heal a missing
// server-side row without POSTing on literally every page load.
const SYNC_KEY = "push-last-sync"
const SYNC_THROTTLE_MS = 24 * 60 * 60 * 1000

function snoozed(): boolean {
  const until = Number(localStorage.getItem(SNOOZE_KEY) || 0)
  return Date.now() < until
}

export function PushBanner() {
  const [show, setShow] = useState(false)
  const [registering, setRegistering] = useState(false)

  // Decide what to show based on the REAL state: permission + actual subscription.
  // - granted + subscribed  → nothing (and keep the server in sync, throttled)
  // - granted + no sub       → silently re-subscribe (permission already given)
  // - denied / unsupported   → nothing (OS won't let us re-ask)
  // - default                → show the banner, unless snoozed
  const evaluate = useCallback(async (reg: ServiceWorkerRegistration) => {
    const perm = getPushPermission()

    if (perm === "granted") {
      const existing = await getExistingSubscription(reg)
      if (!existing) {
        // Lost subscription (endpoint rotated / server row pruned). Re-attach
        // without prompting — the user already granted permission.
        await subscribeToPush(reg, { requestPermission: false })
      } else {
        // Heal a possibly-missing server row (e.g. an earlier 401), throttled.
        const last = Number(localStorage.getItem(SYNC_KEY) || 0)
        if (Date.now() - last > SYNC_THROTTLE_MS) {
          subscribeToPush(reg, { requestPermission: false }).then((r) => {
            if (r.ok) localStorage.setItem(SYNC_KEY, String(Date.now()))
          })
        }
      }
      setShow(false)
      return
    }

    if (perm === "denied" || perm === "unsupported") {
      setShow(false)
      return
    }

    // perm === "default"
    setShow(!snoozed())
  }, [])

  useEffect(() => {
    if (!isPushSupported()) return
    let active = true

    const run = async () => {
      const reg = await registerServiceWorker()
      if (reg && active) await evaluate(reg)
    }
    run()

    // Re-check when the tab regains focus: catches the user granting OR revoking
    // permission from OS/browser settings while the app was open.
    const onVisible = () => {
      if (document.visibilityState === "visible") run()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      active = false
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [evaluate])

  const handleEnable = async () => {
    // iOS Safari/PWA requires Notification.requestPermission() to run INSIDE the
    // tap's user-activation, before any `await` consumes it. So request first,
    // synchronously, then do the async SW + subscribe work. (Android is lenient,
    // which is why the previous order only failed on iPhone.)
    let permission: NotificationPermission = "denied"
    try {
      permission = await Notification.requestPermission()
    } catch {
      /* unsupported / throws → treat as not granted */
    }

    setRegistering(true)
    if (permission === "granted") {
      const reg = await registerServiceWorker()
      // Permission already handled above; just attach the subscription.
      if (reg) await subscribeToPush(reg, { requestPermission: false })
    }
    setRegistering(false)
    setShow(false)

    // Dismissed/denied/failed → snooze so we don't nag on the next load. A real
    // grant needs no snooze (perm=granted hides the banner on its own).
    if (permission !== "granted") {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
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
