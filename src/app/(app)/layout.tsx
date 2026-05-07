import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { SideNav } from "@/components/nav/SideNav"
import { BottomTabs } from "@/components/nav/BottomTabs"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-shell-bg text-shell-text flex flex-col font-sans selection:bg-shell-accent/30">
      <SideNav role={session.role} email={session.email} />
      <main className="lg:ml-64 pb-20 lg:pb-0 flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.03] via-transparent to-violet-500/[0.02] pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </main>
      <BottomTabs role={session.role} />
    </div>
  )
}
