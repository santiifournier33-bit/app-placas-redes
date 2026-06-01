"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Target, CalendarDays, Trophy, SlidersHorizontal } from "lucide-react"
import type { UserRole } from "@/lib/auth/session"
import { useFunnelStore } from "@/lib/stores/funnelStore"
import { FunnelRingsGrid } from "./FunnelRingsGrid"
import { FunnelCalendar } from "./FunnelCalendar"
import { Leaderboard } from "./Leaderboard"
import { GoalsConfig } from "./GoalsConfig"

type TabType = "tracker" | "calendario" | "leaderboard" | "metas"

export default function EmbudoModule({ role }: { role: UserRole }) {
  const searchParams = useSearchParams()
  const isAdmin = role === "admin"
  const validTabs: TabType[] = isAdmin
    ? ["tracker", "calendario", "leaderboard", "metas"]
    : ["tracker", "calendario", "leaderboard"]

  const fromQuery = (searchParams.get("tab") ?? "") as TabType
  const [activeTab, setActiveTab] = useState<TabType>(validTabs.includes(fromQuery) ? fromQuery : "tracker")

  const init = useFunnelStore(s => s.init)
  useEffect(() => { init() }, [init])

  useEffect(() => {
    const t = (searchParams.get("tab") ?? "") as TabType
    if (validTabs.includes(t) && t !== activeTab) setActiveTab(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="space-y-6">
      <div className="flex space-x-1 bg-surface-1 border border-border-subtle p-1 rounded-xl overflow-x-auto">
        <TabButton label="Tracker" icon={<Target size={16} />} active={activeTab === "tracker"} onClick={() => setActiveTab("tracker")} />
        <TabButton label="Calendario" icon={<CalendarDays size={16} />} active={activeTab === "calendario"} onClick={() => setActiveTab("calendario")} />
        <TabButton label="Leaderboard" icon={<Trophy size={16} />} active={activeTab === "leaderboard"} onClick={() => setActiveTab("leaderboard")} />
        {isAdmin && (
          <TabButton label="Metas" icon={<SlidersHorizontal size={16} />} active={activeTab === "metas"} onClick={() => setActiveTab("metas")} />
        )}
      </div>

      <div className="min-h-[500px]">
        {activeTab === "tracker" && <FunnelRingsGrid variant="full" />}
        {activeTab === "calendario" && <FunnelCalendar />}
        {activeTab === "leaderboard" && <Leaderboard variant="full" />}
        {activeTab === "metas" && isAdmin && <GoalsConfig />}
      </div>
    </div>
  )
}

function TabButton({ label, icon, active, onClick }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
        active ? "bg-shell-accent/10 text-shell-accent" : "text-text-muted hover:bg-shell-border hover:text-text-primary"
      }`}
    >
      {icon}{label}
    </button>
  )
}
