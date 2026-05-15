'use client'

import { useState } from 'react'
import TemplateSender from './TemplateSender'
import SignaturesList from './SignaturesList'

type Tab = 'nueva' | 'listado'

const DOCUSEAL_URL = 'http://144.22.45.201:3001'

export default function SignaturesModule() {
  const [activeTab, setActiveTab] = useState<Tab>('nueva')
  const [refreshList, setRefreshList] = useState(0)

  const handleRefresh = () => {
    setRefreshList(r => r + 1)
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] px-6 pt-5 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Firmas Digitales</h1>
              <p className="text-xs text-[var(--text-muted)]">Enviá documentos a firmar de forma segura</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Actualizar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <a
              href={DOCUSEAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 rounded-lg border border-violet-500/20 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Administrar Plantillas
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {([
            ['nueva', '✍️ Nueva Firma'],
            ['listado', '📋 Mis Documentos'],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                activeTab === id
                  ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'nueva' && <TemplateSender onSent={() => setActiveTab('listado')} />}
        {activeTab === 'listado' && <SignaturesList key={refreshList} />}
      </div>
    </div>
  )
}
