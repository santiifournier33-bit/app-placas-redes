'use client'

import { useEffect, useState } from 'react'
import { createClient } from './client'
import { getActiveUser } from './active-user'
import type { User } from '@supabase/supabase-js'

const supabase = createClient()

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getActiveUser(supabase).then(({ user }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading, supabase }
}
