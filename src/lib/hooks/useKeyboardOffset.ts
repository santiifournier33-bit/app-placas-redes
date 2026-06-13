"use client"

import { useEffect, useState } from "react"

export interface KeyboardInsets {
  /** Altura en px que ocupa el teclado virtual sobre el viewport (0 = cerrado). */
  keyboardHeight: number
  /** Altura del área visible (visualViewport.height) o innerHeight si no hay soporte. */
  viewportHeight: number
}

const KEYBOARD_THRESHOLD_PX = 100

/**
 * Insets del teclado virtual vía visualViewport.
 *
 * iOS encoge el viewport *visual* (no el *layout*) al abrir el teclado y posiciona
 * los elementos `position: fixed` respecto al layout → una hoja `fixed bottom:0`
 * "flota" y deja ver el fondo. Combinar:
 *   - `bottom: keyboardHeight`  → apoya la hoja sobre el teclado (sin gap)
 *   - `maxHeight: viewportHeight` → la limita al área visible (su tope no se va arriba)
 * Se usa `bottom`/`maxHeight` (no `transform`) para no volver la hoja containing-block
 * de sus hijos `fixed`.
 *
 * `keyboardHeight = innerHeight - visualViewport.height` (sin `offsetTop`), igual que
 * el patrón ya probado `useKeyboardOpen` en AppShell. Umbral de 100px para ignorar
 * el ruido de la barra de direcciones.
 */
export function useKeyboardOffset(): KeyboardInsets {
  const [insets, setInsets] = useState<KeyboardInsets>({ keyboardHeight: 0, viewportHeight: 0 })

  useEffect(() => {
    if (typeof window === "undefined") return
    const vv = window.visualViewport

    const handle = () => {
      const viewportHeight = vv?.height ?? window.innerHeight
      const diff = window.innerHeight - viewportHeight
      const keyboardHeight = diff > KEYBOARD_THRESHOLD_PX ? diff : 0
      setInsets({ keyboardHeight, viewportHeight })
    }
    handle()

    if (!vv) return // navegadores muy viejos: la hoja queda en bottom:0
    vv.addEventListener("resize", handle)
    vv.addEventListener("scroll", handle)
    return () => {
      vv.removeEventListener("resize", handle)
      vv.removeEventListener("scroll", handle)
    }
  }, [])

  return insets
}
