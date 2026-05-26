import { useState, useEffect } from 'react'
import SmartAuthorizationForm from './SmartAuthorizationForm'
interface TemplateField {
  name: string
  type: string
  required: boolean
}

interface Template {
  id: number
  name: string
  roles: string[]
  fieldsByRole: Record<string, TemplateField[]>
  documents: { name: string; preview: string }[]
}

interface SignerForm {
  role: string
  name: string
  email: string
  phone: string
  values: Record<string, string>
}

export default function TemplateSender({ onSent }: { onSent: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  
  const [signers, setSigners] = useState<SignerForm[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/signatures/templates')
      .then(res => res.json())
      .then(data => {
        if (data.templates) setTemplates(data.templates)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  const handleSelectTemplate = (id: number) => {
    setSelectedTemplateId(id)
    const tpl = templates.find(t => t.id === id)
    if (tpl) {
      setSigners(tpl.roles.map(role => ({ role, name: '', email: '', phone: '', values: {} })))
    } else {
      setSigners([])
    }
  }

  const updateSigner = (idx: number, field: keyof SignerForm, value: any) => {
    const newSigners = [...signers]
    newSigners[idx] = { ...newSigners[idx], [field]: value }
    setSigners(newSigners)
  }

  const updateSignerValue = (idx: number, fieldName: string, value: string) => {
    const newSigners = [...signers]
    newSigners[idx] = {
      ...newSigners[idx],
      values: { ...newSigners[idx].values, [fieldName]: value }
    }
    setSigners(newSigners)
  }

  const handleSubmit = async () => {
    setError('')
    if (!selectedTemplateId) { setError('Seleccioná una plantilla.'); return }
    
    // Validate required static fields
    const missing = signers.find(s => !s.name.trim() || !s.email.trim())
    if (missing) {
      setError(`Completá el nombre y email para el rol: ${missing.role}`)
      return
    }

    // Validate dynamic fields
    if (selectedTemplate) {
      for (let i = 0; i < signers.length; i++) {
        const roleFields = selectedTemplate.fieldsByRole[signers[i].role] || []
        const missingField = roleFields.find(f => f.required && !signers[i].values[f.name]?.trim())
        if (missingField) {
          setError(`Completá el campo "${missingField.name}" para el rol: ${signers[i].role}`)
          return
        }
      }
    }

    setSending(true)
    try {
      // Intentar obtener el email del usuario logueado para usarlo como Reply-To
      let replyToEmail = ''
      try {
        const storedUser = localStorage.getItem('freire_session') || localStorage.getItem('currentUser')
        if (storedUser) {
          const parsed = JSON.parse(storedUser)
          if (parsed.email) replyToEmail = parsed.email
        }
      } catch (e) {}

      const res = await fetch('/api/signatures/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          ...(replyToEmail ? { reply_to: replyToEmail } : {}),
          signers: signers.map(s => ({
            ...s,
            // Send values directly as an object as required by DocuSeal API
            values: s.values
          }))
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar')

      setSuccess('¡Documento enviado con éxito!')
      setTimeout(() => {
        setSuccess('')
        setSelectedTemplateId(null)
        onSent()
      }, 2000)
    } catch (e: any) {
      setError(e.message || 'Error inesperado')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Cargando plantillas disponibles...</div>
  }

  if (templates.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-500/10 text-violet-400 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[var(--text-primary)]">No hay plantillas</h3>
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mt-2">
          Todavía no creaste ninguna plantilla en DocuSeal. Ingresá al panel de administrador en <a href="http://144.22.45.201:3001" target="_blank" className="text-violet-400 hover:underline">144.22.45.201:3001</a> para subir tus PDFs estándar (Autorizaciones, Reservas) y colocar los campos de firma.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8 h-full overflow-y-auto">
      <div>
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">1. Seleccionar Plantilla</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                selectedTemplateId === tpl.id 
                  ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50' 
                  : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="w-12 h-16 bg-zinc-800 rounded flex-shrink-0 overflow-hidden shadow-sm border border-zinc-700">
                {tpl.documents[0]?.preview ? (
                  <img src={tpl.documents[0].preview} alt="" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">PDF</div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="font-medium text-[var(--text-primary)] truncate">{tpl.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">{tpl.roles.length} firmantes requeridos</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Si es una Autorización o Venta, usamos el Smart Form */}
      {selectedTemplate && (selectedTemplate.name.toUpperCase().includes('AUTORIZACION') || selectedTemplate.name.toUpperCase().includes('VENTA') || selectedTemplate.name.toUpperCase().includes('EXCLUSIVA')) ? (
        <SmartAuthorizationForm template={selectedTemplate} onSent={() => {
          setSelectedTemplateId(null)
          onSent()
        }} />
      ) : selectedTemplate && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">2. Datos de los Firmantes</h2>
          <div className="space-y-4">
            {signers.map((signer, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-subtle)]">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <h4 className="font-medium text-[var(--text-primary)] capitalize">{signer.role}</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nombre Completo *</label>
                    <input
                      type="text"
                      value={signer.name}
                      onChange={e => updateSigner(idx, 'name', e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Email *</label>
                    <input
                      type="email" inputMode="email"
                      value={signer.email}
                      onChange={e => updateSigner(idx, 'email', e.target.value)}
                      placeholder="Ej: juan@mail.com"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Dynamic Fields for this Role */}
                {selectedTemplate?.fieldsByRole[signer.role]?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                    <h5 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Datos a completar por {signer.role}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplate.fieldsByRole[signer.role].map(field => (
                        <div key={field.name}>
                          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                            {field.name.replace(/_/g, ' ')} {field.required && '*'}
                          </label>
                          <input
                            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                            value={signer.values?.[field.name] || ''}
                            onChange={e => updateSignerValue(idx, field.name, e.target.value)}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-violet-500 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-end">
            {error && <div className="text-red-400 text-sm mb-3 flex items-center gap-1.5"><AlertCircleIcon /> {error}</div>}
            {success && <div className="text-green-400 text-sm mb-3 flex items-center gap-1.5"><CheckCircleIcon /> {success}</div>}
            
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <>Enviando... <span className="animate-spin text-lg leading-none">⟳</span></>
              ) : (
                <>Enviar para Firmar <span>→</span></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AlertCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
