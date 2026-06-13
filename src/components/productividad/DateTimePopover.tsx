"use client"

import { type RefObject } from "react"
import { useIsMobile } from "@/lib/hooks/useIsMobile"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { PortalDropdown } from "@/components/ui/PortalDropdown"
import { DateTimePanel, type DateTimeValue } from "@/components/productividad/DateTimePanel"

interface DateTimePopoverProps extends DateTimeValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (next: DateTimeValue) => void
  showReminder?: boolean
  /** Desktop: ancla para el popover. Si se omite en desktop, se usa un Dialog centrado. */
  anchorRef?: RefObject<HTMLElement | null>
  /** Título accesible / encabezado del sheet/dialog en móvil/desktop-dialog. */
  title?: string
}

/**
 * Host responsive del DateTimePanel. Unifica el patrón móvil en un bottom-sheet
 * scrolleable (crear y editar) y conserva en desktop el popover anclado (crear)
 * o el dialog centrado (editar). Presentacional: forwardea value+onChange al panel.
 *
 * Por qué: en móvil el panel (~600-680px) no entra como dropdown `fixed` y clipea
 * controles sin scroll (P1). Un bottom-sheet con overflow-y-auto lo resuelve.
 */
export function DateTimePopover({
  open,
  onOpenChange,
  date,
  time,
  reminderOffsetMin,
  onChange,
  showReminder = true,
  anchorRef,
  title = "Fecha y hora",
}: DateTimePopoverProps) {
  const isMobile = useIsMobile()

  const panel = (
    <DateTimePanel
      date={date}
      time={time}
      reminderOffsetMin={reminderOffsetMin}
      onChange={onChange}
      onDone={() => onOpenChange(false)}
      showReminder={showReminder}
    />
  )

  // Móvil: bottom-sheet scrolleable — nunca clipea.
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showClose={false}
          className="rounded-t-2xl p-0 bg-surface-1 max-h-[85vh] overflow-y-auto hide-scrollbar"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-surface-1 z-10">
            <div className="w-10 h-1 rounded-full bg-border-strong/40" />
          </div>
          {panel}
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop con ancla: popover anclado (comportamiento de crear, intacto).
  if (anchorRef) {
    return (
      <PortalDropdown
        anchorRef={anchorRef}
        open={open}
        onClose={() => onOpenChange(false)}
        closeOnScroll={false}
        className="bg-surface-2 rounded-xl border border-border-default shadow-2xl w-[300px] max-w-[calc(100vw-1.5rem)]"
      >
        {panel}
      </PortalDropdown>
    )
  }

  // Desktop sin ancla: dialog centrado (comportamiento de editar).
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[340px] p-0 sm:rounded-2xl bg-surface-1 overflow-hidden border-border-default"
        showClose={false}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="px-4 pt-3">
          <span className="text-sm font-bold text-text-primary">{title}</span>
        </div>
        {panel}
      </DialogContent>
    </Dialog>
  )
}
