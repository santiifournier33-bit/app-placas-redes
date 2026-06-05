import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import SignaturesModule from '@/components/firmas/SignaturesModule'

export const metadata = {
  title: 'Firmas Digitales · Freire Propiedades',
  description: 'Gestión de firmas digitales para contratos y documentos',
}

export default async function FirmasPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="h-[calc(100dvh-4rem)] lg:h-screen overflow-hidden">
      <SignaturesModule role={session.role} />
    </div>
  )
}
