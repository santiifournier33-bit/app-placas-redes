"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

export interface MailCredentials {
  user: string
  pass: string
}

interface MailContextType {
  /** Email corporativo derivado del email de sesión */
  mailEmail: string | null
  /** Credenciales listas para usar (mail + pass) */
  credentials: MailCredentials | null
  /** Guardar la contraseña del correo (solo la primera vez) */
  savePassword: (pass: string) => Promise<void>
  /** Cerrar sesión de correo (borra la contraseña guardada) */
  logoutMail: () => void
  isLoading: boolean
  error: string | null
}

const MailContext = createContext<MailContextType | undefined>(undefined)

/**
 * Mapea el email de sesión (Tokko) al email corporativo (DonWeb).
 * - Admin (freirepropiedadespilar@gmail.com) → contacto@freirepropiedades.com
 * - Asesores → su mismo email (ya es @freirepropiedades.com)
 */
const ADMIN_MAIL_MAP: Record<string, string> = {
  "freirepropiedadespilar@gmail.com": "contacto@freirepropiedades.com",
}

function deriveMailEmail(sessionEmail: string): string {
  const lower = sessionEmail.toLowerCase().trim()
  return ADMIN_MAIL_MAP[lower] || lower
}

function getStorageKey(sessionEmail: string): string {
  return `freire_mail_pass_${sessionEmail.toLowerCase()}`
}

export function MailProvider({ children, sessionEmail }: { children: ReactNode; sessionEmail: string }) {
  const [credentials, setCredentials] = useState<MailCredentials | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mailEmail = deriveMailEmail(sessionEmail)
  const storageKey = getStorageKey(sessionEmail)

  // Al montar: intentar cargar password guardada
  useEffect(() => {
    const savedPass = localStorage.getItem(storageKey)
    if (savedPass) {
      setCredentials({ user: mailEmail, pass: savedPass })
    }
    setIsLoading(false)
  }, [mailEmail, storageKey])

  const savePassword = useCallback(async (pass: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // Validar credenciales contra el servidor IMAP
      const res = await fetch("/api/mail/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: mailEmail, pass }),
      })

      if (!res.ok) {
        throw new Error("Contraseña incorrecta. Verificá que sea la del correo corporativo.")
      }

      // Guardar en localStorage
      localStorage.setItem(storageKey, pass)
      setCredentials({ user: mailEmail, pass })
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [mailEmail, storageKey])

  const logoutMail = useCallback(() => {
    localStorage.removeItem(storageKey)
    setCredentials(null)
  }, [storageKey])

  return (
    <MailContext.Provider value={{ mailEmail, credentials, savePassword, logoutMail, isLoading, error }}>
      {children}
    </MailContext.Provider>
  )
}

export function useMail() {
  const context = useContext(MailContext)
  if (context === undefined) {
    throw new Error("useMail must be used within a MailProvider")
  }
  return context
}
