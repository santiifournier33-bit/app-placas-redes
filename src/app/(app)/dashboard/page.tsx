"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTaskStore } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { usePipelinesStore } from "@/lib/stores/pipelinesStore"
import {
  Users, CheckSquare, AlertTriangle, UserPlus, ClipboardList, Briefcase,
  BarChart3, Clock,
} from "lucide-react"
import Link from "next/link"
import { startOfWeek, isAfter, isBefore, format } from "date-fns"
import { es } from "date-fns/locale"
import { WeeklyTrackerWidget } from "@/components/productividad/WeeklyTrackerWidget"
import { PageHeader } from "@/components/nav/PageHeader"

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { tasks, init: initTasks } = useTaskStore()
  const { contacts, init: initContacts } = useContactStore()
  const { pipelines, init: initPipelines } = usePipelinesStore()

  useEffect(() => {
    setMounted(true)
    initTasks()
    initContacts()
    initPipelines()
  }, [])

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })

  const metrics = useMemo(() => {
    const pendingTasks = tasks.filter(t => !t.completed && !t.parent_id).length
    const completedThisWeek = tasks.filter(t =>
      t.completed_at && isAfter(new Date(t.completed_at), weekStart)
    ).length
    const contactsThisWeek = contacts.filter(c =>
      c.created_at && isAfter(new Date(c.created_at), weekStart)
    ).length
    const overdueTasks = tasks.filter(t =>
      !t.completed && t.due_date && isBefore(new Date(t.due_date), now) && !t.parent_id
    )
    const urgentTasks = tasks
      .filter(t => !t.completed && t.due_date && !t.parent_id)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5)
    const unhealthyLeads = contacts
      .filter(c => {
        if (!c.last_activity_at) return true
        const daysSince = Math.floor((now.getTime() - new Date(c.last_activity_at).getTime()) / 86400000)
        return daysSince >= 14
      })
      .slice(0, 5)

    return { pendingTasks, completedThisWeek, contactsThisWeek, overdueTasks, urgentTasks, unhealthyLeads }
  }, [tasks, contacts, now.toDateString()])

  if (!mounted) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-white/[0.04] rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-white/[0.04] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Dashboard"
        subtitle={format(now, "EEEE d 'de' MMMM", { locale: es })}
      />
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6 w-full">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={<Users size={20} strokeWidth={1.8} />}
          label="Contactos"
          value={contacts.length}
          href="/productividad/contactos"
          color="blue"
        />
        <KPICard
          icon={<UserPlus size={20} strokeWidth={1.8} />}
          label="Nuevos (semana)"
          value={metrics.contactsThisWeek}
          href="/productividad/contactos"
          color="emerald"
        />
        <KPICard
          icon={<CheckSquare size={20} strokeWidth={1.8} />}
          label="Pendientes"
          value={metrics.pendingTasks}
          href="/productividad/tareas"
          color="amber"
        />
        <KPICard
          icon={<CheckSquare size={20} strokeWidth={1.8} />}
          label="Completadas (semana)"
          value={metrics.completedThisWeek}
          href="/productividad/tareas"
          color="violet"
        />
      </div>

      {/* Two-column layout: tracker + pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Tracker */}
        <WeeklyTrackerWidget />

        {/* Pipeline Distribution */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pipelines</h3>
          {pipelines.length === 0 ? (
            <p className="text-xs text-zinc-600 py-4 text-center">Sin pipelines</p>
          ) : (
            <div className="space-y-2">
              {pipelines.map(p => {
                const stageCount = p.stages?.length ?? 0
                return (
                  <Link
                    key={p.id}
                    href="/productividad/negocios"
                    className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{p.emoji}</span>
                      <span className="text-xs font-medium text-zinc-300">{p.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">{stageCount} etapas</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-[0.12em] mb-3">Acciones rapidas</p>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction
            icon={<UserPlus size={20} strokeWidth={1.5} />}
            label="Nuevo contacto"
            color="blue"
            onClick={() => router.push("/productividad/contactos?new=1")}
          />
          <QuickAction
            icon={<ClipboardList size={20} strokeWidth={1.5} />}
            label="Nueva tarea"
            color="violet"
            onClick={() => router.push("/productividad/tareas?new=1")}
          />
          <QuickAction
            icon={<Briefcase size={20} strokeWidth={1.5} />}
            label="Ver pipeline"
            color="emerald"
            onClick={() => router.push("/productividad/negocios")}
          />
          <QuickAction
            icon={<BarChart3 size={20} strokeWidth={1.5} />}
            label="Metricas"
            color="amber"
            onClick={() => router.push("/productividad/equipo")}
          />
        </div>
      </div>

      {/* Two-column: urgent tasks + unhealthy leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 urgent tasks */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tareas urgentes</h3>
            <Link href="/productividad/tareas" className="text-[10px] text-blue-400 hover:text-blue-300">
              Ver todas
            </Link>
          </div>
          {metrics.urgentTasks.length === 0 ? (
            <p className="text-xs text-zinc-600 py-4 text-center">Sin tareas con fecha</p>
          ) : (
            <div className="space-y-1">
              {metrics.urgentTasks.map(task => {
                const overdue = task.due_date && isBefore(new Date(task.due_date), now)
                return (
                  <Link
                    key={task.id}
                    href="/productividad/tareas"
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <Clock size={12} className={overdue ? "text-red-400" : "text-zinc-600"} />
                    <span className="text-xs text-zinc-300 flex-1 truncate">{task.title}</span>
                    <span className={`text-[10px] shrink-0 ${overdue ? "text-red-400 font-bold" : "text-zinc-600"}`}>
                      {format(new Date(task.due_date!), "d MMM", { locale: es })}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Top 5 unhealthy contacts */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Contactos sin actividad</h3>
            <Link href="/productividad/contactos" className="text-[10px] text-blue-400 hover:text-blue-300">
              Ver todos
            </Link>
          </div>
          {metrics.unhealthyLeads.length === 0 ? (
            <p className="text-xs text-zinc-600 py-4 text-center">Todos con actividad reciente</p>
          ) : (
            <div className="space-y-1">
              {metrics.unhealthyLeads.map(c => {
                const days = c.last_activity_at
                  ? Math.floor((now.getTime() - new Date(c.last_activity_at).getTime()) / 86400000)
                  : null
                return (
                  <Link
                    key={c.id}
                    href="/productividad/contactos"
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center text-[9px] font-bold text-red-400 shrink-0">
                      {(c.first_name || '?')[0]}
                    </div>
                    <span className="text-xs text-zinc-300 flex-1 truncate">
                      {c.first_name} {c.last_name}
                    </span>
                    <span className="text-[10px] text-red-400/70 shrink-0">
                      {days !== null ? `${days}d` : 'nunca'}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overdue alert */}
      {metrics.overdueTasks.length > 0 && (
        <Link
          href="/productividad/tareas"
          className="block rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 hover:bg-amber-500/10 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {metrics.overdueTasks.length} tarea{metrics.overdueTasks.length > 1 ? "s" : ""} vencida{metrics.overdueTasks.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1">
            {metrics.overdueTasks.slice(0, 3).map(task => (
              <p key={task.id} className="text-sm text-zinc-400">{task.title}</p>
            ))}
            {metrics.overdueTasks.length > 3 && (
              <p className="text-xs text-zinc-600">+{metrics.overdueTasks.length - 3} mas</p>
            )}
          </div>
        </Link>
      )}
      </div>
    </div>
  )
}

const COLOR_MAP = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", icon: "text-blue-400/70" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "text-emerald-400/70" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", icon: "text-amber-400/70" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", icon: "text-violet-400/70" },
}

const ACTION_COLOR_MAP = {
  blue: { bg: "bg-blue-500/10 hover:bg-blue-500/20", icon: "text-blue-400", border: "border-blue-500/20" },
  emerald: { bg: "bg-emerald-500/10 hover:bg-emerald-500/20", icon: "text-emerald-400", border: "border-emerald-500/20" },
  amber: { bg: "bg-amber-500/10 hover:bg-amber-500/20", icon: "text-amber-400", border: "border-amber-500/20" },
  violet: { bg: "bg-violet-500/10 hover:bg-violet-500/20", icon: "text-violet-400", border: "border-violet-500/20" },
}

function QuickAction({ icon, label, color, onClick }: {
  icon: React.ReactNode
  label: string
  color: keyof typeof ACTION_COLOR_MAP
  onClick: () => void
}) {
  const c = ACTION_COLOR_MAP[color]
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-all"
    >
      <div className={`w-14 h-14 rounded-2xl border ${c.border} ${c.bg} flex items-center justify-center transition-colors`}>
        <span className={c.icon}>{icon}</span>
      </div>
      <span className="text-[10px] text-zinc-500 text-center leading-tight font-medium">{label}</span>
    </button>
  )
}

function KPICard({ icon, label, value, href, color }: {
  icon: React.ReactNode
  label: string
  value: number
  href: string
  color: keyof typeof COLOR_MAP
}) {
  const c = COLOR_MAP[color]
  return (
    <Link
      href={href}
      className={`rounded-2xl border border-white/[0.06] ${c.bg} p-4 hover:scale-[1.02] transition-all`}
    >
      <div className={`${c.icon} mb-2`}>{icon}</div>
      <p className={`text-2xl font-bold ${c.text} tabular-nums`}>{value}</p>
      <p className="text-[11px] text-zinc-500 font-medium mt-1">{label}</p>
    </Link>
  )
}
