'use client'

import { usePipelinesStore } from '@/lib/stores/pipelinesStore'

export function PipelineSelector() {
  const { pipelines, activePipelineId, setActivePipeline } = usePipelinesStore()

  if (pipelines.length <= 1) return null

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scroll-x-affordance">
      {pipelines.map(p => {
        const active = p.id === activePipelineId
        return (
          <button
            key={p.id}
            onClick={() => setActivePipeline(p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              active
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                : 'bg-surface-overlay text-text-muted border border-border-subtle hover:text-text-secondary hover:bg-surface-overlay-hover'
            }`}
          >
            {p.emoji && <span className="text-sm">{p.emoji}</span>}
            {p.name}
            <span className={`text-xs md:text-[10px] tabular-nums ${active ? 'text-blue-400/60' : 'text-zinc-700'}`}>
              {p.stages.length}
            </span>
          </button>
        )
      })}
    </div>
  )
}
