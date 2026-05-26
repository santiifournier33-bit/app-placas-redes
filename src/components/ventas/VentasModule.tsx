"use client"

import { useState } from "react"
import { DollarSign, Activity, PieChart, Sparkles } from "lucide-react"
import ProductionTab from "./ProductionTab"
import ActivityTab from "./ActivityTab"
import BalanceTab from "./BalanceTab"

type TabType = "produccion" | "actividad" | "balance" | "analiticas"

export default function VentasModule() {
  const [activeTab, setActiveTab] = useState<TabType>("produccion")

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex space-x-1 bg-shell-surface border border-shell-border p-1 rounded-xl overflow-x-auto scroll-x-affordance">
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
          <div className="flex items-center justify-center h-64 border border-shell-border border-dashed rounded-2xl bg-shell-surface/50">
            <p className="text-shell-text-muted">Próximamente: Analíticas IA</p>
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
          : 'text-shell-text-muted hover:bg-shell-border hover:text-shell-text'
        }
      `}
    >
      {icon}
      {label}
    </button>
  )
}
