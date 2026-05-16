import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { MailProvider } from "@/lib/mail/MailContext"
import { MailGate } from "./MailGate"
import { PageHeader } from "@/components/nav/PageHeader"

export default async function CorreoPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <MailProvider sessionEmail={session.email}>
      <div className="flex flex-col h-[100dvh] lg:h-screen overflow-hidden">
        <PageHeader
          title="Correo corporativo"
          subtitle="@freirepropiedades.com — vía DonWeb"
        />
        <div className="flex-1 min-h-0">
          <MailGate />
        </div>
      </div>
    </MailProvider>
  )
}
