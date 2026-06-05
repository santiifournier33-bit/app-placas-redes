'use client'

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastState {
  toasts: Toast[]
  notify: (message: string, type?: ToastType, durationMs?: number) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  notify: (message, type = 'success', durationMs = 2500) => {
    const id = (globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random()))
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().dismiss(id), durationMs)
  },

  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

/** Helper para usar fuera de componentes (stores, handlers). */
export const notify = (message: string, type?: ToastType, durationMs?: number) =>
  useToastStore.getState().notify(message, type, durationMs)
