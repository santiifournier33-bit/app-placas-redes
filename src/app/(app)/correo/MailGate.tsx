"use client"

import { useMail } from "@/lib/mail/MailContext"
import { MailLogin } from "@/components/mail/MailLogin"
import { MailApp } from "@/components/mail/MailApp"
import { Loader2 } from "lucide-react"

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
