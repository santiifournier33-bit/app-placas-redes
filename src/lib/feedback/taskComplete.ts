/**
 * Feedback al completar una tarea: un "ding" corto sintetizado + vibración leve.
 *
 * Sin assets ni dependencias. El sonido se genera en vivo con Web Audio (0 bytes,
 * baja latencia, sin solape feo en completados rápidos). Como siempre se dispara
 * desde un tap del usuario, el AudioContext puede arrancar/resumir sin chocar con
 * la política de autoplay (incl. iOS Safari).
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === "suspended") void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/**
 * Una "voz" con cuerpo: fundamental + un 2º armónico suave (timbre más cálido,
 * no un bip pelado) y envelope attack/decay para que no "cliquee".
 */
function voice(ac: AudioContext, freq: number, startAt: number, dur: number, peak: number) {
  const t0 = ac.currentTime + startAt
  const bus = ac.createGain()
  bus.gain.setValueAtTime(0.0001, t0)
  bus.gain.exponentialRampToValueAtTime(peak, t0 + 0.006)
  bus.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  bus.connect(ac.destination)

  // Fundamental (sine) + 2º armónico a ganancia 0.2 → calidez tipo campana suave.
  for (const [mult, gain] of [[1, 1], [2, 0.2]] as const) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = "sine"
    osc.frequency.value = freq * mult
    g.gain.value = gain
    osc.connect(g).connect(bus)
    osc.start(t0)
    osc.stop(t0 + dur + 0.04)
  }
}

/** "Confirm suave (tipo Slack)": dos notas que suben G5→B5, sine cálido, ganancia baja. */
function playCompleteSound() {
  const ac = getCtx()
  if (!ac) return
  voice(ac, 783.99, 0, 0.12, 0.055)     // G5
  voice(ac, 987.77, 0.08, 0.18, 0.055)  // B5
}

/** Vibración háptica leve (Android; iOS la ignora en silencio). */
function hapticComplete() {
  try {
    navigator.vibrate?.(15)
  } catch {
    /* no-op */
  }
}

/** Dispara sonido + háptico. Nunca lanza: un fallo de audio jamás rompe el completar. */
export function taskCompleteFeedback() {
  try {
    playCompleteSound()
    hapticComplete()
  } catch {
    /* no-op */
  }
}
