import { TabNav } from "@/components/servicios/TabNav"
import { ReminderToast } from "@/components/servicios/ReminderToast"
import { DolarRateSync } from "@/components/servicios/DolarRateSync"

export default function ServiciosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-full">
      <TabNav />
      <DolarRateSync />
      <div className="flex-1">{children}</div>
      <ReminderToast />
    </div>
  )
}
