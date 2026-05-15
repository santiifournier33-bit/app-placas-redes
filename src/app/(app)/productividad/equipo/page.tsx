import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { ReunionLunesView } from "@/components/productividad/equipo/ReunionLunesView"

export default async function EquipoPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/dashboard')
  }

  return <ReunionLunesView />
}
