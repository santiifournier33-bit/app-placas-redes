"use client"

import { useEffect, useState } from "react"

/**
 * Overlay temporal de medición del teclado virtual / visualViewport.
 * Solo se monta si la URL incluye `?kbdebug=1` → cero impacto en uso normal.
 *
 * Sirve para capturar números reales en iOS (no reproducible en emulación) y así
 * ajustar con exactitud la fórmula de keyboard-avoidance de los bottom-sheets.
 * Eliminar una vez confirmado el comportamiento.
 */
export function KbDebugHud() {
  const [enabled] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("kbdebug"),
  )
  const [data, setData] = useState<Record<string, number | string>>({})

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const vv = window.visualViewport
    const read = () => {
      const sheet = document.querySelector<HTMLElement>('[role="dialog"]')
      const r = sheet?.getBoundingClientRect()
      setData({
        innerH: window.innerHeight,
        vvH: vv ? Math.round(vv.height) : "n/a",
        vvOffTop: vv ? Math.round(vv.offsetTop) : "n/a",
        vvPageTop: vv ? Math.round(vv.pageTop) : "n/a",
        vvScale: vv ? +vv.scale.toFixed(2) : "n/a",
        kbH: vv ? Math.round(window.innerHeight - vv.height) : 0,
        sheetTop: r ? Math.round(r.top) : "-",
        sheetBot: r ? Math.round(r.bottom) : "-",
      })
    }
    requestAnimationFrame(read)
    const id = window.setInterval(read, 400)
    vv?.addEventListener("resize", read)
    vv?.addEventListener("scroll", read)
    window.addEventListener("resize", read)
    return () => {
      window.clearInterval(id)
      vv?.removeEventListener("resize", read)
      vv?.removeEventListener("scroll", read)
      window.removeEventListener("resize", read)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      aria-hidden
      style={{ position: "fixed", top: 0, left: 0, zIndex: 99999, pointerEvents: "none" }}
      className="m-1 rounded bg-black/85 px-2 py-1 font-mono text-[10px] leading-tight text-green-400"
    >
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>{k}: {String(v)}</div>
      ))}
    </div>
  )
}
