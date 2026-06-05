'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/nav/PageHeader'

// Tab content loaded on demand: TemplateSender carries the heavy signature
// editor; neither tab is needed until its panel is shown.
const tabLoading = () => (
  <div className="p-6">
    <div className="h-8 w-48 animate-pulse rounded-xl bg-[var(--bg-secondary)]" />
  </div>
)
const TemplateSender = dynamic(() => import('./TemplateSender'), { loading: tabLoading })
const SignaturesList = dynamic(() => import('./SignaturesList'), { loading: tabLoading })
const AutorizacionForm = dynamic(() => import('./AutorizacionForm'), { loading: tabLoading })
const TemplateEditor = dynamic(() => import('./TemplateEditor'), { loading: tabLoading })

type Tab = 'nueva' | 'listado' | 'plantillas'
type NuevaMode = 'autorizacion' | 'otras'

const DOCUSEAL_URL = process.env.NEXT_PUBLIC_DOCUSEAL_URL ?? 'http://144.22.45.201:3001'

export default function SignaturesModule({ role = 'asesor' }: { role?: 'admin' | 'asesor' }) {
  const isAdmin = role === 'admin'
  const [activeTab, setActiveTab] = useState<Tab>('nueva')
  const [nuevaMode, setNuevaMode] = useState<NuevaMode>('autorizacion')
  const [refreshList, setRefreshList] = useState(0)

  const handleRefresh = () => {
    setRefreshList(r => r + 1)
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <PageHeader
        title="Firmas Digitales"
        subtitle="Enviá documentos a firmar de forma segura"
        actions={
          <>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
          </>
        }
      />

      {/* Tabs */}
      <div className="border-b border-[var(--border-subtle)] px-6 pt-3 flex-shrink-0">
        <div className="flex gap-1">
          {([
            ['nueva', '✍️ Nueva Firma'],
            ['listado', '📋 Mis Documentos'],
            ...(isAdmin ? [['plantillas', '⚙️ Plantillas'] as [Tab, string]] : []),
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
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'nueva' && (
          <>
            <div className="px-6 pt-4 flex-shrink-0">
              <div className="inline-flex rounded-lg border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-secondary)]">
                {([
                  ['autorizacion', 'Autorización (dinámica)'],
                  ['otras', 'Otras plantillas'],
                ] as [NuevaMode, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setNuevaMode(id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      nuevaMode === id ? 'bg-violet-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {nuevaMode === 'autorizacion'
                ? <AutorizacionForm onSent={() => setActiveTab('listado')} />
                : <TemplateSender onSent={() => setActiveTab('listado')} />}
            </div>
          </>
        )}
        {activeTab === 'listado' && <SignaturesList key={refreshList} />}
        {activeTab === 'plantillas' && isAdmin && <TemplateEditor />}
      </div>
    </div>
  )
}
