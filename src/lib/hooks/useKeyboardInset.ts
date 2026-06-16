"use client"

import { useEffect, useState } from "react"

/**
 * Alto del teclado virtual en px (coords de layout) vía visualViewport.
 *
 * `kbInset = innerHeight - (vv.offsetTop + vv.height)` = espacio por debajo del
 * viewport *visible* dentro del layout = el teclado. Incluir `offsetTop` lo hace
 * robusto en cualquier posición de scroll (iOS reparte el teclado entre `offsetTop`
 * y `height` según el scroll).
 *
 * Uso: en un bottom-sheet `position: fixed` aplicar `style={{ bottom: kbInset }}`
 * (estilo Todoist) → el borde inferior se apoya sobre el teclado. SIN `transform`
 * (un `fixed` + `transform` + teclado se rompe en iOS; ver [[project_ios_keyboard_sheets]]).
 *
 * Devuelve 0 si el teclado está cerrado o no hay soporte de visualViewport.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    const vv = window.visualViewport
    if (!vv) return // sin soporte: la hoja queda en bottom:0

    const handle = () => {
      const kb = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height))
      // Umbral chico para ignorar diferencias de barra de direcciones.
      setInset(kb > 80 ? kb : 0)
    }
    handle()
    vv.addEventListener("resize", handle)
    vv.addEventListener("scroll", handle)
    return () => {
      vv.removeEventListener("resize", handle)
      vv.removeEventListener("scroll", handle)
    }
  }, [])

  return inset
}
