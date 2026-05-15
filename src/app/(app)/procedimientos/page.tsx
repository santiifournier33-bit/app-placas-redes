import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { ProceduresChat } from '@/components/procedures/ProceduresChat'

export const metadata = {
  title: 'Procedimientos · Freire Propiedades',
  description: 'Asistente IA de procedimientos inmobiliarios',
}

export default async function ProcedimientosPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="h-[calc(100dvh-4rem)] lg:h-screen overflow-hidden">
      <ProceduresChat />
    </div>
  )
}
