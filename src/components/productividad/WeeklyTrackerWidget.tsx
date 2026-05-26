'use client'

import { useMemo } from 'react'
import { useTaskStore } from '@/lib/stores/taskStore'
import { getWeeklyTrackerMetrics, DEFAULT_TARGETS } from '@/lib/productividad/weekly-tracker'

interface WeeklyTrackerWidgetProps {
  weekDate?: Date
}

export function WeeklyTrackerWidget({ weekDate = new Date() }: WeeklyTrackerWidgetProps) {
  const tasks = useTaskStore(s => s.tasks)

  const metrics = useMemo(
    () => getWeeklyTrackerMetrics(tasks, weekDate, DEFAULT_TARGETS),
    [tasks, weekDate]
  )

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-overlay p-4 space-y-3">
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
        Plan semanal 40-5-5-1
      </h3>
      <div className="space-y-2.5">
        {metrics.map(m => {
          const pct = m.target > 0 ? Math.min((m.current / m.target) * 100, 100) : 0
          const done = m.current >= m.target
          return (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs md:text-[11px] text-text-secondary">{m.label}</span>
                <span className={`text-xs md:text-[11px] font-bold ${done ? 'text-emerald-400' : 'text-text-muted'}`}>
                  {m.current}/{m.target}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-overlay-hover overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: done ? '#10b981' : m.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
