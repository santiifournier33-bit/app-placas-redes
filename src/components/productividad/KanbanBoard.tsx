'use client'

import { useMemo } from 'react'
import type { KanbanContact } from '@/lib/stores/contactStore'
import type { PipelineStage } from '@/lib/stores/pipelinesStore'
import { KanbanColumn } from './KanbanColumn'

interface KanbanBoardProps {
  contacts: KanbanContact[]
  stages: PipelineStage[]
  onDrop: (contactPipelineId: string, stageId: string) => void
  onTapContact: (contact: KanbanContact) => void
}

export function KanbanBoard({ contacts, stages, onDrop, onTapContact }: KanbanBoardProps) {
  const sorted = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages]
  )

  const grouped = useMemo(() => {
    const map: Record<string, KanbanContact[]> = {}
    for (const stage of sorted) {
      map[stage.id] = []
    }
    for (const contact of contacts) {
      if (map[contact.stageId]) {
        map[contact.stageId].push(contact)
      }
    }
    return map
  }, [contacts, sorted])

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 px-4 scroll-x-affordance">
      {sorted.map(stage => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          contacts={grouped[stage.id] ?? []}
          allStages={sorted}
          onDrop={onDrop}
          onTapContact={onTapContact}
        />
      ))}
    </div>
  )
}
