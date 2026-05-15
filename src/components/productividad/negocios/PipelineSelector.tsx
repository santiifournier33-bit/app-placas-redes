'use client'

import { usePipelinesStore } from '@/lib/stores/pipelinesStore'

export function PipelineSelector() {
  const { pipelines, activePipelineId, setActivePipeline } = usePipelinesStore()

  if (pipelines.length <= 1) return null

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
      {pipelines.map(p => {
        const active = p.id === activePipelineId
        return (
          <button
            key={p.id}
            onClick={() => setActivePipeline(p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              active
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                : 'bg-white/[0.04] text-zinc-500 border border-white/[0.06] hover:text-zinc-300 hover:bg-white/[0.06]'
            }`}
          >
            {p.emoji && <span className="text-sm">{p.emoji}</span>}
            {p.name}
            <span className={`text-[10px] tabular-nums ${active ? 'text-blue-400/60' : 'text-zinc-700'}`}>
              {p.stages.length}
            </span>
          </button>
        )
      })}
    </div>
  )
}
