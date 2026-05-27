"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { DollarSign, Activity, PieChart, Sparkles } from "lucide-react"
import ProductionTab from "./ProductionTab"
import ActivityTab from "./ActivityTab"
import BalanceTab from "./BalanceTab"

type TabType = "produccion" | "actividad" | "balance" | "analiticas"

const VALID_TABS: TabType[] = ["produccion", "actividad", "balance", "analiticas"]

export default function VentasModule() {
  const searchParams = useSearchParams()
  const initialFromQuery = (searchParams.get("tab") ?? "") as TabType
  const initialTab: TabType = VALID_TABS.includes(initialFromQuery) ? initialFromQuery : "produccion"

  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Sync activeTab when the sidebar accordion changes ?tab=.
  useEffect(() => {
    const t = (searchParams.get("tab") ?? "") as TabType
    if (VALID_TABS.includes(t) && t !== activeTab) setActiveTab(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex space-x-1 bg-surface-1 border border-border-subtle p-1 rounded-xl overflow-x-auto scroll-x-affordance">
        <TabButton 
          id="produccion" 
          label="Producción" 
          icon={<DollarSign size={16} />} 
          active={activeTab === "produccion"} 
          onClick={() => setActiveTab("produccion")} 
        />
        <TabButton 
          id="actividad" 
          label="Actividad" 
          icon={<Activity size={16} />} 
          active={activeTab === "actividad"} 
          onClick={() => setActiveTab("actividad")} 
        />
        <TabButton 
          id="balance" 
          label="Balance Anual" 
          icon={<PieChart size={16} />} 
          active={activeTab === "balance"} 
          onClick={() => setActiveTab("balance")} 
        />
        <TabButton 
          id="analiticas" 
          label="Analíticas IA" 
          icon={<Sparkles size={16} />} 
          active={activeTab === "analiticas"} 
          onClick={() => setActiveTab("analiticas")} 
          disabled
        />
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === "produccion" && <ProductionTab />}
        {activeTab === "actividad" && <ActivityTab />}
        {activeTab === "balance" && <BalanceTab />}
        {activeTab === "analiticas" && (
          <div className="flex items-center justify-center h-64 border border-border-subtle border-dashed rounded-2xl bg-surface-1/50">
            <p className="text-text-muted">Próximamente: Analíticas IA</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ 
  id, label, icon, active, onClick, disabled 
}: { 
  id: string, label: string, icon: React.ReactNode, active: boolean, onClick: () => void, disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${active 
          ? 'bg-shell-accent/10 text-shell-accent' 
          : 'text-text-muted hover:bg-shell-border hover:text-text-primary'
        }
      `}
    >
      {icon}
      {label}
    </button>
  )
}
