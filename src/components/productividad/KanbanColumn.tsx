'use client'

import { useState } from 'react'
import type { KanbanContact } from '@/lib/stores/contactStore'
import type { PipelineStage } from '@/lib/stores/pipelinesStore'
import { LeadCard } from './LeadCard'

interface KanbanColumnProps {
  stage: PipelineStage
  contacts: KanbanContact[]
  allStages: PipelineStage[]
  onDrop: (contactPipelineId: string, stageId: string) => void
  onTapContact: (contact: KanbanContact) => void
}

export function KanbanColumn({ stage, contacts, allStages, onDrop, onTapContact }: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      className={`flex flex-col w-72 shrink-0 rounded-2xl border transition-colors ${
        dragOver
          ? 'border-blue-500/30 bg-blue-500/5'
          : 'border-border-subtle bg-surface-overlay'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const contactPipelineId = e.dataTransfer.getData('text/plain')
        if (contactPipelineId) onDrop(contactPipelineId, stage.id)
      }}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border-subtle">
        {stage.emoji && <span className="text-sm">{stage.emoji}</span>}
        <span className="text-sm font-medium text-text-primary truncate">{stage.name}</span>
        <span className="text-xs font-bold text-text-muted tabular-nums ml-auto">{contacts.length}</span>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-260px)] min-h-[100px]">
        {contacts.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-zinc-700">Sin leads</p>
          </div>
        ) : (
          contacts.map(contact => (
            <LeadCard
              key={contact.contactPipelineId}
              contact={contact}
              stage={allStages.find(s => s.id === contact.stageId)}
              onTap={() => onTapContact(contact)}
            />
          ))
        )}
      </div>
    </div>
  )
}
