'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore, type ToastType } from '@/lib/stores/toastStore'

const ICON: Record<ToastType, React.ReactNode> = {
  success: <Check size={16} className="text-emerald-400" />,
  error: <AlertCircle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-blue-400" />,
}

const RING: Record<ToastType, string> = {
  success: 'border-emerald-500/25',
  error: 'border-red-500/25',
  info: 'border-blue-500/25',
}

/**
 * Toaster global. Montado una vez en AppShell. Renderiza via portal a body para
 * quedar por encima del nav/modales. Se ubica abajo (zona pulgar) respetando
 * safe-area y dejando lugar para el BottomTabs en móvil.
 */
export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] lg:bottom-6 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-2.5 max-w-sm w-full sm:w-auto rounded-xl border ${RING[t.type]} bg-[#1e1e2c]/95 backdrop-blur px-3.5 py-2.5 shadow-2xl animate-fade-in`}
        >
          <span className="shrink-0">{ICON[t.type]}</span>
          <span className="text-sm text-text-primary flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
