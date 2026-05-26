'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, ArrowRight, CheckCircle, PlusCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'

interface ActivityRow {
  id: string
  event_type: string
  payload: Record<string, unknown> | null
  created_at: string | null
}

const supabase = createClient()

export function ContactHistoryTab({ contactId }: { contactId: string }) {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const { pipelines } = usePipelinesStore()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('contact_activity_log')
        .select('id, event_type, payload, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (!cancelled) {
        setRows((data ?? []) as ActivityRow[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [contactId])

  const stageName = (id: string | undefined) => {
    if (!id) return '—'
    for (const p of pipelines) {
      const s = p.stages.find(s => s.id === id)
      if (s) return s.name
    }
    return '—'
  }

  const renderRow = (row: ActivityRow) => {
    const payload = (row.payload ?? {}) as Record<string, string>
    const when = row.created_at
      ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: es })
      : ''

    switch (row.event_type) {
      case 'pipeline_change':
        return {
          icon: <ArrowRight size={13} className="text-blue-400" />,
          text: <>Movido de <span className="text-text-secondary">{stageName(payload.from_stage_id)}</span> a <span className="text-text-secondary">{stageName(payload.to_stage_id)}</span></>,
          when,
        }
      case 'task_created':
        return {
          icon: <PlusCircle size={13} className="text-violet-400" />,
          text: <>Tarea creada: <span className="text-text-secondary">{payload.title}</span></>,
          when,
        }
      case 'task_completed':
        return {
          icon: <CheckCircle size={13} className="text-emerald-400" />,
          text: <>Tarea completada: <span className="text-text-secondary">{payload.title}</span></>,
          when,
        }
      default:
        return {
          icon: <Activity size={13} className="text-text-muted" />,
          text: <>{row.event_type}</>,
          when,
        }
    }
  }

  if (loading) {
    return <div className="p-4 text-xs text-text-muted">Cargando...</div>
  }

  if (rows.length === 0) {
    return <div className="p-4 text-xs text-text-muted text-center py-8">Sin actividad registrada</div>
  }

  return (
    <div className="p-4 space-y-2">
      {rows.map(row => {
        const { icon, text, when } = renderRow(row)
        return (
          <div key={row.id} className="flex items-start gap-2 px-2 py-2 hover:bg-surface-overlay rounded-lg">
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-secondary">{text}</p>
              <p className="text-xs md:text-[10px] text-text-muted mt-0.5">{when}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
