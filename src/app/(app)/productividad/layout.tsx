import { TabNav } from "@/components/productividad/TabNav"
import { getSession } from "@/lib/auth/session"

export default async function ProductividadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  const role = session?.role

  return (
    <div className="flex flex-col min-h-full">
      <TabNav role={role} />
      <div className="flex-1">{children}</div>
    </div>
  )
}
