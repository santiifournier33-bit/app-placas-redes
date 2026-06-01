"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTaskStore } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { useFunnelStore } from "@/lib/stores/funnelStore"
import {
  Users, CheckSquare, AlertTriangle, UserPlus, ClipboardList, Palette,
  Clock, Target,
} from "lucide-react"
import Link from "next/link"
import { startOfWeek, isAfter, isBefore, format } from "date-fns"
import { es } from "date-fns/locale"
import { FunnelRingsGrid } from "@/components/embudo/FunnelRingsGrid"
import { DailyActions } from "@/components/embudo/DailyActions"
import { Leaderboard } from "@/components/embudo/Leaderboard"
import { PageHeader } from "@/components/nav/PageHeader"
import type { FunnelStage } from "@/lib/embudo/funnel"

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { tasks, init: initTasks } = useTaskStore()
  const { contacts, init: initContacts } = useContactStore()
  const initFunnel = useFunnelStore(s => s.init)

  useEffect(() => {
    setMounted(true)
    initTasks()
    initContacts()
    initFunnel()
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

    return { pendingTasks, completedThisWeek, contactsThisWeek, overdueTasks, urgentTasks }
  }, [tasks, contacts, now.toDateString()])

  if (!mounted) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-overlay rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-surface-overlay rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-shell-bg text-text-primary selection:bg-brand-accent/20">
      <PageHeader
        title="Dashboard"
        subtitle={format(now, "EEEE d 'de' MMMM", { locale: es })}
      />
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6 w-full pb-24 lg:pb-8">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={<Users size={18} strokeWidth={2} />}
          label="Contactos"
          value={contacts.length}
          href="/productividad/contactos"
          color="blue"
        />
        <KPICard
          icon={<UserPlus size={18} strokeWidth={2} />}
          label="Nuevos (semana)"
          value={metrics.contactsThisWeek}
          href="/productividad/contactos"
          color="emerald"
        />
        <KPICard
          icon={<CheckSquare size={18} strokeWidth={2} />}
          label="Pendientes"
          value={metrics.pendingTasks}
          href="/productividad/tareas"
          color="amber"
        />
        <KPICard
          icon={<CheckSquare size={18} strokeWidth={2} />}
          label="Completadas"
          value={metrics.completedThisWeek}
          href="/productividad/tareas"
          color="violet"
        />
      </div>

      {/* Daily actions — what to do today + carryover */}
      <DailyActions />

      {/* Sales funnel summary */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1/50 backdrop-blur-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] flex items-center gap-1.5">
            <Target size={13} className="text-shell-accent" /> Tu embudo
          </h3>
          <Link href="/embudo?tab=tracker" className="text-xs md:text-[10px] text-brand-accent hover:underline font-bold uppercase tracking-wider">
            Ver módulo
          </Link>
        </div>
        <FunnelRingsGrid
          variant="summary"
          onRingClick={(stage: FunnelStage) => router.push(`/embudo?tab=tracker&stage=${stage}`)}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-3 px-1">Acciones rápidas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          <QuickAction
            icon={<UserPlus size={20} strokeWidth={1.8} />}
            label="Nuevo contacto"
            color="blue"
            onClick={() => router.push("/productividad/contactos?new=1")}
          />
          <QuickAction
            icon={<ClipboardList size={20} strokeWidth={1.8} />}
            label="Nueva tarea"
            color="violet"
            onClick={() => router.push("/productividad/tareas?new=1")}
          />
          <QuickAction
            icon={<Palette size={20} strokeWidth={1.8} />}
            label="Crear diseño"
            color="emerald"
            onClick={() => router.push("/diseno?tab=properties")}
          />
        </div>
      </div>

      {/* Two-column: mini leaderboard + urgent tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mini leaderboard */}
        <Leaderboard variant="mini" />

        {/* Top 5 urgent tasks */}
        <div className="rounded-2xl border border-border-subtle bg-surface-1/50 backdrop-blur-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">Tareas urgentes</h3>
            <Link href="/productividad/tareas" className="text-xs md:text-[10px] text-brand-accent hover:underline font-bold uppercase tracking-wider">
              Ver todas
            </Link>
          </div>
          {metrics.urgentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-text-muted">
              <CheckSquare size={20} className="stroke-[1.5] mb-2 opacity-50" />
              <p className="text-xs font-medium">No hay tareas urgentes</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {metrics.urgentTasks.map(task => {
                const overdue = task.due_date && isBefore(new Date(task.due_date), now)
                return (
                  <Link
                    key={task.id}
                    href="/productividad/tareas"
                    className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl hover:bg-surface-2/80 transition-colors border border-transparent hover:border-border-subtle"
                  >
                    <Clock size={14} className={overdue ? "text-red-400" : "text-text-muted"} />
                    <span className="text-xs text-text-primary flex-1 truncate font-medium">{task.title}</span>
                    <span className={`text-xs md:text-[10px] shrink-0 font-semibold px-2 py-0.5 rounded-full ${overdue ? "text-red-400 bg-red-400/10" : "text-text-muted bg-surface-2"}`}>
                      {format(new Date(task.due_date!), "d MMM", { locale: es })}
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
          className="block rounded-2xl border border-red-500/20 bg-red-500/5 p-4 hover:bg-red-500/10 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400 animate-pulse" />
            <span className="text-xs md:text-[11px] font-bold text-red-400 uppercase tracking-wider">
              {metrics.overdueTasks.length} tarea{metrics.overdueTasks.length > 1 ? "s" : ""} vencida{metrics.overdueTasks.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1">
            {metrics.overdueTasks.slice(0, 3).map(task => (
              <p key={task.id} className="text-xs text-text-primary/80 pl-6">{task.title}</p>
            ))}
            {metrics.overdueTasks.length > 3 && (
              <p className="text-xs md:text-[10px] text-red-400/70 pl-6 font-bold uppercase tracking-wider">+{metrics.overdueTasks.length - 3} más</p>
            )}
          </div>
        </Link>
      )}
      </div>
    </div>
  )
}

const COLOR_MAP = {
  blue: {
    bg: "hover:bg-shell-accent-muted",
    border: "hover:border-shell-accent/30",
    glow: "bg-shell-accent shadow-[0_0_12px_rgba(200,164,90,0.5)]",
    icon: "text-shell-accent",
  },
  emerald: {
    bg: "hover:bg-emerald-500/5",
    border: "hover:border-emerald-500/30",
    glow: "bg-emerald-500 shadow-[0_0_12px_#10b981]",
    icon: "text-emerald-400",
  },
  amber: {
    bg: "hover:bg-brand-accent/10",
    border: "hover:border-brand-accent/30",
    glow: "bg-brand-accent shadow-[0_0_12px_rgba(200,164,90,0.6)]",
    icon: "text-brand-accent",
  },
  violet: {
    bg: "hover:bg-violet-500/5",
    border: "hover:border-violet-500/30",
    glow: "bg-violet-500 shadow-[0_0_12px_#8b5cf6]",
    icon: "text-violet-400",
  },
}

const ACTION_COLOR_MAP = {
  blue: { bg: "bg-shell-accent/10", icon: "text-shell-accent" },
  emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-500" },
  amber: { bg: "bg-brand-accent/10", icon: "text-brand-accent" },
  violet: { bg: "bg-violet-500/10", icon: "text-violet-500" },
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
      className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface-1/50 border border-border-subtle hover:border-shell-accent/20 hover:bg-surface-1/80 cursor-pointer active:scale-95 transition-all group shadow-sm hover:shadow-md"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200 ${c.bg}`}>
        <span className={`${c.icon} transition-transform duration-300 group-hover:scale-110`}>{icon}</span>
      </div>
      <span className="text-xs md:text-[10px] text-text-muted text-center leading-tight font-bold uppercase tracking-wider transition-colors group-hover:text-text-primary">{label}</span>
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
      className={`rounded-2xl border border-border-subtle bg-surface-1/50 backdrop-blur-xl p-4 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${c.border} ${c.bg}`}
    >
      <div className={`absolute left-0 top-1/3 bottom-1/3 w-[3px] rounded-r-full ${c.glow}`} />
      <div className={`${c.icon} mb-2 transition-transform duration-300 group-hover:scale-110`}>{icon}</div>
      <p className="text-2xl font-bold text-text-primary tabular-nums tracking-tight">{value}</p>
      <p className="text-xs md:text-[9px] text-text-muted font-bold mt-1.5 uppercase tracking-wider">{label}</p>
    </Link>
  )
}
