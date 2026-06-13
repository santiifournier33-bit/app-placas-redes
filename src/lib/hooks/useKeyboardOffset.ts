"use client"

import { useEffect, useState } from "react"

/**
 * Altura en px que ocupa el teclado virtual sobre el viewport, vía visualViewport.
 *
 * iOS encoge el viewport *visual* (no el *layout*) al abrir el teclado y posiciona
 * los elementos `position: fixed` respecto al layout → una hoja `fixed bottom:0`
 * "flota" sobre el teclado dejando ver el fondo. Aplicar este offset como `bottom`
 * inline en la hoja la apoya justo sobre el teclado (sin gap), sin usar `transform`
 * (que la volvería containing-block de sus hijos `fixed`).
 *
 * Devuelve 0 cuando el teclado está cerrado o el navegador no soporta visualViewport.
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    const vv = window.visualViewport
    if (!vv) return // navegadores muy viejos: la hoja queda en bottom:0

    const handle = () => {
      // Espacio entre el borde inferior del viewport visible y el del layout = teclado.
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setOffset(kb)
    }
    handle()
    vv.addEventListener("resize", handle)
    vv.addEventListener("scroll", handle)
    return () => {
      vv.removeEventListener("resize", handle)
      vv.removeEventListener("scroll", handle)
    }
  }, [])

  return offset
}
