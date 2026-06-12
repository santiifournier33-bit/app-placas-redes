'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getActiveUser } from '@/lib/supabase/active-user'

const supabase = createClient()

/** Counts pending inquiries owned by the current user where SLA has expired
 *  (created > 1h ago, not yet responded). Used to render a badge on the
 *  Consultas sidebar item. */
export function useConsultasBadge(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { user } = await getActiveUser(supabase)
      if (!user || cancelled) return
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count: c } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('status', 'pending')
        .lt('first_inquired_at', cutoff)
      if (!cancelled) setCount(c ?? 0)
    }
    load()
    const interval = setInterval(load, 60_000)  // refresh every minute
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return count
}
