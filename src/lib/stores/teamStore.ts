import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useTaskStore } from "./taskStore"
import { useContactStore } from "./contactStore"
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns"

export interface AgentProfile {
  email: string
  displayName: string
  phone: string
  avatarUrl?: string
  isActive: boolean
}

export interface AgentMetrics {
  tasksCompleted: number
  leadsCreated: number
  leadsMoved: number
  totalActions: number
}

export interface AgentWeekData {
  agent: AgentProfile
  metrics: AgentMetrics
}

interface TeamState {
  agents: AgentProfile[]
  addAgent: (agent: AgentProfile) => void
  removeAgent: (email: string) => void
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      agents: [],

      addAgent: (agent) =>
        set((s) => {
          if (s.agents.some((a) => a.email === agent.email)) return s
          return { agents: [...s.agents, agent] }
        }),

      removeAgent: (email) =>
        set((s) => ({
          agents: s.agents.filter(a => a.email !== email),
        })),
    }),
    { name: "prod-team" }
  )
)

export function calculateMetrics(agentEmail: string, weekStart: Date): AgentMetrics {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const interval = { start: weekStart, end: weekEnd }

  const tasks = useTaskStore.getState().tasks
  const contacts = useContactStore.getState().contacts

  const tasksCompleted = tasks.filter(t =>
    !t.parent_id &&
    t.completed_at &&
    isWithinInterval(new Date(t.completed_at), interval)
  ).length

  const leadsCreated = contacts.filter(c =>
    c.created_at &&
    isWithinInterval(new Date(c.created_at), interval)
  ).length

  const leadsMoved = contacts.filter(c =>
    c.last_activity_at &&
    isWithinInterval(new Date(c.last_activity_at), interval) &&
    c.created_at &&
    !isWithinInterval(new Date(c.created_at), interval)
  ).length

  return {
    tasksCompleted,
    leadsCreated,
    leadsMoved,
    totalActions: tasksCompleted + leadsCreated + leadsMoved,
  }
}

export function getTeamWeekData(weekStart: Date): AgentWeekData[] {
  const { agents } = useTeamStore.getState()

  return agents
    .filter(a => a.isActive)
    .map(agent => ({
      agent,
      metrics: calculateMetrics(agent.email, weekStart),
    }))
    .sort((a, b) => b.metrics.totalActions - a.metrics.totalActions)
}

export function getWeekKey(date: Date): string {
  const ws = startOfWeek(date, { weekStartsOn: 1 })
  return ws.toISOString().slice(0, 10)
}
