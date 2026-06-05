'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

type Placement =
  | 'bottom-start' | 'bottom-end'
  | 'top-start'    | 'top-end'

interface PortalDropdownProps {
  /** Ref to the trigger element (used to compute placement). */
  anchorRef: RefObject<HTMLElement | null>
  /** Whether the dropdown panel is visible. */
  open: boolean
  /** Called when the dropdown should close (outside click, scroll, escape, resize). */
  onClose: () => void
  /** Panel content. */
  children: ReactNode
  /** Where to anchor the panel relative to the trigger. Default: bottom-start. */
  placement?: Placement
  /** Pixel gap between trigger and panel. Default: 4. */
  offset?: number
  /** Optional className for the panel wrapper. */
  className?: string
  /** Min width override; if not set, panel uses its natural width. */
  minWidth?: number | string
  /** Z-index. Default: 9999. */
  zIndex?: number
}

/**
 * Generic dropdown rendered into document.body via portal with position: fixed.
 * Designed so any ancestor's `overflow: hidden | auto | scroll` cannot clip the panel.
 * Closes on outside click, window scroll, window resize, or Escape.
 *
 * Use this for any popover-like UI (selects, color pickers, menus, column toggles, etc.).
 */
export function PortalDropdown({
  anchorRef,
  open,
  onClose,
  children,
  placement = 'bottom-start',
  offset = 4,
  className = '',
  minWidth,
  zIndex = 9999,
}: PortalDropdownProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // True once the panel has been positioned. Until then we ignore scroll events:
  // an `autoFocus` input inside the panel mounts off-screen (-9999) and the browser
  // scrolls to reveal it, firing a spurious scroll that would otherwise close us.
  const readyRef = useRef(false)

  const computePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const panelW = panelRef.current?.offsetWidth ?? 200
    const panelH = panelRef.current?.offsetHeight ?? 200

    let top = 0
    let left = 0

    if (placement.startsWith('bottom')) {
      top = rect.bottom + offset
    } else {
      top = rect.top - panelH - offset
    }

    if (placement.endsWith('start')) {
      left = rect.left
    } else {
      left = rect.right - panelW
    }

    // Keep within viewport horizontally
    const maxLeft = window.innerWidth - panelW - 8
    if (left > maxLeft) left = Math.max(8, maxLeft)
    if (left < 8) left = 8

    // Flip vertically if overflowing
    if (top + panelH > window.innerHeight - 8) {
      const flipped = rect.top - panelH - offset
      if (flipped >= 8) top = flipped
    }

    setPos({ top, left })
    readyRef.current = true
  }, [anchorRef, placement, offset])

  useEffect(() => {
    if (!open) return
    readyRef.current = false
    // Compute on next frame so panel measures correctly
    requestAnimationFrame(computePosition)

    const handleMousedown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !anchorRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        onClose()
      }
    }
    const handleScroll = (e: Event) => {
      // Ignore scrolls fired before the panel is positioned (autoFocus reveal scroll).
      if (!readyRef.current) return
      // Scrolling inside the panel itself (e.g. a long, scrollable list) must
      // not close it — only reposition/close on ancestor or window scroll.
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return
      onClose()
    }
    const handleResize = () => onClose()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleMousedown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMousedown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose, computePosition, anchorRef])

  if (!open || typeof window === 'undefined') return null

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        zIndex,
        minWidth,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  )
}
