'use client'

import { User } from 'lucide-react'
import type { KanbanContact, HealthStatus } from '@/lib/stores/contactStore'
import { getLeadHealth, getDaysSinceActivity, SOURCE_LABELS } from '@/lib/stores/contactStore'
import type { PipelineStage } from '@/lib/stores/pipelinesStore'

const HEALTH_COLORS: Record<HealthStatus, string> = {
  green: 'bg-emerald-400',
  orange: 'bg-amber-400',
  red: 'bg-red-400',
  gray: 'bg-zinc-600',
}

interface LeadCardProps {
  contact: KanbanContact
  stage: PipelineStage | undefined
  onTap: () => void
}

export function LeadCard({ contact, stage, onTap }: LeadCardProps) {
  const health = getLeadHealth(contact.lastPipelineActivity, stage)
  const days = getDaysSinceActivity(contact.lastPipelineActivity)
  const sourceLabel = contact.source ? SOURCE_LABELS[contact.source as keyof typeof SOURCE_LABELS] ?? contact.source : null

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', contact.contactPipelineId)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onTap}
      className="relative flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${HEALTH_COLORS[health]}`} />

      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-1 ${
        health === 'red' ? 'bg-red-500/15' :
        health === 'orange' ? 'bg-amber-500/15' :
        health === 'green' ? 'bg-emerald-500/15' :
        'bg-zinc-500/15'
      }`}>
        <User size={14} className={
          health === 'red' ? 'text-red-400' :
          health === 'orange' ? 'text-amber-400' :
          health === 'green' ? 'text-emerald-400' :
          'text-zinc-500'
        } />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-shell-text truncate">
          {contact.first_name} {contact.last_name}
        </p>
        {contact.primary_phone && (
          <p className="text-xs md:text-[11px] text-zinc-500 mt-0.5 truncate">{contact.primary_phone}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          {sourceLabel && (
            <span className="text-xs md:text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
              {sourceLabel}
            </span>
          )}
          {health !== 'gray' && (
            <span className={`text-xs md:text-[10px] font-medium ${
              health === 'red' ? 'text-red-400' :
              health === 'orange' ? 'text-amber-400' :
              'text-emerald-400'
            }`}>
              {days}d
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
