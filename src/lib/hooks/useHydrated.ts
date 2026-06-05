"use client"

import { useSyncExternalStore } from "react"

// `subscribe` never fires — the hydrated flag flips exactly once (server→client)
// and useSyncExternalStore handles that transition itself.
const emptySubscribe = () => () => {}

/**
 * Returns `false` during server render and the initial client hydration pass,
 * then `true` once the component is running in the browser.
 *
 * Use this to gate client-only UI (e.g. anything depending on `useIsMobile`,
 * `window`, or Zustand data loaded after mount) without a hydration mismatch.
 *
 * Why `useSyncExternalStore` instead of `useState(false)` + `setState(true)` in
 * an effect: the effect approach trips `react-hooks/set-state-in-effect` (an
 * extra cascading render). `useSyncExternalStore` reads `false` from the server
 * snapshot and `true` from the client snapshot; React reconciles the difference
 * after hydration with no mismatch warning and no setState-in-effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client snapshot
    () => false, // server snapshot
  )
}
