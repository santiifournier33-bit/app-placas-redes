import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { MailProvider } from "@/lib/mail/MailContext"
import { MailGate } from "./MailGate" // Extract this to a separate file since CorreoPage is now server

export default async function CorreoPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <MailProvider sessionEmail={session.email}>
      {/* 
        lg: 100vh - 4rem (header tokko)
        mobile: 100dvh - 4rem (header tokko) - 5rem (bottom appshell nav) 
      */}
      <div className="flex flex-col h-[calc(100dvh-9rem)] lg:h-[calc(100vh-4rem)] overflow-hidden">
        {/* Page header */}
        <div className="px-6 py-4 border-b border-white/[0.06] shrink-0">
          <h1 className="text-xl font-bold text-shell-text">Correo corporativo</h1>
          <p className="text-xs text-zinc-500 mt-0.5">@freirepropiedades.com — vía DonWeb</p>
        </div>

        {/* Mail client fills remaining height */}
        <div className="flex-1 min-h-0">
          <MailGate />
        </div>
      </div>
    </MailProvider>
  )
}
