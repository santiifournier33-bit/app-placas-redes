"use client"

import dynamic from "next/dynamic"
import { useMail } from "@/lib/mail/MailContext"
import { MailLogin } from "@/components/mail/MailLogin"
import { Loader2 } from "lucide-react"

// Full IMAP client (~694 lines). Only loaded once the user is authenticated,
// so it never weighs on the login view or other routes.
const MailApp = dynamic(
  () => import("@/components/mail/MailApp").then((m) => m.MailApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    ),
  },
)

export function MailGate() {
  const { credentials, isLoading } = useMail()

  // Wait for initial load before showing login or app
  // But if we don't have credentials yet, show Login.
  // We don't unmount MailLogin during its own loading state so it can show errors.
  
  if (isLoading && credentials === null && typeof window !== 'undefined' && !localStorage.getItem(`freire_mail_pass_`)) {
     // Actually, we don't need a global loading spinner here if MailLogin handles its own loading state for submissions.
     // But MailContext sets isLoading=true on mount to read from localStorage.
  }

  // A cleaner approach: If there's a global loading state AND we aren't trying to log in...
  // Let's just let MailLogin and MailApp handle the display.

  if (!credentials) {
    return <MailLogin />
  }

  return <MailApp />
}
