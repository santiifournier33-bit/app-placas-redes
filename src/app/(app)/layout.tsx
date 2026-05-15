import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { AppShell } from "@/components/nav/AppShell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <AppShell role={session.role} email={session.email}>
      {children}
    </AppShell>
  )
}
